# Libry Cards bot (Bothost)

Маленький бот + HTTP API для рефералов, админ-грантов, **общих картинок карт** и **синка прогресса**.

В корне репозитория лежит **`Dockerfile`** (Python). Без него Bothost из‑за `package.json` Mini App стартует как Node и падает с `ERR_UNKNOWN_FILE_EXTENSION` на `bot/main.py`.

## Env (Bothost)

| Переменная | Пример | Описание |
|------------|--------|----------|
| `BOT_TOKEN` | от BotFather | обязателен |
| `WEBAPP_URL` | `https://libry-cards.vercel.app` | URL Mini App на Vercel |
| `PUBLIC_BASE` | `https://bot-….bothost.tech` | публичный HTTPS этого бота (картинки) |
| `ADMIN_IDS` | `1920121195` | через запятую |
| `REFERRAL_BONUS` | `25` | монеты приглашённому |
| `PORT` | `3000` | порт HTTP (совпадает с «Порт веб-приложения») |
| `DATA_PATH` | `data/store.json` | файл хранилища |
| `CARDS_DIR` | `data/cards` | файлы картинок |

**Важно:** добавь `PUBLIC_BASE` = твой домен Bothost без `/` в конце.

После `git pull` на Bothost сделай **Restart** бота.

## Старт

```bash
pip install -r requirements.txt
python main.py
```

(или entry `bot/main.py` из корня репо)

API:

- `GET /api/health`
- `GET /media/cards/{file}` — картинки
- `POST /api/bootstrap` — рефералы, pending, `cardOverrides`, `progress`
- `POST /api/claim`
- `POST /api/progress` — синк прогресса аккаунта
- `POST /api/admin/grant`
- `POST /api/admin/card` — поля карты + `imageBase64` (лимит ~300 KB)

В Mini App `config.backendBaseUrl` = тот же HTTPS, что `PUBLIC_BASE`.

## Команды

- `/start` / `/start ref_123`
- `/give <id> coins|cases N`

## Ссылка приглашения

`https://t.me/librycards_bot?start=ref_{telegramId}`
