import { ENEMY_TYPES, EMOJI_ENEMY_KEY } from '../config/enemyConfig.js';

const WALK_SPEED = 70;
const CHARGE_SPEED = WALK_SPEED * 2; // moose stampede — double its normal plod
const CHARGE_RANGE = 300; // horizontal distance at which the moose spots the player
const CHARGE_VRANGE = 130; // only charge when the player is near its own height
const FLY_SPEED = 55;
const FLY_PATROL = 150; // horizontal patrol half-range from spawn
const BOB_SPEED = 70; // vertical bob velocity amplitude
const BEER_SPEED = 55;
const BEER_PATROL = 120; // patrol half-range
const BEER_PAUSE = 900; // ms paused at each end before turning
const ALIEN_SPEED = 95; // horizontal cruise
const ALIEN_PATROL = 300; // wide sweep across the sky
const ALIEN_VSPEED = 95; // vertical zig speed (up/down legs form the V/X)
const ALIEN_VLEG = 900; // ms per vertical leg before flipping direction
const DANCE_SWAY = 60; // side-to-side sway speed
const DANCE_HOP = 170; // occasional little hop
const PIGEON_WALK = 40; // ground pigeon amble
const PIGEON_RUN = 100; // occasional run burst
const PIGEON_PATROL = 130; // patrol half-range
const PIGEON_HOP = 210; // random little hop
const PIGEON_SWOOP_H = 130; // swooper max horizontal pursuit speed
const PIGEON_SWOOP_V = 120; // swooper max vertical dive/climb speed
const PIGEON_SWOOP_RANGE = 240; // horizontal range within which it dives at the player

// Motions that fly (no gravity, no floor collision).
const FLYING_MOTIONS = new Set(['fly', 'vfly', 'pswoop']);

// Enemy kinds are defined in enemyConfig's ENEMY_TYPES registry (art + motion).
// All are lethal on side/below contact but squashed when stomped. Motions:
//   walk        — walks the ground, turns at blocks/edges.
//   charge      — plods the ground until it spots a nearby player, then stampedes
//                 toward them at double speed (moose).
//   fly         — hovers, patrols horizontally and bobs up/down.
//   patrolPause — patrols the ground, pausing at each end then turning (beer).
//   vfly        — sweeps the sky on a V/zig-zag path (alien).
//   dance       — sways in place with the occasional hop (party placeholders).
export class Enemy extends Phaser.GameObjects.Sprite {
  // `groundTop` is the ground surface; flyers spawn `opts.elevation` above it.
  constructor(scene, x, groundTop, opts = {}) {
    const type = ENEMY_TYPES[opts.type] ? opts.type : 'walker';
    const cfg = ENEMY_TYPES[type];
    const motion = cfg.motion;
    const isFlyer = FLYING_MOTIONS.has(motion);
    const elevation = opts.elevation ?? cfg.elevation ?? 130;
    const spawnY = isFlyer ? groundTop - elevation : groundTop;
    const usesAnim = cfg.art === 'goose' || cfg.art === 'sheet';
    // Most sheets use the anim key as their texture key; multi-anim sheets (moose)
    // set an explicit `texture` shared by several animations.
    const texture = usesAnim ? (cfg.texture || cfg.anim) : EMOJI_ENEMY_KEY(type);
    super(scene, x, spawnY, texture, 0);
    this.setOrigin(0.5, 1);
    scene.add.existing(this);
    scene.physics.add.existing(this, false);

    this.type = type;
    this.points = cfg.points ?? null; // null = use RunScene's global ENEMY_POINTS
    this.motion = motion;
    this.isFlyer = isFlyer;
    this.anim = usesAnim ? cfg.anim : null; // starting animation
    // Sheets facing left (moose) flip the opposite way to the right-facing default.
    this.facesLeft = cfg.facing === 'left';
    // Named animations (used by charge/pigeon motions that swap between them).
    this.walkAnim = cfg.anims?.walk || this.anim;
    this.chargeAnim = cfg.anims?.charge || this.anim;
    this.flyAnim = cfg.anims?.fly || this.anim;
    this.idleAnim = cfg.anims?.idle || this.anim;
    this.pigeonRunUntil = 0;
    this.initialX = x;
    this.initialY = spawnY;
    const patrol =
      motion === 'patrolPause'
        ? BEER_PATROL
        : motion === 'vfly'
        ? ALIEN_PATROL
        : motion === 'pwalk'
        ? PIGEON_PATROL
        : FLY_PATROL;
    this.minX = x - patrol;
    this.maxX = x + patrol;
    this.dir = -1; // start toward the incoming player
    this.alive = true;
    this.paused = false;
    this.pauseUntil = 0;
    this.phase = Math.random() * ALIEN_VLEG * 2; // desync vertical legs (V ↔ X)
    // Aliens fire laser pulses; stagger first shot so they don't all fire at once.
    this.nextFireAt = motion === 'vfly' ? scene.time.now + Phaser.Math.Between(800, 2500) : Infinity;

    // Scale a sprite sheet to its target display height (`size`).
    if (cfg.art === 'sheet' && cfg.size) {
      this.setScale(cfg.size / this.height);
    }
    // Per-instance scale multiplier (e.g. 1.5 for oversized variants).
    if (opts.scale && opts.scale !== 1) {
      this.setScale(this.scaleX * opts.scale, this.scaleY * opts.scale);
    }
    this.baseScaleX = this.scaleX;
    this.baseScaleY = this.scaleY;

    // Hitbox (in source-frame px; scales with the sprite). Sheets derive a
    // centred body inset from the frame; emoji fall back to a size fraction.
    let box = cfg.box;
    if (!box && cfg.art === 'sheet') {
      const bw = this.width * 0.6;
      const bh = this.height * 0.82;
      box = { w: bw, h: bh, ox: (this.width - bw) / 2, oy: this.height - bh };
    } else if (!box) {
      box = { w: cfg.size * 0.55, h: cfg.size * 0.6, ox: cfg.size * 0.225, oy: cfg.size * 0.2 };
    }
    this.body.setSize(box.w, box.h);
    this.body.setOffset(box.ox, box.oy);
    this.body.setCollideWorldBounds(!isFlyer);
    this.body.setAllowGravity(!isFlyer);

    if (this.anim) {
      this.play(this.anim);
    }
    scene.events.on('update', this.update, this);
  }

