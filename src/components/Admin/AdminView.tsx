import { useMemo, useState } from 'react';
import type { ContentData, Rarity } from '../../types';
import { RARITY_LABELS } from '../../types';
import {
  commitEditableContent,
  getEditableContent,
  resetContentToBase,
} from '../../content/loader';
import { downloadBinaryFile, downloadContentJson, downloadDataUrlAsFile } from '../../content/overlay';
import {
  addBook,
  addShelf,
  deleteBook,
  deleteShelf,
  updateBook,
  updateCard,
  updateShelf,
} from '../../utils/adminContent';
import { adminGrant, adminSaveCard, hasBackend } from '../../api/backend';
import { applyCardOverrides } from '../../content/loader';
import { Header } from '../ui/Header';
import { Button } from '../ui/Button';
import styles from './AdminView.module.css';

interface AdminViewProps {
  onBack: () => void;
  initData: string;
  userId: string;
}

const RARITIES: Rarity[] = [
  'common',
  'rare',
  'epic',
  'legendary',
  'mythic',
  'secret',
];

const MAX_DATA_URL_BYTES = 300_000;

type Tab = 'content' | 'grant';

type Draft = {
  shelfName: string;
  bookName: string;
  bookRarity: Rarity;
  cardName: string;
  cardDesc: string;
  cardImage: string;
  cardRarity: Rarity;
};

const emptyDraft = (): Draft => ({
  shelfName: '',
  bookName: '',
  bookRarity: 'common',
  cardName: '',
  cardDesc: '',
  cardImage: '',
  cardRarity: 'common',
});

function insideTelegramWebApp(): boolean {
  try {
    const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } })
      .Telegram;
    return Boolean(tg?.WebApp?.initData);
  } catch {
    return false;
  }
}

