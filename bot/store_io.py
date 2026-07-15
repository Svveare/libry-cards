"""Store persistence: lock, debounced compact saves, caches."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from pathlib import Path
from typing import Any

log = logging.getLogger("libry.store")

SAVE_DEBOUNCE_S = 2.0
KNOWN_USERS_TTL_S = 60.0
OPEN_CLAIMS_MAX_AGE_S = 7 * 86400

_store_lock: asyncio.Lock | None = None
_save_handle: asyncio.Handle | None = None
_known_users_cache: tuple[float, list[str]] | None = None


def get_store_lock() -> asyncio.Lock:
    global _store_lock
    if _store_lock is None:
        _store_lock = asyncio.Lock()
    return _store_lock


def write_store_disk(data_path: Path, data: dict[str, Any]) -> None:
    data_path.parent.mkdir(parents=True, exist_ok=True)
    tmp = data_path.with_suffix(".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    tmp.replace(data_path)


async def flush_store(data_path: Path, data: dict[str, Any]) -> None:
    await asyncio.to_thread(write_store_disk, data_path, data)


def schedule_save(app: Any, data_path: Path, data: dict[str, Any]) -> None:
    """Coalesce disk writes within SAVE_DEBOUNCE_S."""
    global _save_handle

    loop = asyncio.get_running_loop()
    pending = app.setdefault("_store_pending_save", False)
    app["_store_pending_save"] = True
    app["_store_snapshot"] = data
    app["_store_data_path"] = data_path

    def _flush_pending() -> None:
        app["_store_pending_save"] = False
        snapshot = app.get("_store_snapshot")
        path = app.get("_store_data_path")
        if snapshot is not None and path is not None:
            asyncio.create_task(flush_store(path, snapshot))

    if _save_handle is not None:
        _save_handle.cancel()
    _save_handle = loop.call_later(SAVE_DEBOUNCE_S, _flush_pending)


async def save_store_now(data_path: Path, data: dict[str, Any]) -> None:
    """Immediate flush (e.g. shutdown)."""
    await flush_store(data_path, data)


def invalidate_known_users_cache() -> None:
    global _known_users_cache
    _known_users_cache = None


def known_user_ids(store: dict[str, Any]) -> list[str]:
    global _known_users_cache
    now = time.monotonic()
    if _known_users_cache is not None:
        cached_at, ids = _known_users_cache
        if now - cached_at < KNOWN_USERS_TTL_S:
            return ids

    ids: set[str] = set()
    for key in ("users", "progress", "pending", "referrals", "referral_counts"):
        bucket = store.get(key) or {}
        if isinstance(bucket, dict):
            ids.update(str(k) for k in bucket.keys() if str(k).isdigit())
    for claim in (store.get("open_claims") or {}).values():
        if isinstance(claim, dict):
            uid = str(claim.get("userId") or "")
            if uid.isdigit():
                ids.add(uid)
    result = sorted(ids)
    _known_users_cache = (now, result)
    return result


def prune_open_claims(store: dict[str, Any], now: float | None = None) -> bool:
    """Drop open_claims older than OPEN_CLAIMS_MAX_AGE_S. Returns True if changed."""
    claims = store.get("open_claims")
    if not isinstance(claims, dict) or not claims:
        return False
    t = now if now is not None else time.time()
    cutoff = t - OPEN_CLAIMS_MAX_AGE_S
    removed = False
    for cid in list(claims.keys()):
        claim = claims.get(cid)
        if not isinstance(claim, dict):
            continue
        created = claim.get("createdAt")
        if created is None:
            continue
        try:
            ts = float(created)
        except (TypeError, ValueError):
            continue
        if ts < cutoff:
            claims.pop(cid, None)
            removed = True
    return removed
