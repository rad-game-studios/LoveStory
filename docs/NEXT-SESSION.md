# Love Story — Next Session Plan

_Planned: 2026-06-30 (for the next working session)_

Three goals, in suggested build order. Each lists the approach, the files it
touches, and **open decisions / assets needed** (flagged so we resolve them
fast at the start of the session). See `docs/STATUS.md` for current architecture.

---

## 1. Per-stage enemies
**Goal:** distinct enemies per location instead of one generic red patroller.

**Current:** `src/entities/Enemy.js` is a single type (red square, walks, stompable, lethal on side). `worldConfig.js` segments list `enemies: [{ x }]`.

**Approach:**
- Add an enemy "type" concept — likely a new `enemyConfig.js` (or per-type entries in `worldConfig`) mapping a type key → art (sprite sheet) + size + speed.
- Extend segment `enemies` entries to `{ x, type }`.
- `Enemy` constructor takes the type → loads/uses its sprite + tuning. Register enemy anims like characters (`registerCharacterAnims` pattern in `characterConfig.js`).
- `RunScene.buildGameplay` passes type through.

**Open decisions:**
- Enemy theme per location (e.g., skatepark → pigeon? bar → ? Alaska → ? church/party → ?). Pick a flavor per stage.
- Animated enemies or single-frame? (mirror the character sprite spec.)

**Assets needed:** enemy sprite sheets per type (placeholder stubs OK to start; final art later). Document a spec like `art/sprites/README.md`.

---

## 2. New "5.75 years of adventures" stage (between Bar and Alaska)
**Goal:** insert a new playable stage expressing _"5.75 years of adventures and fun later"_ before arriving in Alaska for the engagement.

**Placement:** new segment at **index 2**, between `Astoria · Sparrow Bar` (1) and `Alaska · Northern Lights` (now 3). Because segments are data-driven in `worldConfig.SEGMENTS`, inserting one shifts the rest automatically.

**Approach:**
- Add a `SEGMENTS` entry (key e.g. `adventures`, name + scenery + obstacles/enemies).
- Show the caption "5.75 years of adventures and fun later" — likely a larger **centered title card** that fades in/out at the start of the stage (distinct from the small persistent location label). Could reuse the crossfade timing.

**Open decisions:**
- One backdrop, or a **montage** of several images that crossfade *within* this single stage (a mini-sequence)?
- Caption style: big fading card vs. the existing top label.
- Is this stage normal-length or extra-long (montage feel)?

**Assets needed:** background art for the stage (single image, or a few for a montage).

---

## 3. Zero as a playable character (during the new stage)
**Goal:** play as **Zero** during the "5.75 years" stage.

**Open decision (resolve first):** _who/what is Zero?_ (assumed a pet/dog) — confirm so the sprite spec is right.

**Approach options (pick one):**
- **A — per-segment character swap in `RunScene` (recommended):** add an optional `playable` field on a segment (e.g. `playable: 'zero'`). When the player enters that segment, swap the controlled character's sprite/anims to Zero (and have Ricky+Denise tag along as companions); revert on exit. Keeps the single continuous world.
- **B — dedicated scene:** hand off from `RunScene` to a `ZeroScene` for this stage, then return. Cleaner isolation but breaks the one-world model and the seamless crossfade.

**Implementation notes (for option A):**
- Add `zero` to `characterConfig.js` (sheet + portrait + anims) so `registerCharacterAnims` and `SHEET_KEY` work uniformly.
- Today `RunScene` creates one `PlayerMain` (selected) + one `PlayerMirror` (partner) for the whole run. Supporting a per-stage playable swap means either re-skinning the existing `PlayerMain` for that stage or spawning/swapping entities at the boundary — decide the cleanest mechanism.

**Open decisions:**
- Does control **switch to Zero** (Ricky + Denise become companions), or is Zero **added as a third companion** while you still control your pick?
- Title screen: still pick Ricky/Denise; Zero only appears in this stage? (assumed yes.)

**Assets needed:** Zero sprite sheet + portrait (per `art/sprites/README.md` spec).

---

## Asset checklist for tomorrow
- [ ] Real Ricky & Denise sprite sheets (currently stubs)
- [ ] **Zero** sprite sheet + portrait
- [ ] Enemy sprite sheets per stage/type (or a theme list to stub from)
- [ ] Background(s) for the "5.75 years of adventures" stage

## Suggested order
1. **Per-stage enemies** — extends the existing system, no new scene.
2. **Insert the new stage** — segment + caption + background.
3. **Zero playable** — character config + per-segment playable swap.

> Reminder: after dropping in any new art, restart the dev server + hard-reload.
