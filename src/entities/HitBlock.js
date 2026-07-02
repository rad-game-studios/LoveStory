const SIZE = 40;

// A Mario-style hit block. Solid (acts as a platform: stand on top / blocked at
// sides). Head-bump it from below once to dispense its contents:
//   - normal (yellow '?')            -> a coin
//   - special (checkerboard, gold)   -> a special item (e.g. skateboard)
// After being hit it becomes an inert "used" block (still solid).
export class HitBlock extends Phaser.GameObjects.Image {
  // `topY` is the block's top surface (like a platform).
  constructor(scene, x, topY, opts = {}) {
    HitBlock.ensureTextures(scene);
    const special = Boolean(opts.special);
    super(scene, x, topY, special ? 'hitblock-special' : 'hitblock-yellow');
    this.setOrigin(0.5, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.special = special;
    this.item = opts.item || null;
    this.used = false;
    this.initialY = topY;
  }

  // Returns true if this bump dispensed (false if already used).
  bump() {
    if (this.used) {
      return false;
    }
    this.used = true;
    this.setTexture('hitblock-used');
    this.scene.tweens.add({
      targets: this,
      y: this.initialY - 8,
      duration: 80,
      yoyo: true,
      onComplete: () => {
        this.y = this.initialY;
        if (this.body) {
          this.body.updateFromGameObject();
        }
      }
    });
    return true;
  }

  static ensureTextures(scene) {
    const S = SIZE;
    const make = (key, draw) => {
      if (scene.textures.exists(key)) {
        return;
      }
      const c = document.createElement('canvas');
      c.width = S;
      c.height = S;
      draw(c.getContext('2d'), S);
      scene.textures.addCanvas(key, c);
    };
    const rivets = (x, color) => {
      x.fillStyle = color;
      [[5, 5], [S - 5, 5], [5, S - 5], [S - 5, S - 5]].forEach(([cx, cy]) => {
        x.beginPath();
        x.arc(cx, cy, 2, 0, Math.PI * 2);
        x.fill();
      });
    };
    make('hitblock-yellow', (x) => {
      x.fillStyle = '#f7b500';
      x.fillRect(0, 0, S, S);
      x.strokeStyle = '#7c4a03';
      x.lineWidth = 3;
      x.strokeRect(1.5, 1.5, S - 3, S - 3);
      rivets(x, '#7c4a03');
      x.fillStyle = '#7c4a03';
      x.font = 'bold 26px sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('?', S / 2, S / 2 + 1);
    });
    make('hitblock-used', (x) => {
      x.fillStyle = '#8a5a2b';
      x.fillRect(0, 0, S, S);
      x.strokeStyle = '#5c3a1a';
      x.lineWidth = 3;
      x.strokeRect(1.5, 1.5, S - 3, S - 3);
      rivets(x, '#5c3a1a');
    });
    make('hitblock-special', (x) => {
      const n = 5;
      const sq = S / n;
      for (let r = 0; r < n; r++) {
        for (let col = 0; col < n; col++) {
          x.fillStyle = (r + col) % 2 === 0 ? '#111111' : '#f5f5f5';
          x.fillRect(col * sq, r * sq, sq, sq);
        }
      }
      x.strokeStyle = '#fde047';
      x.lineWidth = 3;
      x.strokeRect(1.5, 1.5, S - 3, S - 3);
    });
  }
}
