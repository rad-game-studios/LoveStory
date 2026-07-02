// A solid block: the player collides with it, can run into it, jump over it,
// and stand on top of it. Never lethal (Super Mario brick/pipe behaviour).
//
// `anchor: 'bottom'` (default) — `y` is the ground surface the block rests on.
// `anchor: 'top'`             — `y` is the top surface of a floating platform.
export class Obstacle extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y, width, height, opts = {}) {
    super(scene, x, y, width, height, opts.color ?? 0x92400e);
    this.setOrigin(0.5, opts.anchor === 'top' ? 0 : 1);
    this.setStrokeStyle(2, opts.stroke ?? 0x7c2d12);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.initialX = x;
    this.initialY = y;
  }

  reset() {
    this.setPosition(this.initialX, this.initialY);
    if (this.body) {
      this.body.updateFromGameObject();
    }
  }
}
