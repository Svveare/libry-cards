"""In-memory sliding-window rate limits (single Bothost instance)."""

from __future__ import annotations

import logging
import time
from collections import defaultdict, deque
from typing import Callable

from aiohttp import web

log = logging.getLogger("libry.rate_limit")

WINDOW_S = 60.0

# (max_per_window_ip, max_per_window_user)
ROUTE_LIMITS: dict[str, tuple[int, int | None]] = {
    "health": (0, None),  # 0 = unlimited
    "bootstrap": (30, 10),
    "progress": (60, 20),
    "claim": (30, 10),
    "admin": (20, 5),
    "media": (120, None),
}


def route_group(path: str) -> str:
    if path in ("/health", "/api/health"):
        return "health"
    if path == "/api/bootstrap":
        return "bootstrap"
    if path == "/api/progress":
        return "progress"
    if path == "/api/claim":
        return "claim"
    if path.startswith("/api/admin/"):
        return "admin"
    if path.startswith("/media/cards/"):
        return "media"
    return "other"


class SlidingWindow:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str, limit: int, now: float | None = None) -> bool:
        if limit <= 0:
            return True
        t = now if now is not None else time.monotonic()
        q = self._hits[key]
        cutoff = t - WINDOW_S
        while q and q[0] < cutoff:
            q.popleft()
        if len(q) >= limit:
            return False
        q.append(t)
        return True

    def retry_after(self, key: str, now: float | None = None) -> int:
        t = now if now is not None else time.monotonic()
        q = self._hits.get(key)
        if not q:
            return 1
        wait = int(max(1, WINDOW_S - (t - q[0]) + 1))
        return wait


_ip_limiter = SlidingWindow()
_user_limiter = SlidingWindow()


def client_ip(request: web.Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote or "unknown"


def too_many(retry_after: int) -> web.Response:
    return web.json_response(
        {"error": "rate_limit"},
        status=429,
        headers={"Retry-After": str(retry_after)},
    )


def check_ip(request: web.Request, group: str) -> web.Response | None:
    limits = ROUTE_LIMITS.get(group)
    if not limits:
        return None
    ip_limit, _ = limits
    ip = client_ip(request)
    key = f"{group}:ip:{ip}"
    if _ip_limiter.allow(key, ip_limit):
        return None
    log.warning("rate limit ip group=%s ip=%s", group, ip)
    return too_many(_ip_limiter.retry_after(key))


def check_user(user_id: str, group: str) -> web.Response | None:
    if not user_id:
        return None
    limits = ROUTE_LIMITS.get(group)
    if not limits:
        return None
    _, user_limit = limits
    if not user_limit:
        return None
    key = f"{group}:user:{user_id}"
    if _user_limiter.allow(key, user_limit):
        return None
    log.warning("rate limit user group=%s user=%s", group, user_id)
    return too_many(_user_limiter.retry_after(key))


def rate_limit_middleware() -> Callable:
    @web.middleware
    async def middleware(request: web.Request, handler):
        group = route_group(request.path)
        blocked = check_ip(request, group)
        if blocked is not None:
            return blocked
        return await handler(request)

    return middleware
