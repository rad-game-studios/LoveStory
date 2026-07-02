# Project: "The Run" — Wedding Site Runner Game (Prototype Spec)

## 0. Context for the Agent

You are scaffolding a **basic, functional prototype** of a 2D side-scrolling runner game using **Phaser 4** (vanilla JS, no framework wrapper needed). This game will be embedded via `<iframe>` on a wedding website. The goal of this pass is **mechanical correctness with placeholder art** — colored rectangles and simple shapes stand in for sprites and backgrounds, which will be swapped in later from AI-generated assets. Do not spend effort on visual polish. Spend effort on clean, swappable architecture.

Build incrementally: get one screen fully playable and committed before moving to the next. Do not attempt all three levels in one pass — build Level 1, Screen 1 (Astoria Skate Park) end-to-end first, confirm it runs, then proceed.

---

## 1. Tech Stack

- **Engine:** Phaser 4 (latest stable, "Salusa" 4.1+), loaded via npm (`npm create @phaserjs/game@latest` vanilla JS template, or CDN if simpler to scaffold)
- **Language:** JavaScript (no TypeScript for this prototype — keep it simple)
- **Physics:** Arcade Physics (built into Phaser) — this is a runner, we don't need Matter.js
- **No build complexity:** Vite default template is fine. No backend, no database, no auth.
- **Target:** Single static deployable bundle (HTML + JS + assets folder) that can run in an `<iframe>`

---

## 2. Core Concept

A 2-player-character runner (only one human-controlled at a time per playthrough) that tells the story of our relationship across three real locations, each rendered as two connected "screens." The player picks **Ricky** or **Denise** at game start. The unpicked character runs alongside as a **mirrored companion** — copies all inputs (run, jump, duck) but is purely cosmetic: cannot collide with obstacles, cannot die, never blocks gameplay. Think Ice Climbers co-op partner, but AI-mirrored rather than player 2.

---

## 3. Game Structure

```
Title Screen (character select: Ricky / Denise)
  └─ Level 1: Astoria, NY
       Screen 1: Skate Park
       Screen 2: Bar
  └─ Level 2: Alaska
       Screen 1: Anchorage (Northern Lights)
       Screen 2: Homer Beach (engagement spot)
  └─ Level 3: Williamsburg, BK
       Screen 1: Church
       Screen 2: Party
  └─ End Screen
```

Each level = 2 screens. Each screen = one horizontally-scrolling playable space ending in a **trigger door/transition object** (not a hard cut) that plays a short transition animation into the next screen.

---

## 4. Character & Controls

