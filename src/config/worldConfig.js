// One continuous world made of ordered location "segments". Each location is a
// prolonged, static, zoomed-in backdrop that fills the screen while the player
// runs a long stretch through it; at each boundary the backdrop crossfades
// ("stitches") into the next location. No parallax — the backdrops are pinned
// to the camera so they read as one held scene per location.
//
// Each segment may provide:
//   scenery : an imported image URL (the location backdrop)
//   skyColor / sceneryColor : placeholder fill used until art is supplied
//
// obstacles/enemies use x RELATIVE to the segment (0..SEGMENT_LENGTH), so
// segments stay self-contained and reorderable. Drop new art in
// art/backgrounds/, import it, and assign it to the segment's `scenery` field.

import skateparkBg from '../../art/backgrounds/1-skatepark.png';
import barBg from '../../art/backgrounds/2-sparrow-bar.jpeg';
import zeroBg from '../../art/backgrounds/2.5-timejumpandzero.png';
import anchorageBg from '../../art/backgrounds/3-nothern-lights-alaska.png';
import homerBg from '../../art/backgrounds/4-homer-alaska.png';
import churchBg from '../../art/backgrounds/5-church.png';
import partyBg from '../../art/backgrounds/6-party.png';

export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 540;
export const GROUND_HEIGHT = 80;

// World distance the player covers per location. At RUN_SPEED 240 px/s, 3600px
// is ~15s per scene. Increase for longer scenes.
export const SEGMENT_LENGTH = 3600;
// Width of the crossfade band between adjacent backdrops (px of travel).
export const CROSSFADE_BAND = 700;
// Backdrop zoom: 1 = cover (fill viewport, crop overflow). >1 zooms in further.
export const BACKDROP_ZOOM = 1.0;

// A dense field of bone-emoji collectibles for the Zero "time jump" stage
// (no enemies, 10x the usual coin count). x is authored relative (≈60..1100).
function boneField(count = 50) {
  const coins = [];
  for (let i = 0; i < count; i++) {
    const x = 60 + (i / (count - 1)) * 1040;
    const y = 70 + Math.round(70 * Math.abs(Math.sin(i * 0.7)));
    coins.push({ x, y, emoji: '🦴', points: 10 });
  }
  return coins;
}

