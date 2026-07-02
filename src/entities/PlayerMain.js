import { SHEET_KEY, SPRITE_DISPLAY_HEIGHT, FRAME_HEIGHT } from '../config/characterConfig.js';

const WIDTH = 34;
const HEIGHT = 48;
const DUCK_HEIGHT = 36;
const RUN_SPEED = 240;
const JUMP_VELOCITY = -640;
const STOMP_BOUNCE = -420;
const JUMP_CUT = 0.4;
const FLY_SPEED = 270;
const SHOOT_COOLDOWN = 160;
const HIT_INVULN = 1200;
const BASE_HEARTS = 3; // life points the player always starts/respawns with

// Power-up effects. Only one is active at a time — collecting a special resets
// to base and applies the new one (Mario-style). Unset fields default to base.
//   speed/jump/size multipliers · board (skateboard visual) · shoot · hearts
//   (extra life points added on top of BASE_HEARTS) · fly · doubleJump
//   invincible · duration (ms, timed then reverts to base)
const POWER_UPS = {
  skateboard: { speed: 1.6, size: 1.5, board: true },
  beer: { size: 1.5, shoot: 'fire' },
  shootingStar: { jump: 1.35, size: 2, shoot: 'star' },
  ring: { speed: 1.6, jump: 1.35, size: 2, hearts: 3 },
  wings: { size: 1.7, fly: true, invincible: true, duration: 15000 },
  musicNote: { size: 1.5, shoot: 'laser' }
};

// Cap character growth at the skateboard's size (biggest allowed).
const MAX_SIZE_MULT = POWER_UPS.skateboard.size;

export class PlayerMain extends Phaser.GameObjects.Container {
  constructor(scene, x, y, mainCharacter = 'ricky') {
    super(scene, x, y);
    this.scene.add.existing(this);

    this.mainCharacter = mainCharacter;
    this.controlsEnabled = true;
    this.facingLeft = false;

    this.isRunning = false;
    this.isJumping = false;
    this.isDucking = false;
    this.jumpsUsed = 0;
    this.lastShotAt = 0;
    this.invulnUntil = 0;
    this.powerUpTimer = null;
    this.powerUpExpiresAt = 0;

    this.createVisuals();

    this.scene.physics.add.existing(this, false);
    this.body.setCollideWorldBounds(true);
    this.setupInput();
    this.applyPowerUp(null); // base state (sets gravity, size, body, flags)

    this.scene.events.on('update', this.update, this);
  }

  createVisuals() {
    this.baseScale = SPRITE_DISPLAY_HEIGHT / FRAME_HEIGHT;
    this.sprite = this.scene.add.sprite(0, HEIGHT / 2, SHEET_KEY(this.mainCharacter), 0);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setScale(this.baseScale);
    this.add(this.sprite);
    this.sprite.play(`${this.mainCharacter}-idle`, true);

    // Red chevron that hovers above the head so the player can always spot the
    // character they control. Positioned in refreshSprite(), bobbed in update().
    this.chevron = this.scene.add
      .triangle(0, 0, -12, -10, 12, -10, 0, 6, 0xff2d2d)
      .setStrokeStyle(2, 0xffffff);
    this.chevron.x = 12; // nudge right so its center sits over the character
    this.add(this.chevron);
    this.chevronBaseY = 0;

    const deck = this.scene.add.rectangle(0, 24, 46, 7, 0x3b2a1a).setStrokeStyle(1, 0x000000);
    const wheel1 = this.scene.add.circle(-14, 29, 4, 0xd1d5db);
    const wheel2 = this.scene.add.circle(14, 29, 4, 0xd1d5db);
    this.skateboardParts = [deck, wheel1, wheel2];
    this.skateboardParts.forEach((o) => {
      o.setVisible(false);
      this.add(o);
    });
  }

