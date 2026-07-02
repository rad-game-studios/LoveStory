import Phaser from 'phaser';
import './style.css';

// The scene/entity modules reference a global `Phaser` (so placeholder code
// stays free of per-file imports and real art can be dropped in later without
// touching them). Expose it before importing those modules so that
// `class Foo extends Phaser.Scene` resolves at module-evaluation time.
window.Phaser = Phaser;

const { gameConfig } = await import('./config/gameConfig.js');
const { SplashScene } = await import('./scenes/SplashScene.js');
const { DifficultyScene } = await import('./scenes/DifficultyScene.js');
const { TitleScene } = await import('./scenes/TitleScene.js');
const { HowToScene } = await import('./scenes/HowToScene.js');
const { StageSelectScene } = await import('./scenes/StageSelectScene.js');
const { RunScene } = await import('./scenes/RunScene.js');
const { EndScene } = await import('./scenes/EndScene.js');

gameConfig.scene = [SplashScene, DifficultyScene, TitleScene, HowToScene, StageSelectScene, RunScene, EndScene];

const game = new Phaser.Game(gameConfig);

// Exposed for debugging / automated smoke tests; harmless in the iframe build.
window.game = game;
