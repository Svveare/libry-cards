import configData from '../data/config.json';
import type {
  AppConfig,
  Book,
  Card,
  CardOverride,
  ContentData,
  Rarity,
  Shelf,
  Stand,
} from '../types';
import { clearContentOverlay, loadContentOverlay, saveContentOverlay } from './overlay';

export const config = configData as AppConfig;

function isEnabled(item: { enabled?: boolean }): boolean {
  return item.enabled !== false;
}

let baseContent: ContentData | null = null;
let content: ContentData | null = null;
let loadPromise: Promise<void> | null = null;
let standsCache: Stand[] | null = null;
let allCardsCache: Card[] | null = null;
let cardsByIdCache: Map<string, Card> | null = null;
let permanentCardsCache: Card[] | null = null;
/** Server overrides survive local overlay resets / reloads until next apply. */
let serverOverrides: Record<string, CardOverride> = {};

function clearCaches(): void {
  standsCache = null;
  allCardsCache = null;
  cardsByIdCache = null;
  permanentCardsCache = null;
}

function patchContentWithOverrides(
  data: ContentData,
  overrides: Record<string, CardOverride>,
): ContentData {
  if (!overrides || Object.keys(overrides).length === 0) return data;
  const next = structuredClone(data);
  for (const stand of next.stands) {
    for (const shelf of stand.shelves) {
      for (const book of shelf.books) {
        for (const page of book.pages) {
          for (const card of page.cards) {
            const o = overrides[card.id];
            if (!o) continue;
            if (o.name !== undefined) card.name = o.name;
            if (o.description !== undefined) card.description = o.description;
            if (o.image !== undefined) {
              if (o.image === '') delete card.image;
              else card.image = o.image;
            }
            if (o.rarity !== undefined) card.rarity = o.rarity as Rarity;
          }
        }
      }
    }
  }
  return next;
}

function applyOverlay(base: ContentData): ContentData {
  const overlay = loadContentOverlay();
  const withLocal = overlay ?? base;
  return patchContentWithOverrides(withLocal, serverOverrides);
}

export function isContentReady(): boolean {
  return content !== null;
}

export function isAdminUser(userId: string): boolean {
  return (config.adminUserIds ?? []).includes(userId);
}

/** Lazy-load content.json once (separate chunk), then apply overlay. */
export function preloadContent(): Promise<void> {
  if (content) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = import('../data/content.json').then((mod) => {
      baseContent = mod.default as ContentData;
      content = applyOverlay(baseContent);
      clearCaches();
    });
  }
  return loadPromise;
}

function requireContent(): ContentData {
  if (!content) {
    throw new Error('Content not ready — call preloadContent() first');
  }
  return content;
}

/** Apply Bothost card overrides (server wins over local overlay fields). */
export function applyCardOverrides(overrides: Record<string, CardOverride>): void {
  serverOverrides = { ...overrides };
  if (!baseContent) return;
  const overlay = loadContentOverlay();
  const withLocal = overlay ? structuredClone(overlay) : structuredClone(baseContent);
  content = patchContentWithOverrides(withLocal, serverOverrides);
  clearCaches();
}

/** Deep clone of current effective content (overlay or base). */
export function getEditableContent(): ContentData {
  return structuredClone(requireContent());
}

/** Persist overlay and refresh in-memory catalog (re-applies server overrides). */
export function commitEditableContent(data: ContentData): void {
  saveContentOverlay(data);
  content = patchContentWithOverrides(structuredClone(data), serverOverrides);
  clearCaches();
}

/** Drop overlay and restore bundled content.json (+ server overrides). */
export function resetContentToBase(): void {
  clearContentOverlay();
  if (baseContent) {
    content = patchContentWithOverrides(
      structuredClone(baseContent),
      serverOverrides,
    );
    clearCaches();
  }
}

