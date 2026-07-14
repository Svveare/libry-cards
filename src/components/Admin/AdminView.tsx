import { useMemo, useState } from 'react';
import type { ContentData, Rarity } from '../../types';
import { RARITY_LABELS } from '../../types';
import {
  commitEditableContent,
  getEditableContent,
  resetContentToBase,
} from '../../content/loader';
import { downloadBinaryFile, downloadContentJson } from '../../content/overlay';
import {
  addBook,
  addShelf,
  deleteBook,
  deleteShelf,
  updateBook,
  updateCard,
  updateShelf,
} from '../../utils/adminContent';
import { adminGrant, hasBackend } from '../../api/backend';
import { Header } from '../ui/Header';
import { Button } from '../ui/Button';
import styles from './AdminView.module.css';

interface AdminViewProps {
  onBack: () => void;
  initData: string;
}

const RARITIES: Rarity[] = [
  'common',
  'rare',
  'epic',
  'legendary',
  'mythic',
  'secret',
];

const MAX_DATA_URL_BYTES = 180_000;

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

export function AdminView({ onBack, initData }: AdminViewProps) {
  const [tab, setTab] = useState<Tab>('content');
  const [data, setData] = useState<ContentData>(() => getEditableContent());
  const [standId, setStandId] = useState('permanent');
  const [shelfId, setShelfId] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [note, setNote] = useState<string | null>(null);
  const [imgBroken, setImgBroken] = useState(false);

  const [grantId, setGrantId] = useState('');
  const [grantCoins, setGrantCoins] = useState('25');
  const [grantCases, setGrantCases] = useState('0');
  const [grantBusy, setGrantBusy] = useState(false);

  const inTg = insideTelegramWebApp();

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

  const onPickImage = (file: File | null) => {
    if (!file || !cardId) return;
    const safe = file.name.replace(/[^\w.\-]+/g, '_');
    if (file.size > MAX_DATA_URL_BYTES) {
      downloadBinaryFile(file, safe);
      const path = `/cards/${safe}`;
      const next = updateCard(data, cardId, { image: path });
      persist(
        next,
        `Файл большой (${Math.round(file.size / 1024)} KB). Скачан — положи в public/cards/. В JSON: ${path}`,
      );
      setDraft((d) => ({ ...d, cardImage: path }));
      setImgBroken(false);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      setDraft((d) => ({ ...d, cardImage: dataUrl }));
      setImgBroken(false);
      downloadBinaryFile(file, safe);
      persist(
        updateCard(data, cardId, { image: dataUrl }),
        `Превью в оверлее + файл «${safe}» скачан для public/cards/`,
      );
    };
    reader.readAsDataURL(file);
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
                        Картинка уже в оверлее (превью для тебя). Для всех
                        игроков — положи скачанный файл в public/cards/ + JSON +
                        деплой.
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
                    onClick={() => {
                      persist(
                        updateCard(data, card.id, {
                          name: draft.cardName.trim() || '—',
                          description: draft.cardDesc,
                          image: draft.cardImage.trim(),
                          rarity: draft.cardRarity,
                        }),
                        'Карта сохранена',
                      );
                    }}
                  >
                    Сохранить карту
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
