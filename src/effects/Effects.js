import { VIEW_WIDTH } from '../config/worldConfig.js';

// All particle effects use small textures generated at runtime (Graphics ->
// generateTexture), so there are zero image-asset dependencies. One-shot bursts
// (dust, sparkle) reuse persistent emitters; ambient weather (snow, confetti)
// is a screen-pinned emitter toggled per location.
export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.ensureTextures();

    // Dust kicked up on jump/land (near the feet, follows the world).
    this.dust = scene.add.particles(0, 0, 'fx-dot', {
      lifespan: 350,
      speed: { min: 20, max: 80 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.7, end: 0 },
      gravityY: 220,
      tint: 0xcbb89a,
      emitting: false
    });
    this.dust.setDepth(9);

    // Sparkle burst when an enemy is stomped.
    this.spark = scene.add.particles(0, 0, 'fx-dot', {
      lifespan: 450,
      speed: { min: 60, max: 160 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: 120,
      tint: [0xfde047, 0xfacc15, 0xfff7cc],
      emitting: false
    });
    this.spark.setDepth(9);

    this.ambientKind = null;
    this.ambient = null;
  }

  ensureTextures() {
    const s = this.scene;
    if (!s.textures.exists('fx-dot')) {
      const g = s.make.graphics({ add: false });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(6, 6, 6);
      g.generateTexture('fx-dot', 12, 12);
      g.destroy();
    }
    if (!s.textures.exists('fx-square')) {
      const g = s.make.graphics({ add: false });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 10, 10);
      g.generateTexture('fx-square', 10, 10);
      g.destroy();
    }
  }

  burstDust(x, y, count = 7) {
    this.dust.explode(count, x, y);
  }

  sparkle(x, y, count = 14) {
    this.spark.explode(count, x, y);
  }

  // Switch the ambient weather to match the current location (or none).
  // kind: 'snow' | 'confetti' | null
  setAmbient(kind) {
    if (kind === this.ambientKind) {
      return;
    }
    this.ambientKind = kind;
    if (this.ambient) {
      this.ambient.destroy();
      this.ambient = null;
    }
    if (!kind) {
      return;
    }

    const common = {
      x: { min: 0, max: VIEW_WIDTH },
      y: -12,
      quantity: 1
    };

    if (kind === 'snow') {
      this.ambient = this.scene.add.particles(0, 0, 'fx-dot', {
        ...common,
        frequency: 70,
        lifespan: 9000,
        speedY: { min: 40, max: 90 },
        speedX: { min: -25, max: 25 },
        scale: { min: 0.15, max: 0.4 },
        alpha: { min: 0.4, max: 0.9 },
        tint: 0xffffff
      });
    } else if (kind === 'confetti') {
      this.ambient = this.scene.add.particles(0, 0, 'fx-square', {
        ...common,
        frequency: 45,
        lifespan: 7000,
        speedY: { min: 70, max: 130 },
        speedX: { min: -40, max: 40 },
        scale: { min: 0.4, max: 0.9 },
        rotate: { min: 0, max: 360 },
        tint: [0xf472b6, 0x60a5fa, 0xfde047, 0x34d399, 0xf87171, 0xa78bfa]
      });
    }

    if (this.ambient) {
      this.ambient.setScrollFactor(0).setDepth(16);
    }
  }
}
