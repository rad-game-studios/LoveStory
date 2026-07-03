// Enemy definitions. The goose ships as 64x64 animation strips (transparent,
// facing right). Other enemy types use emoji placeholders (rendered to a
// texture at runtime) until real sprite sheets are supplied.

import gooseIdle from '../../art/enemies/Goose/Idle.png';
import gooseWalk from '../../art/enemies/Goose/Walk.png';
import gooseFlap from '../../art/enemies/Goose/Flap.png';
import beerImg from '../../art/enemies/Beer/beer.png';
import alienImg from '../../art/enemies/Alien/alien.png';
import mooseImg from '../../art/enemies/moose/moose.png';
import pigeonImg from '../../art/enemies/pigeon/pigeon.png';

export const ENEMY_FRAME = 64;

const GOOSE_SHEETS = {
  'goose-idle': { url: gooseIdle, frameRate: 3 },
  'goose-walk': { url: gooseWalk, frameRate: 10 },
  'goose-flap': { url: gooseFlap, frameRate: 12 }
};

// Non-goose sprite sheets (each with its own frame size). Beer is a 4-frame
// strip of 96x128 angry-mug frames. Alien is a 5x6 grid of 140x110 frames
// (flying saucer facing right); we loop the top row for a cruising animation.
const SHEETS = {
  'beer-anim': { url: beerImg, frameWidth: 96, frameHeight: 128, frameRate: 6 },
  'alien-fly': { url: alienImg, frameWidth: 140, frameHeight: 110, frameRate: 8, frames: [0, 1, 2, 3] }
};

// Moose: a single 6x3 grid sheet (200x170 frames, facing left) holding three
// cycles — idle (row 0), walk (row 1), and a head-down charge/gallop (row 2).
// One texture, several animations, so it's handled separately from SHEETS.
const MOOSE_TEXTURE = 'moose-sheet';
const MOOSE_SHEET = { url: mooseImg, frameWidth: 200, frameHeight: 170 };
const MOOSE_ANIMS = {
  'moose-idle': { frames: [0, 1, 2, 3], frameRate: 4 },
  'moose-walk': { frames: [6, 7, 8, 9, 10, 11], frameRate: 10 },
  'moose-charge': { frames: [12, 13, 14, 15], frameRate: 14 }
};

// Pigeon: a 4x4 grid sheet (168x176 frames, facing left) — idle (row 0), walk
// (row 1), fly (row 2, wings out). Used by both the ground and swooping variants.
const PIGEON_TEXTURE = 'pigeon-sheet';
const PIGEON_SHEET = { url: pigeonImg, frameWidth: 168, frameHeight: 176 };
const PIGEON_ANIMS = {
  'pigeon-idle': { frames: [0, 1, 2, 3], frameRate: 4 },
  'pigeon-walk': { frames: [4, 5, 6, 7], frameRate: 9 },
  'pigeon-fly': { frames: [8, 9, 10, 11], frameRate: 12 }
};

// Hitbox inset within the 64x64 goose frame (transparent padding).
export const GOOSE_BOX = { w: 38, h: 38, ox: 13, oy: 18 };

