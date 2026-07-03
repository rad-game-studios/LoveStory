import { CHARACTERS, PORTRAIT_KEY } from '../config/characterConfig.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { isZeroUnlocked } from '../services/progress.js';

const FIRST_SCENE = 'HowToScene';
const LABELS = { ricky: 'RICKY', denise: 'DENISE', zero: 'ZERO' };

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  preload() {
    Object.values(CHARACTERS).forEach((cfg) => {
      if (!this.textures.exists(PORTRAIT_KEY(cfg.key))) {
        this.load.image(PORTRAIT_KEY(cfg.key), cfg.portrait);
      }
    });
  }

  create() {
    this.add.rectangle(480, 270, 960, 540, 0x111827).setOrigin(0.5);
    addFullscreenButton(this);
    this.add.text(480, 90, 'LOVE STORY', { fontSize: '52px', color: '#fef3c7', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(480, 150, 'Choose your runner', { fontSize: '24px', color: '#fef3c7' }).setOrigin(0.5);

    // Ricky and Denise always; Zero once he's been unlocked.
    this.characters = ['ricky', 'denise'];
    if (isZeroUnlocked()) {
      this.characters.push('zero');
    }

    const n = this.characters.length;
    const size = n >= 3 ? 176 : 200;
    const spacing = n >= 3 ? 250 : 320;
    const startX = 480 - ((n - 1) / 2) * spacing;
    const y = 330;

    this.highlights = this.characters.map((key, i) => {
      const x = startX + i * spacing;
      const hl = this.add
        .rectangle(x, y, size + 16, size + 16, 0x000000, 0)
        .setStrokeStyle(6, 0xfef3c7)
        .setVisible(false);
      const img = this.add
        .image(x, y, PORTRAIT_KEY(key))
        .setDisplaySize(size, size)
        .setInteractive({ useHandCursor: true });
      img.on('pointerover', () => this.select(i));
      img.on('pointerdown', () => this.startGame(key));
      this.add.text(x, y + size / 2 + 28, LABELS[key] || key.toUpperCase(), { fontSize: '24px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
      return hl;
    });

    this.add
      .text(480, 500, 'Arrow keys to choose · Enter / click to start', { fontSize: '18px', color: '#9ca3af' })
      .setOrigin(0.5);

    const keyboard = this.input.keyboard;
    keyboard.on('keydown-LEFT', () => this.select(this.selected - 1));
    keyboard.on('keydown-A', () => this.select(this.selected - 1));
    keyboard.on('keydown-RIGHT', () => this.select(this.selected + 1));
    keyboard.on('keydown-D', () => this.select(this.selected + 1));
    keyboard.on('keydown-ENTER', () => this.startGame(this.characters[this.selected]));
    keyboard.on('keydown-SPACE', () => this.startGame(this.characters[this.selected]));

    this.selected = 0;
    this.select(0);
  }

  select(index) {
    const n = this.characters.length;
    this.selected = ((index % n) + n) % n; // wrap around
    this.highlights.forEach((hl, i) => hl.setVisible(i === this.selected));
  }

  startGame(character) {
    this.scene.start(FIRST_SCENE, { mainCharacter: character });
  }
}
