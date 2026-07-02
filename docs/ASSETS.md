# Assets — Sources, Licenses, Pipeline

Strategy is **hybrid** (see `/.claude/plans/` plan and `docs/NEXT-SESSION.md`):
- **Effects** → Phaser built-in particles (no art files). ✅ done
- **Obstacles & enemies** → curated **CC0** off-the-shelf packs (drop into `art/`, wire via an atlas).
- **Hero characters** (Ricky / Denise / Zero) → AI-generated, to match the bespoke backgrounds.

## In use now
| Asset | Source | License | Notes |
| --- | --- | --- | --- |
| Backgrounds `art/backgrounds/1..6` | AI-generated | n/a (ours) | Real, wired in `worldConfig.js` |
| Character sheets `art/sprites/*` | AI (stub placeholders) | n/a (ours) | Spec in `art/sprites/README.md` |
| Enemy: **Goose** `art/enemies/Goose/{Idle,Walk,Run,Flap}.png` | itch.io (off-the-shelf) | ⚠️ confirm pack license | 64×64 strips, transparent, facing right. Used for both enemy types: ground walker = Walk, flyer = Flap. Wired in `src/config/enemyConfig.js`. |
| Particle effects (dust, sparkle, snow, confetti) | generated at runtime | n/a | `src/effects/Effects.js` — no files |
| Coin (collectible) | generated at runtime | n/a | `src/entities/Coin.js` — no files |

## Recommended off-the-shelf sources (CC0 = free, no attribution required)
- **Kenney.nl** — Platformer packs + Particle Pack, CC0. Phaser loads these natively via `this.load.atlasXML(key, png, xml)`. https://kenney.nl/assets
- **itch.io (CC0 pixel art)** — better pixel-style match to our hi-fi backgrounds than Kenney's cleaner art. https://itch.io/game-assets/free/tag-cc0/tag-pixel-art
  - e.g. Anokolisa (sidescroller forest sprites + enemies), GandalfHardcore (32×32 overworld).
- **CraftPix freebies** — 2D side-scroller props, enemies, GUI. https://craftpix.net/freebies/
- **PixelLab** — AI animated sprite sheets (idle/run/jump) for heroes + **Zero**, to end one-off-mockup churn. https://www.pixellab.ai/

## How to add a pack (when ready)
1. Drop the pack's `spritesheet.png` (+ `.xml` if Kenney/Starling) into `art/` (e.g. `art/packs/<name>/`).
2. Load it in `RunScene.preload`: `this.load.atlasXML(key, png, xml)` (Starling) or `this.load.spritesheet(...)` (uniform grid).
3. Reference frames by name: `this.add.image(x, y, key, 'frameName')`, or build anims (mirror `registerCharacterAnims` in `characterConfig.js`).
4. For enemies, add a `type` → atlas mapping (`src/config/enemyConfig.js`, planned) and set `enemies: [{ x, type }]` in `worldConfig.js`.
5. **Restart the dev server + hard-reload** after adding files (Vite won't serve new assets to a stale session).

## License hygiene
CC0 requires no attribution, but credit sources in this file anyway. Avoid
non-commercial / attribution-required packs unless we track them here.
