import type { UserProgress } from '../types';
import {
  bookHasSecretPage,
  getBookById,
  getShelfById,
  getStandById,
  getStands,
  isBookBaseComplete,
} from '../content/loader';

export interface SecretPageOffer {
  bookId: string;
  title: string;
  description: string;
  price: number;
}

/** Dynamic shop offers: unlock secret page for base-complete books. */
export function getSecretPageOffers(
  progress: Pick<UserProgress, 'collectedCardIds' | 'secretPageUnlockedBookIds'>,
): SecretPageOffer[] {
  const unlocked = new Set(progress.secretPageUnlockedBookIds);
  const collected = new Set(progress.collectedCardIds);
  const offers: SecretPageOffer[] = [];

  for (const stand of getStands()) {
    for (const shelf of stand.shelves) {
      for (const book of shelf.books) {
        if (!book.enabled || !bookHasSecretPage(book)) continue;
        if (unlocked.has(book.id)) continue;
        if (!isBookBaseComplete(book, collected)) continue;

        const shelfRef = getShelfById(book.shelfId) ?? shelf;
        const standRef = getStandById(shelfRef.standId) ?? stand;
        offers.push({
          bookId: book.id,
          title: `Секретная страница · ${book.name}`,
          description: `${standRef.name} · ${shelfRef.name}`,
          price: 1,
        });
      }
    }
  }

  return offers;
}

export function canBuySecretPage(
  bookId: string,
  progress: Pick<
    UserProgress,
    'pages' | 'collectedCardIds' | 'secretPageUnlockedBookIds'
  >,
): 'ok' | 'broke' | 'locked' | 'owned' | 'unknown' {
  const book = getBookById(bookId);
  if (!book?.enabled || !bookHasSecretPage(book)) return 'unknown';
  if (progress.secretPageUnlockedBookIds.includes(bookId)) return 'owned';
  if (!isBookBaseComplete(book, progress.collectedCardIds)) return 'locked';
  if (progress.pages < 1) return 'broke';
  return 'ok';
}
