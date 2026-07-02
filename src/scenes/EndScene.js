import { submitScore, getTopScores, leaderboardIsShared } from '../services/leaderboard.js';
import { markGameBeaten } from '../services/progress.js';
import { isTouchDevice } from '../ui/touchControls.js';

const W = 960;
const H = 540;

const fmtTime = (secs) => {
  const t = Math.max(0, Math.round(secs));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

export class EndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndScene' });
  }

  create(data = {}) {
    this.results = data;
    this.submitted = false;

    // Reaching the End screen means the game was beaten — unlock stage select.
    markGameBeaten();

    // Drop the gameplay key captures (W/A/S/D/F, arrows, space) so name entry
    // below reads plain keystrokes without the run's control bindings interfering.
    this.input.keyboard.clearCaptures();

    this.add.rectangle(W / 2, H / 2, W, H, 0x111827).setOrigin(0.5);
    this.add.text(W / 2, 34, 'YOU MADE IT!', { fontSize: '40px', color: '#fef3c7', fontStyle: 'bold' }).setOrigin(0.5);

    this.showScorecard();
  }

  // Stage-by-stage collectable scorecard, shown before the name entry.
  showScorecard() {
    const collectables = this.results.collectables || [];
    const objs = [];

    objs.push(
      this.add.text(W / 2, 92, 'SCORECARD', { fontSize: '26px', color: '#fde047', fontStyle: 'bold' }).setOrigin(0.5)
    );
    objs.push(
      this.add
        .text(W / 2, 122, 'Collectables gathered on each leg of the journey', {
          fontSize: '15px',
          color: '#9ca3af'
        })
        .setOrigin(0.5)
    );

    let y = 158;
    if (!collectables.length) {
      objs.push(
        this.add.text(W / 2, y, 'No collectables tracked.', { fontSize: '17px', color: '#e5e7eb' }).setOrigin(0.5)
      );
      y += 30;
    } else {
      collectables.forEach((stage) => {
        objs.push(
          this.add
            .text(W / 2 - 300, y, stage.stage, { fontSize: '17px', color: '#e5e7eb', fontStyle: 'bold' })
            .setOrigin(0, 0.5)
        );
        const items = stage.items
          .slice()
          .sort((a, b) => (a.emoji === '🟡' ? -1 : b.emoji === '🟡' ? 1 : 0));
        const summary = items.map((it) => `${it.emoji} ${it.collected}/${it.total}`).join('    ');
        objs.push(
          this.add
            .text(W / 2 + 300, y, summary, { fontSize: '18px', color: '#ffffff', align: 'right' })
            .setOrigin(1, 0.5)
        );
        y += 34;
      });
    }

    objs.push(
      this.add
        .text(W / 2, H - 44, 'Press ENTER to continue', { fontSize: '16px', color: '#9ca3af' })
        .setOrigin(0.5)
    );

    const proceed = () => {
      this.input.keyboard.off('keydown-ENTER', proceed);
      this.input.keyboard.off('keydown-SPACE', proceed);
      this.input.off('pointerdown', proceed);
      objs.forEach((o) => o.destroy());
      this.showResults();
    };
    this.input.keyboard.on('keydown-ENTER', proceed);
    this.input.keyboard.on('keydown-SPACE', proceed);
    this.input.on('pointerdown', proceed);
  }

  showResults() {
    const data = this.results;
    const coins = data.coins || 0;
    const enemies = data.enemiesDefeated || 0;
    const mult = data.multiplier || 1;
    const timeLeft = data.timeRemaining || 0;
    const finalScore = data.finalScore || 0;

    const breakdown = [
      `Coins   ${coins} × 10   =   ${coins * 10}`,
      `Enemies   ${enemies} × 50   =   ${enemies * 50}`,
      `Time left ${fmtTime(timeLeft)}   →   × ${mult.toFixed(2)}`
    ].join('\n');
    this.add
      .text(W / 2, 78, breakdown, { fontSize: '19px', color: '#e5e7eb', align: 'center', lineSpacing: 6 })
      .setOrigin(0.5, 0);

    this.add.text(W / 2, 172, `SCORE  ${finalScore}`, { fontSize: '34px', color: '#fde047', fontStyle: 'bold' }).setOrigin(0.5);

    // --- Name entry (canvas-native, no DOM element) ---
    this.promptText = this.add
      .text(W / 2, 216, 'Type your name for the leaderboard:', { fontSize: '17px', color: '#9ca3af' })
      .setOrigin(0.5);
    this.enteredName = '';
    this.hint = this.add.text(W / 2, 286, '', { fontSize: '15px', color: '#9ca3af' }).setOrigin(0.5);

    if (isTouchDevice()) {
      this.buildTouchNameEntry();
    } else {
      this.buildKeyboardNameEntry();
    }

    // --- Leaderboard ---
    this.add
      .text(W / 2, 320, leaderboardIsShared() ? 'LEADERBOARD' : 'LEADERBOARD (this device)', {
        fontSize: '18px',
        color: '#fef3c7',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);
    this.boardText = this.add
      .text(W / 2, 344, 'Loading…', { fontSize: '15px', color: '#e5e7eb', align: 'left', lineSpacing: 3, fontFamily: 'monospace' })
      .setOrigin(0.5, 0);

    this.refreshBoard();
  }

  // Desktop: capture keystrokes through Phaser and draw the name on the canvas
  // (no DOM element to steal focus).
  buildKeyboardNameEntry() {
    this.add.rectangle(W / 2, 250, 240, 40, 0x1f2937).setStrokeStyle(2, 0xfde047).setOrigin(0.5);
    this.cursorOn = true;
    this.nameText = this.add
      .text(W / 2, 250, '', { fontSize: '22px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.renderName();
    this.cursorTimer = this.time.addEvent({
      delay: 450,
      loop: true,
      callback: () => {
        this.cursorOn = !this.cursorOn;
        this.renderName();
      }
    });

    // The very Enter press that advanced from the scorecard also fires a generic
    // keydown here; arm submit a beat later so it can't self-submit an empty name.
    this.submitArmed = false;
    this.time.delayedCall(200, () => {
      this.submitArmed = true;
    });
    this.onNameKey = (e) => {
      if (this.submitted) {
        return;
      }
      if (e.key === 'Enter') {
        if (this.submitArmed) {
          this.submit();
        }
      } else if (e.key === 'Backspace') {
        this.enteredName = this.enteredName.slice(0, -1);
        this.renderName();
      } else if (e.key.length === 1 && /[a-zA-Z0-9 ]/.test(e.key) && this.enteredName.length < 12) {
        this.enteredName += e.key.toUpperCase();
        this.renderName();
      }
    };
    this.input.keyboard.on('keydown', this.onNameKey);
    this.hint.setText('Press ENTER to submit');
  }

  // Touch devices have no hardware keyboard, so use a real DOM <input> (which
  // pops the on-screen keyboard) plus a tappable SUBMIT button. Safe here: the End
  // screen is terminal (you refresh to play again), so no later scene is affected.
  buildTouchNameEntry() {
    const el = this.add.dom(
      W / 2,
      250,
      'input',
      'width:220px;height:36px;font-size:20px;text-align:center;text-transform:uppercase;' +
        'border-radius:6px;border:2px solid #fde047;background:#1f2937;color:#ffffff;outline:none;'
    );
    el.node.setAttribute('maxlength', '12');
    el.node.setAttribute('placeholder', 'NAME');
    el.node.setAttribute('autocapitalize', 'characters');
    el.node.setAttribute('autocomplete', 'off');
    el.node.setAttribute('enterkeyhint', 'go');
    el.node.addEventListener('input', () => {
      this.enteredName = el.node.value;
    });
    el.node.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submit();
      }
    });
    this.nameDom = el;
    this.time.delayedCall(60, () => el.node.focus());

    this.submitButton = this.add
      .text(712, 250, 'SUBMIT', {
        fontSize: '18px',
        color: '#111827',
        backgroundColor: '#fde047',
        fontStyle: 'bold',
        padding: { x: 22, y: 9 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.submitButton.on('pointerdown', () => this.submit());
    this.hint.setText('Tap SUBMIT when done');
  }

  renderName() {
    if (!this.nameText) {
      return;
    }
    const cursor = this.cursorOn ? '|' : ' ';
    this.nameText.setText((this.enteredName || '') + cursor);
  }

  async refreshBoard(highlightName) {
    const top = await getTopScores(8);
    if (!top.length) {
      this.boardText.setText('No scores yet — be the first!');
      return;
    }
    const lines = top.map((e, i) => {
      const row = `${String(i + 1).padStart(2, ' ')}. ${String(e.name).padEnd(12, ' ')} ${e.score}`;
      return highlightName && e.name === highlightName ? `▶ ${row}` : `  ${row}`;
    });
    this.boardText.setText(lines.join('\n'));
  }

  async submit() {
    if (this.submitted) {
      return;
    }
    this.submitted = true;
    const name = (this.enteredName || 'ANON').trim().toUpperCase().slice(0, 12) || 'ANON';

    // Tear down whichever entry path was used.
    if (this.onNameKey) {
      this.input.keyboard.off('keydown', this.onNameKey);
    }
    if (this.cursorTimer) {
      this.cursorTimer.remove();
    }
    this.cursorOn = false;
    if (this.nameText) {
      this.nameText.setText(name);
    }
    if (this.nameDom) {
      this.nameDom.node.blur();
      this.nameDom.destroy();
    }
    if (this.submitButton) {
      this.submitButton.disableInteractive().setAlpha(0.5);
    }
    this.hint.setText('Saving…');

    await submitScore(name, this.results.finalScore || 0);
    this.promptText.setText(`Nice run, ${name}!`);
    this.hint.setText('');

    await this.refreshBoard(name);

    // No in-game replay button: starting a fresh run re-triggered a stubborn
    // input-freeze bug on the next level, so we ask the player to refresh
    // (a clean page load) to play again.
    this.add
      .text(W / 2, H - 30, 'Refresh your browser to play again.\nCan you make it to the top of the leaderboard?', {
        fontSize: '18px',
        color: '#fde047',
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 4,
        wordWrap: { width: W - 80 }
      })
      .setOrigin(0.5);
  }
}
