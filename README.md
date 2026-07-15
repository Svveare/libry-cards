# Libry Cards

Telegram Mini App + Bothost bot (monorepo).

## Структура

| Путь | Назначение |
|------|------------|
| `web/` | Mini App (React/Vite) → Vercel |
| `bot/` + корневые `main.py`, `requirements.txt` | Telegram bot + API → Bothost |
| `api/` | Vercel serverless (`check-subscription`) |
| `Dockerfile` | кастомный Python-образ для Bothost |

**Важно:** `package.json` лежит в `web/`, не в корне. Иначе Bothost думает, что это Node, и запускает `node bot/main.py`.

## Mini App (Vercel)

```bash
cd web
npm install
npm run build
npm run dev
```

Vercel: root репозитория, `vercel.json` сам ставит `npm … --prefix web`. Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_USERNAME`, `TELEGRAM_WEBAPP_URL`.

В `web/src/data/config.json` → `backendBaseUrl` = HTTPS Bothost.

## Бот (Bothost)

1. Git URL этого репо (корень = Python: `requirements.txt` + `main.py`)
2. Главный файл: **`main.py`** (не Node / не `bot/main.py` через node)
3. Env: `BOT_TOKEN`, `WEBAPP_URL`, `PUBLIC_BASE=https://bot-….bothost.tech`, `ADMIN_IDS`
4. Redeploy после пуша → в **логах сборки** должно быть `pip install`, **не** `npm install`
5. `GET …/api/health`

Подробнее: [`bot/README.md`](bot/README.md).
