# Character Sprite Art Spec

The game loads four files from this folder. The current `*.png` files are
**temporary placeholder stubs** (simple generated shapes) — overwrite them with
the real art using the **exact same filenames** and no code changes are needed.

| File | Purpose |
| --- | --- |
| `ricky.png` | Ricky sprite sheet |
| `denise.png` | Denise sprite sheet |
| `ricky-portrait.png` | Ricky headshot (title character-select) |
| `denise-portrait.png` | Denise headshot (title character-select) |

## Sprite sheets (`ricky.png`, `denise.png`)

- **Transparent PNG** (true alpha — no checkerboard, no headers/labels).
- **Side profile, facing RIGHT.** The game flips the sprite to face left; do not
  include a left-facing version.
- **Single horizontal row of 6 uniform cells, 128 × 192 px each** (sheet = 768 × 192).
- Character **bottom-aligned** (feet at the cell's bottom edge) and **horizontally
  centered** in each cell. The art is scaled down in-engine to ~72 px tall and
  anchored at the feet.
- **Frame order (left → right):**

  | Frame | Pose |
  | --- | --- |
  | 0 | idle / standing |
  | 1–4 | run / walk cycle |
  | 5 | jump (in-air) |

  Ducking reuses frame 0, squashed vertically — no dedicated crouch frame needed.

## Portraits (`ricky-portrait.png`, `denise-portrait.png`)

- ~512 × 512 px, transparent or solid background. Displayed at 200 × 200 on the
  title screen.

## If the format differs

Cell size or frame count can change — just update `frameWidth` / `frameHeight`
and the `anims` frame ranges in [`src/config/characterConfig.js`](../../src/config/characterConfig.js).

## After replacing files

Restart the dev server (`npm run dev`) and hard-reload the browser
(Cmd+Shift+R) — Vite won't serve newly-swapped assets to a stale session.
