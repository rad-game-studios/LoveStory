import { SHEET_KEY, SPRITE_DISPLAY_HEIGHT, FRAME_HEIGHT } from '../config/characterConfig.js';

const HEIGHT = 48;
const DUCK_HEIGHT = 36;

// A cosmetic companion: no physics body, never collides. Copies the main
// player's run/jump/duck state, facing, and size with a fixed trailing offset.
// Used for the human partner (the couple) and for Zero the dog.
//
// opts: { trail, offsetY, facesRight, board, alpha }
//   trail      = distance kept behind the main player (px)
//   facesRight = true if the art faces right by default (dog); else left (humans)
//   board      = show a skateboard under the sprite when the skateboard power-up is active
export class PlayerMirror extends Phaser.GameObjects.Container {
  constructor(scene, x, y, characterKey, opts = {}) {
    super(scene, x, y);
    this.scene.add.existing(this);

    this.characterKey = characterKey;
    this.trail = opts.trail ?? 40;
    this.offsetY = opts.offsetY ?? -20;
    this.facesRight = opts.facesRight ?? false;
    this.showBoard = opts.board ?? false;
    this.baseAlpha = opts.alpha ?? 0.85;

    this.createVisuals();
    this.scene.events.on('update', this.update, this);
  }

  createVisuals() {
    this.baseScale = SPRITE_DISPLAY_HEIGHT / FRAME_HEIGHT;
    this.sprite = this.scene.add.sprite(0, HEIGHT / 2, SHEET_KEY(this.characterKey), 0);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setScale(this.baseScale);
    this.sprite.setAlpha(this.baseAlpha);
    this.add(this.sprite);
    this.sprite.play(`${this.characterKey}-idle`, true);

    this.skateboardParts = [];
    if (this.showBoard) {
      const deck = this.scene.add.rectangle(0, 24, 46, 7, 0x3b2a1a).setStrokeStyle(1, 0x000000).setAlpha(this.baseAlpha);
      const wheel1 = this.scene.add.circle(-14, 29, 4, 0xd1d5db).setAlpha(this.baseAlpha);
      const wheel2 = this.scene.add.circle(14, 29, 4, 0xd1d5db).setAlpha(this.baseAlpha);
      this.skateboardParts = [deck, wheel1, wheel2];
      this.skateboardParts.forEach((o) => {
        o.setVisible(false);
        this.add(o);
      });
    }
  }

  update() {
    const main = this.scene.playerMain;
    if (!main || !this.visible) {
      return;
    }

    // Trail behind the direction the main player faces.
    const behind = main.facingLeft ? this.trail : -this.trail;
    this.setPosition(main.x + behind, main.y + this.offsetY);

    let anim = 'idle';
    if (main.isJumping) {
      anim = 'jump';
    } else if (main.isRunning) {
      anim = 'run';
    }
    this.sprite.play(`${this.characterKey}-${anim}`, true);

    // Mimic the main player's size + power-up look.
    const size = main.sizeMult || 1;
    this.sprite.y = (HEIGHT * size) / 2;
    const s = this.baseScale * size;
    if (main.isDucking) {
      this.sprite.scaleX = s;
      this.sprite.scaleY = s * (DUCK_HEIGHT / HEIGHT);
    } else {
      this.sprite.setScale(s);
    }
    // Humans face left by default (flip when facing right); the dog faces right.
    this.sprite.setFlipX(this.facesRight ? main.facingLeft : !main.facingLeft);
    this.skateboardParts.forEach((o) => o.setVisible(main.powerUp === 'skateboard'));
  }

  reset(x, y) {
    this.setPosition(x, y);
    this.sprite.setScale(this.baseScale);
    this.sprite.setFlipX(!this.facesRight);
    this.sprite.play(`${this.characterKey}-idle`, true);
  }
}
