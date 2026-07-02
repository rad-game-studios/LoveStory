import { CHARACTERS, PORTRAIT_KEY } from '../config/characterConfig.js';
import { addFullscreenButton } from '../ui/fullscreen.js';

const FIRST_SCENE = 'HowToScene';
const PORTRAIT_SIZE = 200;

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
    this.selected = 'ricky';

    this.add.rectangle(480, 270, 960, 540, 0x111827).setOrigin(0.5);
    addFullscreenButton(this);
    this.add.text(480, 96, 'LOVE STORY', { fontSize: '52px', color: '#fef3c7', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(480, 158, 'Choose your runner', { fontSize: '24px', color: '#fef3c7' }).setOrigin(0.5);

    this.rickyHL = this.makeHighlight(320, 330);
    this.deniseHL = this.makeHighlight(640, 330);

    this.rickyButton = this.makePortrait(320, 330, 'ricky');
    this.deniseButton = this.makePortrait(640, 330, 'denise');

    this.add.text(320, 458, 'RICKY', { fontSize: '24px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(640, 458, 'DENISE', { fontSize: '24px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    this.add
      .text(480, 500, 'Arrow keys to choose · Enter / click to start', { fontSize: '18px', color: '#9ca3af' })
      .setOrigin(0.5);

    const keyboard = this.input.keyboard;
    keyboard.on('keydown-LEFT', () => this.select('ricky'));
    keyboard.on('keydown-A', () => this.select('ricky'));
    keyboard.on('keydown-RIGHT', () => this.select('denise'));
    keyboard.on('keydown-D', () => this.select('denise'));
    keyboard.on('keydown-ENTER', () => this.startGame(this.selected));
    keyboard.on('keydown-SPACE', () => this.startGame(this.selected));

    this.select('ricky');
  }

  makeHighlight(x, y) {
    return this.add
      .rectangle(x, y, PORTRAIT_SIZE + 16, PORTRAIT_SIZE + 16, 0x000000, 0)
      .setStrokeStyle(6, 0xfef3c7)
      .setVisible(false);
  }

  makePortrait(x, y, character) {
    const img = this.add
      .image(x, y, PORTRAIT_KEY(character))
      .setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE)
      .setInteractive({ useHandCursor: true });
    img.on('pointerover', () => this.select(character));
    img.on('pointerdown', () => this.startGame(character));
    return img;
  }

  select(character) {
    this.selected = character;
    this.rickyHL.setVisible(character === 'ricky');
    this.deniseHL.setVisible(character === 'denise');
  }

  startGame(character) {
    this.scene.start(FIRST_SCENE, { mainCharacter: character });
  }
}
