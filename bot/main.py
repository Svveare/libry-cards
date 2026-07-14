"""Libry Cards Telegram bot + HTTP API for Bothost."""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import os
import time
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl

from aiohttp import web
from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    WebAppInfo,
)

BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "https://example.vercel.app").rstrip("/")
ADMIN_IDS = {
    x.strip()
    for x in os.environ.get("ADMIN_IDS", "1920121195").split(",")
    if x.strip()
}
REFERRAL_BONUS = int(os.environ.get("REFERRAL_BONUS", "25"))
DATA_PATH = Path(os.environ.get("DATA_PATH", "data/store.json"))
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", os.environ.get("BOTHOST_PORT", "3000")))
PUBLIC_BASE = os.environ.get("PUBLIC_BASE", "").rstrip("/")  # https://xxx.bothost.ru

if not BOT_TOKEN:
    raise SystemExit("BOT_TOKEN is required")


def default_store() -> dict[str, Any]:
    return {
        "referrals": {},  # invitee_id -> referrer_id
        "referral_counts": {},  # referrer_id -> int
        "pending": {},  # user_id -> {coins, bonusCases, claimedLocalReferral}
        "grants": [],  # list of {id, userId, coins, bonusCases, claimed}
    }


def load_store() -> dict[str, Any]:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not DATA_PATH.exists():
        data = default_store()
        save_store(data)
        return data
    with DATA_PATH.open("r", encoding="utf-8") as f:
        raw = json.load(f)
    base = default_store()
    base.update(raw)
    return base


def save_store(data: dict[str, Any]) -> None:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = DATA_PATH.with_suffix(".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    tmp.replace(DATA_PATH)


STORE = load_store()


def pending_for(user_id: str) -> dict[str, int]:
    p = STORE["pending"].setdefault(
        user_id, {"coins": 0, "bonusCases": 0, "localReferralHandled": False}
    )
    return p


def register_referral(invitee: str, referrer: str) -> bool:
    """Return True if newly registered."""
    if not referrer or referrer == invitee:
        return False
    if invitee in STORE["referrals"]:
        return False
    STORE["referrals"][invitee] = referrer
    STORE["referral_counts"][referrer] = int(STORE["referral_counts"].get(referrer, 0)) + 1
    p = pending_for(invitee)
    p["coins"] = int(p.get("coins", 0)) + REFERRAL_BONUS
    save_store(STORE)
    return True


def validate_init_data(init_data: str) -> dict[str, Any] | None:
    """Telegram WebApp initData HMAC check (Bot API)."""
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


def webapp_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Открыть Libry Cards",
                    web_app=WebAppInfo(url=WEBAPP_URL),
                )
            ]
        ]
    )


bot = Bot(BOT_TOKEN)
dp = Dispatcher()


@dp.message(CommandStart())
async def cmd_start(message: Message, command: CommandObject) -> None:
    args = (command.args or "").strip()
    user_id = str(message.from_user.id) if message.from_user else ""
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

    await message.answer(text, reply_markup=webapp_keyboard())


@dp.message(Command("give"))
async def cmd_give(message: Message, command: CommandObject) -> None:
    """Admin: /give <user_id> coins <n> | /give <user_id> cases <n>"""
    uid = str(message.from_user.id) if message.from_user else ""
    if uid not in ADMIN_IDS:
        await message.answer("Нет доступа.")
        return
    parts = (command.args or "").split()
    if len(parts) < 3:
        await message.answer("Формат: /give <telegram_id> coins|cases <число>")
        return
    target, kind, amount_s = parts[0], parts[1].lower(), parts[2]
    try:
        amount = int(amount_s)
    except ValueError:
        await message.answer("Число должно быть целым.")
        return
    if amount <= 0:
        await message.answer("Число > 0.")
        return
    p = pending_for(target)
    if kind in ("coins", "coin", "монеты"):
        p["coins"] = int(p.get("coins", 0)) + amount
    elif kind in ("cases", "case", "кейсы", "кейс"):
        p["bonusCases"] = int(p.get("bonusCases", 0)) + amount
    else:
        await message.answer("Вид: coins или cases")
        return
    save_store(STORE)
    await message.answer(
        f"Ок: {target} → +{amount} {kind}. Заберёт при входе в Mini App."
    )


