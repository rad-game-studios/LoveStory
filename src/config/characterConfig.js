// Per-character art: sprite sheet + portrait + animation frame ranges.
//
// Sheets are spec'd as a single horizontal row of uniform cells, side profile
// facing RIGHT (the code flips to face left). Frame order:
//   0 idle · 1-4 run/walk cycle · 5 jump
// Swap the placeholder art for final art by overwriting these files (and, if the
// cell size or frame count changes, the `frameWidth/frameHeight`/ranges below).

import rickySheet from '../../art/sprites/ricky.png';
import deniseSheet from '../../art/sprites/denise.png';
import rickyPortrait from '../../art/sprites/ricky-portrait.png';
import denisePortrait from '../../art/sprites/denise-portrait.png';
import dogSheet from '../../art/sprites/dog.png';
import dogPortrait from '../../art/sprites/dog-portrait.png';
import dogActions from '../../art/sprites/dog-actions.png';

export const FRAME_WIDTH = 128;
export const FRAME_HEIGHT = 192;

// On-screen height of the character art (the arcade body stays 48px tall; the
// art is scaled to this and bottom-aligned so feet sit on the ground).
export const SPRITE_DISPLAY_HEIGHT = 72;

export const CHARACTERS = {
  ricky: {
    key: 'ricky',
    sheet: rickySheet,
    portrait: rickyPortrait,
    frameWidth: FRAME_WIDTH,
    frameHeight: FRAME_HEIGHT,
    anims: {
      idle: { frames: [0], frameRate: 1, repeat: -1 },
      run: { frames: [1, 2, 3, 4], frameRate: 10, repeat: -1 },
      jump: { frames: [5], frameRate: 1, repeat: -1 }
    }
  },
  denise: {
    key: 'denise',
    sheet: deniseSheet,
    portrait: denisePortrait,
    frameWidth: FRAME_WIDTH,
    frameHeight: FRAME_HEIGHT,
    anims: {
      idle: { frames: [0], frameRate: 1, repeat: -1 },
      run: { frames: [1, 2, 3, 4], frameRate: 10, repeat: -1 },
      jump: { frames: [5], frameRate: 1, repeat: -1 }
    }
  },
  // Zero the dog — an unlockable third playable character. Reuses the dog art
  // (which faces RIGHT, unlike the left-facing humans).
  zero: {
    key: 'zero',
    sheet: dogSheet,
    portrait: dogPortrait,
    frameWidth: FRAME_WIDTH,
    frameHeight: FRAME_HEIGHT,
    facesRight: true,
    anims: {
      idle: { frames: [0], frameRate: 1, repeat: -1 },
      run: { frames: [1, 2, 3, 4], frameRate: 10, repeat: -1 },
      jump: { frames: [5], frameRate: 1, repeat: -1 }
    }
  }
};

export const SHEET_KEY = (character) => `${character}-sheet`;
export const PORTRAIT_KEY = (character) => `${character}-portrait`;

// Zero the dog: a companion (not selectable). Same 6-frame 128x192 sheet layout
// as the characters, but the art faces RIGHT (characters face left).
export const DOG = {
  key: 'dog',
  sheet: dogSheet,
  portrait: dogPortrait,
  frameWidth: FRAME_WIDTH,
  frameHeight: FRAME_HEIGHT,
  facesRight: true,
  anims: {
    idle: { frames: [0], frameRate: 1, repeat: -1 },
    run: { frames: [1, 2, 3, 4], frameRate: 10, repeat: -1 },
    jump: { frames: [5], frameRate: 1, repeat: -1 }
  }
};

// Zero's extra action poses (dog-actions.png: lie / bark / downward-dog; the 4th
// frame is the existing jump pose, so it's unused). Same 128x192 frame size.
export const ZERO_ACTIONS_KEY = 'zero-actions';
const ZERO_ACTIONS = {
  sheet: dogActions,
  frameWidth: FRAME_WIDTH,
  frameHeight: FRAME_HEIGHT,
  anims: {
    lie: { frame: 0 },
    bark: { frame: 1 },
    downdog: { frame: 2 }
  }
};

export function preloadZeroActions(scene) {
  if (!scene.textures.exists(ZERO_ACTIONS_KEY)) {
    scene.load.spritesheet(ZERO_ACTIONS_KEY, ZERO_ACTIONS.sheet, {
      frameWidth: ZERO_ACTIONS.frameWidth,
      frameHeight: ZERO_ACTIONS.frameHeight
    });
  }
}

export function registerZeroActionAnims(scene) {
  Object.entries(ZERO_ACTIONS.anims).forEach(([name, def]) => {
    const key = `zero-${name}`;
    if (scene.anims.exists(key)) {
      return;
    }
    scene.anims.create({
      key,
      frames: [{ key: ZERO_ACTIONS_KEY, frame: def.frame }],
      frameRate: 1,
      repeat: -1
    });
  });
}

// Register a set of animations (idempotent — anims are global).
export function registerAnimsFor(scene, key, animsDef) {
  const sheetKey = SHEET_KEY(key);
  Object.entries(animsDef).forEach(([name, def]) => {
    const animKey = `${key}-${name}`;
    if (scene.anims.exists(animKey)) {
      return;
    }
    scene.anims.create({
      key: animKey,
      frames: def.frames.map((frame) => ({ key: sheetKey, frame })),
      frameRate: def.frameRate,
      repeat: def.repeat
    });
  });
}

export function registerCharacterAnims(scene, character) {
  registerAnimsFor(scene, character, CHARACTERS[character].anims);
}
