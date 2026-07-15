"""Libry Cards Telegram bot + HTTP API for Bothost."""

from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl

from aiohttp import web
from aiogram import Bot, Dispatcher
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    WebAppInfo,
)

from progress_guard import load_card_allowlist, merge_progress
from rate_limit import check_user, rate_limit_middleware, route_group
from store_io import (
    flush_store,
    get_store_lock,
    invalidate_known_users_cache,
    known_user_ids,
    prune_open_claims,
    schedule_save,
    write_store_disk,
)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("libry")

APP_ENV = os.environ.get("ENV", os.environ.get("APP_ENV", "")).lower()
BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "https://example.vercel.app").rstrip("/")
_admin_raw = os.environ.get("ADMIN_IDS", "").strip()
if _admin_raw:
    ADMIN_IDS = {x.strip() for x in _admin_raw.split(",") if x.strip()}
elif APP_ENV == "dev":
    ADMIN_IDS = {"1920121195"}
else:
    raise SystemExit("ADMIN_IDS is required in production (set ENV=dev for local fallback)")

REFERRAL_BONUS = int(os.environ.get("REFERRAL_BONUS", "25"))
DATA_PATH = Path(os.environ.get("DATA_PATH", "data/store.json"))
CARDS_DIR = Path(os.environ.get("CARDS_DIR", "data/cards"))
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", os.environ.get("BOTHOST_PORT", "3000")))
PUBLIC_BASE = os.environ.get("PUBLIC_BASE", "").rstrip("/")
MAX_IMAGE_BYTES = int(os.environ.get("MAX_IMAGE_BYTES", str(300 * 1024)))
MAX_GRANT_COINS = 10_000
MAX_GRANT_CASES = 50
BROADCAST_COOLDOWN_S = 60

if not BOT_TOKEN:
    raise SystemExit("BOT_TOKEN is required")

CARD_ID_RE = re.compile(r"^[a-zA-Z0-9_\-]{1,80}$")
MIME_EXT = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}

STORE_SCHEMA = 3
_web_app: web.Application | None = None
_broadcast_running = False
_broadcast_finished_at = 0.0


def default_store() -> dict[str, Any]:
    return {
        "version": STORE_SCHEMA,
        "referrals": {},
        "referral_counts": {},
        "pending": {},
        "open_claims": {},
        "card_overrides": {},
        "progress": {},
        "users": {},
    }


def load_store() -> dict[str, Any]:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    CARDS_DIR.mkdir(parents=True, exist_ok=True)
    if not DATA_PATH.exists():
        data = default_store()
        write_store_disk(DATA_PATH, data)
        return data
    with DATA_PATH.open("r", encoding="utf-8") as f:
        raw = json.load(f)
    base = default_store()
    base.update(raw)
    base.pop("grants", None)
    base.setdefault("card_overrides", {})
    base.setdefault("progress", {})
    base.setdefault("open_claims", {})
    base.setdefault("users", {})
    if base.get("version") != STORE_SCHEMA:
        base["version"] = STORE_SCHEMA
        base["progress"] = {}
        base["pending"] = {}
        base["open_claims"] = {}
        write_store_disk(DATA_PATH, base)
    return base


STORE = load_store()


async def persist_store() -> None:
    if _web_app is None:
        write_store_disk(DATA_PATH, STORE)
        return
    async with get_store_lock():
        schedule_save(_web_app, DATA_PATH, STORE)


def pending_for(user_id: str) -> dict[str, int]:
    p = STORE["pending"].setdefault(
        user_id, {"coins": 0, "bonusCases": 0, "localReferralHandled": False}
    )
    return p


def register_referral(invitee: str, referrer: str) -> bool:
    if not referrer or referrer == invitee or not referrer.isdigit():
        return False
    if invitee in STORE["referrals"]:
        return False
    STORE["referrals"][invitee] = referrer
    STORE["referral_counts"][referrer] = int(STORE["referral_counts"].get(referrer, 0)) + 1
    p = pending_for(invitee)
    p["coins"] = int(p.get("coins", 0)) + REFERRAL_BONUS
    invalidate_known_users_cache()
    return True


def validate_init_data(init_data: str) -> dict[str, Any] | None:
    if not init_data:
        return None
    parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = parsed.pop("hash", None)
    if not received_hash:
        return None
    data_check = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))
    secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    calculated = hmac.new(secret_key, data_check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calculated, received_hash):
        return None
    auth_date = int(parsed.get("auth_date", "0") or 0)
    if auth_date and time.time() - auth_date > 86400:
        return None
    user_raw = parsed.get("user")
    if not user_raw:
        return None
    try:
        user = json.loads(user_raw)
    except json.JSONDecodeError:
        return None
    return {"user": user, "start_param": parsed.get("start_param")}


