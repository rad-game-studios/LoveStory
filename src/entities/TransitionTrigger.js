export class TransitionTrigger extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y, width, height) {
    super(scene, x, y, width, height, 0x22c55e);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setOrigin(0.5, 0.5);
    this.setAlpha(0.8);
    this.setDepth(10);
  }
}
