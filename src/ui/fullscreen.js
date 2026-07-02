// A small YouTube-style fullscreen toggle button pinned to the top-right corner.
// Fullscreen state lives on the game canvas, so it persists across scene changes —
// tapping it on any menu keeps you fullscreen through the whole run.
//
// Only shown where the browser supports the Fullscreen API. Notably, iPhone Safari
// does NOT (iPad and Android Chrome do), so on iPhone the button is simply hidden.

export function addFullscreenButton(scene) {
  const scale = scene.scale;
  if (!scale.fullscreen.available) {
    return null;
  }

  const size = 40;
  const x = scale.width - 8 - size / 2;
  const y = 8 + size / 2;

  const bg = scene.add
    .rectangle(x, y, size, size, 0x000000, 0.35)
    .setStrokeStyle(2, 0xffffff, 0.4)
    .setScrollFactor(0)
    .setDepth(100)
    .setInteractive({ useHandCursor: true });

  const g = scene.add.graphics().setScrollFactor(0).setDepth(101);

  const draw = () => {
    g.clear();
    g.lineStyle(3, 0xffffff, 0.95);
    const half = size / 2 - 9;
    const arm = 8;
    // Enter icon: frame corners (arms point inward). Exit icon: arms point outward.
    const dir = scale.isFullscreen ? 1 : -1;
    [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1]
    ].forEach(([dx, dy]) => {
      const px = x + dx * half;
      const py = y + dy * half;
      g.beginPath();
      g.moveTo(px + dir * dx * arm, py);
      g.lineTo(px, py);
      g.lineTo(px, py + dir * dy * arm);
      g.strokePath();
    });
  };
  draw();

  bg.on('pointerup', () => scale.toggleFullscreen());
  scale.on('enterfullscreen', draw);
  scale.on('leavefullscreen', draw);
  scene.events.once('shutdown', () => {
    scale.off('enterfullscreen', draw);
    scale.off('leavefullscreen', draw);
  });

  return { bg, g };
}
