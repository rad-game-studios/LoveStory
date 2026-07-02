// A solid platform that oscillates along one axis and carries the player. Uses
// a dynamic, immovable, gravity-free arcade body moved by velocity (friction
// carries riders horizontally; vertical motion pushes/drops them).
//
// `y` is the top surface. `axis` 'x' | 'y'. `range` = half travel (± from start).
export class MovingPlatform extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y, width, opts = {}) {
    super(scene, x, y, width, opts.height || 20, opts.color ?? 0xf59e0b);
    this.setOrigin(0.5, 0);
    this.setStrokeStyle(2, opts.stroke ?? 0xb45309);
    scene.add.existing(this);
    scene.physics.add.existing(this, false);
    this.body.setImmovable(true);
    this.body.setAllowGravity(false);
    this.body.setFriction(1, 0);

    this.axis = opts.axis === 'y' ? 'y' : 'x';
    this.range = opts.range || 150;
    this.speed = opts.speed || 60;
    this.initialX = x;
    this.initialY = y;
    this.dir = 1;
    const start = this.axis === 'x' ? x : y;
    this.minV = start - this.range;
    this.maxV = start + this.range;

    this.applyVelocity();
    scene.events.on('update', this.update, this);
  }

  applyVelocity() {
    if (this.axis === 'x') {
      this.body.setVelocity(this.speed * this.dir, 0);
    } else {
      this.body.setVelocity(0, this.speed * this.dir);
    }
  }

  update() {
    if (!this.body) {
      return;
    }
    const pos = this.axis === 'x' ? this.x : this.y;
    if (pos <= this.minV && this.dir < 0) {
      this.dir = 1;
      this.applyVelocity();
    } else if (pos >= this.maxV && this.dir > 0) {
      this.dir = -1;
      this.applyVelocity();
    }
  }

  reset() {
    this.dir = 1;
    this.setPosition(this.initialX, this.initialY);
    if (this.body) {
      this.body.reset(this.initialX, this.initialY);
      this.applyVelocity();
    }
  }
}
