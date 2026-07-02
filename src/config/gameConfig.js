export const gameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: 'app',
  backgroundColor: '#111827',
  pixelArt: true,
  // Request backgrounds with CORS so they work when the build is embedded in an
  // iframe / served from another origin (e.g. the wedding site / a CDN).
  loader: { crossOrigin: 'anonymous' },
  // DOM container is used only for the End-screen name <input> on touch devices
  // (to pop the on-screen keyboard). The End screen is terminal (refresh to play
  // again), so the earlier "DOM overlay froze the next scene" bug can't recur.
  dom: { createContainer: true },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1200 },
      debug: false
    }
  },
  scene: []
};
