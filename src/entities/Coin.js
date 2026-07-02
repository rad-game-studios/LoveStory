// A collectible coin. Texture is generated at runtime (no asset file). Bobs in
// place; collected on overlap with the player. Pass `opts.emoji` to reskin it
// as an emoji collectible (bone, diamond, cross, …) and `opts.points` to set
// its score value (defaults to 10).
export class Coin extends Phaser.GameObjects.Image {
  constructor(scene, x, y, opts = {}) {
    const emoji = opts.emoji || null;
    const size = opts.size || (emoji ? 34 : 26);
    const textureKey = emoji ? Coin.ensureEmojiTexture(scene, emoji, size) : (Coin.ensureTexture(scene), 'coin-tex');
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(6);

    this.points = opts.points || 10;
    this.collected = false;
    this.initialX = x;
    this.initialY = y;
    this.bob = scene.tweens.add({
      targets: this,
      y: y - 8,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
  }

  static ensureTexture(scene) {
    if (scene.textures.exists('coin-tex')) {
      return;
    }
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0xb45309, 1);
    g.fillCircle(13, 13, 13); // rim
    g.fillStyle(0xfacc15, 1);
    g.fillCircle(13, 13, 11); // face
    g.fillStyle(0xfde68a, 1);
    g.fillRect(11, 5, 4, 16); // shine
    g.generateTexture('coin-tex', 26, 26);
    g.destroy();
  }

  // Render an emoji glyph to a transparent canvas texture (returns the key).
  static ensureEmojiTexture(scene, emoji, size = 34) {
    const key = `coin-emoji-${emoji}`;
    if (scene.textures.exists(key)) {
      return key;
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
    return key;
  }

  // Returns true if this call collected the coin (false if already collected).
  collect() {
    if (this.collected) {
      return false;
    }
    this.collected = true;
    if (this.body) {
      this.body.enable = false;
    }
    if (this.bob) {
      this.bob.stop();
    }
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.7,
      scaleY: 1.7,
      alpha: 0,
      duration: 200,
      onComplete: () => this.setVisible(false)
    });
    return true;
  }

  reset() {
    // Collected coins stay collected; this restores an uncollected coin's bob
    // origin if it was nudged. (No-op for collected coins.)
    if (!this.collected) {
      this.setPosition(this.initialX, this.initialY);
    }
  }
}