  update() {
    if (!this.body || !this.alive) {
      return;
    }
    if (this.motion === 'fly') {
      if (this.x <= this.minX) {
        this.dir = 1;
      } else if (this.x >= this.maxX) {
        this.dir = -1;
      }
      this.body.setVelocityX(FLY_SPEED * this.dir);
      this.body.setVelocityY(Math.cos(this.scene.time.now / 240) * BOB_SPEED);
      this.setFlipX(this.dir < 0);
    } else if (this.motion === 'vfly') {
      // Sky sweep: patrol wide horizontally while the vertical direction flips
      // each "leg", tracing a repeating V/zig-zag (X where paths cross).
      if (this.x <= this.minX) {
        this.dir = 1;
      } else if (this.x >= this.maxX) {
        this.dir = -1;
      }
      this.body.setVelocityX(ALIEN_SPEED * this.dir);
      const vdir = Math.floor((this.scene.time.now + this.phase) / ALIEN_VLEG) % 2 === 0 ? 1 : -1;
      this.body.setVelocityY(ALIEN_VSPEED * vdir);
      this.setFlipX(this.dir < 0);
      // Fire a laser pulse at the player on a random interval.
      if (this.scene.time.now >= this.nextFireAt && typeof this.scene.spawnAlienPulse === 'function') {
        this.scene.spawnAlienPulse(this.x, this.y - this.displayHeight * 0.3);
        this.nextFireAt = this.scene.time.now + Phaser.Math.Between(1800, 3200);
      }
    } else if (this.motion === 'dance') {
      // Placeholder groove: sway side to side, hop now and then.
      const sway = Math.sin((this.scene.time.now + this.phase) / 200);
      this.body.setVelocityX(DANCE_SWAY * sway);
      this.setFlipX(sway < 0);
      if (this.body.blocked.down && Math.sin((this.scene.time.now + this.phase) / 90) > 0.985) {
        this.body.setVelocityY(-DANCE_HOP);
      }
    } else if (this.motion === 'patrolPause') {
      // Patrol back and forth, pausing at each end (or a wall) then turning.
      if (this.paused) {
        this.body.setVelocityX(0);
        if (this.scene.time.now >= this.pauseUntil) {
          this.paused = false;
          this.dir *= -1;
        }
        return;
      }
      const atEnd =
        (this.dir < 0 && (this.x <= this.minX || this.body.blocked.left)) ||
        (this.dir > 0 && (this.x >= this.maxX || this.body.blocked.right));
      if (atEnd) {
        this.paused = true;
        this.pauseUntil = this.scene.time.now + BEER_PAUSE;
        this.body.setVelocityX(0);
      } else {
        this.body.setVelocityX(BEER_SPEED * this.dir);
      }
    } else if (this.motion === 'charge') {
      // Plod along until the player comes within range at roughly the same
      // height, then stampede straight at them at double the walk speed.
      const player = this.scene.playerMain;
      const dx = player ? player.x - this.x : Infinity;
      const dy = player ? Math.abs(player.y - this.y) : Infinity;
      this.charging = player && Math.abs(dx) <= CHARGE_RANGE && dy <= CHARGE_VRANGE;
      if (this.charging) {
        this.dir = dx < 0 ? -1 : 1;
        this.body.setVelocityX(CHARGE_SPEED * this.dir);
      } else {
        if (this.body.blocked.left) {
          this.dir = 1;
        } else if (this.body.blocked.right) {
          this.dir = -1;
        }
        this.body.setVelocityX(WALK_SPEED * this.dir);
      }
      this.setFlipX(this.facesLeft ? this.dir > 0 : this.dir < 0);
      const wantAnim = this.charging ? this.chargeAnim : this.walkAnim;
      if (wantAnim) {
        this.play(wantAnim, true); // ignoreIfPlaying — won't restart each frame
      }
    } else if (this.motion === 'pwalk') {
      // Ground pigeon: amble back and forth, break into an occasional run, and
      // hop at random. Turns at the patrol edges or a wall.
      if (this.x <= this.minX || this.body.blocked.left) {
        this.dir = 1;
      } else if (this.x >= this.maxX || this.body.blocked.right) {
        this.dir = -1;
      }
      if (this.scene.time.now >= this.pigeonRunUntil && Math.random() < 0.004) {
        this.pigeonRunUntil = this.scene.time.now + Phaser.Math.Between(500, 1100);
      }
      const running = this.scene.time.now < this.pigeonRunUntil;
      this.body.setVelocityX((running ? PIGEON_RUN : PIGEON_WALK) * this.dir);
      if (this.body.blocked.down && Math.random() < 0.012) {
        this.body.setVelocityY(-PIGEON_HOP);
      }
      this.setFlipX(this.facesLeft ? this.dir > 0 : this.dir < 0);
      // Flap while airborne (hopping), otherwise strut.
      const want = this.body.blocked.down ? this.walkAnim : this.flyAnim;
      if (want) {
        this.play(want, true);
      }
    } else if (this.motion === 'pswoop') {
      // Swooping pigeon: pursue the player horizontally, diving toward them when
      // roughly overhead and climbing back to cruise height once they slip past.
      const player = this.scene.playerMain;
      if (player) {
        const dx = player.x - this.x;
        this.dir = dx < 0 ? -1 : 1;
        this.body.setVelocityX(Phaser.Math.Clamp(dx * 2, -PIGEON_SWOOP_H, PIGEON_SWOOP_H));
        const overhead = Math.abs(dx) < PIGEON_SWOOP_RANGE;
        const targetY = overhead ? player.y - 8 : this.initialY;
        this.body.setVelocityY(Phaser.Math.Clamp((targetY - this.y) * 3, -PIGEON_SWOOP_V, PIGEON_SWOOP_V));
      } else {
        this.body.setVelocity(0, 0);
      }
      this.setFlipX(this.facesLeft ? this.dir > 0 : this.dir < 0);
      if (this.flyAnim) {
        this.play(this.flyAnim, true);
      }
    } else {
      if (this.body.blocked.left) {
        this.dir = 1;
      } else if (this.body.blocked.right) {
        this.dir = -1;
      }
      this.body.setVelocityX(WALK_SPEED * this.dir);
      this.setFlipX(this.dir < 0);
    }
  }

  // Stomped from above: flatten, disable, and disappear.
  squash() {
    if (!this.alive) {
      return;
    }
    this.alive = false;
    this.body.setVelocity(0, 0);
    this.body.setEnable(false);
    this.anims.stop();
    this.scene.tweens.add({
      targets: this,
      scaleY: this.baseScaleY * 0.3,
      alpha: 0,
      duration: 150,
      onComplete: () => this.setVisible(false)
    });
  }

  reset() {
    this.alive = true;
    this.dir = -1;
    this.paused = false;
    this.charging = false;
    this.pigeonRunUntil = 0;
    if (this.motion === 'vfly') {
      this.nextFireAt = this.scene.time.now + Phaser.Math.Between(800, 2500);
    }
    this.setVisible(true);
    this.setScale(this.baseScaleX, this.baseScaleY);
    this.setAlpha(1);
    this.setFlipX(false);
    this.setPosition(this.initialX, this.initialY);
    if (this.body) {
      this.body.setEnable(true);
      this.body.reset(this.initialX, this.initialY);
      this.body.setVelocity(0, 0);
    }
    if (this.anim) {
      this.play(this.anim);
    }
  }
}
