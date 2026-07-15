import type { CaseTier } from '../types';

export type PagesCatalogItemId =
  | 'pages_ink'
  | 'pages_coins'
  | 'pages_soft'
  | 'pages_mid';

export type PagesCatalogKind = 'ink' | 'coins' | 'case';

export interface PagesCatalogItem {
  id: PagesCatalogItemId;
  price: number;
  label: string;
  kind: PagesCatalogKind;
  amount?: number;
  tier?: CaseTier;
}

/** Page spends — price is in pages, not coins. */
export const PAGES_CATALOG: PagesCatalogItem[] = [
  {
    id: 'pages_ink',
    price: 1,
    label: '+40 чернил',
    kind: 'ink',
    amount: 40,
  },
  {
    id: 'pages_coins',
    price: 1,
    label: '+80 монет',
    kind: 'coins',
    amount: 80,
  },
  {
    id: 'pages_soft',
    price: 1,
    label: 'Кейс Soft',
    kind: 'case',
    tier: 'soft',
  },
  {
    id: 'pages_mid',
    price: 2,
    label: 'Кейс Mid',
    kind: 'case',
    tier: 'mid',
  },
];

export function isPagesShopAction(action: string): boolean {
  return (
    action === 'pages_ink' ||
    action === 'pages_coins' ||
    action === 'pages_soft' ||
    action === 'pages_mid'
  );
}

export function pagesPriceLabel(price: number): string {
  if (price === 1) return '1 страница';
  if (price >= 2 && price <= 4) return `${price} страницы`;
  return `${price} страниц`;
}
