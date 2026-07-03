import { SEGMENTS } from '../config/worldConfig.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { getTopScores, leaderboardIsShared } from '../services/leaderboard.js';
import { getLastScorecard } from '../services/progress.js';
import { createScrollList } from '../ui/scrollList.js';

const W = 960;
const H = 540;
const NEXT_SCENE = 'RunScene';

// Unlocked after beating the game: pick any stage to start from. Shown between
// the How-to screen and the run for returning players.
export class StageSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StageSelectScene' });
  }

  create(data = {}) {
    this.mainCharacter = data.mainCharacter || 'ricky';
    this.started = false;
    this.overlayOpen = false;

    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    // Restore canvas keyboard focus — it may have been stolen by EndScene's DOM
    // input and not properly returned during the TitleScene → HowToScene hops.
    if (this.game.canvas) {
      this.game.canvas.setAttribute('tabindex', '0');
      this.game.canvas.focus();
    }

    this.add.rectangle(W / 2, H / 2, W, H, 0x111827).setOrigin(0.5);
    addFullscreenButton(this);
    this.add.text(W / 2, 46, 'SELECT A STAGE', { fontSize: '38px', color: '#fef3c7', fontStyle: 'bold' }).setOrigin(0.5);
    this.add
      .text(W / 2, 92, 'You beat the game — jump into any stage', { fontSize: '16px', color: '#9ca3af' })
      .setOrigin(0.5);

    const top = 138;
    const rowH = 44;
    SEGMENTS.forEach((seg, i) => {
      const y = top + i * rowH;
      const label = `${i + 1}.  ${seg.name}`;
      const row = this.add
        .text(W / 2, y, label, {
          fontSize: '20px',
          color: '#e5e7eb',
          fontStyle: 'bold',
          backgroundColor: '#1f2937',
          padding: { x: 18, y: 8 },
          fixedWidth: 520,
          align: 'center'
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      row.on('pointerover', () => row.setBackgroundColor('#374151'));
      row.on('pointerout', () => row.setBackgroundColor('#1f2937'));
      row.on('pointerdown', () => this.startStage(i));
    });

    // Icon buttons below the last stage: LIVE Leaderboard and last Scorecard.
    const iconY = top + SEGMENTS.length * rowH + 14;
    this.makeIconButton(W / 2 - 44, iconY, '📊', () => this.openLeaderboard());
    this.makeIconButton(W / 2 + 44, iconY, '🎫', () => this.openScorecard());

    this.add
      .text(W / 2, H - 20, 'Click a stage  ·  or press ENTER to start from the beginning', {
        fontSize: '15px',
        color: '#9ca3af'
      })
      .setOrigin(0.5);

    this.input.keyboard.on('keydown-ENTER', () => this.startStage(0));
    this.input.keyboard.on('keydown-SPACE', () => this.startStage(0));
  }

  makeIconButton(x, y, emoji, onClick) {
    const box = this.add
      .rectangle(x, y, 66, 48, 0x1f2937)
      .setStrokeStyle(2, 0xfde047)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, emoji, { fontSize: '26px' }).setOrigin(0.5);
    box.on('pointerover', () => box.setFillStyle(0x374151));
    box.on('pointerout', () => box.setFillStyle(0x1f2937));
    box.on('pointerdown', onClick);
    return box;
  }

  startStage(index) {
    if (this.started || this.overlayOpen) {
      return;
    }
    this.started = true;
    this.scene.start(NEXT_SCENE, { mainCharacter: this.mainCharacter, startSegment: index });
  }

  // --- Modal overlays (leaderboard / scorecard) ---

  openOverlay(build) {
    if (this.overlayOpen) {
      return;
    }
    this.overlayOpen = true;
    this.overlayObjs = [];

    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setDepth(50).setInteractive();
    const panel = this.add.rectangle(W / 2, H / 2, 780, 448, 0x111827).setStrokeStyle(3, 0xfde047).setDepth(51).setInteractive();
    const close = this.add
      .text(W / 2 + 372, H / 2 - 210, '✕', { fontSize: '26px', color: '#fca5a5', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(53)
      .setInteractive({ useHandCursor: true });
    const hint = this.add
      .text(W / 2, H / 2 + 208, 'Tap outside or press ESC to close', { fontSize: '13px', color: '#9ca3af' })
      .setOrigin(0.5)
      .setDepth(53);
    this.overlayObjs.push(dim, panel, close, hint);

    const closeFn = () => this.closeOverlay();
    dim.on('pointerdown', closeFn); // taps outside the panel close it
    close.on('pointerdown', closeFn);
    this._overlayClose = closeFn;
    this.input.keyboard.on('keydown-ESC', closeFn);

    build();
  }

  closeOverlay() {
    if (!this.overlayOpen) {
      return;
    }
    (this.overlayObjs || []).forEach((o) => o.destroy());
    this.overlayObjs = [];
    if (this.overlayList) {
      this.overlayList.destroy();
      this.overlayList = null;
    }
    if (this._overlayClose) {
      this.input.keyboard.off('keydown-ESC', this._overlayClose);
      this._overlayClose = null;
    }
    this.overlayOpen = false;
  }

  openLeaderboard() {
    this.openOverlay(async () => {
      this.overlayObjs.push(
        this.add
          .text(W / 2, H / 2 - 190, leaderboardIsShared() ? 'LIVE LEADERBOARD' : 'LIVE LEADERBOARD (this device)', {
            fontSize: '24px',
            color: '#fef3c7',
            fontStyle: 'bold'
          })
          .setOrigin(0.5)
          .setDepth(52)
      );
      // Full, scrollable board (wheel / drag / arrow keys).
      const list = createScrollList(this, {
        x: 288,
        y: H / 2 - 156,
        width: 384,
        height: 320,
        depth: 52,
        arrowKeys: true,
        style: { fontSize: '18px', color: '#e5e7eb', fontFamily: 'monospace', lineSpacing: 8 }
      });
      this.overlayList = list;
      list.setText('Loading…');

      const top = await getTopScores(500);
      if (!this.overlayOpen || this.overlayList !== list) {
        return;
      }
      if (!top.length) {
        list.setText('No scores yet — be the first!');
      } else {
        list.setText(
          top
            .map((e, i) => `${String(i + 1).padStart(3, ' ')}. ${String(e.name).padEnd(12, ' ')} ${e.score}`)
            .join('\n')
        );
      }
    });
  }

  openScorecard() {
    this.openOverlay(() => {
      this.overlayObjs.push(
        this.add
          .text(W / 2, H / 2 - 176, 'LAST SCORECARD', { fontSize: '24px', color: '#fde047', fontStyle: 'bold' })
          .setOrigin(0.5)
          .setDepth(52)
      );

      const data = getLastScorecard();
      const collectables = (data && data.collectables) || [];
      if (!collectables.length) {
        this.overlayObjs.push(
          this.add
            .text(W / 2, H / 2, 'Finish a full run to record your scorecard here.', {
              fontSize: '17px',
              color: '#9ca3af',
              align: 'center',
              wordWrap: { width: 700 }
            })
            .setOrigin(0.5)
            .setDepth(52)
        );
        return;
      }

      this.overlayObjs.push(
        this.add
          .text(W / 2, H / 2 - 140, `SCORE  ${data.finalScore || 0}`, { fontSize: '22px', color: '#fed7aa', fontStyle: 'bold' })
          .setOrigin(0.5)
          .setDepth(52)
      );

      let y = H / 2 - 100;
      collectables.forEach((stage) => {
        this.overlayObjs.push(
          this.add
            .text(W / 2 - 330, y, stage.stage, { fontSize: '15px', color: '#e5e7eb', fontStyle: 'bold' })
            .setOrigin(0, 0.5)
            .setDepth(52)
        );
        const items = (stage.items || []).slice().sort((a, b) => (a.emoji === '🟡' ? -1 : b.emoji === '🟡' ? 1 : 0));
        const summary = items.map((it) => `${it.emoji} ${it.collected}/${it.total}`).join('    ');
        this.overlayObjs.push(
          this.add
            .text(W / 2 + 330, y, summary, { fontSize: '16px', color: '#ffffff', align: 'right' })
            .setOrigin(1, 0.5)
            .setDepth(52)
        );
        y += 30;
      });
    });
  }
}
