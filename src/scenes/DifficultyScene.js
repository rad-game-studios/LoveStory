import { hasBeatenGame } from '../services/progress.js';
import { addFullscreenButton } from '../ui/fullscreen.js';

const W = 960;
const H = 540;

// Difficulty picker shown right after the splash screen (every fresh start).
// The choice is stored on the game registry so it survives every later scene
// hop (Title/HowTo/StageSelect/Run/End → restart) without threading through
// each scene.start call. Normal = the standard challenge; Very Easy = unlimited
// health plus gentle pit recovery.
const OPTIONS = [
  {
    value: 'normal',
    label: 'NORMAL',
    blurb: 'The full challenge — 3 hearts, and pits or hits can end your run.'
  },
  {
    value: 'veryEasy',
    label: 'VERY EASY',
    blurb: 'Unlimited health, and a pit fall just sets you back a few steps.'
  }
];

export class DifficultyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DifficultyScene' });
  }

  create() {
    this.selected = 0; // Normal is the default.
    this.advanced = false;

    this.add.rectangle(W / 2, H / 2, W, H, 0x111827).setOrigin(0.5);
    addFullscreenButton(this);
    this.add.text(W / 2, 92, 'CHOOSE DIFFICULTY', { fontSize: '44px', color: '#fef3c7', fontStyle: 'bold' }).setOrigin(0.5);

    const top = 210;
    const rowH = 128;
    this.rows = OPTIONS.map((opt, i) => {
      const y = top + i * rowH;
      const box = this.add
        .rectangle(W / 2, y, 620, 104, 0x1f2937)
        .setStrokeStyle(4, 0x374151)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(W / 2, y - 22, opt.label, { fontSize: '30px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
      const blurb = this.add
        .text(W / 2, y + 20, opt.blurb, { fontSize: '17px', color: '#cbd5e1', align: 'center', wordWrap: { width: 560 } })
        .setOrigin(0.5);
      box.on('pointerover', () => this.select(i));
      box.on('pointerdown', () => this.confirm(i));
      return { box, label, blurb };
    });

    this.add
      .text(W / 2, H - 34, 'Arrow keys to choose  ·  Enter / click to start', { fontSize: '16px', color: '#9ca3af' })
      .setOrigin(0.5);

    const kb = this.input.keyboard;
    kb.on('keydown-UP', () => this.select(0));
    kb.on('keydown-LEFT', () => this.select(0));
    kb.on('keydown-DOWN', () => this.select(1));
    kb.on('keydown-RIGHT', () => this.select(1));
    kb.on('keydown-ENTER', () => this.confirm(this.selected));
    kb.on('keydown-SPACE', () => this.confirm(this.selected));

    this.select(0);
  }

  select(i) {
    this.selected = i;
    this.rows.forEach((row, idx) => {
      const on = idx === i;
      row.box.setStrokeStyle(4, on ? 0xfde047 : 0x374151);
      row.box.setFillStyle(on ? 0x273449 : 0x1f2937);
    });
  }

  confirm(i) {
    if (this.advanced) {
      return;
    }
    this.advanced = true;
    this.registry.set('difficulty', OPTIONS[i].value);
    // Route onward exactly as the splash used to: character select once the game
    // has been beaten, otherwise straight into the first Ricky-only playthrough.
    if (hasBeatenGame()) {
      this.scene.start('TitleScene');
    } else {
      this.scene.start('HowToScene', { mainCharacter: 'ricky' });
    }
  }
}
