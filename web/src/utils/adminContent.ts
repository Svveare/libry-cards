import type { Book, Card, ContentData, Page, Rarity, Shelf } from '../types';

const PAGE_RARITIES: Rarity[] = [
  'common',
  'rare',
  'epic',
  'legendary',
  'mythic',
];

function slugifyId(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\$/g, '')
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/[а-яё]/g, (c) => {
      const map: Record<string, string> = {
        а: 'a',
        б: 'b',
        в: 'v',
        г: 'g',
        д: 'd',
        е: 'e',
        ё: 'e',
        ж: 'zh',
        з: 'z',
        и: 'i',
        й: 'y',
        к: 'k',
        л: 'l',
        м: 'm',
        н: 'n',
        о: 'o',
        п: 'p',
        р: 'r',
        с: 's',
        т: 't',
        у: 'u',
        ф: 'f',
        х: 'h',
        ц: 'ts',
        ч: 'ch',
        ш: 'sh',
        щ: 'sch',
        ъ: '',
        ы: 'y',
        ь: '',
        э: 'e',
        ю: 'yu',
        я: 'ya',
      };
      return map[c] ?? c;
    });
}

function uniqueId(base: string, used: Set<string>): string {
  let id = base || `id-${Date.now()}`;
  if (!used.has(id)) {
    used.add(id);
    return id;
  }
  let n = 2;
  while (used.has(`${id}-${n}`)) n += 1;
  const next = `${id}-${n}`;
  used.add(next);
  return next;
}

function collectIds(data: ContentData): Set<string> {
  const used = new Set<string>();
  for (const stand of data.stands) {
    used.add(stand.id);
    for (const shelf of stand.shelves) {
      used.add(shelf.id);
      for (const book of shelf.books) {
        used.add(book.id);
        for (const page of book.pages) {
          used.add(page.id);
          for (const card of page.cards) used.add(card.id);
        }
      }
    }
  }
  return used;
}

function createEmptyPages(
  bookId: string,
  shelfId: string,
  standId: string,
  used: Set<string>,
): Page[] {
  return PAGE_RARITIES.map((rarity, idx) => {
    const pageNum = idx + 1;
    const pageId = uniqueId(`${bookId}-page-${pageNum}`, used);
    const cards: Card[] = [0, 1, 2, 3].map((slot) => ({
      id: uniqueId(`${bookId}-${rarity}-${slot}`, used),
      name: '—',
      description: '',
      rarity,
      slotIndex: slot,
      bookId,
      shelfId,
      standId,
    }));
    return { id: pageId, number: pageNum, rarity, cards };
  });
}

export function addShelf(
  data: ContentData,
  standId: string,
  name: string,
): ContentData {
  const next = structuredClone(data);
  const stand = next.stands.find((s) => s.id === standId);
  if (!stand) return data;
  const used = collectIds(next);
  const id = uniqueId(slugifyId(name) || 'shelf', used);
  const shelf: Shelf = {
    id,
    name: name.trim() || 'Новая полка',
    standId,
    order: stand.shelves.length + 1,
    enabled: true,
    books: [],
  };
  stand.shelves.push(shelf);
  return next;
}

export function updateShelf(
  data: ContentData,
  shelfId: string,
  patch: Partial<Pick<Shelf, 'name' | 'enabled' | 'order'>>,
): ContentData {
  const next = structuredClone(data);
  for (const stand of next.stands) {
    const shelf = stand.shelves.find((s) => s.id === shelfId);
    if (!shelf) continue;
    if (patch.name !== undefined) shelf.name = patch.name;
    if (patch.enabled !== undefined) shelf.enabled = patch.enabled;
    if (patch.order !== undefined) shelf.order = patch.order;
    return next;
  }
  return data;
}

export function deleteShelf(data: ContentData, shelfId: string): ContentData {
  const next = structuredClone(data);
  for (const stand of next.stands) {
    stand.shelves = stand.shelves.filter((s) => s.id !== shelfId);
  }
  return next;
}

export function addBook(
  data: ContentData,
  shelfId: string,
  name: string,
  rarity: Rarity = 'common',
): ContentData {
  const next = structuredClone(data);
  for (const stand of next.stands) {
    const shelf = stand.shelves.find((s) => s.id === shelfId);
    if (!shelf) continue;
    const used = collectIds(next);
    const id = uniqueId(slugifyId(name) || 'book', used);
    const book: Book = {
      id,
      name: name.trim() || 'Новая книга',
      rarity,
      shelfId,
      order: shelf.books.length + 1,
      enabled: true,
      pages: createEmptyPages(id, shelfId, stand.id, used),
    };
    shelf.books.push(book);
    return next;
  }
  return data;
}

