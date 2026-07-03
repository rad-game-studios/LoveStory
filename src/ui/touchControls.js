// On-screen touch controls for phones/tablets.
//
// A small "virtual input" object is written by the on-screen buttons and read by
// PlayerMain, OR'd together with the keyboard so both work. Held buttons set
// booleans; jump/shoot use one-shot edge flags that PlayerMain consumes+clears
// each frame (matching the keyboard's JustDown/JustUp behaviour).

export function isTouchDevice() {
  return (
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
    (typeof window !== 'undefined' && 'ontouchstart' in window)
  );
}

export function createVirtualInput() {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    jumpEdge: false, // set on jump press, cleared after PlayerMain reads it
    jumpReleasedEdge: false, // set on jump release
    shootEdge: false, // set on shoot press
    barkEdge: false // set on bark press (Zero only)
  };
}

// Build the on-screen pad for a gameplay scene. Buttons are pinned to the camera
// (scrollFactor 0) and sit above the HUD. Returns the virtual-input object.
export function setupTouchControls(scene) {
  const vinput = createVirtualInput();
  scene.virtualInput = vinput;

  if (!isTouchDevice()) {
    return vinput; // desktop: keyboard only, no on-screen pad
  }

  // Allow several simultaneous touches (e.g. hold ▶ while tapping JUMP).
  scene.input.addPointer(2);

  const DEPTH = 50;

  const makeButton = (x, y, r, glyph, onDown, onUp, style = {}) => {
    const color = style.color ?? 0xffffff;
    const idleAlpha = style.idleAlpha ?? 0.16;
    const pressAlpha = style.pressAlpha ?? 0.42;
    const circle = scene.add
      .circle(x, y, r, color, idleAlpha)
      .setStrokeStyle(3, color, 0.65)
      .setScrollFactor(0)
      .setDepth(DEPTH);
    const label = scene.add
      .text(x, y, glyph, { fontSize: `${Math.round(r * 0.95)}px`, color: style.textColor ?? '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setAlpha(0.92);
    // A generous rectangular hit zone (forgiving for fingers) drives the input.
    const zone = scene.add
      .zone(x, y, r * 2.3, r * 2.3)
      .setScrollFactor(0)
      .setDepth(DEPTH + 2)
      .setInteractive();
    const press = () => {
      circle.setFillStyle(color, pressAlpha);
      onDown();
    };
    const release = () => {
      circle.setFillStyle(color, idleAlpha);
      if (onUp) {
        onUp();
      }
    };
    zone.on('pointerdown', press);
    zone.on('pointerup', release);
    zone.on('pointerout', release);
    zone.on('pointerupoutside', release);
    return { circle, label, zone };
  };

  // Movement cluster (bottom-left) — raised so nothing clips off the bottom.
  makeButton(92, 420, 48, '◀', () => (vinput.left = true), () => (vinput.left = false));
  makeButton(208, 420, 48, '▶', () => (vinput.right = true), () => (vinput.right = false));

  // Action cluster (bottom-right).
  makeButton(
    868,
    415,
    56,
    '▲',
    () => {
      vinput.up = true;
      vinput.jumpEdge = true;
    },
    () => {
      vinput.up = false;
      vinput.jumpReleasedEdge = true;
    }
  );
  makeButton(752, 450, 40, '▼', () => (vinput.down = true), () => (vinput.down = false));
  // Shoot — red so it stands out from the white directional/jump buttons.
  const fire = makeButton(868, 308, 40, '✦', () => (vinput.shootEdge = true), null, {
    color: 0xef4444,
    idleAlpha: 0.34,
    pressAlpha: 0.62
  });

  // The fire button is only useful with a shooting power-up — show it only then.
  const fireObjs = [fire.circle, fire.label, fire.zone];
  fireObjs.forEach((o) => o.setVisible(false));
  scene.events.on('update', () => {
    const canShoot = Boolean(scene.playerMain && scene.playerMain.canShoot);
    fireObjs.forEach((o) => o.setVisible(canShoot));
  });

  // Bark button — only when playing as Zero.
  if (scene.mainCharacter === 'zero') {
    makeButton(752, 352, 40, '🔊', () => (vinput.barkEdge = true), null, {
      color: 0xfacc15,
      idleAlpha: 0.3,
      pressAlpha: 0.6
    });
  }

  return vinput;
}