  // Apply a power-up by name (null = base). Resets any previous power-up first.
  applyPowerUp(name) {
    if (this.powerUpTimer) {
      this.powerUpTimer.remove(false);
      this.powerUpTimer = null;
    }
    const prevSize = this.sizeMult || 1;
    const p = POWER_UPS[name] || {};

    this.powerUp = name || null;
    this.speedMult = p.speed || 1;
    this.jumpMult = p.jump || 1;
    this.sizeMult = Math.min(p.size || 1, MAX_SIZE_MULT);
    this.hearts = BASE_HEARTS + (p.hearts || 0);
    this.invincible = Boolean(p.invincible);
    this.canFly = Boolean(p.fly);
    this.canDoubleJump = Boolean(p.doubleJump);
    this.canShoot = Boolean(p.shoot);
    this.shootType = p.shoot || null;
    this.skateboardParts.forEach((o) => o.setVisible(Boolean(p.board)));
    this.body.setAllowGravity(!this.canFly);

    // Keep feet planted as the body grows/shrinks (changes happen upward).
    this.y -= (HEIGHT * this.sizeMult) / 2 - (HEIGHT * prevSize) / 2;
    this.setStandingBody();
    this.refreshSprite();
    this.sprite.setAlpha(1);

    if (p.duration) {
      this.powerUpExpiresAt = this.scene.time.now + p.duration;
      this.powerUpTimer = this.scene.time.delayedCall(p.duration, () => this.applyPowerUp(null));
    } else {
      this.powerUpExpiresAt = 0;
    }
  }

  // Enemy contact. Returns 'ignore' (immune), 'hit' (heart absorbed), or 'reset'.
  hurt() {
    if (this.invincible || this.scene.time.now < this.invulnUntil) {
      return 'ignore';
    }
    // Very Easy: hits never drain health or reset the run — just a brief flinch.
    if (this.scene.difficulty === 'veryEasy') {
      this.invulnUntil = this.scene.time.now + HIT_INVULN;
      return 'hit';
    }
    if (this.hearts > 0) {
      this.hearts -= 1;
      this.invulnUntil = this.scene.time.now + HIT_INVULN;
      return 'hit';
    }
    return 'reset';
  }