export const SEGMENTS = [
  {
    key: 'astoriaSkatePark',
    name: 'Astoria · Skate Park',
    scenery: skateparkBg,
    sky: null,
    skyColor: 0x9ec9e8,
    sceneryColor: 0x4b5563,
    groundColor: 0x374151, // gray
    // Stage 1 (easiest): introduces blocks, platforms, one small pit + a coin reward.
    obstacles: [
      { x: 120, width: 50, height: 80 },
      { x: 330, width: 55, height: 110 },
      { x: 620, width: 50, height: 90 },
      { x: 880, width: 55, height: 110 }
    ],
    // Floating platforms: `y` is the top surface's height above the ground.
    platforms: [
      { x: 230, y: 120, width: 120 },
      { x: 520, y: 150, width: 120 },
      { x: 760, y: 120, width: 130 }
    ],
    // Moving platform: `axis` 'x'|'y', `range` = half-travel, `speed` px/s.
    movingPlatforms: [{ x: 1000, y: 130, width: 110, axis: 'x', range: 90, speed: 55 }],
    // Pits: `x` left edge (relative), `width` = gap in px. Fall in = reset.
    pits: [{ x: 450, width: 120 }],
    // Coins: `y` = height above ground.
    coins: [
      { x: 230, y: 150 },
      { x: 450, y: 95 },
      { x: 520, y: 185 },
      { x: 760, y: 155 },
      { x: 1000, y: 170 },
      { x: 1080, y: 70 },
      // Skateboard collectables sprinkled through the skate park.
      { x: 180, y: 200, emoji: '🛹' },
      { x: 400, y: 130, emoji: '🛹' },
      { x: 660, y: 200, emoji: '🛹' },
      { x: 900, y: 120, emoji: '🛹' }
    ],
    // Hit blocks (`y` = top surface height): yellow '?' pop a coin when head-bumped;
    // one checkerboard `special` per stage. Stage 1's special is right at the start
    // (skateboard = speed boost) so it's obvious not to miss it.
    hitBlocks: [
      { x: 40, y: 110, special: true, item: 'skateboard' },
      { x: 400, y: 120 },
      { x: 820, y: 120 }
    ],
    // enemy `type`: 'walker' (default) | 'flyer'; flyer `y` = height above ground.
    enemies: [
      { x: 400, type: 'walker' },
      { x: 700, type: 'flyer', y: 140 },
      { x: 950, type: 'walker' }
    ]
  },
  {
    key: 'astoriaBar',
    name: 'Astoria · Sparrow Bar',
    scenery: barBg,
    sky: null,
    skyColor: 0x3b1d12,
    sceneryColor: 0x7c2d12,
    groundColor: 0x1e2a52, // dark navy blue
    // Stage 2: wider pit, a faster moving platform.
    obstacles: [
      { x: 160, width: 55, height: 100 },
      { x: 380, width: 50, height: 80 },
      { x: 640, width: 55, height: 120 },
      { x: 880, width: 50, height: 90 }
    ],
    platforms: [{ x: 280, y: 130, width: 120 }, { x: 560, y: 150, width: 110 }],
    movingPlatforms: [{ x: 760, y: 120, width: 110, axis: 'x', range: 120, speed: 65 }],
    pits: [{ x: 500, width: 140 }],
    coins: [
      { x: 280, y: 160 },
      { x: 500, y: 95 },
      { x: 560, y: 185 },
      { x: 760, y: 150 },
      { x: 1000, y: 80 },
      // Cheers! collectables around the bar.
      { x: 200, y: 200, emoji: '🍻' },
      { x: 420, y: 130, emoji: '🍻' },
      { x: 640, y: 200, emoji: '🍻' },
      { x: 900, y: 130, emoji: '🍻' }
    ],
    hitBlocks: [{ x: 40, y: 120, special: true, item: 'beer' }, { x: 200, y: 115 }, { x: 700, y: 125 }],
    enemies: [
      { x: 300, type: 'beer' },
      { x: 480, type: 'beer', scale: 1.5 },
      { x: 650, type: 'beer' },
      { x: 820, type: 'beer', scale: 1.5 },
      { x: 980, type: 'beer' },
      { x: 1100, type: 'beer' }
    ]
  },
  {
    // Transition/"time jump" stage that introduces Zero the dog (he follows for
    // the rest of the run). Light, breezy gameplay.
    key: 'timeJumpZero',
    name: 'Time Warp · Meet Zero',
    scenery: zeroBg,
    sky: null,
    skyColor: 0x101018,
    sceneryColor: 0x1b1b28,
    groundColor: 0x2d3340,
    obstacles: [{ x: 300, width: 50, height: 80 }, { x: 720, width: 55, height: 100 }],
    platforms: [{ x: 200, y: 130, width: 120 }, { x: 560, y: 150, width: 120 }],
    pits: [{ x: 470, width: 130 }],
    // Zero stage: no enemies — 10x the coins, reskinned as bone emojis.
    coins: boneField(50),
    hitBlocks: [{ x: 380, y: 120 }, { x: 850, y: 120 }],
    enemies: []
  },
  {
    key: 'alaskaAnchorage',
    name: 'Alaska · Fairbanks',
    scenery: anchorageBg,
    sky: null,
    skyColor: 0x0b1f3a,
    sceneryColor: 0x111827,
    groundColor: 0x4a2f1b, // dark brown
    groundBorderColor: 0x4d7c3a, // grass green top edge
    ambient: 'snow',
    // Stage 3: two pits (one bridged by a moving platform), more flyers.
    obstacles: [
      { x: 140, width: 50, height: 90 },
      { x: 340, width: 55, height: 120 },
      { x: 560, width: 50, height: 80 },
      { x: 820, width: 55, height: 110 }
    ],
    platforms: [{ x: 240, y: 130, width: 110 }, { x: 680, y: 150, width: 110 }],
    movingPlatforms: [{ x: 460, y: 120, width: 110, axis: 'x', range: 120, speed: 70 }],
    pits: [{ x: 420, width: 150 }, { x: 760, width: 120 }],
    coins: [
      { x: 240, y: 160 },
      { x: 460, y: 95 },
      { x: 680, y: 185 },
      { x: 900, y: 90 },
      { x: 1050, y: 70 },
      // Collectable snowflakes drifting under the Northern Lights.
      { x: 180, y: 210, emoji: '❄️' },
      { x: 340, y: 130, emoji: '❄️' },
      { x: 540, y: 200, emoji: '❄️' },
      { x: 700, y: 120, emoji: '❄️' },
      { x: 860, y: 200, emoji: '❄️' },
      { x: 1010, y: 140, emoji: '❄️' }
    ],
    hitBlocks: [{ x: 40, y: 120, special: true, item: 'shootingStar' }, { x: 200, y: 120 }, { x: 980, y: 120 }],
    // Northern Lights: alien invaders sweeping the sky in V/zig-zag paths (~3x goose).
    enemies: [
      { x: 260, type: 'alien', y: 230 },
      { x: 620, type: 'alien', y: 320 },
      { x: 980, type: 'alien', y: 210 },
      // Moose plodding along the ground below the lights.
      { x: 180, type: 'moose' },
      { x: 660, type: 'moose' },
      { x: 900, type: 'moose' }
    ]
  },
  {
    key: 'alaskaHomer',
    name: 'Alaska · Homer',
    scenery: homerBg,
    sky: null,
    skyColor: 0x7fb6d6,
    sceneryColor: 0x0f766e,
    groundColor: 0xd2b48c, // sand / tan
    ambient: 'snow',
    // Stage 4: wider pits, a vertical elevator platform.
    obstacles: [
      { x: 120, width: 55, height: 100 },
      { x: 360, width: 50, height: 80 },
      { x: 600, width: 60, height: 120 },
      { x: 860, width: 50, height: 90 }
    ],
    platforms: [{ x: 240, y: 140, width: 110 }],
    movingPlatforms: [
      { x: 480, y: 120, width: 110, axis: 'x', range: 140, speed: 75 },
      { x: 760, y: 150, width: 100, axis: 'y', range: 70, speed: 55 }
    ],
    pits: [{ x: 440, width: 170 }, { x: 700, width: 130 }],
    // Homer Beach: no enemies — 10 diamonds worth 100 pts each, plus normal coins.
    coins: [
      { x: 100, y: 90, emoji: '💎', points: 100 },
      { x: 220, y: 170, emoji: '💎', points: 100 },
      { x: 340, y: 120, emoji: '💎', points: 100 },
      { x: 460, y: 200, emoji: '💎', points: 100 },
      { x: 560, y: 100, emoji: '💎', points: 100 },
      { x: 680, y: 180, emoji: '💎', points: 100 },
      { x: 780, y: 130, emoji: '💎', points: 100 },
      { x: 880, y: 210, emoji: '💎', points: 100 },
      { x: 980, y: 110, emoji: '💎', points: 100 },
      { x: 1080, y: 90, emoji: '💎', points: 100 },
      // Normal coins mixed in.
      { x: 160, y: 150 },
      { x: 400, y: 160 },
      { x: 620, y: 150 },
      { x: 840, y: 160 },
      { x: 1030, y: 170 }
    ],
    hitBlocks: [{ x: 40, y: 120, special: true, item: 'ring' }, { x: 200, y: 120 }, { x: 900, y: 120 }],
    enemies: []
  },
  {
    key: 'williamsburgChurch',
    name: 'Williamsburg · Church',
    scenery: churchBg,
    sky: null,
    skyColor: 0xf0e6c8,
    sceneryColor: 0xfef3c7,
    groundColor: 0xf0f0f0, // white
    // Stage 5: three pits, two moving platforms, dense obstacles + enemies.
    obstacles: [
      { x: 120, width: 55, height: 110 },
      { x: 300, width: 50, height: 80 },
      { x: 500, width: 55, height: 120 },
      { x: 720, width: 50, height: 90 },
      { x: 920, width: 55, height: 115 }
    ],
    platforms: [{ x: 220, y: 140, width: 100 }, { x: 620, y: 150, width: 100 }],
    movingPlatforms: [
      { x: 400, y: 120, width: 100, axis: 'x', range: 150, speed: 80 },
      { x: 820, y: 140, width: 100, axis: 'y', range: 80, speed: 60 }
    ],
    pits: [{ x: 360, width: 170 }, { x: 600, width: 150 }, { x: 860, width: 130 }],
    // Church: no enemies — 3 collectable crosses worth 77 pts each, plus normal coins.
    coins: [
      { x: 220, y: 198, emoji: '✝️', points: 77 },
      { x: 560, y: 233, emoji: '✝️', points: 77 },
      { x: 920, y: 120, emoji: '✝️', points: 77 },
      // Normal coins mixed in.
      { x: 160, y: 160 },
      { x: 400, y: 150 },
      { x: 680, y: 160 },
      { x: 780, y: 150 },
      { x: 1030, y: 160 }
    ],
    hitBlocks: [{ x: 40, y: 120, special: true, item: 'wings' }, { x: 180, y: 120 }, { x: 860, y: 120 }],
    enemies: []
  },
  {
    key: 'williamsburgParty',
    name: 'Williamsburg · Party',
    scenery: partyBg,
    sky: null,
    skyColor: 0x2a1145,
    sceneryColor: 0x4c1d95,
    groundColor: 0x9b1c1c, // red carpet red
    ambient: 'confetti',
    // Stage 6 (hardest + longest): an extended dance-floor gauntlet with heavy
    // verticality, elevators, and lots of dancers. Roughly 2.3x a normal stage.
    length: 8200,
    obstacles: [
      { x: 90, width: 50, height: 90 },
      { x: 170, width: 45, height: 120 },
      { x: 300, width: 55, height: 100 },
      { x: 470, width: 50, height: 130 },
      { x: 560, width: 45, height: 90 },
      { x: 700, width: 55, height: 110 },
      { x: 800, width: 45, height: 140 },
      { x: 930, width: 55, height: 100 },
      { x: 1010, width: 50, height: 120 }
    ],
    platforms: [
      { x: 150, y: 130, width: 80 },
      { x: 250, y: 210, width: 80 },
      { x: 350, y: 150, width: 70 },
      { x: 520, y: 190, width: 80 },
      { x: 620, y: 260, width: 80 },
      { x: 700, y: 160, width: 70 },
      { x: 880, y: 220, width: 80 },
      { x: 980, y: 150, width: 70 },
      { x: 1070, y: 250, width: 80 }
    ],
    movingPlatforms: [
      { x: 210, y: 120, width: 90, axis: 'x', range: 150, speed: 95 },
      { x: 420, y: 150, width: 85, axis: 'y', range: 120, speed: 75 },
      { x: 590, y: 130, width: 85, axis: 'x', range: 160, speed: 90 },
      { x: 760, y: 200, width: 80, axis: 'y', range: 130, speed: 80 },
      { x: 940, y: 140, width: 85, axis: 'x', range: 140, speed: 95 },
      { x: 1040, y: 190, width: 80, axis: 'y', range: 110, speed: 70 }
    ],
    pits: [
      { x: 230, width: 170 },
      { x: 400, width: 150 },
      { x: 600, width: 190 },
      { x: 760, width: 160 },
      { x: 900, width: 150 },
      { x: 1030, width: 130 }
    ],
    coins: [
      { x: 150, y: 170 },
      { x: 250, y: 250 },
      { x: 350, y: 190 },
      { x: 420, y: 300 },
      { x: 520, y: 230 },
      { x: 620, y: 300 },
      { x: 700, y: 200 },
      { x: 760, y: 320 },
      { x: 880, y: 260 },
      { x: 940, y: 300 },
      { x: 980, y: 190 },
      { x: 1070, y: 290 },
      // Disco balls: 10 collectables worth 100 pts each.
      { x: 120, y: 240, emoji: '🪩', points: 100 },
      { x: 220, y: 160, emoji: '🪩', points: 100 },
      { x: 330, y: 300, emoji: '🪩', points: 100 },
      { x: 450, y: 200, emoji: '🪩', points: 100 },
      { x: 560, y: 320, emoji: '🪩', points: 100 },
      { x: 660, y: 190, emoji: '🪩', points: 100 },
      { x: 740, y: 260, emoji: '🪩', points: 100 },
      { x: 850, y: 200, emoji: '🪩', points: 100 },
      { x: 960, y: 320, emoji: '🪩', points: 100 },
      { x: 1050, y: 200, emoji: '🪩', points: 100 }
    ],
    hitBlocks: [
      { x: 40, y: 120, special: true, item: 'musicNote' },
      { x: 180, y: 120 },
      { x: 540, y: 120 },
      { x: 860, y: 120 },
      { x: 1050, y: 120 }
    ],
    // Party: dancing guy/girl emoji placeholders (swap for sprite sheets later).
    enemies: [
      { x: 80,   type: 'danceGuy' },
      { x: 160,  type: 'danceGirl', scale: 1.5 },
      { x: 250,  type: 'danceGuy' },
      { x: 330,  type: 'danceGirl' },
      { x: 410,  type: 'danceGuy',  scale: 1.5 },
      { x: 490,  type: 'danceGirl' },
      { x: 560,  type: 'danceGuy' },
      { x: 630,  type: 'danceGirl', scale: 1.5 },
      { x: 700,  type: 'danceGuy' },
      { x: 770,  type: 'danceGirl' },
      { x: 830,  type: 'danceGuy',  scale: 1.5 },
      { x: 890,  type: 'danceGirl' },
      { x: 940,  type: 'danceGuy' },
      { x: 990,  type: 'danceGirl', scale: 1.5 },
      { x: 1040, type: 'danceGuy' },
      { x: 1080, type: 'danceGirl' },
      { x: 1100, type: 'danceGuy',  scale: 1.5 }
    ]
  }
];
