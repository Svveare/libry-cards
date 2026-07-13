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
import { Header } from '../ui/Header';
import { Button } from '../ui/Button';
import styles from './AdminView.module.css';

interface AdminViewProps {
  onBack: () => void;
}

const RARITIES: Rarity[] = [
  'common',
  'rare',
  'epic',
  'legendary',
  'mythic',
  'secret',
];

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

export function AdminView({ onBack }: AdminViewProps) {
  const [data, setData] = useState<ContentData>(() => getEditableContent());
  const [standId, setStandId] = useState('permanent');
  const [shelfId, setShelfId] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [note, setNote] = useState<string | null>(null);

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

  const onPickImage = async (file: File | null) => {
    if (!file || !cardId) return;
    const safe = file.name.replace(/[^\w.\-]+/g, '_');
    const path = `/cards/${safe}`;
    downloadBinaryFile(file, safe);
    const next = updateCard(data, cardId, { image: path });
    persist(next, `Файл «${safe}» скачан — положи в public/cards/. В JSON: ${path}`);
    setDraft((d) => ({ ...d, cardImage: path }));
  };

  return (
    <section className={`viewEnter ${styles.root}`}>
      <Header title="Админка" subtitle="Контент · оверлей" onBack={onBack} />

      <div className={styles.toolbar}>
        <Button
          variant="secondary"
          onClick={() => {
            downloadContentJson(data);
            setNote('content.json скачан — замени src/data/content.json в репо');
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
          Сбросить оверлей
        </Button>
      </div>
      {note ? <p className={styles.note}>{note}</p> : null}
      <p className={styles.hint}>
        Картинки: 900×1200 (3:4), WebP/JPG. Путь вида /cards/name.webp → файл в
        public/cards/
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

      <div className={styles.cols}>
        <div className={styles.col}>
          <h3 className={styles.colTitle}>Полки</h3>
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
              <input
                value={draft.shelfName}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, shelfName: e.target.value }))
                }
              />
              <Button
                fullWidth
                variant="secondary"
                onClick={() => {
                  persist(
                    updateShelf(data, shelf.id, { name: draft.shelfName.trim() }),
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
                Удалить полку
              </Button>
            </div>
          ) : null}
        </div>

        <div className={styles.col}>
          <h3 className={styles.colTitle}>Книги</h3>
          <ul className={styles.list}>
            {(shelf?.books ?? []).map((b) => (
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
          {shelf ? (
            <>
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
                    persist(next, 'Книга добавлена (5 страниц × 4 слота)');
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
                  <input
                    value={draft.bookName}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, bookName: e.target.value }))
                    }
                  />
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
                    Удалить книгу
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className={styles.muted}>Выбери полку</p>
          )}
        </div>

        <div className={styles.col}>
          <h3 className={styles.colTitle}>Карты</h3>
          {book ? (
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
          ) : (
            <p className={styles.muted}>Выбери книгу</p>
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
              <label className={styles.field}>
                <span>Картинка (URL / путь)</span>
                <input
                  value={draft.cardImage}
                  placeholder="/cards/name.webp"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, cardImage: e.target.value }))
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Файл → скачать в public/cards</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
                />
              </label>
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
    </section>
  );
}