### Selection
- Title screen: two character portraits (placeholder colored squares labeled "RICKY" / "DENISE"), click or press Enter to select.
- Selected character = `PlayerMain` (controlled)
- Unselected character = `PlayerMirror` (AI-controlled, mirrors `PlayerMain`'s input state every frame with a small fixed offset — e.g., positioned 40px behind and 20px above/below, like a trailing partner)

### Controls (PlayerMain only — PlayerMirror has no direct input)
- **Right Arrow / D** — run right (continuous movement while held; camera follows player)
- **Up Arrow / W / Spacebar** — jump
- **Down Arrow / S** — duck/slide (under obstacles)
- No left movement needed for this prototype (runner moves forward only)

### PlayerMirror behavior
- Reads `PlayerMain`'s current input state each frame (isRunning, isJumping, isDucking) and replays the same actions with the fixed positional offset.
- Has its own sprite/animation state but **no collision body** (or a collision body that is purely visual — never triggers obstacle-hit logic, never destroys/resets).
- If `PlayerMain` dies/resets, `PlayerMirror` resets position to match, no death animation needed for it.

---

## 5. Obstacles & Death/Reset

- Define a simple `Obstacle` class/sprite group per screen (placeholder: red rectangles of varying size).
- On collision between `PlayerMain` and an `Obstacle`: trigger a **screen reset** — `PlayerMain` and `PlayerMirror` return to the screen's start position, camera resets, obstacles reset to initial state. Keep this simple (no lives/health system for the prototype — just instant reset).
- No obstacle should be unavoidable without a jump or duck input (basic playability check).

---

## 6. Screen Transitions (Triggered Door/Cutscene)

- At the right edge of each screen, place a `TransitionTrigger` zone (placeholder: a colored rectangle labeled "DOOR").
- When `PlayerMain` overlaps this zone:
  1. Disable player input.
  2. Play a short placeholder "enter" animation — simplest implementation: both characters walk toward the trigger object and fade out over ~0.5–1s (use a Phaser tween, not real animation frames yet).
  3. Load the next screen's scene.
  4. Fade in, re-enable input, place both characters at the new screen's start position.
- This same trigger pattern is reused for level transitions (Screen 2 of a level → Screen 1 of the next level), just swap the target scene key.

---

## 7. Scene Architecture (Phaser Scene per Screen)

Use one Phaser Scene class per screen — this keeps the level/screen swap clean and matches how you'll swap in real backgrounds later.

```
TitleScene
AstoriaSkateParkScene
AstoriaBarScene
AlaskaAnchorageScene
AlaskaHomerBeachScene
WilliamsburgChurchScene
WilliamsburgPartyScene
EndScene
```

Each screen scene should:
- Accept the selected character (Ricky/Denise) via Phaser's scene data passing (`this.scene.start('SceneName', { mainCharacter: 'ricky' })`)
- Set up: ground/floor, background (placeholder solid color per screen, distinct per screen so they're visually distinguishable during testing), obstacles array, transition trigger zone at far right
- Re-instantiate `PlayerMain` and `PlayerMirror` with correct sprite tint/label based on `mainCharacter` data

---

## 8. Placeholder Asset Conventions

Since real art comes later, use these placeholder conventions so swapping is trivial:

- **Characters:** colored rectangles, 32x48px. Ricky = blue tint, Denise = pink tint. Label text above each ("RICKY"/"DENISE") for clarity during testing — remove once real sprites are in.
- **Backgrounds:** solid color fill per screen (e.g., Astoria Skate Park = grey, Bar = dark amber, Anchorage = deep navy, Homer Beach = light blue, Church = cream, Party = dark purple). This makes it visually obvious which screen you're on while testing.
- **Obstacles:** red rectangles, varying width/height.
- **Ground:** dark grey strip along the bottom of the screen.
- **Transition trigger:** bright green rectangle labeled "DOOR" or "NEXT" at the right edge.

All placeholder assets should be **simple Phaser Graphics objects or generated textures**, not image files — this avoids needing any actual asset files for this pass and keeps the prototype runnable with zero external dependencies.

---

## 9. File/Folder Structure

```
/src
  /scenes
    TitleScene.js
    AstoriaSkateParkScene.js
    AstoriaBarScene.js
    AlaskaAnchorageScene.js
    AlaskaHomerBeachScene.js
    WilliamsburgChurchScene.js
    WilliamsburgPartyScene.js
    EndScene.js
  /entities
    PlayerMain.js
    PlayerMirror.js
    Obstacle.js
    TransitionTrigger.js
  /config
    gameConfig.js       // Phaser game config (dimensions, physics, scene list)
    levelConfig.js       // per-screen layout data (obstacle positions, ground height, start position, transition target)
  main.js                 // entry point, builds Phaser.Game with gameConfig
index.html
```

**Important:** Put obstacle positions, screen dimensions, and transition targets into `levelConfig.js` as plain data objects (not hardcoded inside each scene). This is what makes it easy to later swap placeholder colors for real backgrounds and adjust obstacle placement to match real art without touching scene logic.

---

## 10. Build Order (do these in sequence, confirm each works before moving on)

1. Scaffold the Phaser project (vanilla JS template), confirm a blank canvas renders.
2. Build `PlayerMain` with run/jump/duck on a flat ground in a single test scene. Confirm controls feel right.
3. Add `PlayerMirror` mirroring logic. Confirm it trails and copies inputs but never collides.
4. Build `Obstacle` placeholder + collision detection + screen reset on hit.
5. Build `TransitionTrigger` + fade transition + scene swap, tested between two dummy scenes.
6. Build `TitleScene` with character select, wire selection into scene data passing.
7. Build out the real 7 scenes (Astoria x2, Alaska x2, Williamsburg x2, End) using `levelConfig.js` data, reusing all systems above.
8. Wire scenes together in correct order via transition triggers.
9. Confirm full playthrough: Title → all 6 screens → End screen.

---

## 11. Explicitly Out of Scope for This Pass

- Real sprites/backgrounds (placeholder only — architecture should make swapping trivial later)
- Sound/music
- Mobile touch controls
- Score/timer system
- Save state / progress persistence
- Multiple difficulty or speed-up sections
- Any animation beyond basic Phaser tweens for the transition fade

---

## 12. Definition of Done (Prototype)

- [ ] Game runs in browser via `npm run dev` with zero console errors
- [ ] Title screen allows character selection (Ricky or Denise)
- [ ] PlayerMain responds to run/jump/duck inputs
- [ ] PlayerMirror trails and mirrors inputs, never collides/dies
- [ ] Obstacles cause a clean screen reset on collision
- [ ] All 6 screens are reachable in sequence via transition triggers
- [ ] Each screen is visually distinguishable (placeholder colors) for testing
- [ ] Project structure matches Section 9 so asset-swapping later requires no logic changes — only swapping placeholder fills for image textures in `levelConfig.js` / scene preload methods