export function AdminView({ onBack, initData, userId }: AdminViewProps) {
  const [tab, setTab] = useState<Tab>('content');
  const [data, setData] = useState<ContentData>(() => getEditableContent());
  const [standId, setStandId] = useState('permanent');
  const [shelfId, setShelfId] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [note, setNote] = useState<string | null>(null);
  const [imgBroken, setImgBroken] = useState(false);
  const [lastImageFileName, setLastImageFileName] = useState<string | null>(
    null,
  );
  const [showDeployChecklist, setShowDeployChecklist] = useState(false);

  const [grantId, setGrantId] = useState('');
  const [grantCoins, setGrantCoins] = useState('25');
  const [grantCases, setGrantCases] = useState('0');
  const [grantBusy, setGrantBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  const inTg = insideTelegramWebApp();
  const isGuest = !userId || userId === 'guest' || !initData;

  const imageStatus = useMemo(() => {
    const img = draft.cardImage.trim();
    if (!img) return null;
    if (img.startsWith('data:')) {
      return {
        kind: 'overlay' as const,
        text: 'в оверлее (только на этом устройстве)',
      };
    }
    if (img.startsWith('/cards/')) {
      return {
        kind: 'path' as const,
        text: `путь ${img} — файл должен лежать в public/cards/ на сервере`,
      };
    }
    if (img.startsWith('https://') || img.startsWith('http://')) {
      return {
        kind: 'url' as const,
        text: 'внешний URL (должен открываться как картинка)',
      };
    }
    return {
      kind: 'other' as const,
      text: 'путь/URL — проверь, что файл доступен на проде',
    };
  }, [draft.cardImage]);

  const suggestedCardsPath = lastImageFileName
    ? `/cards/${lastImageFileName}`
    : draft.cardImage.startsWith('/cards/')
      ? draft.cardImage
      : '/cards/name.webp';

  const stand = data.stands.find((s) => s.id === standId);
  const shelf = stand?.shelves.find((s) => s.id === shelfId) ?? null;
  const book = shelf?.books.find((b) => b.id === bookId) ?? null;
  const card = useMemo(() => {
    if (!book || !cardId) return null;
    for (const page of book.pages) {
      const found = page.cards.find((c) => c.id === cardId);
      if (found) return found;
    }
    return null;
  }, [book, cardId]);

  const persist = (next: ContentData, message?: string) => {
    commitEditableContent(next);
    setData(next);
    if (message) setNote(message);
  };

  const selectShelf = (id: string) => {
    setShelfId(id);
    setBookId(null);
    setCardId(null);
    const s = stand?.shelves.find((x) => x.id === id);
    setDraft((d) => ({ ...d, shelfName: s?.name ?? '' }));
  };

  const selectBook = (id: string) => {
    setBookId(id);
    setCardId(null);
    const b = shelf?.books.find((x) => x.id === id);
    setDraft((d) => ({
      ...d,
      bookName: b?.name ?? '',
      bookRarity: b?.rarity ?? 'common',
    }));
  };

  const selectCard = (id: string) => {
    setCardId(id);
    setImgBroken(false);
    setShowDeployChecklist(false);
    setLastImageFileName(null);
    if (!book) return;
    for (const page of book.pages) {
      const c = page.cards.find((x) => x.id === id);
      if (c) {
        setDraft((d) => ({
          ...d,
          cardName: c.name,
          cardDesc: c.description,
          cardImage: c.image ?? '',
          cardRarity: c.rarity,
        }));
        break;
      }
    }
  };

  const pushCardToServer = async (
    cardIdToSave: string,
    fields: {
      name: string;
      description: string;
      rarity: Rarity;
      image: string;
      clearImage?: boolean;
    },
  ): Promise<{ ok: boolean; image?: string; error?: string }> => {
    if (!hasBackend()) {
      return { ok: false, error: 'backend не настроен' };
    }
    if (!initData) {
      return {
        ok: false,
        error: 'Нужен вход из Telegram Mini App (initData), иначе не у всех',
      };
    }
    const payload: {
      cardId: string;
      name: string;
      description: string;
      rarity: string;
      image?: string;
      imageBase64?: string;
      mime?: string;
      clearImage?: boolean;
    } = {
      cardId: cardIdToSave,
      name: fields.name,
      description: fields.description,
      rarity: fields.rarity,
    };
    if (fields.clearImage) {
      payload.clearImage = true;
      payload.image = '';
    } else if (fields.image.startsWith('data:')) {
      const mimeMatch = /^data:([^;]+);base64,/.exec(fields.image);
      payload.mime = mimeMatch?.[1] ?? 'image/webp';
      payload.imageBase64 = fields.image;
    } else if (fields.image) {
      payload.image = fields.image;
    }
    return adminSaveCard(initData, payload);
  };

  const removeCardImage = async () => {
    if (!card) return;
    if (!confirm('Удалить картинку у этой карты у всех игроков?')) return;
    const fields = {
      name: draft.cardName.trim() || '—',
      description: draft.cardDesc,
      rarity: draft.cardRarity,
      image: '',
      clearImage: true as const,
    };
    const next = updateCard(data, card.id, { image: '' });
    persist(next);
    setDraft((d) => ({ ...d, cardImage: '' }));
    setLastImageFileName(null);
    setImgBroken(false);
    setShowDeployChecklist(false);
    setSaveBusy(true);
    const res = await pushCardToServer(card.id, fields);
    setSaveBusy(false);
    if (res.ok) {
      applyCardOverrides({
        [card.id]: {
          name: fields.name,
          description: fields.description,
          rarity: fields.rarity,
          image: '',
        },
      });
      setNote('Картинка удалена на сервере — у всех после перезахода');
    } else {
      setNote(
        `Локально очищено, на сервер нет: ${res.error ?? 'ошибка'}. Открой админку из Telegram.`,
      );
    }
  };

  const onPickImage = (file: File | null) => {
    if (!file || !cardId) return;
    const safe = file.name.replace(/[^\w.\-]+/g, '_');
    setLastImageFileName(safe);
    setShowDeployChecklist(false);
    const afterLocal = async (imageValue: string) => {
      const next = updateCard(data, cardId, { image: imageValue });
      persist(next);
      setDraft((d) => ({ ...d, cardImage: imageValue }));
      setImgBroken(false);
      setSaveBusy(true);
      const res = await pushCardToServer(cardId, {
        name: draft.cardName.trim() || '—',
        description: draft.cardDesc,
        rarity: draft.cardRarity,
        image: imageValue,
      });
      setSaveBusy(false);
      if (res.ok) {
        const serverImage = res.image ?? imageValue;
        if (res.image && res.image !== imageValue) {
          const withUrl = updateCard(next, cardId, { image: res.image });
          persist(withUrl);
          setDraft((d) => ({ ...d, cardImage: res.image! }));
        }
        applyCardOverrides({
          [cardId]: {
            name: draft.cardName.trim() || '—',
            description: draft.cardDesc,
            rarity: draft.cardRarity,
            image: serverImage,
          },
        });
        setNote(
          'Сохранено на сервере — картинка у всех после перезахода в Mini App',
        );
      } else {
        setShowDeployChecklist(true);
        setNote(
          `Локально да, на сервер нет: ${res.error ?? 'ошибка'}. Открой админку из Telegram.`,
        );
      }
    };

    if (file.size > MAX_DATA_URL_BYTES) {
      downloadBinaryFile(file, safe);
      setNote(
        `Файл >${Math.round(MAX_DATA_URL_BYTES / 1024)} KB — сожми WebP/JPG и выбери снова (лимит сервера ~300 KB).`,
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      downloadBinaryFile(file, safe);
      void afterLocal(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const saveCard = async () => {
    if (!card) return;
    const image = draft.cardImage.trim();
    const fields = {
      name: draft.cardName.trim() || '—',
      description: draft.cardDesc,
      rarity: draft.cardRarity,
      image,
    };
    const next = updateCard(data, card.id, fields);
    persist(next);
    setSaveBusy(true);
    const res = await pushCardToServer(card.id, fields);
    setSaveBusy(false);
    if (res.ok) {
      const serverImage = res.image ?? image;
      if (res.image && res.image !== image) {
        const withUrl = updateCard(next, card.id, { image: res.image });
        persist(withUrl);
        setDraft((d) => ({ ...d, cardImage: res.image! }));
      }
      applyCardOverrides({
        [card.id]: {
          name: fields.name,
          description: fields.description,
          rarity: fields.rarity,
          image: serverImage || undefined,
        },
      });
      setShowDeployChecklist(false);
      setNote(
        'Сохранено на сервере — у всех игроков после перезахода / следующего входа',
      );
    } else {
      setShowDeployChecklist(true);
      setNote(
        `Сохранено только локально: ${res.error ?? 'ошибка'}. Для всех нужен Telegram Mini App + Bothost.`,
      );
    }
  };

  const redownloadImage = () => {
    const img = draft.cardImage.trim();
    const name = lastImageFileName ?? 'card.webp';
    if (img.startsWith('data:')) {
      downloadDataUrlAsFile(img, name);
      setNote(`Файл «${name}» скачан ещё раз — положи в public/cards/`);
      return;
    }
    setNote(
      'Нет data URL для повторной загрузки. Выбери файл снова или положи свой файл в public/cards/.',
    );
  };

  const useCardsPath = () => {
    if (!lastImageFileName) return;
    const path = `/cards/${lastImageFileName}`;
    setDraft((d) => ({ ...d, cardImage: path }));
    setImgBroken(false);
    if (cardId) {
      persist(
        updateCard(data, cardId, { image: path }),
        `Путь в оверлее: ${path}. Файл всё ещё нужен в public/cards/ + деплой.`,
      );
      setShowDeployChecklist(true);
    }
  };

  const onGrant = async () => {
    const target = grantId.trim();
    const coins = Number(grantCoins) || 0;
    const cases = Number(grantCases) || 0;
    if (!target) {
      setNote('Укажи Telegram ID');
      return;
    }
    if (!hasBackend()) {
      setNote('Нужен backendBaseUrl в config (Bothost HTTPS)');
      return;
    }
    if (!initData) {
      setNote('Открой админку из Telegram Mini App');
      return;
    }
    setGrantBusy(true);
    const res = await adminGrant(initData, target, coins, cases);
    setGrantBusy(false);
    setNote(
      res.ok
        ? `Выдано ${target}: +${coins} монет, +${cases} кейсов (заберёт при входе)`
        : `Ошибка: ${res.error ?? 'неизвестно'}`,
    );
  };

  const openAdminInBrowser = () => {
    const url = window.location.href;
    try {
      const tg = (
        window as unknown as {
          Telegram?: { WebApp?: { openLink?: (u: string) => void } };
        }
      ).Telegram?.WebApp;
      if (tg?.openLink) {
        tg.openLink(url);
        return;
      }
    } catch {
      // ignore
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className={`viewEnter ${styles.root}`}>
      <Header title="Админка" subtitle="Контент · выдача" onBack={onBack} />

      {isGuest ? (
        <div className={styles.warnBanner} role="status">
          <strong>Ты не в Telegram Mini App</strong>
          <span>
            Профиль здесь = <code>guest</code>, не твой Telegram ID на телефоне.
            Монеты/коллекция на ПК и в TG — разные. Чтобы править «как админ из
            аккаунта», открывай игру из бота в Telegram.
          </span>
        </div>
      ) : null}

      <div className={styles.infoBanner} role="note">
        <strong>Общий контент через Bothost</strong>
        <span>
          Сохранение карты/фото из Telegram Mini App уходит на сервер — после
          перезахода картинка видна у всех. Без Telegram (guest) сохранится
          только на этом устройстве.
        </span>
      </div>

      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'content'}
          className={`${styles.tab} ${tab === 'content' ? styles.tabActive : ''}`}
          onClick={() => setTab('content')}
        >
          Контент
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'grant'}
          className={`${styles.tab} ${tab === 'grant' ? styles.tabActive : ''}`}
          onClick={() => setTab('grant')}
        >
          Выдача
        </button>
      </div>

      {note ? <p className={styles.note}>{note}</p> : null}

      {tab === 'grant' ? (
        <div className={styles.grantPanel}>
          <p className={styles.hint}>
            Игрок получит монеты / бонус-открытия кейса при следующем заходе в
            Mini App (через бот API).
          </p>
          <label className={styles.field}>
            <span>Telegram ID</span>
            <input
              inputMode="numeric"
              value={grantId}
              placeholder="1920121195"
              onChange={(e) => setGrantId(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Монеты</span>
            <input
              inputMode="numeric"
              value={grantCoins}
              onChange={(e) => setGrantCoins(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Бонус-кейсы (открытия)</span>
            <input
              inputMode="numeric"
              value={grantCases}
              onChange={(e) => setGrantCases(e.target.value)}
            />
          </label>
          <Button fullWidth disabled={grantBusy} onClick={() => void onGrant()}>
            {grantBusy ? 'Отправка…' : 'Выдать'}
          </Button>
          {!hasBackend() ? (
            <p className={styles.muted}>
              backendBaseUrl пуст — задеплой bot/ на Bothost и пропиши URL в
              config.json
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <div className={styles.toolbar}>
            <Button
              variant="secondary"
              onClick={() => {
                downloadContentJson(data);
                setNote(
                  'content.json скачан — замени src/data/content.json в репо',
                );
              }}
            >
              Скачать JSON
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (!confirm('Сбросить оверлей к bundled content.json?')) return;
                resetContentToBase();
                const fresh = getEditableContent();
                setData(fresh);
                setShelfId(null);
                setBookId(null);
                setCardId(null);
                setNote('Оверлей сброшен');
              }}
            >
              Сбросить
            </Button>
          </div>
          <p className={styles.hint}>
            Картинки: загружай файл с устройства в браузере. Для всех игроков —
            файл в public/cards/ + «Скачать JSON» + деплой.
          </p>

          <label className={styles.field}>
            <span>Стенд</span>
            <select
              value={standId}
              onChange={(e) => {
                setStandId(e.target.value);
                setShelfId(null);
                setBookId(null);
                setCardId(null);
              }}
            >
              {data.stands.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.flow}>
            <div className={styles.step}>
              <h3 className={styles.colTitle}>1. Полка</h3>
              <ul className={styles.list}>
                {(stand?.shelves ?? []).map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={`${styles.rowBtn} ${shelfId === s.id ? styles.active : ''}`}
                      onClick={() => selectShelf(s.id)}
                    >
                      {s.name}
                    </button>
                  </li>
                ))}
              </ul>
              <div className={styles.inline}>
                <input
                  value={draft.shelfName}
                  placeholder="Имя полки"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, shelfName: e.target.value }))
                  }
                />
                <Button
                  onClick={() => {
                    if (!draft.shelfName.trim()) return;
                    const next = addShelf(data, standId, draft.shelfName.trim());
                    persist(next, 'Полка добавлена');
                    const created = next.stands
                      .find((s) => s.id === standId)
                      ?.shelves.at(-1);
                    if (created) selectShelf(created.id);
                  }}
                >
                  +
                </Button>
              </div>
              {shelf ? (
                <div className={styles.editBox}>
                  <Button
                    fullWidth
                    variant="secondary"
                    onClick={() => {
                      persist(
                        updateShelf(data, shelf.id, {
                          name: draft.shelfName.trim(),
                        }),
                        'Полка сохранена',
                      );
                    }}
                  >
                    Сохранить полку
                  </Button>
                  <Button
                    fullWidth
                    variant="ghost"
                    onClick={() => {
                      if (!confirm(`Удалить полку «${shelf.name}»?`)) return;
                      persist(deleteShelf(data, shelf.id), 'Полка удалена');
                      setShelfId(null);
                      setBookId(null);
                      setCardId(null);
                    }}
                  >
                    Удалить
                  </Button>
                </div>
              ) : null}
            </div>

            <div className={styles.step}>
              <h3 className={styles.colTitle}>2. Книга</h3>
              {!shelf ? (
                <p className={styles.muted}>Сначала полка</p>
              ) : (
                <>
                  <ul className={styles.list}>
                    {shelf.books.map((b) => (
                      <li key={b.id}>
                        <button
                          type="button"
                          className={`${styles.rowBtn} ${bookId === b.id ? styles.active : ''}`}
                          onClick={() => selectBook(b.id)}
                        >
                          {b.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className={styles.inline}>
                    <input
                      value={draft.bookName}
                      placeholder="Имя книги"
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, bookName: e.target.value }))
                      }
                    />
                    <Button
                      onClick={() => {
                        if (!draft.bookName.trim()) return;
                        const next = addBook(
                          data,
                          shelf.id,
                          draft.bookName.trim(),
                          draft.bookRarity,
                        );
                        persist(next, 'Книга добавлена');
                        const created = next.stands
                          .flatMap((s) => s.shelves)
                          .find((s) => s.id === shelf.id)
                          ?.books.at(-1);
                        if (created) selectBook(created.id);
                      }}
                    >
                      +
                    </Button>
                  </div>
                  {book ? (
                    <div className={styles.editBox}>
                      <select
                        value={draft.bookRarity}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            bookRarity: e.target.value as Rarity,
                          }))
                        }
                      >
                        {RARITIES.map((r) => (
                          <option key={r} value={r}>
                            {RARITY_LABELS[r]}
                          </option>
                        ))}
                      </select>
                      <Button
                        fullWidth
                        variant="secondary"
                        onClick={() => {
                          persist(
                            updateBook(data, book.id, {
                              name: draft.bookName.trim(),
                              rarity: draft.bookRarity,
                            }),
                            'Книга сохранена',
                          );
                        }}
                      >
                        Сохранить книгу
                      </Button>
                      <Button
                        fullWidth
                        variant="ghost"
                        onClick={() => {
                          if (!confirm(`Удалить книгу «${book.name}»?`)) return;
                          persist(deleteBook(data, book.id), 'Книга удалена');
                          setBookId(null);
                          setCardId(null);
                        }}
                      >
                        Удалить
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className={styles.step}>
              <h3 className={styles.colTitle}>3. Карта</h3>
              {!book ? (
                <p className={styles.muted}>Сначала книга</p>
              ) : (
                <ul className={styles.list}>
                  {book.pages.map((page) => (
                    <li key={page.id} className={styles.pageBlock}>
                      <p className={styles.pageLabel}>
                        Стр. {page.number} · {RARITY_LABELS[page.rarity]}
                      </p>
                      {page.cards.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`${styles.rowBtn} ${cardId === c.id ? styles.active : ''}`}
                          onClick={() => selectCard(c.id)}
                        >
                          {c.name || c.id}
                        </button>
                      ))}
                    </li>
                  ))}
                </ul>
              )}
              {card ? (
                <div className={styles.editBox}>
                  <label className={styles.field}>
                    <span>Имя</span>
                    <input
                      value={draft.cardName}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, cardName: e.target.value }))
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Описание</span>
                    <textarea
                      value={draft.cardDesc}
                      rows={3}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, cardDesc: e.target.value }))
                      }
                    />
                  </label>
                  <div className={styles.imageBlock}>
                    <p className={styles.imageTitle}>Картинка с устройства</p>
                    {inTg ? (
                      <>
                        <p className={styles.hint}>
                          В Telegram WebView выбор файла часто ломает экран.
                          Нажми кнопку — админка откроется в браузере, там
                          будет «Выбрать файл».
                        </p>
                        <Button
                          fullWidth
                          variant="secondary"
                          onClick={openAdminInBrowser}
                        >
                          Открыть в браузере и загрузить файл
                        </Button>
                        <label className={styles.field}>
                          <span>Всё равно выбрать файл здесь (может глючить)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              onPickImage(e.target.files?.[0] ?? null)
                            }
                          />
                        </label>
                      </>
                    ) : (
                      <>
                        <p className={styles.hint}>
                          Выбери JPG/WebP с телефона или ПК. Появится превью;
                          файл ещё скачается — его потом кладут в{' '}
                          <code>public/cards/</code> и деплоят, чтобы видели все
                          игроки.
                        </p>
                        <label className={styles.field}>
                          <span>Выбрать файл</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              onPickImage(e.target.files?.[0] ?? null)
                            }
                          />
                        </label>
                      </>
                    )}
                    {draft.cardImage.startsWith('data:') ? (
                      <p className={styles.note}>
                        Картинка в оверлее (превью только тут). Для телефона —
                        см. чеклист после сохранения.
                      </p>
                    ) : null}
                    {imageStatus ? (
                      <p
                        className={
                          imageStatus.kind === 'overlay'
                            ? styles.statusOverlay
                            : styles.statusPath
                        }
                      >
                        Статус: {imageStatus.text}
                      </p>
                    ) : null}
                  </div>

                  <label className={styles.field}>
                    <span>Или путь / URL (необязательно)</span>
                    <input
                      value={
                        draft.cardImage.startsWith('data:')
                          ? '(файл с устройства)'
                          : draft.cardImage
                      }
                      placeholder="/cards/name.webp"
                      disabled={draft.cardImage.startsWith('data:')}
                      onChange={(e) => {
                        setImgBroken(false);
                        setDraft((d) => ({
                          ...d,
                          cardImage: e.target.value,
                        }));
                      }}
                    />
                  </label>
                  {draft.cardImage.startsWith('data:') && lastImageFileName ? (
                    <Button
                      fullWidth
                      variant="ghost"
                      onClick={useCardsPath}
                    >
                      Поставить путь {suggestedCardsPath} для деплоя
                    </Button>
                  ) : null}
                  {draft.cardImage ? (
                    <Button
                      fullWidth
                      variant="ghost"
                      disabled={saveBusy}
                      onClick={() => void removeCardImage()}
                    >
                      {saveBusy ? 'Удаление…' : 'Удалить картинку'}
                    </Button>
                  ) : null}
                  <p className={styles.hint}>
                    Яндекс.Диск / Google Drive обычно не работают: там ссылка на
                    страницу, а нужна прямая картинка или файл в{' '}
                    <code>public/cards/</code>.
                  </p>
                  {draft.cardImage &&
                  !draft.cardImage.startsWith('data:') &&
                  !imgBroken ? (
                    <div className={styles.preview}>
                      <img
                        src={draft.cardImage}
                        alt="Превью"
                        onError={() => setImgBroken(true)}
                      />
                    </div>
                  ) : draft.cardImage.startsWith('data:') ? (
                    <div className={styles.preview}>
                      <img src={draft.cardImage} alt="Превью" />
                    </div>
                  ) : draft.cardImage && imgBroken ? (
                    <p className={styles.muted}>Превью не загрузилось</p>
                  ) : null}
                  <label className={styles.field}>
                    <span>Редкость</span>
                    <select
                      value={draft.cardRarity}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          cardRarity: e.target.value as Rarity,
                        }))
                      }
                    >
                      {RARITIES.map((r) => (
                        <option key={r} value={r}>
                          {RARITY_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button
                    fullWidth
                    disabled={saveBusy}
                    onClick={() => void saveCard()}
                  >
                    {saveBusy ? 'Сохранение…' : 'Сохранить карту'}
                  </Button>

                  {showDeployChecklist ? (
                    <div className={styles.checklist} role="status">
                      <p className={styles.checklistTitle}>
                        Запасной путь (если сервер недоступен)
                      </p>
                      <ol className={styles.checklistSteps}>
                        <li>
                          Положи файл в <code>public/cards/</code>
                          {lastImageFileName
                            ? ` (имя: ${lastImageFileName})`
                            : ''}
                        </li>
                        <li>
                          Путь <code>{suggestedCardsPath}</code>
                        </li>
                        <li>
                          «Скачать JSON» → <code>src/data/content.json</code> →
                          push
                        </li>
                      </ol>
                      <div className={styles.checklistActions}>
                        <Button
                          fullWidth
                          variant="secondary"
                          onClick={() => {
                            downloadContentJson(data);
                            setNote(
                              'content.json скачан — замени src/data/content.json и задеплой',
                            );
                          }}
                        >
                          Скачать JSON
                        </Button>
                        {draft.cardImage.startsWith('data:') ? (
                          <Button
                            fullWidth
                            variant="ghost"
                            onClick={redownloadImage}
                          >
                            Скачать файл картинки ещё раз
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