async def api_health(_: web.Request) -> web.Response:
    return web.json_response({"ok": True, "service": "libry-cards-bot"})


async def api_bootstrap(request: web.Request) -> web.Response:
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
    start_param = body.get("startParam") or parsed.get("start_param") or ""

    # Fallback: register referral from Mini App start_param if bot /start missed
    if isinstance(start_param, str) and start_param.startswith("ref_"):
        register_referral(user_id, start_param[4:].strip())

    p = pending_for(user_id)
    coins = int(p.get("coins", 0))
    cases = int(p.get("bonusCases", 0))
    # Consume pending into response; client applies then we clear on ack
    # Explicit claim endpoint preferred — clear here after returning once:
    # Use claimIds to avoid double-spend: move to "issued" token.
    claim_id = None
    if coins or cases:
        claim_id = f"{user_id}-{int(time.time())}-{coins}-{cases}"
        STORE.setdefault("open_claims", {})[claim_id] = {
            "userId": user_id,
            "coins": coins,
            "bonusCases": cases,
        }
        p["coins"] = 0
        p["bonusCases"] = 0
        save_store(STORE)

    count = int(STORE["referral_counts"].get(user_id, 0))
    return web.json_response(
        {
            "userId": user_id,
            "referralCount": count,
            "pendingCoins": coins,
            "pendingBonusCases": cases,
            "claimId": claim_id,
            "isAdmin": user_id in ADMIN_IDS,
            "referredBy": STORE["referrals"].get(user_id),
        }
    )


async def api_claim(request: web.Request) -> web.Response:
    """Confirm client applied a bootstrap claim (idempotent)."""
    try:
        body = await request.json()
    except Exception:
        return web.json_response({"error": "invalid json"}, status=400)
    parsed = validate_init_data(body.get("initData") or "")
    if not parsed:
        return web.json_response({"error": "unauthorized"}, status=401)
    user_id = str(parsed["user"].get("id", ""))
    claim_id = body.get("claimId")
    open_claims = STORE.setdefault("open_claims", {})
    claim = open_claims.get(claim_id) if claim_id else None
    if not claim or claim.get("userId") != user_id:
        return web.json_response({"ok": True, "already": True})
    open_claims.pop(claim_id, None)
    save_store(STORE)
    return web.json_response({"ok": True})


async def api_admin_grant(request: web.Request) -> web.Response:
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

    target = str(body.get("targetUserId") or "").strip()
    coins = int(body.get("coins") or 0)
    cases = int(body.get("bonusCases") or 0)
    if not target.isdigit():
        return web.json_response({"error": "bad target"}, status=400)
    if coins < 0 or cases < 0 or (coins == 0 and cases == 0):
        return web.json_response({"error": "bad amounts"}, status=400)

    p = pending_for(target)
    p["coins"] = int(p.get("coins", 0)) + coins
    p["bonusCases"] = int(p.get("bonusCases", 0)) + cases
    save_store(STORE)
    return web.json_response(
        {
            "ok": True,
            "targetUserId": target,
            "pendingCoins": p["coins"],
            "pendingBonusCases": p["bonusCases"],
        }
    )


def cors_middleware():
    @web.middleware
    async def middleware(request: web.Request, handler):
        if request.method == "OPTIONS":
            resp = web.Response(status=204)
        else:
            resp = await handler(request)
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
        resp.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
        return resp

    return middleware


async def on_startup(app: web.Application) -> None:
    app["bot_task"] = asyncio.create_task(dp.start_polling(bot))


async def on_cleanup(app: web.Application) -> None:
    task = app.get("bot_task")
    if task:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    await bot.session.close()


def create_app() -> web.Application:
    app = web.Application(middlewares=[cors_middleware()])
    app.router.add_get("/health", api_health)
    app.router.add_get("/api/health", api_health)
    app.router.add_post("/api/bootstrap", api_bootstrap)
    app.router.add_post("/api/claim", api_claim)
    app.router.add_post("/api/admin/grant", api_admin_grant)
    app.router.add_route("OPTIONS", "/api/{tail:.*}", api_health)
    app.on_startup.append(on_startup)
    app.on_cleanup.append(on_cleanup)
    return app


def main() -> None:
    web.run_app(create_app(), host=HOST, port=PORT)


if __name__ == "__main__":
    main()
