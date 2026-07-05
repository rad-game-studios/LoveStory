import { PlayerMain } from '../entities/PlayerMain.js';
import { Coin } from '../entities/Coin.js';
import {
  CHARACTERS,
  SHEET_KEY,
  registerCharacterAnims,
  preloadZeroActions,
  registerZeroActionAnims
} from '../config/characterConfig.js';
import { SEGMENTS, VIEW_WIDTH, VIEW_HEIGHT, GROUND_HEIGHT } from '../config/worldConfig.js';
import { setupTouchControls } from '../ui/touchControls.js';
import bonusBg from '../../art/backgrounds/00-zero-bonus.jpeg';

const WORLD_W = 2600;
const COIN_COUNT = 100;
const COIN_POINTS = 10;
const BONUS_SECONDS = 30;

// Zero's bonus round: reached via a max-charge jump off the blue platform at the
// end of the party. The main run clock is frozen (we're a separate scene); grab
// as many of the 100 coins as you can in 30s, then drop back into the party.
export class BonusScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BonusScene' });
  }

  preload() {
    if (!this.textures.exists('zero-bonus-bg')) {
      this.load.image('zero-bonus-bg', bonusBg);
    }
    const cfg = CHARACTERS.zero;
    if (!this.textures.exists(SHEET_KEY('zero'))) {
      this.load.spritesheet(SHEET_KEY('zero'), cfg.sheet, { frameWidth: cfg.frameWidth, frameHeight: cfg.frameHeight });
    }
    preloadZeroActions(this);
  }

  create(data = {}) {
    this.carry = data;
    this.mainCharacter = 'zero'; // so touch controls show Zero's layout
    this.bonusCoins = 0;
    this.ended = false;

    registerCharacterAnims(this, 'zero');
    registerZeroActionAnims(this);

    const groundTop = VIEW_HEIGHT - GROUND_HEIGHT;
    this.spawnY = groundTop - 24;

    // Backdrop (pinned across the whole arena).
    const src = this.textures.get('zero-bonus-bg').getSourceImage();
    const scale = Math.max(VIEW_WIDTH / src.width, VIEW_HEIGHT / src.height);
    for (let x = 0; x < WORLD_W; x += VIEW_WIDTH) {
      this.add.image(x + VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 'zero-bonus-bg').setScale(scale).setDepth(0);
    }

    // Ground.
    const floor = this.add.rectangle(WORLD_W / 2, VIEW_HEIGHT - GROUND_HEIGHT / 2, WORLD_W, GROUND_HEIGHT, 0x1f2937).setDepth(5);
    this.physics.add.existing(floor, true);

    this.physics.world.setBounds(0, 0, WORLD_W, VIEW_HEIGHT);

    // Player (Zero).
    this.playerMain = new PlayerMain(this, 140, this.spawnY, 'zero');
    this.playerMain.setDepth(8);
    this.physics.add.collider(this.playerMain, floor);

    // 100 coins in a running/jumping wave across the arena.
    this.coins = [];
    const left = 260;
    const right = WORLD_W - 220;
    for (let i = 0; i < COIN_COUNT; i++) {
      const x = left + (i / (COIN_COUNT - 1)) * (right - left);
      const y = groundTop - 40 - Math.abs(Math.sin(i * 0.34)) * 150;
      this.coins.push(new Coin(this, x, y, {}));
    }
    this.physics.add.overlap(this.playerMain, this.coins, this.collectCoin, null, this);

    // Camera.
    this.cameras.main.setBounds(0, 0, WORLD_W, VIEW_HEIGHT);
    this.cameras.main.startFollow(this.playerMain, true, 0.1, 0.1);
    this.cameras.main.setFollowOffset(-160, 0);
    this.cameras.main.fadeIn(300);

    // HUD.
    this.timerText = this.add
      .text(VIEW_WIDTH / 2, 24, '', { fontSize: '44px', color: '#ef4444', fontStyle: 'bold' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setShadow(2, 2, '#000000', 4);
    this.coinText = this.add
      .text(20, 24, '', { fontSize: '24px', color: '#fde047', fontStyle: 'bold' })
      .setScrollFactor(0)
      .setDepth(20)
      .setShadow(2, 2, '#000000', 4);
    this.add
      .text(VIEW_WIDTH / 2, VIEW_HEIGHT - 26, 'BONUS ROUND — grab every coin!', {
        fontSize: '16px',
        color: '#bfdbfe',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20);

    this.bonusEndAt = this.time.now + BONUS_SECONDS * 1000;
    this.refreshHud(BONUS_SECONDS);

    setupTouchControls(this);
  }

  collectCoin(playerGO, coin) {
    if (coin.collect()) {
      this.bonusCoins += 1;
      this.refreshHud();
      if (this.bonusCoins >= COIN_COUNT) {
        this.endBonus('PERFECT!  All 100 coins! 🎉');
      }
    }
  }

  refreshHud(secs) {
    const remaining = secs != null ? secs : Math.max(0, Math.ceil((this.bonusEndAt - this.time.now) / 1000));
    this.timerText.setText(`0:${String(remaining).padStart(2, '0')}`);
    this.timerText.setColor(remaining <= 5 && remaining % 2 === 0 ? '#fca5a5' : '#ef4444');
    this.coinText.setText(`🪙 ${this.bonusCoins} / ${COIN_COUNT}`);
  }

  update() {
    if (this.ended) {
      return;
    }
    this.refreshHud();
    if (this.time.now >= this.bonusEndAt) {
      this.endBonus("Time's up!");
    }
  }

  endBonus(message) {
    if (this.ended) {
      return;
    }
    this.ended = true;
    this.playerMain.setControlsEnabled(false);

    if (message) {
      this.add
        .text(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, message, {
          fontSize: '30px',
          color: '#fef3c7',
          fontStyle: 'bold',
          align: 'center'
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(30);
    }

    const d = this.carry;
    const partyIndex = SEGMENTS.findIndex((s) => s.key === 'williamsburgParty');
    this.time.delayedCall(1100, () => {
      this.cameras.main.fadeOut(400);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('RunScene', {
          mainCharacter: d.mainCharacter || 'zero',
          startSegment: partyIndex >= 0 ? partyIndex : d.startSegment,
          carryScore: (d.carryScore || 0) + this.bonusCoins * COIN_POINTS,
          carryCoins: (d.carryCoins || 0) + this.bonusCoins,
          carryEnemies: d.carryEnemies || 0,
          carryTime: d.carryTime
        });
      });
    });
  }
}
