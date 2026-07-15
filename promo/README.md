# Libry Cards — 15s promo v5 (Remotion)

Рекламный ролик **15 с @ 30 fps**: balanced pacing, soft exits, emotion layer (bloom / dust / richer sparks), CTA Telegram.

| Composition | Размер | Выход |
|-------------|--------|--------|
| `LibryPromo916` | 1080×1920 | `out/libry-promo-9x16.mp4` |
| `LibryPromo169` | 1920×1080 | `out/libry-promo-16x9.mp4` (height-fit + oil bars) |

## Setup

```bash
cd promo
npm install
```

## Studio / Render

```bash
npm run studio
npm run render:916
npm run render:169
npm run render
```

## Timeline (v5)

Absolute end markers (`theme.ts` `FRAME`, `CUT_OVERLAP=2`, `DURATION_FRAMES=450`):

| t (с) | Frames | Beat |
|------:|-------:|------|
| 0.0–1.2 | 0–36 | Hook: карты fly-in + Libry (stamp early, bloom) |
| 1.2–2.87 | 36–86 | Shelf: dive → книжные flips (~8f + hold) + dust |
| 2.87–4.47 | 86–134 | Case: stop ~halfway → hero «Легенда!» + bloom |
| 4.47–5.87 | 134–176 | Chest+: pick → celebrate → dim losers |
| 5.87–7.27 | 176–218 | Collect: early land, 19→20/20 + sparks |
| 7.27–8.6 | 218–258 | Daily: strip + early «+1 кейс», hold «Ежедневно» |
| 8.6–10.0 | 258–300 | Secret: silver bloom + denser sparks |
| 10.0–12.4 | 300–372 | Payoff: dust · breathing glow · «Твоя библиотека» |
| 12.4–15 | 372–450 | CTA: Libry Cards / Telegram / @LibryCards |

Cuts overlap by 2 frames; mid-scene exits use `softExit` (4f, scale 1→0.97). Impact whip (4f) + flash between scenes.

## Audio

| File | Role | Volume |
|------|------|--------|
| `public/whoosh-bed.wav` | Bed whooshes | ~0.26 |
| `public/promo-bg.mp3` | Music bed | fade-in 8–10f → 0.28, soft fade on CTA |

### Music attribution

**«Shipping Lanes»** — Chad Crouch  
Source: [Free Music Archive](https://freemusicarchive.org/) (ccCommunity / Arps)  
License: Creative Commons Attribution (CC BY) — free with attribution  
Downloaded to `public/promo-bg.mp3` for local Remotion renders.
