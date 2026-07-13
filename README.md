# Libry Cards

Telegram Mini App — коллекционная библиотека карточек.

## v1

- Музыка → «Русский реп» (20 карт)
- Ежедневка и сундук 48 ч — после подписки на `@librycards`
- Магазин: сброс ожидания 75, Сундук+ 150, кейсы 75/100/150, гарантия 100/150/200
- Задания, ачивки, друзья, админка (`adminUserIds`)

## Локально

```bash
npm.cmd install
npm.cmd run build
npm.cmd run dev
```

`http://localhost:5173`

## Деплой

1. `npm.cmd run build`
2. `npx vercel --prod`
3. BotFather → `@librycards_bot` → Web App URL = HTTPS деплоя
4. Smoke: daily → сундук (подписка) → кейс → library → friends → admin

`vercel.json` — SPA rewrite.

## Контент

- `src/data/content.json` / `config.json`
- Картинки: `public/cards/` + `"image": "/cards/….webp"` (900×1200)
- Админка: оверлей + «Скачать JSON» → коммит и редеплой

## Ограничения без бэкенда

- Прогресс в localStorage
- Подписка: «Я подписался» (без getChatMember)
- Счётчик приглашений инвайтера = 0 до сервера

## Стек

React 19 + Vite + TypeScript · CSS Modules · localStorage · Vercel
