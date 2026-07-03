// A scrollable text panel. Rather than masking a big text block (geometry masks
// are unreliable here), it renders only the lines that fit the viewport and
// re-slices as you scroll — so nothing ever spills outside the box. Scroll with
// the mouse wheel, a touch/pointer drag, or the up/down arrow keys.
export function createScrollList(scene, opts) {
  const { x, y, width, height } = opts;
  const depth = opts.depth ?? 60;
  const padX = opts.padX ?? 14;
  const padY = opts.padY ?? 10;
  const style = opts.style || { fontSize: '16px', color: '#e5e7eb', fontFamily: 'monospace', lineSpacing: 6 };

  const text = scene.add.text(x + padX, y + padY, '', style).setOrigin(0, 0).setDepth(depth);

  // Measure per-line height (font + lineSpacing) so we know how many lines fit.
  text.setText('X');
  const h1 = text.height;
  text.setText('X\nX');
  const lineH = Math.max(1, text.height - h1);
  text.setText('');

  const viewH = height - padY * 2;
  const visibleCount = Math.max(1, Math.floor(viewH / lineH));

  const track = scene.add.rectangle(x + width - 5, y + 2, 4, height - 4, 0xffffff, 0.1).setOrigin(0, 0).setDepth(depth);
  const thumb = scene.add.rectangle(x + width - 5, y + 2, 4, 24, 0xfde047, 0.75).setOrigin(0, 0).setDepth(depth + 1);

  let lines = [];
  let offset = 0; // top visible line index (fractional; floored when slicing)

  const render = () => {
    const maxOffset = Math.max(0, lines.length - visibleCount);
    offset = Phaser.Math.Clamp(offset, 0, maxOffset);
    const start = Math.floor(offset);
    text.setText(lines.slice(start, start + visibleCount).join('\n'));
    const scrollable = lines.length > visibleCount;
    track.setVisible(scrollable);
    thumb.setVisible(scrollable);
    if (scrollable) {
      const thumbH = Math.max(24, (visibleCount / lines.length) * (height - 4));
      thumb.height = thumbH;
      thumb.y = y + 2 + (maxOffset ? start / maxOffset : 0) * (height - 4 - thumbH);
    }
  };

  const setText = (str) => {
    lines = String(str).split('\n');
    offset = 0;
    render();
  };

  const inView = (px, py) => px >= x && px <= x + width && py >= y && py <= y + height;
  const scrollByPixels = (dy) => {
    offset += dy / lineH;
    render();
  };

  const onWheel = (pointer, over, dx, dy) => {
    if (inView(pointer.x, pointer.y)) {
      scrollByPixels(dy);
    }
  };
  let dragging = false;
  let lastY = 0;
  const onDown = (p) => {
    if (inView(p.x, p.y)) {
      dragging = true;
      lastY = p.y;
    }
  };
  const onMove = (p) => {
    if (dragging && p.isDown) {
      scrollByPixels(lastY - p.y);
      lastY = p.y;
    }
  };
  const onUp = () => {
    dragging = false;
  };
  scene.input.on('wheel', onWheel);
  scene.input.on('pointerdown', onDown);
  scene.input.on('pointermove', onMove);
  scene.input.on('pointerup', onUp);

  const kb = scene.input.keyboard;
  const onUpKey = () => {
    offset -= 1;
    render();
  };
  const onDownKey = () => {
    offset += 1;
    render();
  };
  if (opts.arrowKeys) {
    kb.on('keydown-UP', onUpKey);
    kb.on('keydown-DOWN', onDownKey);
  }

  render();

  return {
    setText,
    // Scroll so the given line (0-based) is roughly centred in the viewport.
    revealLine(index) {
      offset = index - Math.floor(visibleCount / 2);
      render();
    },
    destroy() {
      scene.input.off('wheel', onWheel);
      scene.input.off('pointerdown', onDown);
      scene.input.off('pointermove', onMove);
      scene.input.off('pointerup', onUp);
      if (opts.arrowKeys) {
        kb.off('keydown-UP', onUpKey);
        kb.off('keydown-DOWN', onDownKey);
      }
      text.destroy();
      track.destroy();
      thumb.destroy();
    }
  };
}
