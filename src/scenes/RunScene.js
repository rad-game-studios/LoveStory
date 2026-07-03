import { PlayerMain } from '../entities/PlayerMain.js';
import { PlayerMirror } from '../entities/PlayerMirror.js';
import { Obstacle } from '../entities/Obstacle.js';
import { MovingPlatform } from '../entities/MovingPlatform.js';
import { Coin } from '../entities/Coin.js';
import { HitBlock } from '../entities/HitBlock.js';
import { Enemy } from '../entities/Enemy.js';
import { TransitionTrigger } from '../entities/TransitionTrigger.js';
import {
  SEGMENTS,
  VIEW_WIDTH,
  VIEW_HEIGHT,
  GROUND_HEIGHT,
  SEGMENT_LENGTH,
  CROSSFADE_BAND,
  BACKDROP_ZOOM
} from '../config/worldConfig.js';
import {
  CHARACTERS,
  DOG,
  SHEET_KEY,
  registerCharacterAnims,
  registerAnimsFor,
  preloadZeroActions,
  registerZeroActionAnims
} from '../config/characterConfig.js';
import { preloadEnemies, registerEnemyAnims } from '../config/enemyConfig.js';
import { Effects } from '../effects/Effects.js';
import { setupTouchControls } from '../ui/touchControls.js';
import { hasBeatenGame, isZeroUnlocked, markZeroUnlocked } from '../services/progress.js';
import engagementImg from '../../art/cutscenes/homer-ring-cutscene.jpeg';
import sparrowMeetImg from '../../art/cutscenes/ricky-and-denise-meet-at-sparrow.jpeg';
import thanksImg from '../../art/cutscenes/thanks-for-playing.jpeg';

// HUD icon per power-up.
const POWER_ICON = { skateboard: '🛹', beer: '🥃', shootingStar: '⭐', ring: '💍', wings: '🪽', musicNote: '⚡' };

// Longer HUD readout for power-ups whose controls need explaining.
const POWER_HINT = {
  beer: '🥃 Press F to shoot fire balls',
  shootingStar: '⭐ Press F to shoot a star',
  musicNote: '⚡ Press F to shoot laser beams'
};

const START_X = 140;
const MIRROR_OFFSET_X = -40;
const MIRROR_OFFSET_Y = -20;
const END_PAD = 500;

// Obstacles/enemies authored x (≈0..1100) are spread across the long segment so
// they aren't bunched at the start of each 15s stretch.
const GAMEPLAY_LEAD = 520;
const GAMEPLAY_TAIL = 640;
const AUTHORED_SPAN = 1100;

// Scoring + timer.
const START_TIME = 300; // seconds, counts down (does not end the run)
const COIN_POINTS = 10;
const ENEMY_POINTS = 50;

const partnerOf = (character) => (character === 'denise' ? 'ricky' : 'denise');

