# Love Story — Project Status

_Last updated: 2026-07-01_

> **Latest session changes + gotchas:** see `docs/SESSION-2026-07-01.md` (per-stage
> content, reworked power-ups, per-segment length, chevron indicator, scorecard,
> How-to-Play screen).

A 2D side-scrolling runner for the wedding website (embedded via `<iframe>`).
The player picks **Ricky** or **Denise**; the unpicked partner runs alongside as
a cosmetic "mirror." The playthrough tells the relationship story across a series of
real locations, ending on an End screen.

## Stack & how to run
- **Phaser 4** (loaded via npm; exposed as global `window.Phaser` in `main.js`), **Vite**, vanilla JS. Arcade physics.
- `npm install` → `npm run dev` (http://localhost:5173) → `npm run build` (outputs `dist/`).
- **Gotcha:** after adding/replacing asset files, **restart the dev server and hard-reload** (Cmd+Shift+R). Vite won't serve newly-added assets to a long-running session (this caused a "backgrounds not showing" bug earlier).

## Key files
- `src/main.js` — boots Phaser, sets `window.Phaser` + `window.game`, scene list `[SplashScene, DifficultyScene, TitleScene, HowToScene, StageSelectScene, RunScene, EndScene]`.
- `src/scenes/DifficultyScene.js` — difficulty picker shown after the splash every fresh start. Writes `difficulty` (`'normal'` | `'veryEasy'`) to the **game registry** (`this.registry`), which persists across all later scene hops. **Very Easy** = unlimited health (`PlayerMain.hurt()` never returns `'reset'`, HUD shows `❤ ∞`) + gentle pit recovery (`RunScene.pitRecoverX()` pops the player back onto the ground piece just left of the pit instead of a checkpoint/reset).
- `src/config/gameConfig.js` — 960×540, gravity 1200, `pixelArt: true`, `loader.crossOrigin: 'anonymous'` (for iframe/cross-origin assets).
- `src/config/worldConfig.js` — the world definition: ordered `SEGMENTS` (each a location backdrop + relative `obstacles`/`enemies`), plus `SEGMENT_LENGTH` (3600px ≈ 15s), `CROSSFADE_BAND` (700), `BACKDROP_ZOOM`.
- `src/config/characterConfig.js` — Ricky/Denise sprite sheets, portraits, animation frame ranges; `registerCharacterAnims`, `SHEET_KEY`, `PORTRAIT_KEY`.
- `src/scenes/TitleScene.js` — character select (portraits + highlight).
- `src/scenes/RunScene.js` — the whole game world: static pinned zoomed backdrops with crossfade stitching, ground, players, gameplay placement, checkpoints, end trigger. Story **cutscenes** (`playImageCutscene()` shared helper, 3s auto-dismiss): the "how they met" scene on arriving at the Sparrow Bar (`art/cutscenes/ricky-and-denise-meet-at-sparrow.jpeg`) and the engagement scene at Homer Beach.
- `src/scenes/EndScene.js` — end + restart.
- `src/entities/` — `PlayerMain` (controlled; arcade body; run/jump/duck/bounce), `PlayerMirror` (cosmetic partner = the *other* character), `Obstacle` (solid, non-lethal block), `Enemy` (patrols, stompable, lethal on side contact), `TransitionTrigger`.

## Feature state (working)
- **Movement:** run left/right, variable-height jump, duck (squash). Mario-style rules: blocks are solid & non-lethal; enemies are lethal but stompable (stomp → squash + bounce).
- **World:** 6 locations rendered as **static, zoomed, full-screen backdrops** that **crossfade** ("stitch") into each other; **~15s minimum per location**. No parallax (removed by request — backdrops are pinned to the camera).
- **Sprites:** animated idle/run/jump for both characters, flip by facing direction, duck squash. The selected character is controlled; the partner runs alongside (the couple runs together). _Art is currently placeholder stubs._
- **Title:** portrait-based character select.

## Locations (current order)
0. Astoria · Skate Park
1. Astoria · Sparrow Bar
2. Time Jump · Meet Zero (bone collectables)
3. Alaska · Northern Lights (aliens + moose)
4. Alaska · Homer Beach (the engagement; diamonds)
5. Williamsburg · Church (crosses)
6. Williamsburg · Party (dancers + disco balls; extra-long)

## Assets
- **Backgrounds** (`art/backgrounds/1..6`) — real pixel art, wired in `worldConfig.js`. ✅
- **Character sprites** (`art/sprites/ricky.png`, `denise.png` + `*-portrait.png`) — **PLACEHOLDER stubs** generated programmatically. Replace with real art using the same filenames; spec in `art/sprites/README.md`.

## Verification habit
Changes are validated by driving headless Chrome via `puppeteer-core` (installed in the session scratchpad) — screenshot states + assert no `pageerror`. The game runs with **zero console errors**.

## Known follow-ups
- Real character sprite sheets (stubs in place now).
- Batch of changes since commit `1bb3886` is **uncommitted** — commit before major new work.
- **FIXED: StageSelectScene frozen after first full run.** Root cause was the EndScene leaderboard **name entry using a Phaser DOM `<input>`** (the only DOM element in the game, and the sole reason `dom: { createContainer: true }` was enabled). Its DOM container overlaid the canvas / held focus and left later scenes (Stage Select) unable to receive keyboard *or* pointer input; only a browser refresh (which tears down the DOM container) recovered it. Fix: replaced the DOM input with **canvas-native name entry** (Phaser text + `keydown` capture, blinking cursor) and **removed `dom: { createContainer: true }`** from `gameConfig.js`. Enter-to-submit is armed ~200ms after the screen appears so the scorecard→results Enter can't self-submit an empty name. Verified end-to-end via the puppeteer harness: full first-play flow lands on TitleScene (character select not skipped), and Stage Select accepts both click and keyboard with zero console errors.
- See `docs/SESSION-2026-07-01.md` for this session's changes/gotchas and `docs/NEXT-SESSION.md` for older planned features.
