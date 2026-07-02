import { hasBeatenGame } from '../services/progress.js';

const W = 960;
const H = 540;

// Shown after the title screen: a quick rundown of the controls and the core
// gameplay concepts before the run begins.
export class HowToScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HowToScene' });
  }

  create(data = {}) {
    this.mainCharacter = data.mainCharacter || 'ricky';

    // Make sure no leftover DOM element (e.g. the End-screen name input) still
    // holds focus, which would swallow the Enter/Space keydown below.
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }

    this.add.rectangle(W / 2, H / 2, W, H, 0x111827).setOrigin(0.5);
    this.add.text(W / 2, 32, 'HOW TO PLAY', { fontSize: '38px', color: '#fef3c7', fontStyle: 'bold' }).setOrigin(0.5);

    // --- Controls (left column) ---
    this.add
      .text(70, 82, 'CONTROLS', { fontSize: '22px', color: '#fde047', fontStyle: 'bold' })
      .setOrigin(0, 0.5);
    const controls = [
      ['Move', '\u2190 \u2192  or  A / D'],
      ['Jump', '\u2191 / W / Space  (hold = higher, press again to double jump)'],
      ['Duck', '\u2193 / S'],
      ['Shoot', 'F  (with a shooting power-up)']
    ];
    let cy = 120;
    controls.forEach(([label, keys]) => {
      this.add.text(70, cy, label, { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0, 0.5);
      this.add.text(230, cy, keys, { fontSize: '18px', color: '#e5e7eb' }).setOrigin(0, 0.5);
      cy += 36;
    });

    // --- Continue prompt ---
    const beaten = hasBeatenGame();
    const prompt = this.add
      .text(W / 2, H - 20, beaten ? 'Press ENTER to choose a stage' : 'Press ENTER to start your run', {
        fontSize: '18px',
        color: '#9ca3af'
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    let advanced = false;
    const start = () => {
      if (advanced) return;
      advanced = true;
      // Clean up the other two listeners so nothing lingers into the next scene.
      this.input.keyboard.off('keydown-ENTER', start);
      this.input.keyboard.off('keydown-SPACE', start);
      this.input.off('pointerdown', start);
      const next = beaten ? 'StageSelectScene' : 'RunScene';
      this.scene.start(next, { mainCharacter: this.mainCharacter });
    };
    this.input.keyboard.on('keydown-ENTER', start);
    this.input.keyboard.on('keydown-SPACE', start);
    this.input.on('pointerdown', start);
  }
}