export function updateBook(
  data: ContentData,
  bookId: string,
  patch: Partial<Pick<Book, 'name' | 'rarity' | 'enabled' | 'order'>>,
): ContentData {
  const next = structuredClone(data);
  for (const stand of next.stands) {
    for (const shelf of stand.shelves) {
      const book = shelf.books.find((b) => b.id === bookId);
      if (!book) continue;
      if (patch.name !== undefined) book.name = patch.name;
      if (patch.rarity !== undefined) book.rarity = patch.rarity;
      if (patch.enabled !== undefined) book.enabled = patch.enabled;
      if (patch.order !== undefined) book.order = patch.order;
      return next;
    }
  }
  return data;
}

export function deleteBook(data: ContentData, bookId: string): ContentData {
  const next = structuredClone(data);
  for (const stand of next.stands) {
    for (const shelf of stand.shelves) {
      shelf.books = shelf.books.filter((b) => b.id !== bookId);
    }
  }
  return next;
}

export function updateCard(
  data: ContentData,
  cardId: string,
  patch: Partial<Pick<Card, 'name' | 'description' | 'image' | 'rarity'>>,
): ContentData {
  const next = structuredClone(data);
  for (const stand of next.stands) {
    for (const shelf of stand.shelves) {
      for (const book of shelf.books) {
        for (const page of book.pages) {
          const card = page.cards.find((c) => c.id === cardId);
          if (!card) continue;
          if (patch.name !== undefined) card.name = patch.name;
          if (patch.description !== undefined) card.description = patch.description;
          if (patch.image !== undefined) {
            if (patch.image === '') delete card.image;
            else card.image = patch.image;
          }
          if (patch.rarity !== undefined) card.rarity = patch.rarity;
          return next;
        }
      }
    }
  }
  return data;
}

function findBook(
  data: ContentData,
  bookId: string,
): { standId: string; shelfId: string; book: Book } | null {
  for (const stand of data.stands) {
    for (const shelf of stand.shelves) {
      const book = shelf.books.find((b) => b.id === bookId);
      if (book) return { standId: stand.id, shelfId: shelf.id, book };
    }
  }
  return null;
}

export function bookHasSecretPageInData(
  data: ContentData,
  bookId: string,
): boolean {
  const found = findBook(data, bookId);
  return Boolean(found?.book.pages.some((p) => p.secret));
}

/** Append a secret page (page 6 or next free number) with 4 empty secret slots. */
export function addSecretPage(data: ContentData, bookId: string): ContentData {
  const next = structuredClone(data);
  const found = findBook(next, bookId);
  if (!found) return data;
  if (found.book.pages.some((p) => p.secret)) return data;

  const used = collectIds(next);
  const nextNumber =
    found.book.pages.reduce((max, p) => Math.max(max, p.number), 0) + 1 || 6;
  const pageId = uniqueId(`${bookId}-page-${nextNumber}`, used);
  const cards: Card[] = [0, 1, 2, 3].map((slot) => ({
    id: uniqueId(`${bookId}-secret-${slot + 1}`, used),
    name: '—',
    description: '',
    rarity: 'secret',
    slotIndex: slot,
    bookId,
    shelfId: found.shelfId,
    standId: found.standId,
  }));
  const page: Page = {
    id: pageId,
    number: nextNumber,
    rarity: 'secret',
    secret: true,
    cards,
  };
  found.book.pages.push(page);
  return next;
}

export function updatePage(
  data: ContentData,
  bookId: string,
  pageId: string,
  patch: Partial<Pick<Page, 'secret' | 'number' | 'rarity'>>,
): ContentData {
  const next = structuredClone(data);
  const found = findBook(next, bookId);
  if (!found) return data;
  const page = found.book.pages.find((p) => p.id === pageId);
  if (!page) return data;

  if (patch.number !== undefined) page.number = patch.number;
  if (patch.rarity !== undefined) page.rarity = patch.rarity;
  if (patch.secret !== undefined) {
    if (patch.secret) {
      page.secret = true;
      if (page.rarity !== 'secret') page.rarity = 'secret';
      for (const card of page.cards) {
        if (card.rarity !== 'secret') card.rarity = 'secret';
      }
    } else {
      delete page.secret;
    }
  }
  return next;
}

/** Add a secret page if the book does not already have one. */
export function ensureSecretPage(
  data: ContentData,
  bookId: string,
): ContentData {
  if (bookHasSecretPageInData(data, bookId)) return data;
  return addSecretPage(data, bookId);
}
