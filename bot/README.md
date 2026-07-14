# Libry Cards bot (Bothost)

Маленький бот + HTTP API для рефералов и админ-грантов.

## Env (Bothost)

| Переменная | Пример | Описание |
|------------|--------|----------|
| `BOT_TOKEN` | от BotFather | обязателен |
| `WEBAPP_URL` | `https://libry-cards-xxx.vercel.app` | URL Mini App на Vercel |
| `ADMIN_IDS` | `1920121195` | через запятую |
| `REFERRAL_BONUS` | `25` | монеты приглашённому |
| `PORT` | `8080` | порт HTTP (Bothost часто задаёт сам) |
| `DATA_PATH` | `data/store.json` | файл хранилища |

## Старт

```bash
cd bot
pip install -r requirements.txt
python main.py
```

Бот: long polling. API на том же порту:

- `GET /api/health`
- `POST /api/bootstrap` `{ "initData", "startParam?" }`
- `POST /api/claim` `{ "initData", "claimId" }`
- `POST /api/admin/grant` `{ "initData", "targetUserId", "coins", "bonusCases" }`

В Mini App `config.backendBaseUrl` = публичный HTTPS Bothost (например `https://your-bot.bothost.ru`).

## Команды

- `/start` — кнопка Web App
- `/start ref_123` — реферал от пользователя 123
- `/give <id> coins 100` — админ
- `/give <id> cases 2` — админ (бонус-открытия ежедневки)

## Ссылка приглашения

`https://t.me/librycards_bot?start=ref_{telegramId}`
