import { SEGMENTS } from '../config/worldConfig.js';

const W = 960;
const H = 540;
const NEXT_SCENE = 'RunScene';

// Unlocked after beating the game: pick any stage to start from. Shown between
// the How-to screen and the run for returning players.
export class StageSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StageSelectScene' });
  }

  create(data = {}) {
    this.mainCharacter = data.mainCharacter || 'ricky';
    this.started = false;

    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    // Restore canvas keyboard focus — it may have been stolen by EndScene's DOM
    // input and not properly returned during the TitleScene → HowToScene hops.
    if (this.game.canvas) {
      this.game.canvas.setAttribute('tabindex', '0');
      this.game.canvas.focus();
    }

    this.add.rectangle(W / 2, H / 2, W, H, 0x111827).setOrigin(0.5);
    this.add.text(W / 2, 46, 'SELECT A STAGE', { fontSize: '38px', color: '#fef3c7', fontStyle: 'bold' }).setOrigin(0.5);
    this.add
      .text(W / 2, 92, 'You beat the game — jump into any stage', { fontSize: '16px', color: '#9ca3af' })
      .setOrigin(0.5);

    const top = 138;
    const rowH = 44;
    SEGMENTS.forEach((seg, i) => {
      const y = top + i * rowH;
      const label = `${i + 1}.  ${seg.name}`;
      const row = this.add
        .text(W / 2, y, label, {
          fontSize: '20px',
          color: '#e5e7eb',
          fontStyle: 'bold',
          backgroundColor: '#1f2937',
          padding: { x: 18, y: 8 },
          fixedWidth: 520,
          align: 'center'
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      row.on('pointerover', () => row.setBackgroundColor('#374151'));
      row.on('pointerout', () => row.setBackgroundColor('#1f2937'));
      row.on('pointerdown', () => this.startStage(i));
    });

    this.add
      .text(W / 2, H - 24, 'Click a stage  ·  or press ENTER to start from the beginning', {
        fontSize: '15px',
        color: '#9ca3af'
      })
      .setOrigin(0.5);

    this.input.keyboard.once('keydown-ENTER', () => this.startStage(0));
    this.input.keyboard.once('keydown-SPACE', () => this.startStage(0));
  }

  startStage(index) {
    if (this.started) return;
    this.started = true;
    this.scene.start(NEXT_SCENE, { mainCharacter: this.mainCharacter, startSegment: index });
  }
}
