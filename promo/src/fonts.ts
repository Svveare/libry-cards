import { loadFont as loadFraunces } from '@remotion/google-fonts/Fraunces';
import { loadFont as loadNunito } from '@remotion/google-fonts/Nunito';

// Fraunces has no Cyrillic — pair with Nunito for RU titles
const fraunces = loadFraunces('normal', {
  weights: ['600', '700'],
  subsets: ['latin'],
});

const nunito = loadNunito('normal', {
  weights: ['600', '700', '800'],
  subsets: ['latin', 'cyrillic'],
});

export const fontDisplay = `${fraunces.fontFamily}, ${nunito.fontFamily}`;
export const fontBody = nunito.fontFamily;
