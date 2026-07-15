"""Sanitize and merge client progress before persisting."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

log = logging.getLogger("libry.progress")

MAX_COINS = 999_999
MAX_INK = 999_999
MAX_PAGES = 999_999
MAX_RATING = 999_999
MAX_ARRAY = 5000
MAX_NEW_CARDS_PER_SYNC = 3
ECONOMY_DELTA = 500

_card_allowlist: set[str] | None = None


def _content_paths() -> list[Path]:
    here = Path(__file__).resolve().parent
    return [
        here / "data" / "content.json",
        here.parent / "web" / "src" / "data" / "content.json",
    ]


def _walk_card_ids(node: Any, out: set[str]) -> None:
    if isinstance(node, dict):
        if "cards" in node and isinstance(node["cards"], list):
            for card in node["cards"]:
                if isinstance(card, dict):
                    cid = card.get("id")
                    if isinstance(cid, str) and cid:
                        out.add(cid)
        for v in node.values():
            _walk_card_ids(v, out)
    elif isinstance(node, list):
        for item in node:
            _walk_card_ids(item, out)


def load_card_allowlist() -> set[str]:
    global _card_allowlist
    if _card_allowlist is not None:
        return _card_allowlist
    ids: set[str] = set()
    for path in _content_paths():
        if not path.is_file():
            continue
        try:
            with path.open("r", encoding="utf-8") as f:
                data = json.load(f)
            _walk_card_ids(data, ids)
            log.info("card allowlist loaded %s ids from %s", len(ids), path)
            break
        except Exception as e:
            log.warning("failed to load card catalog from %s: %s", path, e)
    _card_allowlist = ids
    return ids


def extend_allowlist(store: dict[str, Any]) -> set[str]:
    base = set(load_card_allowlist())
    overrides = store.get("card_overrides") or {}
    if isinstance(overrides, dict):
        base.update(str(k) for k in overrides.keys())
    return base


def _clamp_int(value: Any, lo: int, hi: int, default: int = 0) -> int:
    try:
        n = int(value)
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, n))


def _clamp_str(value: Any, max_len: int) -> str | None:
    if value is None:
        return None
    s = str(value)
    return s[:max_len] if s else None


def _merge_numeric(client: int, server: int, delta: int = ECONOMY_DELTA) -> int:
    if client <= server:
        return max(0, client)
    if client - server > delta:
        return server + delta
    return client


def _merge_card_ids(
    client_ids: list[str],
    server_ids: list[str],
    allowlist: set[str],
) -> list[str]:
    server_set = set(server_ids)
    merged = list(server_ids)
    new_allowed = 0
    for cid in client_ids:
        if not isinstance(cid, str) or not cid or cid in server_set:
            continue
        if cid not in allowlist:
            continue
        if new_allowed >= MAX_NEW_CARDS_PER_SYNC:
            break
        merged.append(cid)
        server_set.add(cid)
        new_allowed += 1
    if len(merged) > MAX_ARRAY:
        merged = merged[:MAX_ARRAY]
    return merged


def merge_progress(
    store: dict[str, Any],
    user_id: str,
    incoming: dict[str, Any],
) -> dict[str, Any]:
    """Return sanitized progress dict safe to persist."""
    allowlist = extend_allowlist(store)
    existing = store.get("progress", {}).get(user_id)
    if not isinstance(existing, dict):
        existing = {}

    out: dict[str, Any] = dict(incoming)

    server_channel = existing.get("channelConfirmedAt")
    incoming_channel = incoming.get("channelConfirmedAt")
    if server_channel:
        out["channelConfirmedAt"] = server_channel
    elif incoming_channel:
        out["channelConfirmedAt"] = _clamp_str(incoming_channel, 64)
    else:
        out["channelConfirmedAt"] = None

    out["coins"] = _merge_numeric(
        _clamp_int(incoming.get("coins"), 0, MAX_COINS),
        _clamp_int(existing.get("coins"), 0, MAX_COINS),
    )
    out["ink"] = _merge_numeric(
        _clamp_int(incoming.get("ink"), 0, MAX_INK),
        _clamp_int(existing.get("ink"), 0, MAX_INK),
    )
    out["pages"] = _merge_numeric(
        _clamp_int(incoming.get("pages"), 0, MAX_PAGES),
        _clamp_int(existing.get("pages"), 0, MAX_PAGES),
    )
    out["rating"] = _clamp_int(
        max(
            _clamp_int(incoming.get("rating"), 0, MAX_RATING),
            _clamp_int(existing.get("rating"), 0, MAX_RATING),
        ),
        0,
        MAX_RATING,
    )

    client_cards = incoming.get("collectedCardIds")
    server_cards = existing.get("collectedCardIds")
    if isinstance(client_cards, list):
        base_server = server_cards if isinstance(server_cards, list) else []
        out["collectedCardIds"] = _merge_card_ids(client_cards, base_server, allowlist)
    elif isinstance(server_cards, list):
        out["collectedCardIds"] = server_cards[:MAX_ARRAY]

    for key in (
        "lifetimeInkEarned",
        "lifetimeDailyOpens",
        "lifetimeChestOpens",
        "inkPurchases",
        "lifetimePaidCases",
        "referralCount",
        "dailyStreak",
        "bonusCaseOpens",
    ):
        if key in incoming:
            out[key] = _clamp_int(incoming.get(key), 0, MAX_COINS)

    if "referralBonusClaimed" in incoming:
        out["referralBonusClaimed"] = bool(incoming.get("referralBonusClaimed"))

    if "referredByUserId" in existing:
        out["referredByUserId"] = existing.get("referredByUserId")
    elif "referredByUserId" in incoming:
        ref = incoming.get("referredByUserId")
        out["referredByUserId"] = ref if isinstance(ref, str) else None

    for list_key in (
        "claimedQuestIds",
        "claimedAchievementIds",
        "appliedClaimIds",
        "claimedFullBookIds",
        "secretPageUnlockedBookIds",
        "claimedStreakMilestones",
        "inkShopCardIds",
    ):
        val = incoming.get(list_key)
        if isinstance(val, list):
            out[list_key] = [str(x) for x in val[:MAX_ARRAY]]

    for ts_key in (
        "lastDailyOpenAt",
        "lastChestOpenAt",
        "lastBonusCaseOpenAt",
        "inkShopRolledAt",
        "dailyStreakLastDate",
        "visitedLibraryAt",
    ):
        if ts_key in incoming:
            out[ts_key] = _clamp_str(incoming.get(ts_key), 64)

    if isinstance(incoming.get("dayStats"), dict):
        out["dayStats"] = incoming["dayStats"]
    elif isinstance(existing.get("dayStats"), dict):
        out["dayStats"] = existing["dayStats"]

    if isinstance(incoming.get("battlePass"), dict):
        out["battlePass"] = incoming["battlePass"]
    elif isinstance(existing.get("battlePass"), dict):
        out["battlePass"] = existing["battlePass"]

    return out
