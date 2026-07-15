export const FPS = 30;
export const DURATION_FRAMES = 450; // 15s

/** Overlap next scene start back by this many frames for soft cuts. */
export const CUT_OVERLAP = 2;

/** v5 balanced timeline — soft exits + emotion layer. Absolute end markers. */
export const FRAME = {
  hookEnd: 36,
  worldEnd: 86,
  caseEnd: 134,
  chestEnd: 176,
  collectEnd: 218,
  dailyEnd: 258,
  secretEnd: 300,
  payoffEnd: 372,
  outroEnd: 450,
} as const;

export const colors = {
  oil: '#100c08',
  oilMid: '#2a2018',
  wood: '#4a301c',
  woodLite: '#6e4828',
  brass: '#e0b84a',
  gold: '#f0d078',
  parchment: '#fff4dc',
  ink: '#120c08',
  glow: 'rgba(240, 208, 120, 0.75)',
  haze: 'rgba(100, 65, 30, 0.22)',
  ivory: '#fffaf0',
  mythic: '#b088ff',
  rare: '#5ab0ff',
  epic: '#d86aff',
  legend: '#ffb428',
  flash: 'rgba(160, 110, 40, 0.85)',
  secret: '#c8d0dc',
};
