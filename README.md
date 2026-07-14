# Libry Cards

Telegram Mini App — коллекционная библиотека карточек.

## v1

- Музыка → «Русский реп» (20 карт)
- Ежедневка и сундук 48 ч — подписка на `@librycards` (`getChatMember` через Vercel `/api`)
- Магазин: сброс ожидания 75, Сундук+ 150, кейсы 75/100/150, гарантия 100/150/200
- Задания, ачивки, друзья, админка (`adminUserIds`)
- Рефералка и админ-выдача: бот + API на Bothost (`bot/`)

## Локально

```bash
npm.cmd install
npm.cmd run build
npm.cmd run dev
```

`http://localhost:5173` — фронт. API подписки (`/api/check-subscription`) на Vercel; локально без env проверка может вернуть ошибку сети.

## Деплой Mini App (Vercel)

1. Push в GitHub → Vercel deploy (или `npx vercel --prod`)
2. Environment Variables на Vercel:
   - `TELEGRAM_BOT_TOKEN` — токен `@librycards_bot`
   - `TELEGRAM_CHANNEL_USERNAME` — `@librycards`
   - `TELEGRAM_WEBAPP_URL` — `https://<ваш-проект>.vercel.app` (без `/` в конце)
3. BotFather → Web App URL = тот же HTTPS
4. Бот должен быть **админом** канала `@librycards` (иначе `getChatMember` не работает)
5. В `src/data/config.json` укажи `backendBaseUrl` = публичный HTTPS Bothost (после деплоя бота)
6. Smoke: daily → сундук → кейс → library → friends → admin

**Важно:** один и тот же `BOT_TOKEN` нельзя одновременно держать на Vercel webhook и на Bothost long polling. Для рефералки/грантов используй Bothost — удали webhook:

```bash
curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
```

(старый `/api/bot-webhook` на Vercel тогда не нужен.)

## Деплой бота (Bothost)

Репозиторий: https://github.com/Svveare/libry-cards.git  
Код бота в папке **`bot/`**.

См. [`bot/README.md`](bot/README.md). Кратко:

1. В Bothost укажи Git URL репозитория, root/subdir = `bot` (если есть такое поле)
2. Env: `BOT_TOKEN`, `WEBAPP_URL` (Vercel), `ADMIN_IDS=1920121195`
3. Старт: `pip install -r requirements.txt && python main.py`
4. Проверка: `GET https://<bothost-host>/api/health`

Приглашение: `https://t.me/librycards_bot?start=ref_{telegramId}`  
Бот отвечает кнопкой Web App → Mini App забирает бонус через `POST /api/bootstrap`.

Админ: вкладка **Выдача** в Mini App или `/give <id> coins|cases N`.

## Контент

- `src/data/content.json` / `config.json`
- Картинки: HTTPS URL или `public/cards/` + `"image": "/cards/….webp"` (900×1200)
- В Telegram WebView file picker скрыт — URL или админка в браузере
- Баннер (если нужен): `public/bot/welcome-banner.jpg`
- Админка: оверлей + «Скачать JSON» → коммит и редеплой

## Без backendBaseUrl

- Прогресс в localStorage
- Реферал invitee +25 локально по `start_param` (счётчик инвайтера не растёт)
- Выдача другому ID невозможна

## Стек

React 19 + Vite + TypeScript · Vercel (`/api` подписка) · Bothost (aiogram + aiohttp)
