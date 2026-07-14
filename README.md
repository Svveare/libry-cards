# Libry Cards

Telegram Mini App — коллекционная библиотека карточек.

## v1

- Музыка → «Русский реп» (20 карт)
- Ежедневка и сундук 48 ч — после **реальной** подписки на `@librycards` (`getChatMember`)
- Магазин: сброс ожидания 75, Сундук+ 150, кейсы 75/100/150, гарантия 100/150/200
- Задания, ачивки, друзья, админка (`adminUserIds`)
- Бот: `/start` с баннером + кнопки «Играть» / «Что умеет этот бот?»

## Локально

```bash
npm.cmd install
npm.cmd run build
npm.cmd run dev
```

`http://localhost:5173` — фронт. API (`/api/*`) на Vercel; локально без env проверка подписки вернёт ошибку сети/сервера.

## Деплой (Vercel)

1. Push в GitHub → Vercel deploy
2. Environment Variables на Vercel:
   - `TELEGRAM_BOT_TOKEN` — токен `@librycards_bot`
   - `TELEGRAM_CHANNEL_USERNAME` — `@librycards`
   - `TELEGRAM_WEBAPP_URL` — `https://<ваш-проект>.vercel.app` (без `/` в конце)
3. BotFather → Web App URL = тот же HTTPS
4. Бот должен быть **админом** канала `@librycards` (иначе `getChatMember` не работает)
5. Webhook:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<ваш-проект>.vercel.app/api/bot-webhook"
```

6. Smoke: `/start` → картинка → «Что умеет этот бот?» → Играть → daily без подписки не пускает → подписка → «Я подписался» → ок → перезаход без повторного гейта

### Реферальная ссылка

`https://t.me/librycards_bot/app?startapp=ref_<telegramId>`

`telegramMiniAppShortName` в `config.json` должен совпадать с BotFather. Для Main Mini App поставьте `""`.

## Контент

- `src/data/content.json` / `config.json`
- Картинки карт: `public/cards/` + `"image": "/cards/….webp"` (900×1200)
- Баннер `/start`: `public/bot/welcome-banner.jpg` (1200×630)
- Админка: оверлей + «Скачать JSON» → коммит и редеплой

## Ограничения

- Прогресс в localStorage; статус подписки кэшируется локально, но при каждом входе сверяется с API
- Счётчик приглашений инвайтера = 0 до сервера

## Стек

React 19 + Vite + TypeScript · Vercel Serverless (`/api`) · Telegram Bot API