export function getStands(): Stand[] {
  if (standsCache) return standsCache;

  standsCache = requireContent()
    .stands.filter(isEnabled)
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((stand) => ({
      ...stand,
      shelves: stand.shelves
        .filter(isEnabled)
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((shelf) => ({
          ...shelf,
          books: shelf.books
            .filter(isEnabled)
            .slice()
            .sort((a, b) => a.order - b.order),
        })),
    }));

  return standsCache;
}

export function getStandById(standId: string): Stand | undefined {
  return getStands().find((s) => s.id === standId);
}

export function getShelfById(shelfId: string): Shelf | undefined {
  for (const stand of getStands()) {
    const shelf = stand.shelves.find((s) => s.id === shelfId);
    if (shelf) return shelf;
  }
  return undefined;
}

export function getBookById(bookId: string): Book | undefined {
  for (const stand of getStands()) {
    for (const shelf of stand.shelves) {
      const book = shelf.books.find((b) => b.id === bookId);
      if (book) return book;
    }
  }
  return undefined;
}

export function getCardById(cardId: string): Card | undefined {
  return getCardsById().get(cardId);
}

export function getAllCards(): Card[] {
  if (allCardsCache) return allCardsCache;
  allCardsCache = getStands().flatMap((stand) =>
    stand.shelves.flatMap((shelf) =>
      shelf.books.flatMap((book) => book.pages.flatMap((page) => page.cards)),
    ),
  );
  cardsByIdCache = null;
  return allCardsCache;
}

function getCardsById(): Map<string, Card> {
  if (cardsByIdCache) return cardsByIdCache;
  const map = new Map<string, Card>();
  for (const card of getAllCards()) {
    map.set(card.id, card);
  }
  cardsByIdCache = map;
  return map;
}

/** Cards from permanent stands only — daily / chest / shop packs. */
export function getPermanentCards(): Card[] {
  if (permanentCardsCache) return permanentCardsCache;
  permanentCardsCache = getStands()
    .filter((stand) => stand.type === 'permanent')
    .flatMap((stand) =>
      stand.shelves.flatMap((shelf) =>
        shelf.books.flatMap((book) => book.pages.flatMap((page) => page.cards)),
      ),
    );
  return permanentCardsCache;
}

export function getBookProgress(
  book: Book,
  collected: Set<string> | string[],
): { collected: number; total: number } {
  const set = collected instanceof Set ? collected : new Set(collected);
  const cardIds = book.pages.flatMap((p) => p.cards.map((c) => c.id));
  let count = 0;
  for (const id of cardIds) {
    if (set.has(id)) count += 1;
  }
  return { collected: count, total: cardIds.length };
}

export function getShelfProgress(
  shelf: Shelf,
  collected: Set<string> | string[],
): { collected: number; total: number } {
  const set = collected instanceof Set ? collected : new Set(collected);
  return shelf.books.reduce(
    (acc, book) => {
      const p = getBookProgress(book, set);
      return {
        collected: acc.collected + p.collected,
        total: acc.total + p.total,
      };
    },
    { collected: 0, total: 0 },
  );
}

/**
 * Channel gate for daily/chest. Real check via /api/check-subscription (getChatMember).
 */
export function canAccessChannelFeature(
  channelConfirmed: boolean,
  feature: 'daily' | 'chest' = 'daily',
): boolean {
  const channel = config.telegramChannel;
  if (!channel.enabled) return true;
  const required =
    feature === 'chest'
      ? Boolean(channel.requiredForChest)
      : channel.requiredForDaily;
  if (!required) return true;
  return channelConfirmed;
}

export function getChannelUrl(): string {
  const raw = config.telegramChannel.username.replace(/^@/, '');
  return `https://t.me/${raw}`;
}

export function getDailyCooldownMs(): number {
  if (config.daily.unlimitedOpens) return 0;
  return config.daily.cooldownHours * 60 * 60 * 1000;
}

export function getChestCooldownMs(): number {
  if (config.chest.unlimitedOpens) return 0;
  return config.chest.cooldownHours * 60 * 60 * 1000;
}
