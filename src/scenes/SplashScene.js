import titleImage from '../../art/title_screen_Love_Story_ring_fix.png';
import themeMusic from '../../sound/music/LoveStory-theme.mp3';
import { addFullscreenButton } from '../ui/fullscreen.js';

// Opening splash: shows the title art, then waits for input (locked for 3s).
// Advances to the difficulty picker, which then routes on to character select
// (if the game's been beaten) or the first Ricky-only playthrough.
export class SplashScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SplashScene' });
  }

  preload() {
    if (!this.textures.exists('title-splash')) {
      this.load.image('title-splash', titleImage);
    }
    if (!this.cache.audio.exists('theme')) {
      this.load.audio('theme', themeMusic);
    }
  }

  create() {
    this.advanced = false;
    this.canAdvance = false;

    this.add.image(480, 270, 'title-splash').setDisplaySize(960, 540);
    this.cameras.main.fadeIn(500);
    addFullscreenButton(this);

    this.startPrompt = this.add
      .text(480, 510, 'PRESS ENTER TO START', { fontSize: '22px', color: '#fde047', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setAlpha(0);

    // After 3 seconds unlock input and reveal the prompt.
    this.time.delayedCall(3000, () => {
      this.canAdvance = true;
      this.tweens.add({
        targets: this.startPrompt,
        alpha: { from: 0, to: 1 },
        duration: 300,
        onComplete: () => {
          this.tweens.add({
            targets: this.startPrompt,
            alpha: 0.15,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
          });
        }
      });
      this.input.keyboard.once('keydown', () => this.advance());
      this.input.once('pointerdown', () => this.advance());
    });
  }

  advance() {
    if (this.advanced) {
      return;
    }
    this.advanced = true;

    // Start the looping theme on this first user gesture (browsers block audio
    // until then). The sound manager is global, so it keeps playing across every
    // scene; guard against re-adding if we ever land here twice.
    if (!this.sound.get('theme')) {
      this.sound.play('theme', { loop: true, volume: 0.4 });
    }

    this.cameras.main.fadeOut(400);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('DifficultyScene');
    });
  }
}
