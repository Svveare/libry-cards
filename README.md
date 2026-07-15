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

Bothost у твоего бота **закешировал Node** (`CMD node bot/main.py`). Это настройка панели, не код — обычный `master` он продолжает собирать как Node.

**Рабочий выход:**

1. В Bothost укажи ветку **`bothost`** (отдельная ветка только с Python: `main.py` + `requirements.txt`, без `package.json`).
2. Главный файл: **`main.py`**
3. Язык / тип: **Python** (если нельзя сменить — **удали бота и создай нового** как Python с тем же Git, branch=`bothost`).
4. Env: `BOT_TOKEN`, `WEBAPP_URL`, `PUBLIC_BASE`, `ADMIN_IDS`
5. Redeploy. В логах сборки должно быть **`pip install` / `python`**, не `npm` и не `CMD ["node",…]`.
6. Если URL Bothost снова сменится — обнови `web/src/data/config.json` → `backendBaseUrl`.

Мини-апп и код бота для разработки — ветка **`master`** (фронт в `web/`, бот в `bot/`).
