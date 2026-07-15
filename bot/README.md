# Libry Cards bot (Bothost)

Python-бот + HTTP API. Корень репозитория специально без `package.json` (фронт в `web/`), иначе Bothost ставит Node и падает с `ERR_UNKNOWN_FILE_EXTENSION` на `.py`.

Старт: корневой **`main.py`** → `bot/main.py`.

## Env (Bothost)

| Переменная | Пример | Описание |
|------------|--------|----------|
| `BOT_TOKEN` | от BotFather | обязателен |
| `WEBAPP_URL` | `https://libry-cards.vercel.app` | Mini App на Vercel |
| `PUBLIC_BASE` | `https://bot-1784140664-7190-svveare.bothost.tech` | **обязателен** — иначе картинки карт не открываются у других игроков |
| `ADMIN_IDS` | `1920121195` | через запятую |
| `REFERRAL_BONUS` | `25` | монеты приглашённому |
| `PORT` | `3000` | порт HTTP |
| `DATA_PATH` | `data/store.json` | хранилище |
| `CARDS_DIR` | `data/cards` | картинки |

После обновления из Git — **Restart**. В логах сборки ищи `python` / `pip`, не `node bot/main.py`.

## Локально

```bash
pip install -r requirements.txt
python main.py
```