  setupInput() {
    const keyboard = this.scene.input.keyboard;
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      F: Phaser.Input.Keyboard.KeyCodes.F,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE
    });
  }

  setStandingBody() {
    const w = WIDTH * this.sizeMult;
    const h = HEIGHT * this.sizeMult;
    this.body.setSize(w, h);
    this.body.setOffset(-w / 2, -h / 2);
  }

  setDuckingBody() {
    const w = WIDTH * this.sizeMult;
    const h = DUCK_HEIGHT * this.sizeMult;
    const full = HEIGHT * this.sizeMult;
    this.body.setSize(w, h);
    this.body.setOffset(-w / 2, full / 2 - h);
  }

  refreshSprite() {
    this.sprite.y = (HEIGHT * this.sizeMult) / 2;
    const s = this.baseScale * this.sizeMult;
    if (this.isDucking) {
      this.sprite.scaleX = s;
      this.sprite.scaleY = s * (DUCK_HEIGHT / HEIGHT);
    } else {
      this.sprite.setScale(s);
    }
    this.sprite.setFlipX(!this.facingLeft);

    // Park the chevron just above the character's head (scales with size).
    const displayH = this.isDucking ? SPRITE_DISPLAY_HEIGHT * this.sizeMult * (DUCK_HEIGHT / HEIGHT) : SPRITE_DISPLAY_HEIGHT * this.sizeMult;
    this.chevronBaseY = this.sprite.y - displayH - 14;
    if (this.chevron) {
      this.chevron.y = this.chevronBaseY;
    }
  }

  setControlsEnabled(enabled) {
    this.controlsEnabled = enabled;
    if (!enabled) {
      this.body.setVelocityX(0);
      this.isRunning = false;
      this.isJumping = false;
      this.isDucking = false;
    }
  }

  updateAnimation() {
    let anim = 'idle';
    if (this.isJumping) {
      anim = 'jump';
    } else if (this.isRunning) {
      anim = 'run';
    }
    this.sprite.play(`${this.mainCharacter}-${anim}`, true);
    this.refreshSprite();

    const invuln = this.invincible || this.scene.time.now < this.invulnUntil;
    this.sprite.setAlpha(invuln && Math.floor(this.scene.time.now / 100) % 2 === 0 ? 0.4 : 1);
  }

  update() {
    if (!this.body) {
      return;
    }
    if (this.chevron) {
      this.chevron.y = this.chevronBaseY - Math.abs(Math.sin(this.scene.time.now / 250)) * 6;
    }
    // On-screen touch buttons (mobile) feed this; empty object on desktop.
    const vi = this.scene.virtualInput || {};

    if (!this.controlsEnabled) {
      this.body.setVelocityX(0);
      // Drop any queued touch edges so they don't fire when control resumes.
      vi.jumpEdge = vi.jumpReleasedEdge = vi.shootEdge = false;
      return;
    }

    const { cursors, keys } = this;
    const movingRight = cursors.right.isDown || keys.D.isDown || vi.right;
    const movingLeft = cursors.left.isDown || keys.A.isDown || vi.left;
    const up = cursors.up.isDown || keys.W.isDown || keys.SPACE.isDown || vi.up;
    const down = cursors.down.isDown || keys.S.isDown || vi.down;
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(cursors.up) ||
      Phaser.Input.Keyboard.JustDown(keys.W) ||
      Phaser.Input.Keyboard.JustDown(keys.SPACE) ||
      vi.jumpEdge;
    const jumpReleased =
      Phaser.Input.Keyboard.JustUp(cursors.up) ||
      Phaser.Input.Keyboard.JustUp(keys.W) ||
      Phaser.Input.Keyboard.JustUp(keys.SPACE) ||
      vi.jumpReleasedEdge;
    // Consume the one-shot touch edges.
    vi.jumpEdge = false;
    vi.jumpReleasedEdge = false;

    // Horizontal movement.
    const speed = RUN_SPEED * this.speedMult;
    let velocityX = 0;
    if (movingRight && !movingLeft) {
      velocityX = speed;
      this.facingLeft = false;
    } else if (movingLeft && !movingRight) {
      velocityX = -speed;
      this.facingLeft = true;
    }
    this.body.setVelocityX(velocityX);
    this.isRunning = velocityX !== 0;

    if (this.canFly) {
      // Angel wings: free vertical flight, no gravity, no ducking.
      this.body.setVelocityY(up && !down ? -FLY_SPEED : down && !up ? FLY_SPEED : 0);
      this.isDucking = false;
      this.isJumping = true;
      this.setStandingBody();
    } else {
      // Ground jumping (+ double jump) and variable jump height.
      if (this.body.blocked.down) {
        this.jumpsUsed = 0;
      }
      if (jumpPressed) {
        if (this.body.blocked.down) {
          this.body.setVelocityY(JUMP_VELOCITY * this.jumpMult);
          this.jumpsUsed = 1;
        } else if (this.jumpsUsed < 2) {
          // Universal double jump: everyone gets a second mid-air jump.
          this.body.setVelocityY(JUMP_VELOCITY * this.jumpMult);
          this.jumpsUsed += 1;
        }
      }
      if (jumpReleased && this.body.velocity.y < 0) {
        this.body.setVelocityY(this.body.velocity.y * JUMP_CUT);
      }
      this.isDucking = down;
      this.isJumping = !this.body.blocked.down;
      if (this.isDucking) {
        this.setDuckingBody();
      } else {
        this.setStandingBody();
      }
    }

    // Shoot (star or fireball, depending on the active power-up).
    const shootPressed = Phaser.Input.Keyboard.JustDown(keys.F) || vi.shootEdge;
    vi.shootEdge = false;
    if (this.canShoot && shootPressed && this.scene.time.now - this.lastShotAt > SHOOT_COOLDOWN) {
      this.lastShotAt = this.scene.time.now;
      // Fire from the top of the current stance, so crouching shoots lower.
      const feet = this.y + (HEIGHT * this.sizeMult) / 2;
      const stanceHeight = this.isDucking ? DUCK_HEIGHT : HEIGHT;
      const originY = feet - stanceHeight * this.sizeMult;
      const dir = this.facingLeft ? -1 : 1;
      if (this.shootType === 'fire' && this.scene.fireFireball) {
        this.scene.fireFireball(this.x, originY, dir);
      } else if (this.shootType === 'laser' && this.scene.fireLaser) {
        this.scene.fireLaser(this.x, originY, dir);
      } else if (this.scene.fireStar) {
        this.scene.fireStar(this.x, originY, dir);
      }
    }

    this.updateAnimation();
  }

  bounce() {
    this.body.setVelocityY(STOMP_BOUNCE);
  }

  reset(x, y) {
    // Place feet on the ground regardless of current size.
    const feetGround = y + HEIGHT / 2;
    const cy = feetGround - (HEIGHT * this.sizeMult) / 2;
    this.setPosition(x, cy);
    this.body.reset(x, cy);
    this.setAlpha(1);
    this.facingLeft = false;
    this.isRunning = false;
    this.isJumping = false;
    this.isDucking = false;
    this.jumpsUsed = 0;
    this.setStandingBody();
    this.refreshSprite();
    this.sprite.play(`${this.mainCharacter}-idle`, true);
  }
}
