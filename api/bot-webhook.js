import { getBotToken, getWebAppUrl, telegramCall } from './_lib/telegram.js';

const START_CAPTION =
  '<b>Libry Cards</b> — собирай уникальные карточки прямо в Telegram!\n\n' +
  '🎮 Ежедневные бонусы и сундуки\n' +
  '🃏 Библиотека, задания и друзья\n' +
  '🔗 Заходи по ссылке и играй прямо сейчас';

const ABOUT_TEXT =
  '<b>Что умеет этот бот?</b>\n\n' +
  '• Ежедневка и сундук — награды раз в день / 48 ч\n' +
  '• Магазин: кейсы, гарантия редкости, чернила\n' +
  '• Библиотека полок и коллекция карт\n' +
  '• Задания, достижения и рефералка для друзей\n\n' +
  'Подпишись на канал и жми <b>Играть</b> — всё в Mini App.';

function playKeyboard(webAppUrl) {
  const rows = [];
  if (webAppUrl) {
    rows.push([{ text: '🎮 Играть', web_app: { url: webAppUrl } }]);
  }
  rows.push([{ text: 'Что умеет этот бот?', callback_data: 'about' }]);
  return { inline_keyboard: rows };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    const botToken = getBotToken();
    const webAppUrl = getWebAppUrl();
    const update = req.body || {};

    if (update.callback_query) {
      const cq = update.callback_query;
      await telegramCall(botToken, 'answerCallbackQuery', {
        callback_query_id: cq.id,
      });
      if (cq.data === 'about' && cq.message) {
        await telegramCall(botToken, 'sendMessage', {
          chat_id: cq.message.chat.id,
          text: ABOUT_TEXT,
          parse_mode: 'HTML',
          reply_markup: playKeyboard(webAppUrl),
        });
      }
      return res.status(200).json({ ok: true });
    }

    const msg = update.message;
    const text = (msg?.text || '').trim();
    if (msg && (text === '/start' || text.startsWith('/start '))) {
      const chatId = msg.chat.id;
      const photoUrl = webAppUrl
        ? `${webAppUrl}/bot/welcome-banner.jpg`
        : undefined;

      if (photoUrl) {
        await telegramCall(botToken, 'sendPhoto', {
          chat_id: chatId,
          photo: photoUrl,
          caption: START_CAPTION,
          parse_mode: 'HTML',
          reply_markup: playKeyboard(webAppUrl),
        });
      } else {
        await telegramCall(botToken, 'sendMessage', {
          chat_id: chatId,
          text: START_CAPTION,
          parse_mode: 'HTML',
          reply_markup: playKeyboard(webAppUrl),
        });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('bot-webhook', err);
    return res.status(200).json({
      ok: true,
      error: err instanceof Error ? err.message : 'error',
    });
  }
}
