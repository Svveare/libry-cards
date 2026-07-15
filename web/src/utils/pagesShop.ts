/** Helpers for pages-priced shop actions (catalog lives in config.shop). */

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