def public_base_from(request: web.Request) -> str:
    if PUBLIC_BASE:
        return PUBLIC_BASE
    proto = request.headers.get("X-Forwarded-Proto") or request.scheme or "https"
    host = request.headers.get("X-Forwarded-Host") or request.host
    return f"{proto}://{host}".rstrip("/")


def is_allowed_card_image_url(img: str, request: web.Request) -> bool:
    if not img:
        return True
    if img.startswith("/media/cards/"):
        return True
    if not img.startswith("https://"):
        return False
    base = public_base_from(request)
    if base and img.startswith(f"{base}/media/cards/"):
        return True
    if PUBLIC_BASE and img.startswith(f"{PUBLIC_BASE}/media/cards/"):
        return True
    return False


def webapp_keyboard(play_label: bool = False) -> InlineKeyboardMarkup:
    label = "Начать играть" if play_label else "Открыть Libry Cards"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=label,
                    web_app=WebAppInfo(url=WEBAPP_URL),
                )
            ]
        ]
    )


def touch_user(user_id: str) -> None:
    if not user_id or not user_id.isdigit():
        return
    users = STORE.setdefault("users", {})
    users[user_id] = {"seenAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}


def cors_origin(request: web.Request) -> str:
    origin = request.headers.get("Origin", "")
    if origin in ("http://localhost:5173", "http://127.0.0.1:5173"):
        return origin
    return WEBAPP_URL


bot = Bot(BOT_TOKEN)
dp = Dispatcher()


@dp.message(CommandStart())
async def cmd_start(message: Message, command: CommandObject) -> None:
    args = (command.args or "").strip()
    user_id = str(message.from_user.id) if message.from_user else ""
    touch_user(user_id)
    text = (
        "Libry Cards — библиотека карточек.\n"
        "Жми кнопку ниже, чтобы открыть игру."
    )

    if args.startswith("ref_"):
        referrer = args[4:].strip()
        if register_referral(user_id, referrer):
            text = (
                f"Добро пожаловать! Тебе начислено +{REFERRAL_BONUS} монет "
                "(заберутся при входе в игру).\n"
                "Открой Libry Cards:"
            )
        else:
            text = "С возвращением. Открой игру:"

    await persist_store()
    await message.answer(text, reply_markup=webapp_keyboard())


@dp.message(Command("give"))
async def cmd_give(message: Message, command: CommandObject) -> None:
    uid = str(message.from_user.id) if message.from_user else ""
    if uid not in ADMIN_IDS:
        await message.answer("Нет доступа.")
        return
    parts = (command.args or "").split()
    if len(parts) < 3:
        await message.answer("Формат: /give <telegram_id> coins|cases <число>")
        return
    target, kind, amount_s = parts[0], parts[1].lower(), parts[2]
    if not target.isdigit():
        await message.answer("ID должен быть числом.")
        return
    try:
        amount = int(amount_s)
    except ValueError:
        await message.answer("Число должно быть целым.")
        return
    if amount <= 0:
        await message.answer("Число > 0.")
        return
    if kind in ("coins", "coin", "монеты") and amount > MAX_GRANT_COINS:
        await message.answer(f"Максимум {MAX_GRANT_COINS} монет за раз.")
        return
    if kind in ("cases", "case", "кейсы", "кейс") and amount > MAX_GRANT_CASES:
        await message.answer(f"Максимум {MAX_GRANT_CASES} кейсов за раз.")
        return
    p = pending_for(target)
    if kind in ("coins", "coin", "монеты"):
        p["coins"] = int(p.get("coins", 0)) + amount
    elif kind in ("cases", "case", "кейсы", "кейс"):
        p["bonusCases"] = int(p.get("bonusCases", 0)) + amount
    else:
        await message.answer("Вид: coins или cases")
        return
    await persist_store()
    await message.answer(
        f"Ок: {target} → +{amount} {kind}. Заберёт при входе в Mini App."
    )


async def api_health(_: web.Request) -> web.Response:
    return web.json_response({"ok": True, "service": "libry-cards-bot"})


async def api_bootstrap(request: web.Request) -> web.Response:
    group = route_group(request.path)
    try:
        body = await request.json()
    except Exception:
        return web.json_response({"error": "invalid json"}, status=400)
    init_data = body.get("initData") or ""
    parsed = validate_init_data(init_data)
    if not parsed:
        return web.json_response({"error": "unauthorized"}, status=401)

    user = parsed["user"]
    user_id = str(user.get("id", ""))
    blocked = check_user(user_id, group)
    if blocked is not None:
        return blocked

    async with get_store_lock():
        if prune_open_claims(STORE):
            invalidate_known_users_cache()

        touch_user(user_id)
        start_param = body.get("startParam") or parsed.get("start_param") or ""

        if isinstance(start_param, str) and start_param.startswith("ref_"):
            register_referral(user_id, start_param[4:].strip())

        open_claims = STORE.setdefault("open_claims", {})
        claim_id = None
        coins = 0
        cases = 0
        for cid, claim in list(open_claims.items()):
            if claim.get("userId") == user_id:
                claim_id = cid
                coins = int(claim.get("coins", 0))
                cases = int(claim.get("bonusCases", 0))
                break

        p = pending_for(user_id)
        pending_coins = int(p.get("coins", 0))
        pending_cases = int(p.get("bonusCases", 0))

        if pending_coins or pending_cases:
            now_ts = time.time()
            if claim_id is None:
                coins = pending_coins
                cases = pending_cases
                claim_id = f"{user_id}-{int(now_ts)}-{coins}-{cases}"
                open_claims[claim_id] = {
                    "userId": user_id,
                    "coins": coins,
                    "bonusCases": cases,
                    "createdAt": now_ts,
                }
            else:
                coins = coins + pending_coins
                cases = cases + pending_cases
                open_claims[claim_id] = {
                    "userId": user_id,
                    "coins": coins,
                    "bonusCases": cases,
                    "createdAt": open_claims[claim_id].get("createdAt", now_ts),
                }
            p["coins"] = 0
            p["bonusCases"] = 0

        count = int(STORE["referral_counts"].get(user_id, 0))
        progress = STORE.get("progress", {}).get(user_id)
        if _web_app:
            schedule_save(_web_app, DATA_PATH, STORE)
        else:
            write_store_disk(DATA_PATH, STORE)

        payload = {
            "userId": user_id,
            "referralCount": count,
            "pendingCoins": coins,
            "pendingBonusCases": cases,
            "claimId": claim_id,
            "isAdmin": user_id in ADMIN_IDS,
            "referredBy": STORE["referrals"].get(user_id),
            "cardOverrides": STORE.get("card_overrides", {}),
            "progress": progress,
        }

    return web.json_response(payload)


async def api_claim(request: web.Request) -> web.Response:
    group = route_group(request.path)
    try:
        body = await request.json()
    except Exception:
        return web.json_response({"error": "invalid json"}, status=400)
    parsed = validate_init_data(body.get("initData") or "")
    if not parsed:
        return web.json_response({"error": "unauthorized"}, status=401)
    user_id = str(parsed["user"].get("id", ""))
    blocked = check_user(user_id, group)
    if blocked is not None:
        return blocked

    claim_id = body.get("claimId")
    async with get_store_lock():
        open_claims = STORE.setdefault("open_claims", {})
        claim = open_claims.get(claim_id) if claim_id else None
        if not claim or claim.get("userId") != user_id:
            return web.json_response({"ok": True, "already": True})
        open_claims.pop(claim_id, None)
        if _web_app:
            schedule_save(_web_app, DATA_PATH, STORE)
        else:
            write_store_disk(DATA_PATH, STORE)
    return web.json_response({"ok": True})


async def api_progress(request: web.Request) -> web.Response:
    group = route_group(request.path)
    try:
        body = await request.json()
    except Exception:
        return web.json_response({"error": "invalid json"}, status=400)
    parsed = validate_init_data(body.get("initData") or "")
    if not parsed:
        return web.json_response({"error": "unauthorized"}, status=401)
    user_id = str(parsed["user"].get("id", ""))
    blocked = check_user(user_id, group)
    if blocked is not None:
        return blocked

    progress = body.get("progress")
    if not isinstance(progress, dict):
        return web.json_response({"error": "bad progress"}, status=400)

    async with get_store_lock():
        merged = merge_progress(STORE, user_id, progress)
        STORE.setdefault("progress", {})[user_id] = merged
        if _web_app:
            schedule_save(_web_app, DATA_PATH, STORE)
        else:
            write_store_disk(DATA_PATH, STORE)
    return web.json_response({"ok": True})


async def api_admin_grant(request: web.Request) -> web.Response:
    group = route_group(request.path)
    try:
        body = await request.json()
    except Exception:
        return web.json_response({"error": "invalid json"}, status=400)
    parsed = validate_init_data(body.get("initData") or "")
    if not parsed:
        return web.json_response({"error": "unauthorized"}, status=401)
    admin_id = str(parsed["user"].get("id", ""))
    if admin_id not in ADMIN_IDS:
        return web.json_response({"error": "forbidden"}, status=403)
    blocked = check_user(admin_id, group)
    if blocked is not None:
        return blocked

    target = str(body.get("targetUserId") or "").strip()
    coins = int(body.get("coins") or 0)
    cases = int(body.get("bonusCases") or 0)
    if not target.isdigit():
        return web.json_response({"error": "bad target"}, status=400)
    if coins < 0 or cases < 0 or (coins == 0 and cases == 0):
        return web.json_response({"error": "bad amounts"}, status=400)
    if coins > MAX_GRANT_COINS or cases > MAX_GRANT_CASES:
        return web.json_response({"error": "amount too large"}, status=400)

    async with get_store_lock():
        p = pending_for(target)
        p["coins"] = int(p.get("coins", 0)) + coins
        p["bonusCases"] = int(p.get("bonusCases", 0)) + cases
        if _web_app:
            schedule_save(_web_app, DATA_PATH, STORE)
        else:
            write_store_disk(DATA_PATH, STORE)

    return web.json_response(
        {
            "ok": True,
            "targetUserId": target,
            "pendingCoins": p["coins"],
            "pendingBonusCases": p["bonusCases"],
        }
    )


async def _run_broadcast(text: str, targets: list[str]) -> None:
    global _broadcast_running, _broadcast_finished_at
    kb = webapp_keyboard(play_label=True)
    sent = 0
    failed = 0
    try:
        for uid in targets:
            try:
                await bot.send_message(chat_id=int(uid), text=text, reply_markup=kb)
                sent += 1
            except Exception:
                failed += 1
            await asyncio.sleep(0.04)
        log.info("broadcast done sent=%s failed=%s total=%s", sent, failed, len(targets))
    finally:
        _broadcast_running = False
        _broadcast_finished_at = time.time()


async def api_admin_broadcast(request: web.Request) -> web.Response:
    global _broadcast_running
    group = route_group(request.path)
    try:
        body = await request.json()
    except Exception:
        return web.json_response({"error": "invalid json"}, status=400)
    parsed = validate_init_data(body.get("initData") or "")
    if not parsed:
        return web.json_response({"error": "unauthorized"}, status=401)
    admin_id = str(parsed["user"].get("id", ""))
    if admin_id not in ADMIN_IDS:
        return web.json_response({"error": "forbidden"}, status=403)
    blocked = check_user(admin_id, group)
    if blocked is not None:
        return blocked

    text = str(body.get("text") or "").strip()
    if not text or len(text) > 3500:
        return web.json_response({"error": "bad text"}, status=400)

    if _broadcast_running:
        return web.json_response({"error": "busy"}, status=409)
    if time.time() - _broadcast_finished_at < BROADCAST_COOLDOWN_S:
        return web.json_response({"error": "cooldown"}, status=429)

    targets = known_user_ids(STORE)
    _broadcast_running = True
    asyncio.create_task(_run_broadcast(text, targets))

    return web.json_response(
        {
            "ok": True,
            "accepted": True,
            "total": len(targets),
        }
    )


async def api_admin_card(request: web.Request) -> web.Response:
    group = route_group(request.path)
    try:
        body = await request.json()
    except Exception:
        return web.json_response({"error": "invalid json"}, status=400)
    parsed = validate_init_data(body.get("initData") or "")
    if not parsed:
        return web.json_response({"error": "unauthorized"}, status=401)
    admin_id = str(parsed["user"].get("id", ""))
    if admin_id not in ADMIN_IDS:
        return web.json_response({"error": "forbidden"}, status=403)
    blocked = check_user(admin_id, group)
    if blocked is not None:
        return blocked

    card_id = str(body.get("cardId") or "").strip()
    if not CARD_ID_RE.match(card_id):
        return web.json_response({"error": "bad cardId"}, status=400)

    async with get_store_lock():
        overrides = STORE.setdefault("card_overrides", {})
        patch: dict[str, Any] = dict(overrides.get(card_id) or {})

        if "name" in body and body["name"] is not None:
            patch["name"] = str(body["name"])[:120]
        if "description" in body and body["description"] is not None:
            patch["description"] = str(body["description"])[:2000]
        if "rarity" in body and body["rarity"] is not None:
            patch["rarity"] = str(body["rarity"])[:32]

        image_b64 = body.get("imageBase64")
        clear_image = bool(body.get("clearImage"))
        if image_b64:
            mime = str(body.get("mime") or "image/webp").lower().strip()
            if mime not in MIME_EXT:
                return web.json_response({"error": "bad mime"}, status=400)
            raw_b64 = str(image_b64)
            if "," in raw_b64 and raw_b64.startswith("data:"):
                raw_b64 = raw_b64.split(",", 1)[1]
            try:
                data = base64.b64decode(raw_b64, validate=False)
            except Exception:
                return web.json_response({"error": "bad base64"}, status=400)
            if len(data) > MAX_IMAGE_BYTES:
                return web.json_response({"error": "image too large"}, status=400)
            if len(data) < 32:
                return web.json_response({"error": "image too small"}, status=400)

            CARDS_DIR.mkdir(parents=True, exist_ok=True)
            for old in CARDS_DIR.glob(f"{card_id}.*"):
                try:
                    old.unlink()
                except OSError:
                    pass
            ext = MIME_EXT[mime]
            filename = f"{card_id}.{ext}"
            path = CARDS_DIR / filename
            path.write_bytes(data)
            base = public_base_from(request)
            patch["image"] = f"{base}/media/cards/{filename}"

        elif clear_image or body.get("image") == "":
            patch["image"] = ""
            for old in CARDS_DIR.glob(f"{card_id}.*"):
                try:
                    old.unlink()
                except OSError:
                    pass

        elif body.get("image") is not None:
            img = str(body.get("image") or "").strip()
            if img and not is_allowed_card_image_url(img, request):
                return web.json_response({"error": "bad image url"}, status=400)
            if img:
                patch["image"] = img[:2000]
            else:
                patch["image"] = ""
                for old in CARDS_DIR.glob(f"{card_id}.*"):
                    try:
                        old.unlink()
                    except OSError:
                        pass

        if not patch:
            return web.json_response({"error": "empty patch"}, status=400)

        overrides[card_id] = patch
        if _web_app:
            schedule_save(_web_app, DATA_PATH, STORE)
        else:
            write_store_disk(DATA_PATH, STORE)

    return web.json_response({"ok": True, "cardId": card_id, "override": patch})


async def api_media_card(request: web.Request) -> web.Response:
    name = request.match_info.get("filename", "")
    if not name or "/" in name or "\\" in name or ".." in name:
        return web.Response(status=400, text="bad name")
    if not re.match(r"^[a-zA-Z0-9_\-]+\.(webp|jpg|jpeg|png|gif)$", name, re.I):
        return web.Response(status=400, text="bad name")
    path = (CARDS_DIR / name).resolve()
    try:
        path.relative_to(CARDS_DIR.resolve())
    except ValueError:
        return web.Response(status=403, text="forbidden")
    if not path.is_file():
        return web.Response(status=404, text="not found")
    ext = path.suffix.lower()
    ctype = {
        ".webp": "image/webp",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
    }.get(ext, "application/octet-stream")
    return web.FileResponse(path, headers={"Content-Type": ctype, "Cache-Control": "public, max-age=86400"})


def cors_middleware():
    @web.middleware
    async def middleware(request: web.Request, handler):
        if request.method == "OPTIONS":
            resp = web.Response(status=204)
        else:
            resp = await handler(request)
        resp.headers["Access-Control-Allow-Origin"] = cors_origin(request)
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
        resp.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
        return resp

    return middleware


async def on_startup(app: web.Application) -> None:
    global _web_app
    _web_app = app
    CARDS_DIR.mkdir(parents=True, exist_ok=True)
    load_card_allowlist()
    app["bot_task"] = asyncio.create_task(dp.start_polling(bot))


async def on_cleanup(app: web.Application) -> None:
    await flush_store(DATA_PATH, STORE)
    task = app.get("bot_task")
    if task:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    await bot.session.close()


def create_app() -> web.Application:
    app = web.Application(
        middlewares=[rate_limit_middleware(), cors_middleware()],
        client_max_size=2 * 1024 * 1024,
    )
    app.router.add_get("/health", api_health)
    app.router.add_get("/api/health", api_health)
    app.router.add_get("/media/cards/{filename}", api_media_card)
    app.router.add_post("/api/bootstrap", api_bootstrap)
    app.router.add_post("/api/claim", api_claim)
    app.router.add_post("/api/progress", api_progress)
    app.router.add_post("/api/admin/grant", api_admin_grant)
    app.router.add_post("/api/admin/broadcast", api_admin_broadcast)
    app.router.add_post("/api/admin/card", api_admin_card)
    app.router.add_route("OPTIONS", "/api/{tail:.*}", api_health)
    app.on_startup.append(on_startup)
    app.on_cleanup.append(on_cleanup)
    return app


def main() -> None:
    web.run_app(create_app(), host=HOST, port=PORT)


if __name__ == "__main__":
    main()