// The whole game world: every location is a prolonged, static, zoomed-in
// backdrop; adjacent backdrops crossfade ("stitch") as the player runs through.
export class RunScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RunScene' });
  }

  preload() {
    this.failedAssets = [];
    this.load.on('loaderror', (file) => {
      console.error('[love-story] background failed to load:', file.key, file.src);
      this.failedAssets.push(file.key);
    });

    SEGMENTS.forEach((seg) => {
      if (seg.scenery && !this.textures.exists(`${seg.key}-scenery`)) {
        this.load.image(`${seg.key}-scenery`, seg.scenery);
      }
    });

    // Load both character sheets (player + partner run together).
    Object.values(CHARACTERS).forEach((cfg) => {
      if (!this.textures.exists(SHEET_KEY(cfg.key))) {
        this.load.spritesheet(SHEET_KEY(cfg.key), cfg.sheet, {
          frameWidth: cfg.frameWidth,
          frameHeight: cfg.frameHeight
        });
      }
    });

    // Zero the dog (companion).
    if (!this.textures.exists(SHEET_KEY('dog'))) {
      this.load.spritesheet(SHEET_KEY('dog'), DOG.sheet, { frameWidth: DOG.frameWidth, frameHeight: DOG.frameHeight });
    }
    if (!this.textures.exists('dog-portrait')) {
      this.load.image('dog-portrait', DOG.portrait);
    }
    preloadZeroActions(this);
    if (!this.textures.exists('engagement')) {
      this.load.image('engagement', engagementImg);
    }
    if (!this.textures.exists('sparrow-meet')) {
      this.load.image('sparrow-meet', sparrowMeetImg);
    }
    if (!this.textures.exists('thanks-for-playing')) {
      this.load.image('thanks-for-playing', thanksImg);
    }

    preloadEnemies(this);
  }

  create(data = {}) {
    this.mainCharacter = data.mainCharacter || 'ricky';
    // Playing as Zero: Ricky AND Denise trail behind, no separate dog companion.
    // Playing as Ricky/Denise: the other partner mirrors, and Zero joins as the
    // dog companion at his stage.
    if (this.mainCharacter === 'zero') {
      this.mirrorChars = ['ricky', 'denise'];
      this.hasDogCompanion = false;
    } else {
      this.partnerCharacter = partnerOf(this.mainCharacter);
      this.mirrorChars = [this.partnerCharacter];
      this.hasDogCompanion = true;
    }
    // Difficulty chosen after the splash (persisted on the game registry).
    // 'veryEasy' = unlimited health + gentle pit recovery; 'normal' = standard.
    this.difficulty = this.registry.get('difficulty') || 'normal';
    this.transitioning = false;
    this.currentIndex = 0;
    this.coinsCollected = 0;
    this.enemiesDefeated = 0;
    this.baseScore = 0;
    this.timeRemaining = START_TIME;
    this.groundTop = VIEW_HEIGHT - GROUND_HEIGHT;
    this.spawnY = this.groundTop - 24;

    Object.keys(CHARACTERS).forEach((c) => registerCharacterAnims(this, c));
    registerAnimsFor(this, 'dog', DOG.anims);
    registerZeroActionAnims(this);
    registerEnemyAnims(this);

    this.zeroIndex = SEGMENTS.findIndex((s) => s.key === 'timeJumpZero');
    this.zeroIntroShown = false;
    // First playthrough: the partner (Denise) is "unlocked" mid-run, appearing at
    // the Sparrow Bar and following for the rest — same pattern as Zero. Once the
    // game is beaten, character select is active and the partner rides along from
    // the start as the usual cosmetic mirror.
    this.mirrorIndex = hasBeatenGame() ? 0 : SEGMENTS.findIndex((s) => s.key === 'astoriaBar');
    this.homerIndex = SEGMENTS.findIndex((s) => s.key === 'alaskaHomer');
    this.cutscenePlayed = false;
    // Sparrow Bar "how they met" cutscene, plays once on first arrival there.
    this.sparrowIndex = SEGMENTS.findIndex((s) => s.key === 'astoriaBar');
    this.sparrowCutscenePlayed = false;
    this.inCutscene = false;

    this.computeLayout();

    // Optional stage select (unlocked after beating the game): start the run at
    // the chosen segment instead of the very beginning.
    this.startSegment = Phaser.Math.Clamp(data.startSegment || 0, 0, SEGMENTS.length - 1);
    this.startX = this.startSegment === 0 ? START_X : this.segStarts[this.startSegment] + 80;
    if (this.zeroIndex >= 0 && this.startSegment >= this.zeroIndex) {
      this.zeroIntroShown = true; // Zero already "met" — skip the intro banner
    }
    if (this.homerIndex >= 0 && this.startSegment > this.homerIndex) {
      this.cutscenePlayed = true; // past the engagement — don't replay it
    }
    if (this.sparrowIndex >= 0 && this.startSegment >= this.sparrowIndex) {
      // Starting at/after the bar via stage select — don't fire it on spawn.
      this.sparrowCutscenePlayed = true;
    }

    this.physics.world.setBounds(0, 0, this.worldWidth, VIEW_HEIGHT);
    // Keep the player inside left/right, but let them fall through the bottom
    // (into pits); a fall is caught in update() and resets to the checkpoint.
    this.physics.world.setBoundsCollision(true, true, false, false);

    this.buildBackdrops();
    this.buildFloor();
    this.buildPlayers();
    this.buildGameplay();
    this.buildCheckpoints();
    this.buildEndTrigger();
    this.buildHud();

    this.effects = new Effects(this);
    this.wasGrounded = true;
    this.setupDebugKeys();
    setupTouchControls(this); // on-screen buttons on phones/tablets



    this.cameras.main.setBounds(0, 0, this.worldWidth, VIEW_HEIGHT);
    this.cameras.main.startFollow(this.playerMain, true, 0.1, 0.1);
    this.cameras.main.setFollowOffset(-160, 0);
    this.cameras.main.fadeIn(400);

    if (this.failedAssets && this.failedAssets.length) {
      this.add
        .text(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 'Backgrounds failed to load.\nRestart the dev server and hard-reload.', {
          fontSize: '18px',
          color: '#fca5a5',
          align: 'center',
          backgroundColor: '#00000099',
          padding: { x: 10, y: 8 }
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(30);
    }
  }

  // One pinned, zoomed (cover) backdrop per location. They stay fixed on screen
  // (no parallax); crossfading is driven by player progress in updateBackdrops().
  buildBackdrops() {
    this.backdrops = SEGMENTS.map((seg, i) => {
      const key = `${seg.key}-scenery`;
      let bd;
      if (this.textures.exists(key)) {
        const src = this.textures.get(key).getSourceImage();
        const scale = Math.max(VIEW_WIDTH / src.width, VIEW_HEIGHT / src.height) * BACKDROP_ZOOM;
        bd = this.add.image(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, key).setScale(scale);
      } else {
        bd = this.add.rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH, VIEW_HEIGHT, seg.sceneryColor);
      }
      return bd.setScrollFactor(0).setDepth(-20).setAlpha(i === 0 ? 1 : 0);
    });
  }

  // Floor built per-segment (so each stage has its own colour) as solid pieces
  // with gaps where `pits` are configured. Falling into a gap drops the player
  // off the bottom (handled in update()). Optional `groundBorderColor` draws a
  // thin strip on top (e.g. Alaska's grass edge).
  buildFloor() {
    this.floorPieces = [];
    const y = VIEW_HEIGHT - GROUND_HEIGHT / 2;
    const last = SEGMENTS.length - 1;

    const addPiece = (x0, x1, color, borderColor) => {
      if (x1 - x0 < 4) {
        return;
      }
      const piece = this.add.rectangle((x0 + x1) / 2, y, x1 - x0, GROUND_HEIGHT, color).setOrigin(0.5).setDepth(5);
      this.physics.add.existing(piece, true);
      this.floorPieces.push(piece);
      if (borderColor != null) {
        this.add.rectangle((x0 + x1) / 2, this.groundTop + 5, x1 - x0, 10, borderColor).setOrigin(0.5).setDepth(5);
      }
    };

    SEGMENTS.forEach((seg, i) => {
      const start = i === 0 ? 0 : this.segmentStartX(i);
      const end = i === last ? this.worldWidth : this.segmentStartX(i + 1);
      const color = seg.groundColor ?? 0x374151;
      const borderColor = seg.groundBorderColor ?? null;

      const gaps = (seg.pits || [])
        .map((p) => {
          const left = this.segmentStartX(i) + this.spread(p.x, i);
          return [left, left + p.width];
        })
        .filter(([gl, gr]) => gr > start && gl < end)
        .sort((a, b) => a[0] - b[0]);

      let cursor = start;
      gaps.forEach(([gl, gr]) => {
        addPiece(cursor, Math.min(gl, end), color, borderColor);
        cursor = Math.max(cursor, gr);
      });
      addPiece(cursor, end, color, borderColor);
    });
  }

  buildPlayers() {
    const startX = this.startX;
    this.playerMain = new PlayerMain(this, startX, this.spawnY, this.mainCharacter);
    this.playerMain.setDepth(8);

    // Cosmetic partners trailing behind (one for Ricky/Denise; both for Zero, at
    // staggered distances). Hidden on the first playthrough until the Sparrow Bar;
    // after the game is beaten mirrorIndex is 0, so they ride along from the start.
    const trails = [40, 80];
    this.mirrors = this.mirrorChars.map((char, i) => {
      const m = new PlayerMirror(this, startX + MIRROR_OFFSET_X, this.spawnY + MIRROR_OFFSET_Y, char, {
        trail: trails[i] ?? 40 + i * 40,
        offsetY: MIRROR_OFFSET_Y,
        facesRight: false,
        board: true,
        alpha: 0.85
      });
      m.setVisible(this.startSegment >= this.mirrorIndex);
      m.setDepth(7);
      return m;
    });

    // Zero the dog companion (only when NOT playing as Zero): trails further
    // behind, faces right, mimics size. Hidden until the "meet Zero" stage.
    if (this.hasDogCompanion) {
      this.zero = new PlayerMirror(this, startX - 95, this.spawnY, 'dog', {
        trail: 95,
        offsetY: 0,
        facesRight: true,
        board: false,
        alpha: 1
      });
      this.zero.setVisible(this.zeroIndex >= 0 && this.startSegment >= this.zeroIndex);
      this.zero.setDepth(7);
    } else {
      this.zero = null;
    }

    this.physics.add.collider(this.playerMain, this.floorPieces);
  }

  segmentStartX(i) {
    return this.segStarts[i];
  }

  // Cumulative segment starts + total world width. Each segment may set its own
  // `length` (defaults to SEGMENT_LENGTH), so stages can be longer than others.
  computeLayout() {
    this.segLengths = SEGMENTS.map((s) => s.length || SEGMENT_LENGTH);
    this.segStarts = [];
    let acc = START_X;
    for (let i = 0; i < SEGMENTS.length; i++) {
      this.segStarts.push(acc);
      acc += this.segLengths[i];
    }
    this.segStarts.push(acc); // boundary just past the last segment
    this.worldWidth = acc + END_PAD;
  }

  // The segment index the given world x falls within.
  segmentIndexAt(x) {
    let idx = 0;
    while (idx < SEGMENTS.length - 1 && x >= this.segStarts[idx + 1]) {
      idx++;
    }
    return idx;
  }

  // Map an authored relative x (≈0..AUTHORED_SPAN) to a world x within segment i.
  spread(relX, i = 0) {
    const segLen = this.segLengths[i] || SEGMENT_LENGTH;
    return GAMEPLAY_LEAD + (relX / AUTHORED_SPAN) * (segLen - GAMEPLAY_LEAD - GAMEPLAY_TAIL);
  }

  buildGameplay() {
    this.obstacles = [];
    this.platforms = [];
    this.movingPlatforms = [];
    this.coins = [];
    this.hitBlocks = [];
    this.enemies = [];
    this.firstSpecialBox = null;
    // Per-stage collectable tally (by emoji/type) for the end-of-run scorecard.
    this.collectableStats = SEGMENTS.map(() => ({}));
    Coin.ensureTexture(this); // coin texture for coins popped from hit blocks
    this.ensureItemTextures(); // special-item icons (skateboard, beer)

    SEGMENTS.forEach((seg, i) => {
      const base = this.segmentStartX(i);
      (seg.obstacles || []).forEach((o) => {
        this.obstacles.push(new Obstacle(this, base + this.spread(o.x, i), this.groundTop, o.width, o.height));
      });
      (seg.platforms || []).forEach((pf) => {
        this.platforms.push(
          new Obstacle(this, base + this.spread(pf.x, i), this.groundTop - pf.y, pf.width, 22, {
            anchor: 'top',
            color: 0x6b7280,
            stroke: 0x374151
          })
        );
      });
      (seg.movingPlatforms || []).forEach((mp) => {
        this.movingPlatforms.push(
          new MovingPlatform(this, base + this.spread(mp.x, i), this.groundTop - mp.y, mp.width, {
            axis: mp.axis,
            range: mp.range,
            speed: mp.speed
          })
        );
      });
      (seg.coins || []).forEach((c) => {
        const coin = new Coin(this, base + this.spread(c.x, i), this.groundTop - (c.y || 60), {
          emoji: c.emoji,
          points: c.points
        });
        const key = c.emoji || '🟡';
        const stats = this.collectableStats[i];
        if (!stats[key]) {
          stats[key] = { emoji: key, collected: 0, total: 0 };
        }
        stats[key].total += 1;
        coin.segmentIndex = i;
        coin.statKey = key;
        this.coins.push(coin);
      });
      (seg.hitBlocks || []).forEach((hb) => {
        const block = new HitBlock(this, base + this.spread(hb.x, i), this.groundTop - hb.y, { special: hb.special, item: hb.item });
        this.hitBlocks.push(block);
        // Remember the very first special box the player can reach so we can point
        // a guiding arrow at it (only that one).
        if (hb.special && !this.firstSpecialBox && i >= this.startSegment) {
          this.firstSpecialBox = block;
        }
        // Coin boxes that hold a themed, scored collectable (e.g. the zero level's
        // 🌀) get tracked so they show up on the scorecard.
        if (hb.coin) {
          block.coin = hb.coin;
          block.segmentIndex = i;
          block.statKey = hb.coin.emoji || '🟡';
          const stats = this.collectableStats[i];
          if (!stats[block.statKey]) {
            stats[block.statKey] = { emoji: block.statKey, collected: 0, total: 0 };
          }
          stats[block.statKey].total += 1;
        }
      });
      (seg.enemies || []).forEach((e) => {
        this.enemies.push(new Enemy(this, base + this.spread(e.x, i), this.groundTop, { type: e.type, elevation: e.y, scale: e.scale }));
      });
    });

    const solids = [...this.obstacles, ...this.platforms];
    const walkers = this.enemies.filter((e) => !e.isFlyer);
    [...solids, ...this.movingPlatforms, ...this.hitBlocks, ...this.enemies].forEach((o) => o.setDepth(6));

    this.physics.add.collider(this.playerMain, solids);
    this.physics.add.collider(this.playerMain, this.movingPlatforms);
    this.physics.add.collider(this.playerMain, this.hitBlocks, this.handleHitBlock, null, this);
    this.physics.add.collider(walkers, this.floorPieces);
    this.physics.add.collider(walkers, solids);
    this.physics.add.overlap(this.playerMain, this.enemies, this.handleEnemyHit, null, this);
    this.physics.add.overlap(this.playerMain, this.coins, this.collectCoin, null, this);

    // Shooting-star projectiles. Overlap is checked per-frame in update()
    // (a persistent group collider proved unreliable here).
    this.projectiles = this.physics.add.group({ allowGravity: false });

    // Alien laser pulses — fired by alien enemies toward the player.
    this.alienPulses = this.physics.add.group({ allowGravity: false });

    // Fireballs (beer power-up): gravity + full bounce so they ricochet off the
    // ground, blocks and platforms. They destroy enemies but never hurt the
    // player (no player overlap/collider). Enemy overlap checked per-frame.
    this.fireballs = this.physics.add.group();
    this.physics.add.collider(this.fireballs, this.floorPieces);
    this.physics.add.collider(this.fireballs, solids);
    this.physics.add.collider(this.fireballs, this.movingPlatforms);
    this.physics.add.collider(this.fireballs, this.hitBlocks);

    this.buildSpecialBoxArrow();
  }

  // A red arrow bobbing above the first special box, pointing straight down at
  // it, to guide the player to grab the opening power-up. Disappears once the
  // box has been hit.
  buildSpecialBoxArrow() {
    const box = this.firstSpecialBox;
    if (!box) {
      return;
    }
    const topY = box.y; // HitBlock origin is (0.5, 0) — y is the box's top surface.
    // Downward-pointing red triangle sitting just above the box.
    const arrow = this.add
      .triangle(box.x, topY - 34, 0, 0, 26, 0, 13, 20, 0xef4444)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(3, 0x7f1d1d)
      .setDepth(15);
    this.specialArrow = arrow;
    this.tweens.add({
      targets: arrow,
      y: topY - 20,
      duration: 480,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
  }

  // Fire a shooting star from the player (shooting-star power-up).
  fireStar(x, y, dir) {
    const star = this.projectiles.create(x + dir * 30, y, 'star-tex').setDepth(9);
    star.body.setAllowGravity(false);
    star.setVelocityX(dir * 540);
    star.setAngularVelocity(480);
    this.time.delayedCall(1500, () => star.active && star.destroy());
  }

  // Fire a fast, straight laser beam (final-stage power-up). Destroys enemies.
  fireLaser(x, y, dir) {
    const laser = this.projectiles.create(x + dir * 34, y, 'laser-tex').setDepth(9);
    laser.body.setAllowGravity(false);
    laser.setVelocityX(dir * 920);
    laser.setFlipX(dir < 0);
    this.time.delayedCall(1200, () => laser.active && laser.destroy());
  }

  // Fire a ricocheting fireball (beer power-up). Bounces off surfaces, destroys
  // enemies on contact, and self-destructs after a few seconds.
  fireFireball(x, y, dir) {
    const fb = this.fireballs.create(x + dir * 26, y, 'fire-tex').setDepth(9);
    fb.body.setAllowGravity(true);
    fb.body.setBounce(1, 1);
    fb.body.setCollideWorldBounds(true);
    fb.setVelocity(dir * 460, -220);
    fb.setAngularVelocity(720);
    this.time.delayedCall(4000, () => fb.active && fb.destroy());
  }

  // Spawn an alien laser pulse aimed at the player's current position.
  spawnAlienPulse(fromX, fromY) {
    if (!this.playerMain || !this.alienPulses) return;
    const tx = this.playerMain.x;
    const ty = this.playerMain.y - 30;
    const angle = Math.atan2(ty - fromY, tx - fromX);
    const speed = 280;
    const tex = Math.random() < 0.5 ? 'alien-pulse-green' : 'alien-pulse-purple';
    const pulse = this.alienPulses.create(fromX, fromY, tex).setDepth(9);
    pulse.body.setAllowGravity(false);
    pulse.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    pulse.setRotation(angle);
    this.time.delayedCall(3500, () => pulse.active && pulse.destroy());
  }

  handleProjectileHit(star, enemy) {
    if (!enemy.alive) {
      return;
    }
    enemy.squash();
    this.enemiesDefeated += 1;
    const pts = enemy.points ?? ENEMY_POINTS;
    this.baseScore += pts;
    this.refreshScore();
    this.showPoints(pts);
    if (this.effects) {
      this.effects.sparkle(enemy.x, enemy.body.top, 10);
    }
    star.destroy();
  }

  // Fireball vs enemy: destroy the enemy but let the fireball keep ricocheting.
  handleFireballHit(fireball, enemy) {
    if (!enemy.alive) {
      return;
    }
    enemy.squash();
    this.enemiesDefeated += 1;
    const pts = enemy.points ?? ENEMY_POINTS;
    this.baseScore += pts;
    this.refreshScore();
    this.showPoints(pts);
    if (this.effects) {
      this.effects.sparkle(enemy.x, enemy.body.top, 10);
    }
  }

  // Head-bump a hit block from below -> dispense its contents (once).
  handleHitBlock(playerGO, block) {
    if (block.used) {
      return;
    }
    if (this.playerMain.body.blocked.up && block.body.touching.down) {
      if (!block.bump()) {
        return;
      }
      if (block.special) {
        if (block === this.firstSpecialBox && this.specialArrow) {
          this.tweens.killTweensOf(this.specialArrow);
          this.specialArrow.destroy();
          this.specialArrow = null;
        }
        this.grantSpecial(block);
      } else {
        this.dispenseCoin(block);
      }
    }
  }

  dispenseCoin(block) {
    const cfg = block.coin;
    const points = cfg ? cfg.points : COIN_POINTS;
    this.coinsCollected += 1;
    this.baseScore += points;
    this.refreshScore();
    this.showPoints(points);

    // Record themed coin-box collectables (e.g. 🌀) on the scorecard.
    if (cfg && this.collectableStats[block.segmentIndex] && this.collectableStats[block.segmentIndex][block.statKey]) {
      const stat = this.collectableStats[block.segmentIndex][block.statKey];
      stat.collected += 1;
      // Collecting all three blue coins on Zero's stage unlocks him as playable.
      if (block.statKey === '🌀' && stat.collected >= stat.total && !isZeroUnlocked()) {
        markZeroUnlocked();
        this.flashingBanner('🐾  ZERO UNLOCKED!  🐾', { y: 130, duration: 3200, fontSize: '24px' });
      }
    }

    // Floating pickup — the emoji for themed coins, otherwise the coin sprite.
    const pickup =
      cfg && cfg.emoji
        ? this.add.text(block.x, block.y - 6, cfg.emoji, { fontSize: '30px' }).setOrigin(0.5).setDepth(7)
        : this.add.image(block.x, block.y - 6, 'coin-tex').setDepth(7);
    this.tweens.add({
      targets: pickup,
      y: pickup.y - 46,
      alpha: 0,
      duration: 500,
      ease: 'Quad.out',
      onComplete: () => pickup.destroy()
    });
    if (this.effects) {
      this.effects.sparkle(block.x, block.y - 10, 6);
    }
  }

  grantSpecial(block) {
    const banner = (text) => this.flashingBanner(text, { y: 150, duration: 3200, fontSize: '24px' });
    if (block.item === 'skateboard') {
      this.playerMain.applyPowerUp('skateboard');
      this.popItem(block, 'skateboard-tex');
      banner('🛹  Skateboard — speed boost!');
    } else if (block.item === 'beer') {
      this.playerMain.applyPowerUp('beer');
      this.popItem(block, 'fire-tex');
      banner('🥃  Press F to shoot fire balls!');
    } else if (block.item === 'shootingStar') {
      this.playerMain.applyPowerUp('shootingStar');
      this.popItem(block, 'star-tex');
      banner('⭐  Press F to shoot a star!');
    } else if (block.item === 'ring') {
      this.playerMain.applyPowerUp('ring');
      this.popItem(block, 'ring-tex');
      this.playEngagementCutscene();
    } else if (block.item === 'wings') {
      this.playerMain.applyPowerUp('wings');
      this.popItem(block, 'wings-tex');
      banner('🪽  Angel wings — Up / Down to fly for 15s!');
    } else if (block.item === 'musicNote') {
      this.playerMain.applyPowerUp('musicNote');
      this.popItem(block, 'laser-tex');
      banner('⚡  Laser blaster — Press F to shoot laser beams!');
    } else {
      // Placeholder reward until each stage's special item is defined.
      this.baseScore += 100;
      this.refreshScore();
      this.showPoints(100);
      banner('★  Special!  +100');
    }
    if (this.effects) {
      this.effects.sparkle(block.x, block.y - 10, 16);
    }
  }

  // Engagement cutscene (Homer Beach). Plays once: on grabbing the wedding ring,
  // or automatically when the player moves past Homer if the ring was missed.
  playEngagementCutscene() {
    if (this.cutscenePlayed || this.inCutscene) {
      return;
    }
    this.cutscenePlayed = true;
    this.playImageCutscene('engagement', 'Homer, Alaska — Ricky got down on one knee and Denise said yes!');
  }

  // "How they met" cutscene (Sparrow Bar). Plays once on first arrival.
  playSparrowCutscene() {
    if (this.sparrowCutscenePlayed || this.inCutscene) {
      return;
    }
    this.sparrowCutscenePlayed = true;
    this.playImageCutscene(
      'sparrow-meet',
      'May 2019 - Ricky skated from Astoria Skatepark to Sparrow Tavern and, by chance, met Denise. ❤️',
      { captionInBottomThird: true, holdMs: 7000 }
    );
  }

  // Shared full-screen image cutscene: pause the world, fade in the image + a
  // caption, hold for 3s (same as the engagement), then fade back and resume.
  // With `captionInBottomThird`, the caption is placed in the bottom third of the
  // displayed image; otherwise it sits near the bottom edge of the frame.
  playImageCutscene(textureKey, caption, opts = {}) {
    this.inCutscene = true;
    this.playerMain.setControlsEnabled(false);
    this.physics.pause();

    const dim = this.add.rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH, VIEW_HEIGHT, 0x000000, 1)
      .setScrollFactor(0)
      .setDepth(40)
      .setAlpha(0);
    const overlay = [];
    let captionY = VIEW_HEIGHT - 66;
    if (this.textures.exists(textureKey)) {
      const src = this.textures.get(textureKey).getSourceImage();
      const scale = Math.min(VIEW_WIDTH / src.width, VIEW_HEIGHT / src.height);
      overlay.push(this.add.image(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, textureKey).setScale(scale).setScrollFactor(0).setDepth(41).setAlpha(0));
      if (opts.captionInBottomThird) {
        const displayH = src.height * scale;
        captionY = Math.min(VIEW_HEIGHT - 52, VIEW_HEIGHT / 2 + displayH / 3);
      }
    }
    overlay.push(
      this.add
        .text(VIEW_WIDTH / 2, captionY, caption, {
          fontSize: '20px',
          color: '#fef3c7',
          fontStyle: 'bold',
          align: 'center',
          backgroundColor: '#000000cc',
          padding: { x: 12, y: 8 },
          wordWrap: { width: 900 }
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(42)
        .setAlpha(0)
    );

    this.tweens.add({ targets: dim, alpha: 0.9, duration: 400 });
    this.tweens.add({ targets: overlay, alpha: 1, duration: 500 });

    const end = () => {
      if (!this.inCutscene) {
        return;
      }
      this.inCutscene = false;
      // A `then` cutscene leads into another scene: leave the overlay up (so the
      // game never flashes back) and hand off to the caller.
      if (opts.then) {
        opts.then();
        return;
      }
      const all = [dim, ...overlay];
      this.tweens.add({
        targets: all,
        alpha: 0,
        duration: 400,
        onComplete: () => {
          all.forEach((o) => o.destroy());
          this.physics.resume();
          if (!this.transitioning) {
            this.playerMain.setControlsEnabled(true);
          }
        }
      });
    };
    // Auto-dismisses after the hold (default 3s). No skip input — it's too easy
    // to skip by accident.
    this.time.delayedCall(opts.holdMs ?? 3000, end);
  }

  // Generate special-item icon textures at runtime (no art files).
  ensureItemTextures() {
    const add = (key, w, h, draw) => {
      if (this.textures.exists(key)) {
        return;
      }
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      draw(c.getContext('2d'));
      this.textures.addCanvas(key, c);
    };
    add('skateboard-tex', 48, 20, (x) => {
      x.fillStyle = '#3b2a1a';
      x.fillRect(2, 6, 44, 7);
      x.strokeStyle = '#000000';
      x.lineWidth = 1;
      x.strokeRect(2, 6, 44, 7);
      x.fillStyle = '#d1d5db';
      [12, 36].forEach((wx) => {
        x.beginPath();
        x.arc(wx, 16, 4, 0, Math.PI * 2);
        x.fill();
      });
    });
    add('beer-tex', 34, 40, (x) => {
      // handle
      x.strokeStyle = '#f0c000';
      x.lineWidth = 4;
      x.beginPath();
      x.arc(27, 24, 7, -1.2, 1.2);
      x.stroke();
      // glass of beer
      x.fillStyle = '#f2a900';
      x.fillRect(6, 12, 20, 26);
      x.fillStyle = '#ffcb3d';
      x.fillRect(8, 14, 5, 22); // highlight
      x.strokeStyle = '#b06f00';
      x.lineWidth = 2;
      x.strokeRect(6, 12, 20, 26);
      x.fillStyle = '#ffe08a';
      [[13, 22], [19, 28], [15, 32]].forEach(([bx, by]) => {
        x.beginPath();
        x.arc(bx, by, 1.6, 0, Math.PI * 2);
        x.fill();
      });
      // foam
      x.fillStyle = '#fffdf5';
      x.fillRect(6, 10, 20, 4);
      [[9, 9, 5], [15, 7, 6], [22, 9, 5], [12, 11, 4], [19, 11, 4]].forEach(([fx, fy, fr]) => {
        x.beginPath();
        x.arc(fx, fy, fr, 0, Math.PI * 2);
        x.fill();
      });
    });
    const drawStar = (x, cx, cy, outer, inner, fill) => {
      x.fillStyle = fill;
      x.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? inner : outer;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      x.closePath();
      x.fill();
    };
    add('star-tex', 28, 28, (x) => drawStar(x, 14, 14, 13, 5.5, '#fde047'));
    add('fire-tex', 22, 22, (x) => {
      x.fillStyle = '#ea580c'; // outer flame (orange-red)
      x.beginPath();
      x.arc(11, 11, 10, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#f97316'; // mid
      x.beginPath();
      x.arc(11, 11, 7, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#fde047'; // hot core
      x.beginPath();
      x.arc(11, 11, 3.5, 0, Math.PI * 2);
      x.fill();
    });
    add('laser-tex', 44, 10, (x) => {
      x.fillStyle = '#b91c1c'; // outer glow (deep red)
      x.beginPath();
      x.roundRect ? x.roundRect(0, 1, 44, 8, 4) : x.rect(0, 1, 44, 8);
      x.fill();
      x.fillStyle = '#f43f5e'; // beam
      x.beginPath();
      x.roundRect ? x.roundRect(2, 3, 40, 4, 2) : x.rect(2, 3, 40, 4);
      x.fill();
      x.fillStyle = '#ffffff'; // hot center line
      x.fillRect(4, 4, 36, 2);
    });
    add('ring-tex', 28, 28, (x) => {
      x.strokeStyle = '#f5c518';
      x.lineWidth = 4;
      x.beginPath();
      x.arc(14, 18, 7, 0, Math.PI * 2);
      x.stroke();
      x.fillStyle = '#bfe9ff';
      x.beginPath();
      x.moveTo(14, 2);
      x.lineTo(19, 8);
      x.lineTo(14, 13);
      x.lineTo(9, 8);
      x.closePath();
      x.fill();
    });
    add('wings-tex', 44, 28, (x) => {
      x.fillStyle = '#ffffff';
      x.beginPath();
      x.ellipse(13, 14, 12, 8, -0.3, 0, Math.PI * 2);
      x.fill();
      x.beginPath();
      x.ellipse(31, 14, 12, 8, 0.3, 0, Math.PI * 2);
      x.fill();
      x.strokeStyle = '#cbd5e1';
      x.lineWidth = 1;
      x.stroke();
    });
    add('note-tex', 26, 32, (x) => {
      x.fillStyle = '#1f2937';
      x.fillRect(15, 5, 3, 19);
      x.beginPath();
      x.moveTo(18, 5);
      x.quadraticCurveTo(26, 9, 20, 17);
      x.lineTo(18, 13);
      x.closePath();
      x.fill();
      x.beginPath();
      x.ellipse(11, 24, 7, 5, -0.3, 0, Math.PI * 2);
      x.fill();
    });
    // Alien laser pulses — small glowing ovals, alternating green and purple.
    const pulse = (key, core, glow) =>
      add(key, 18, 10, (x) => {
        x.shadowBlur = 6;
        x.shadowColor = glow;
        x.fillStyle = glow;
        x.beginPath();
        x.ellipse(9, 5, 16, 8, 0, 0, Math.PI * 2);
        x.fill();
        x.fillStyle = core;
        x.beginPath();
        x.ellipse(9, 5, 10, 5, 0, 0, Math.PI * 2);
        x.fill();
      });
    pulse('alien-pulse-green', '#d1fae5', '#10b981');
    pulse('alien-pulse-purple', '#ede9fe', '#7c3aed');
  }

  // Pops a special-item icon out of the top of a block, then fades it.
  popItem(block, textureKey) {
    const item = this.add.image(block.x, block.y - 6, textureKey).setDepth(9);
    this.tweens.add({
      targets: item,
      y: item.y - 56,
      duration: 380,
      ease: 'Back.out',
      onComplete: () => {
        this.tweens.add({ targets: item, alpha: 0, duration: 320, delay: 200, onComplete: () => item.destroy() });
      }
    });
  }

  // A high-legibility banner that flashes between black-on-white and
  // white-on-black. Auto-destroys after `duration` ms.
  flashingBanner(text, opts = {}) {
    const y = opts.y ?? 96;
    const duration = opts.duration ?? 5000;
    const banner = this.add
      .text(VIEW_WIDTH / 2, y, text, {
        fontSize: opts.fontSize ?? '26px',
        fontStyle: 'bold',
        align: 'center',
        color: '#000000',
        backgroundColor: '#ffffff',
        padding: { x: 14, y: 10 },
        wordWrap: { width: 820 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(31);

    let inverted = false;
    const flip = this.time.addEvent({
      delay: 350,
      loop: true,
      callback: () => {
        inverted = !inverted;
        banner.setColor(inverted ? '#ffffff' : '#000000');
        banner.setBackgroundColor(inverted ? '#000000' : '#ffffff');
      }
    });
    this.time.delayedCall(duration, () => {
      flip.remove();
      banner.destroy();
    });
    return banner;
  }

  // Zero intro: flashing title text (+ his portrait) in the upper middle for 5s.
  showZeroIntro() {
    this.flashingBanner('Many fun adventures and a Zero later', { y: 96, duration: 5000 });
    if (this.textures.exists('dog-portrait')) {
      const portrait = this.add
        .image(VIEW_WIDTH / 2, 260, 'dog-portrait')
        .setDisplaySize(192, 192)
        .setScrollFactor(0)
        .setDepth(31)
        .setAlpha(0);
      this.tweens.add({ targets: portrait, alpha: 1, duration: 400 });
      this.time.delayedCall(5000, () => {
        this.tweens.add({ targets: portrait, alpha: 0, duration: 500, onComplete: () => portrait.destroy() });
      });
    }
  }

  collectCoin(playerGO, coin) {
    if (coin.collect()) {
      this.coinsCollected += 1;
      this.baseScore += coin.points || COIN_POINTS;
      this.refreshScore();
      this.showPoints(coin.points || COIN_POINTS);
      const stats = this.collectableStats && this.collectableStats[coin.segmentIndex];
      if (stats && stats[coin.statKey]) {
        stats[coin.statKey].collected += 1;
      }
      if (this.effects) {
        this.effects.sparkle(coin.x, coin.y, 8);
      }
    }
  }

  refreshScore() {
    if (this.scoreText) {
      this.scoreText.setText(`★ ${this.baseScore}`);
    }
  }

  // Floating "+X pts" white text that rises and fades near the player.
  showPoints(amount) {
    if (!amount || !this.playerMain) {
      return;
    }
    const x = this.playerMain.x + Phaser.Math.Between(-10, 10);
    const y = this.playerMain.y - 58;
    const txt = this.add
      .text(x, y, `+${amount} pts`, { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(25)
      .setShadow(2, 2, '#000000', 3);
    this.tweens.add({
      targets: txt,
      y: y - 42,
      alpha: 0,
      duration: 850,
      ease: 'Quad.out',
      onComplete: () => txt.destroy()
    });
  }

  // Floating "Ouch!" near the player when a life point is lost (mirrors showPoints).
  showOuch() {
    if (!this.playerMain) {
      return;
    }
    const x = this.playerMain.x + Phaser.Math.Between(-10, 10);
    const y = this.playerMain.y - 58;
    const txt = this.add
      .text(x, y, 'Ouch!', { fontSize: '20px', color: '#ff5252', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(25)
      .setShadow(2, 2, '#000000', 3);
    this.tweens.add({
      targets: txt,
      y: y - 42,
      alpha: 0,
      duration: 850,
      ease: 'Quad.out',
      onComplete: () => txt.destroy()
    });
  }

  buildEndTrigger() {
    this.endTrigger = new TransitionTrigger(this, this.worldWidth - 80, this.groundTop - 70, 60, 140);
    this.physics.add.overlap(this.playerMain, this.endTrigger, this.handleEnd, null, this);
  }

  // A checkpoint flag at every location transition (segment boundary). Flags
  // start lowered/grey and raise + turn green as the player passes them. They
  // line up with checkpointX() so a respawn lands at the last flag reached.
  buildCheckpoints() {
    this.checkpoints = [];
    const poleH = 96;
    for (let i = 1; i < SEGMENTS.length; i++) {
      const x = this.segmentStartX(i) + 40;
      const pole = this.add
        .rectangle(x, this.groundTop, 5, poleH, 0xcbd5e1)
        .setOrigin(0.5, 1)
        .setDepth(6)
        .setStrokeStyle(1, 0x64748b);
      const flagY = this.groundTop - poleH + 4;
      const flag = this.add
        .triangle(x + 2, flagY, 0, 0, 46, 15, 0, 30, 0x9ca3af)
        .setOrigin(0, 0)
        .setDepth(6);
      // "D&R" initials on the flag (Denise & Ricky).
      const label = this.add
        .text(x + 15, flagY + 15, 'D&R', { fontSize: '12px', color: '#ffffff', fontStyle: 'bold' })
        .setOrigin(0.5)
        .setDepth(7);
      this.checkpoints.push({ x, pole, flag, label, activated: false });
    }
  }

  // Raise + light up a checkpoint flag the first time it is reached.
  activateCheckpoint(cp) {
    if (cp.activated) {
      return;
    }
    cp.activated = true;
    cp.flag.setFillStyle(0x22c55e);
    this.tweens.add({
      targets: [cp.flag, cp.label],
      y: '-=10',
      duration: 260,
      yoyo: true,
      ease: 'Quad.out'
    });
    this.tweens.add({
      targets: cp.flag,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 260,
      yoyo: true,
      ease: 'Quad.out'
    });
    if (this.effects) {
      this.effects.sparkle(cp.x, this.groundTop - 90, 10);
    }
    this.flashingBanner('Checkpoint!', { y: 130, duration: 1600, fontSize: '20px' });
  }

  buildHud() {
    this.locationLabel = this.add
      .text(VIEW_WIDTH / 2, 28, '', { fontSize: '20px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20)
      .setShadow(2, 2, '#000000', 4);

    this.timerText = this.add
      .text(18, 22, '', { fontSize: '22px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setShadow(2, 2, '#000000', 4);

    this.scoreText = this.add
      .text(VIEW_WIDTH - 18, 22, '★ 0', { fontSize: '22px', color: '#fde047', fontStyle: 'bold' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setShadow(2, 2, '#000000', 4);

    // Hearts (life points), between the location name and score. Enlarged 3x.
    this.heartsText = this.add
      .text(VIEW_WIDTH - 150, 20, '', { fontSize: '60px', color: '#f87171' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setShadow(2, 2, '#000000', 4);

    // Active power-up indicator (+ remaining seconds for timed ones).
    this.powerText = this.add
      .text(18, 52, '', { fontSize: '16px', color: '#fde047', fontStyle: 'bold' })
      .setScrollFactor(0)
      .setDepth(20)
      .setShadow(2, 2, '#000000', 4);

    this.refreshTimer();
  }

  // In Very Easy the player can't die from hits, so show an infinity marker
  // instead of a fixed heart count.
  refreshHearts() {
    if (this.difficulty === 'veryEasy') {
      this.heartsText.setText('❤ ∞');
    } else {
      this.heartsText.setText('❤ '.repeat(this.playerMain.hearts).trim());
    }
  }

  refreshPowerHud() {
    this.refreshHearts();
    const pu = this.playerMain.powerUp;
    if (!pu) {
      this.powerText.setText('');
      return;
    }
    let txt = POWER_HINT[pu] || POWER_ICON[pu] || '★';
    if (this.playerMain.powerUpExpiresAt) {
      const rem = Math.max(0, Math.ceil((this.playerMain.powerUpExpiresAt - this.time.now) / 1000));
      txt += `  ${rem}s`;
    }
    this.powerText.setText(txt);
  }

  refreshTimer() {
    const t = Math.max(0, Math.ceil(this.timeRemaining));
    const m = Math.floor(t / 60);
    const s = t % 60;
    if (this.timerText) {
      this.timerText.setText(`⏱ ${m}:${String(s).padStart(2, '0')}`);
      this.timerText.setColor(t <= 30 ? '#f87171' : '#ffffff');
    }
  }

  // Crossfade the current backdrop into the next near each segment boundary.
  // The current backdrop stays opaque while the next fades in on top of it.
  updateBackdrops() {
    const x = this.playerMain.x;
    const n = this.backdrops.length;
    const idx = this.segmentIndexAt(x);
    const into = x - this.segStarts[idx];
    const segLen = this.segLengths[idx];
    const fadeStart = segLen - CROSSFADE_BAND;

    this.backdrops.forEach((bd, i) => bd.setAlpha(i === idx ? 1 : 0));

    let displayIndex = idx;
    if (idx < n - 1 && into > fadeStart) {
      const f = Phaser.Math.Clamp((into - fadeStart) / CROSSFADE_BAND, 0, 1);
      this.backdrops[idx + 1].setAlpha(f);
      if (f > 0.5) {
        displayIndex = idx + 1;
      }
    }
    this.currentIndex = displayIndex;
  }

  update(time, delta) {
    if (this.transitioning || this.inCutscene) {
      return;
    }

    // Countdown timer (does not end the run; drives the finish-time multiplier).
    if (this.timeRemaining > 0) {
      this.timeRemaining = Math.max(0, this.timeRemaining - delta / 1000);
      this.refreshTimer();
    }

    // Fell into a pit (off the bottom of the world). In Very Easy the fall costs
    // nothing — pop back onto solid ground a few steps before the pit and keep
    // the power-up. Otherwise a heart absorbs it (soft respawn at the checkpoint)
    // or, with no hearts left, it's a full reset.
    if (this.playerMain.y > VIEW_HEIGHT + 140) {
      if (this.difficulty === 'veryEasy') {
        const rx = this.pitRecoverX(this.playerMain.x);
        this.playerMain.reset(rx, this.spawnY);
        this.mirrors.forEach((m) => m.reset(rx + MIRROR_OFFSET_X, this.spawnY + MIRROR_OFFSET_Y));
        return;
      }
      const result = this.playerMain.hurt();
      if (result === 'reset') {
        this.handleReset();
      } else {
        if (result === 'hit') {
          this.showOuch();
        }
        this.softRespawn();
      }
      return;
    }

    this.updateBackdrops();
    if (this.locationLabel) {
      this.locationLabel.setText(SEGMENTS[this.currentIndex].name);
    }
    this.refreshPowerHud();

    // Raise checkpoint flags as the player passes each location transition.
    if (this.checkpoints) {
      this.checkpoints.forEach((cp) => {
        if (!cp.activated && this.playerMain.x >= cp.x) {
          this.activateCheckpoint(cp);
        }
      });
    }

    // Introduce Denise when reaching her stage (first playthrough); she follows
    // for the rest of the run. After the game is beaten mirrorIndex is 0.
    if (this.mirrorIndex >= 0 && this.currentIndex >= this.mirrorIndex) {
      this.mirrors.forEach((m) => m.setVisible(true));
    }

    // "How they met" cutscene on arriving at the Sparrow Bar (plays once).
    if (!this.sparrowCutscenePlayed && this.sparrowIndex >= 0 && this.currentIndex >= this.sparrowIndex) {
      this.playSparrowCutscene();
    }

    // Introduce Zero the dog when reaching his stage; he follows for the rest of
    // the run. Skipped when you're already playing as Zero.
    if (this.zero && this.zeroIndex >= 0 && this.currentIndex >= this.zeroIndex) {
      this.zero.setVisible(true);
      if (!this.zeroIntroShown) {
        this.zeroIntroShown = true;
        this.showZeroIntro();
      }
    }

    // Engagement cutscene: if the ring was missed, play it when leaving Homer.
    if (!this.cutscenePlayed && this.homerIndex >= 0 && this.currentIndex > this.homerIndex) {
      this.playEngagementCutscene();
    }

    // Kick up dust at the feet on takeoff and landing.
    const grounded = this.playerMain.body.blocked.down;
    if (grounded !== this.wasGrounded) {
      this.effects.burstDust(this.playerMain.x, this.playerMain.y + 24, grounded ? 8 : 4);
      this.wasGrounded = grounded;
    }

    // Ambient weather follows the current location.
    this.effects.setAmbient(SEGMENTS[this.currentIndex].ambient || null);

    // Shooting-star projectiles vs enemies (per-frame one-off overlap).
    if (this.projectiles.getLength() > 0) {
      this.projectiles.getChildren().forEach((star) => {
        this.physics.overlap(star, this.enemies, this.handleProjectileHit, null, this);
      });
    }

    // Fireballs vs enemies (per-frame; fireballs survive to keep ricocheting).
    if (this.fireballs.getLength() > 0) {
      this.fireballs.getChildren().forEach((fb) => {
        this.physics.overlap(fb, this.enemies, this.handleFireballHit, null, this);
      });
    }

    // Alien pulses vs player — damage on hit, destroy the pulse.
    // Snapshot the array first so destroying pulses mid-loop doesn't corrupt
    // the iterator. Defer handleReset() until after the loop for the same reason.
    if (this.alienPulses && this.alienPulses.getLength() > 0) {
      let needsReset = false;
      [...this.alienPulses.getChildren()].forEach((pulse) => {
        if (needsReset || !pulse.active) return;
        this.physics.overlap(pulse, this.playerMain, () => {
          if (!pulse.active) return;
          pulse.destroy();
          const result = this.playerMain.hurt();
          if (result === 'reset') {
            needsReset = true;
          } else if (result === 'hit') {
            this.refreshHearts();
            this.showOuch();
          }
        }, null, this);
      });
      if (needsReset) this.handleReset();
    }
  }

  setupDebugKeys() {
    // Dev fast-travel between locations: '[' back, ']' forward.
    this.input.keyboard.on('keydown-OPEN_BRACKET', () => this.fastTravel(-1));
    this.input.keyboard.on('keydown-CLOSED_BRACKET', () => this.fastTravel(1));
  }

  fastTravel(dir) {
    if (this.transitioning) {
      return;
    }
    const idx = Phaser.Math.Clamp(this.currentIndex + dir, 0, SEGMENTS.length - 1);
    const x = this.segmentStartX(idx) + 80;
    this.playerMain.setPosition(x, this.spawnY);
    this.playerMain.body.reset(x, this.spawnY);
    this.mirrors.forEach((m) => m.setPosition(x + MIRROR_OFFSET_X, this.spawnY + MIRROR_OFFSET_Y));
    this.cameras.main.centerOn(x, VIEW_HEIGHT / 2);
  }

  handleEnemyHit(playerGO, enemy) {
    if (this.transitioning || !enemy.alive) {
      return;
    }
    const pb = this.playerMain.body;
    const stomping = pb.velocity.y > 0 && pb.bottom <= enemy.body.top + 14;
    if (stomping) {
      enemy.squash();
      this.playerMain.bounce();
      this.effects.sparkle(enemy.x, enemy.body.top);
      this.enemiesDefeated += 1;
      const pts = enemy.points ?? ENEMY_POINTS;
      this.baseScore += pts;
      this.refreshScore();
      this.showPoints(pts);
    } else {
      const result = this.playerMain.hurt();
      if (result === 'reset') {
        this.handleReset();
      } else if (result === 'hit') {
        this.showOuch();
      }
    }
  }

  // Zero's bark: defeats enemies in a short band radiating from his front (about
  // half a sprite-length), plus a little sound-wave flourish.
  zeroBark(player) {
    if (this.transitioning) {
      return;
    }
    const dir = player.facingLeft ? -1 : 1;
    const w = player.spriteWidth();
    const frontEdge = player.x + dir * (w / 2);
    const farEdge = frontEdge + dir * (w * 0.5);
    const x0 = Math.min(frontEdge, farEdge);
    const x1 = Math.max(frontEdge, farEdge);

    (this.enemies || []).forEach((e) => {
      if (!e.alive || !e.body) {
        return;
      }
      const hw = e.body.halfWidth || 20;
      if (e.x + hw >= x0 && e.x - hw <= x1 && Math.abs(e.y - player.y) < 80) {
        e.squash();
        this.enemiesDefeated += 1;
        const pts = e.points ?? ENEMY_POINTS;
        this.baseScore += pts;
        this.refreshScore();
        this.showPoints(pts);
        if (this.effects) {
          this.effects.sparkle(e.x, e.body.top);
        }
      }
    });

    // Sound-wave flourish + WOOF!
    const wy = player.y - 22;
    const woof = this.add
      .text(farEdge + dir * 6, wy - 18, 'WOOF!', { fontSize: '16px', color: '#fde047', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(12);
    this.tweens.add({ targets: woof, y: woof.y - 18, alpha: 0, duration: 480, onComplete: () => woof.destroy() });
    for (let i = 0; i < 3; i++) {
      const arc = this.add
        .ellipse(frontEdge, wy, 6, 24, 0x000000, 0)
        .setStrokeStyle(3, 0xfde047, 0.9)
        .setDepth(11)
        .setAlpha(0.9);
      this.tweens.add({
        targets: arc,
        scaleX: 3 + i,
        scaleY: 1.5,
        x: frontEdge + dir * (10 + i * 8),
        alpha: 0,
        duration: 320,
        delay: i * 55,
        onComplete: () => arc.destroy()
      });
    }
  }

  checkpointX() {
    const idx = this.segmentIndexAt(this.playerMain.x);
    return Math.max(START_X, this.segStarts[idx] + 40);
  }

  // Very Easy pit recovery: land the player a few steps back onto the solid
  // ground piece just left of the pit they fell into (guaranteed real ground,
  // so they can't loop-fall). Falls back to the checkpoint if none is found.
  pitRecoverX(fallX) {
    let bestRight = null;
    let bestLeft = null;
    this.floorPieces.forEach((pc) => {
      const right = pc.x + pc.width / 2;
      if (right <= fallX + 24 && (bestRight === null || right > bestRight)) {
        bestRight = right;
        bestLeft = pc.x - pc.width / 2;
      }
    });
    if (bestRight === null) {
      return this.checkpointX();
    }
    return Math.max(START_X, bestLeft + 20, bestRight - 60);
  }

  // Soft respawn: send the player back to the checkpoint but keep the power-up
  // and the world state (used when a heart absorbs a pit fall).
  softRespawn() {
    const cx = this.checkpointX();
    this.playerMain.reset(cx, this.spawnY);
    this.mirrors.forEach((m) => m.reset(cx + MIRROR_OFFSET_X, this.spawnY + MIRROR_OFFSET_Y));
  }

  // Full reset: lose the power-up (back to base), return to the checkpoint, and
  // restore the location's obstacles/enemies/etc.
  handleReset() {
    if (this.transitioning) {
      return;
    }
    this.playerMain.applyPowerUp(null);
    const cx = this.checkpointX();
    this.playerMain.reset(cx, this.spawnY);
    this.mirrors.forEach((m) => m.reset(cx + MIRROR_OFFSET_X, this.spawnY + MIRROR_OFFSET_Y));
    this.obstacles.forEach((o) => o.reset());
    this.platforms.forEach((p) => p.reset());
    this.movingPlatforms.forEach((m) => m.reset());
    this.coins.forEach((c) => c.reset());
    this.enemies.forEach((e) => e.reset());
    this.projectiles.clear(true, true);
    this.fireballs.clear(true, true);
    if (this.alienPulses) this.alienPulses.clear(true, true);
  }

  handleEnd() {
    if (this.transitioning) {
      return;
    }
    this.transitioning = true;
    this.playerMain.setControlsEnabled(false);

    // Finish-faster multiplier: full time left ~2x, no time left 1x.
    const multiplier = 1 + this.timeRemaining / START_TIME;
    const finalScore = Math.round(this.baseScore * multiplier);
    const collectables = SEGMENTS.map((seg, i) => ({
      stage: seg.name,
      items: Object.values(this.collectableStats[i] || {})
    })).filter((s) => s.items.length);
    const results = {
      mainCharacter: this.mainCharacter,
      coins: this.coinsCollected,
      enemiesDefeated: this.enemiesDefeated,
      baseScore: this.baseScore,
      timeRemaining: Math.ceil(this.timeRemaining),
      multiplier: Math.round(multiplier * 100) / 100,
      finalScore,
      collectables
    };

    // Play the thank-you cutscene as they leave the party, then fade into the
    // scorecard/leaderboard (the overlay stays up through the fade).
    this.playImageCutscene('thanks-for-playing', 'Thanks for playing! See you in November!', {
      captionInBottomThird: true,
      holdMs: 4000,
      then: () => {
        this.cameras.main.fadeOut(600);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('EndScene', results);
        });
      }
    });
  }
}