// Enemy type registry. `motion` selects the movement behaviour in Enemy.js.
//   art 'goose' -> goose animation; art 'sheet' -> a SHEETS spritesheet scaled
//   to `size` px tall; art 'emoji' -> emoji placeholder rendered at `size` px.
//   `elevation` = spawn height above ground (flyers).
export const ENEMY_TYPES = {
  walker: { art: 'goose', anim: 'goose-walk', motion: 'walk', box: GOOSE_BOX },
  flyer: { art: 'goose', anim: 'goose-flap', motion: 'fly', box: GOOSE_BOX, elevation: 130 },
  beer: { art: 'sheet', anim: 'beer-anim', size: 64, motion: 'patrolPause' },
  // Alien: sky enemy in a flying saucer that sweeps a V/zig-zag path. Worth 3x
  // the standard enemy points (trickier to reach and fires laser pulses).
  alien: { art: 'sheet', anim: 'alien-fly', size: 180, motion: 'vfly', elevation: 210, points: 150, box: { w: 96, h: 76, ox: 22, oy: 18 } },
  // Moose: big land animal that plods along the ground, then charges the player
  // at double speed when they get close (Northern Lights). Right-facing sheet.
  moose: {
    art: 'sheet',
    texture: MOOSE_TEXTURE,
    anim: 'moose-walk',
    anims: { walk: 'moose-walk', charge: 'moose-charge', idle: 'moose-idle' },
    size: 140,
    motion: 'charge',
    box: { w: 138, h: 108, ox: 34, oy: 50 }
  },
  // Pigeon (Skate Park). Two variants share one sheet: a grounded one that walks
  // back and forth, hops, and breaks into a run; and a swooping one that starts
  // airborne and dive-bombs the player. Right-facing sheet.
  pigeon: {
    art: 'sheet',
    texture: PIGEON_TEXTURE,
    anim: 'pigeon-walk',
    anims: { idle: 'pigeon-idle', walk: 'pigeon-walk', fly: 'pigeon-fly' },
    size: 68,
    motion: 'pwalk',
    box: { w: 88, h: 92, ox: 42, oy: 58 }
  },
  pigeonFly: {
    art: 'sheet',
    texture: PIGEON_TEXTURE,
    anim: 'pigeon-fly',
    anims: { idle: 'pigeon-idle', walk: 'pigeon-walk', fly: 'pigeon-fly' },
    size: 68,
    motion: 'pswoop',
    elevation: 165,
    box: { w: 96, h: 72, ox: 38, oy: 62 }
  },
  // Party dancers: ground placeholders (swap for sprite sheets later).
  danceGuy: { art: 'emoji', emoji: '🕺', size: 78, motion: 'dance', box: { w: 40, h: 58, ox: 19, oy: 12 } },
  danceGirl: { art: 'emoji', emoji: '💃', size: 78, motion: 'dance', box: { w: 40, h: 58, ox: 19, oy: 12 } }
};

export const EMOJI_ENEMY_KEY = (type) => `enemy-${type}`;

export function preloadEnemies(scene) {
  Object.entries(GOOSE_SHEETS).forEach(([key, sheet]) => {
    if (!scene.textures.exists(key)) {
      scene.load.spritesheet(key, sheet.url, { frameWidth: ENEMY_FRAME, frameHeight: ENEMY_FRAME });
    }
  });
  Object.entries(SHEETS).forEach(([key, sheet]) => {
    if (!scene.textures.exists(key)) {
      scene.load.spritesheet(key, sheet.url, { frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight });
    }
  });
  if (!scene.textures.exists(MOOSE_TEXTURE)) {
    scene.load.spritesheet(MOOSE_TEXTURE, MOOSE_SHEET.url, {
      frameWidth: MOOSE_SHEET.frameWidth,
      frameHeight: MOOSE_SHEET.frameHeight
    });
  }
  if (!scene.textures.exists(PIGEON_TEXTURE)) {
    scene.load.spritesheet(PIGEON_TEXTURE, PIGEON_SHEET.url, {
      frameWidth: PIGEON_SHEET.frameWidth,
      frameHeight: PIGEON_SHEET.frameHeight
    });
  }
}

// Register goose animations + generate emoji-placeholder textures (idempotent).
export function registerEnemyAnims(scene) {
  Object.entries(GOOSE_SHEETS).forEach(([key, sheet]) => {
    if (scene.anims.exists(key)) {
      return;
    }
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(key, {}),
      frameRate: sheet.frameRate,
      repeat: -1
    });
  });

  Object.entries(SHEETS).forEach(([key, sheet]) => {
    if (scene.anims.exists(key)) {
      return;
    }
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(key, sheet.frames ? { frames: sheet.frames } : {}),
      frameRate: sheet.frameRate,
      repeat: -1
    });
  });

  Object.entries(MOOSE_ANIMS).forEach(([key, a]) => {
    if (scene.anims.exists(key)) {
      return;
    }
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(MOOSE_TEXTURE, { frames: a.frames }),
      frameRate: a.frameRate,
      repeat: -1
    });
  });

  Object.entries(PIGEON_ANIMS).forEach(([key, a]) => {
    if (scene.anims.exists(key)) {
      return;
    }
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(PIGEON_TEXTURE, { frames: a.frames }),
      frameRate: a.frameRate,
      repeat: -1
    });
  });

  Object.entries(ENEMY_TYPES).forEach(([type, cfg]) => {
    if (cfg.art === 'emoji') {
      ensureEmojiTexture(scene, EMOJI_ENEMY_KEY(type), cfg.emoji, cfg.size);
    }
  });
}

// Render an emoji glyph to a transparent canvas texture (placeholder art).
export function ensureEmojiTexture(scene, key, emoji, size = 52) {
  if (scene.textures.exists(key)) {
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.font = `${Math.round(size * 0.8)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2 + 2);
  scene.textures.addCanvas(key, canvas);
}
