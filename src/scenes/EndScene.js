import { submitScore, getTopScores, leaderboardIsShared } from '../services/leaderboard.js';
import { markGameBeaten, saveLastScorecard } from '../services/progress.js';
import { isTouchDevice } from '../ui/touchControls.js';
import { addFullscreenButton } from '../ui/fullscreen.js';
import { createScrollList } from '../ui/scrollList.js';

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
    // Keep this run's scorecard so it can be viewed again from stage select.
    saveLastScorecard(this.results);

    // Drop the gameplay key captures (W/A/S/D/F, arrows, space) so name entry
    // below reads plain keystrokes without the run's control bindings interfering.
    this.input.keyboard.clearCaptures();

    this.add.rectangle(W / 2, H / 2, W, H, 0x111827).setOrigin(0.5);
    addFullscreenButton(this);
    this.add.text(W / 2, 30, 'YOU MADE IT!', { fontSize: '36px', color: '#fef3c7', fontStyle: 'bold' }).setOrigin(0.5);

    // Leaderboard + name entry come FIRST so players actually submit; the
    // collectables scorecard follows once they've entered their name.
    this.showLeaderboardEntry();
  }

  showLeaderboardEntry() {
    const data = this.results;
    const coins = data.coins || 0;
    const enemies = data.enemiesDefeated || 0;
    const mult = data.multiplier || 1;
    const timeLeft = data.timeRemaining || 0;
    const finalScore = data.finalScore || 0;
    this.entryObjs = [];

    const breakdown =
      `Coins ${coins}×10=${coins * 10}     Enemies ${enemies}×50=${enemies * 50}     ` +
      `Time ${fmtTime(timeLeft)} → ×${mult.toFixed(2)}`;
    this.entryObjs.push(
      this.add.text(W / 2, 64, breakdown, { fontSize: '15px', color: '#e5e7eb', align: 'center' }).setOrigin(0.5)
    );
    this.entryObjs.push(
      this.add.text(W / 2, 100, `SCORE  ${finalScore}`, { fontSize: '32px', color: '#fde047', fontStyle: 'bold' }).setOrigin(0.5)
    );

    // --- Name entry (prominent, with cues so players know to leave their name) ---
    this.enteredName = '';
    this.promptText = this.add
      .text(W / 2, 140, 'Enter your name to join the LIVE Leaderboard!', { fontSize: '18px', color: '#fde047', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.entryObjs.push(this.promptText);

    // Pulsing highlighted box behind the field to signal "type/tap here".
    const boxY = 180;
    this.nameBox = this.add.rectangle(W / 2, boxY, 320, 54, 0x1f2937).setStrokeStyle(3, 0xfde047).setOrigin(0.5);
    this.entryObjs.push(this.nameBox);
    this.namePulse = this.tweens.add({
      targets: this.nameBox,
      alpha: { from: 1, to: 0.4 },
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });

    if (isTouchDevice()) {
      this.buildTouchNameEntry(boxY);
    } else {
      this.buildKeyboardNameEntry(boxY);
    }

    // --- LIVE Leaderboard (full + scrollable) ---
    this.entryObjs.push(
      this.add
        .text(W / 2, 284, leaderboardIsShared() ? 'LIVE LEADERBOARD' : 'LIVE LEADERBOARD (this device)', {
          fontSize: '18px',
          color: '#fef3c7',
          fontStyle: 'bold'
        })
        .setOrigin(0.5)
    );
    this.boardList = createScrollList(this, {
      x: 300,
      y: 306,
      width: 360,
      height: 190,
      depth: 5,
      arrowKeys: true,
      style: { fontSize: '16px', color: '#e5e7eb', fontFamily: 'monospace', lineSpacing: 5 }
    });
    this.boardList.setText('Loading…');

    this.refreshBoard();
  }

  // Desktop: capture keystrokes through Phaser and draw the name on the canvas
  // (no DOM element to steal focus). The blinking cursor signals it's typeable.
  buildKeyboardNameEntry(boxY) {
    this.cursorOn = true;
    this.nameText = this.add
      .text(W / 2, boxY, '', { fontSize: '24px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.entryObjs.push(this.nameText);
    this.renderName();
    this.cursorTimer = this.time.addEvent({
      delay: 450,
      loop: true,
      callback: () => {
        this.cursorOn = !this.cursorOn;
        this.renderName();
      }
    });

    // The very Enter press that advanced here also fires a generic keydown; arm
    // submit a beat later so it can't self-submit an empty name.
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
    this.hint = this.add.text(W / 2, boxY + 34, 'Type your name, then press ENTER', { fontSize: '14px', color: '#9ca3af' }).setOrigin(0.5);
    this.entryObjs.push(this.hint);
  }

  // Touch devices have no hardware keyboard, so overlay a real <input> (which pops
  // the on-screen keyboard). Phaser's own add.dom mispositions under Scale.FIT, so
  // we place a plain fixed <input> ourselves and keep it aligned to the on-canvas
  // yellow box (re-aligning on resize/rotate). The SUBMIT button stays a canvas
  // object — Phaser maps its taps correctly.
  buildTouchNameEntry(boxY) {
    const canvas = this.game.canvas;
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 12;
    input.placeholder = 'TAP TO TYPE NAME';
    input.setAttribute('autocapitalize', 'characters');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('enterkeyhint', 'go');
    Object.assign(input.style, {
      position: 'fixed',
      boxSizing: 'border-box',
      textAlign: 'center',
      textTransform: 'uppercase',
      fontWeight: 'bold',
      letterSpacing: '2px',
      color: '#ffffff',
      background: '#0b1220',
      border: '3px solid #fde047',
      borderRadius: '8px',
      outline: 'none',
      zIndex: '10',
      transform: 'translate(-50%, -50%)'
    });
    document.body.appendChild(input);
    this.nameInputEl = input;

    // Keep the <input> exactly over the canvas box regardless of scale/orientation.
    const reposition = () => {
      const r = canvas.getBoundingClientRect();
      const sx = r.width / W;
      const sy = r.height / H;
      input.style.left = `${r.left + (W / 2) * sx}px`;
      input.style.top = `${r.top + boxY * sy}px`;
      input.style.width = `${300 * sx}px`;
      input.style.height = `${44 * sy}px`;
      input.style.fontSize = `${22 * sy}px`;
    };
    reposition();
    this._repositionInput = reposition;
    this.scale.on('resize', reposition);
    window.addEventListener('resize', reposition);
    window.addEventListener('orientationchange', reposition);
    this.events.once('shutdown', () => this.removeNameInput());

    input.addEventListener('input', () => {
      this.enteredName = input.value;
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submit();
      }
    });
    setTimeout(() => input.focus(), 60);

    this.submitButton = this.add
      .text(W / 2, boxY + 52, '✓  SUBMIT', {
        fontSize: '20px',
        color: '#111827',
        backgroundColor: '#fde047',
        fontStyle: 'bold',
        padding: { x: 34, y: 10 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.submitButton.on('pointerdown', () => this.submit());
    this.entryObjs.push(this.submitButton);
    this.hint = this.add
      .text(W / 2, boxY + 92, 'Tap the box, type your name, then SUBMIT', { fontSize: '13px', color: '#9ca3af' })
      .setOrigin(0.5);
    this.entryObjs.push(this.hint);
  }

  removeNameInput() {
    if (this._repositionInput) {
      this.scale.off('resize', this._repositionInput);
      window.removeEventListener('resize', this._repositionInput);
      window.removeEventListener('orientationchange', this._repositionInput);
      this._repositionInput = null;
    }
    if (this.nameInputEl) {
      this.nameInputEl.remove();
      this.nameInputEl = null;
    }
  }

  renderName() {
    if (!this.nameText) {
      return;
    }
    const cursor = this.cursorOn ? '|' : ' ';
    this.nameText.setText((this.enteredName || '') + cursor);
  }

  async refreshBoard(highlightName) {
    const top = await getTopScores(500);
    if (!this.boardList) {
      return;
    }
    if (!top.length) {
      this.boardList.setText('No scores yet — be the first!');
      return;
    }
    const lines = top.map((e, i) => {
      const row = `${String(i + 1).padStart(3, ' ')}. ${String(e.name).padEnd(12, ' ')} ${e.score}`;
      return highlightName && e.name === highlightName ? `▶ ${row}` : `  ${row}`;
    });
    this.boardList.setText(lines.join('\n'));
    // After submitting, scroll to the player's row so they can see their rank.
    if (highlightName) {
      const idx = top.findIndex((e) => e.name === highlightName);
      if (idx >= 0) {
        this.boardList.revealLine(idx, lines.length);
      }
    }
  }

  async submit() {
    if (this.submitted) {
      return;
    }
    this.submitted = true;
    const name = (this.enteredName || 'ANON').trim().toUpperCase().slice(0, 12) || 'ANON';

    // Tear down whichever entry path was used and stop the "type here" pulse.
    if (this.namePulse) {
      this.namePulse.stop();
      this.nameBox.setAlpha(1);
    }
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
    this.removeNameInput();
    if (this.submitButton) {
      this.submitButton.disableInteractive().setAlpha(0.5);
    }
    this.hint.setText('Saving…');

    await submitScore(name, this.results.finalScore || 0);
    this.promptText.setText(`Nice run, ${name}! You're on the LIVE Leaderboard.`).setColor('#86efac');
    this.hint.setText('');

    await this.refreshBoard(name);

    // Offer the collectables scorecard. A dedicated button (not a tap-anywhere)
    // so scrolling/dragging the leaderboard doesn't skip ahead.
    const goLabel = isTouchDevice() ? '🎫  Scorecard  →' : 'Scorecard  →   (ENTER)';
    this.continuePrompt = this.add
      .text(W / 2, H - 22, goLabel, {
        fontSize: '16px',
        color: '#111827',
        backgroundColor: '#fde047',
        fontStyle: 'bold',
        padding: { x: 16, y: 6 }
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setInteractive({ useHandCursor: true });

    const go = () => {
      this.input.keyboard.off('keydown-ENTER', go);
      this.input.keyboard.off('keydown-SPACE', go);
      this.continuePrompt.off('pointerdown', go);
      this.showScorecard();
    };
    this.continuePrompt.on('pointerdown', go);
    this.input.keyboard.on('keydown-ENTER', go);
    this.input.keyboard.on('keydown-SPACE', go);
  }

  // Terminal screen: stage-by-stage collectables + how to play again.
  showScorecard() {
    if (this.namePulse) {
      this.namePulse.stop();
    }
    if (this.boardList) {
      this.boardList.destroy();
      this.boardList = null;
    }
    (this.entryObjs || []).forEach((o) => o.destroy());
    if (this.continuePrompt) {
      this.continuePrompt.destroy();
    }

    const collectables = this.results.collectables || [];

    this.add.text(W / 2, 92, 'SCORECARD', { fontSize: '26px', color: '#fde047', fontStyle: 'bold' }).setOrigin(0.5);
    this.add
      .text(W / 2, 122, 'Collectables gathered on each leg of the journey', { fontSize: '15px', color: '#9ca3af' })
      .setOrigin(0.5);

    let y = 158;
    if (!collectables.length) {
      this.add.text(W / 2, y, 'No collectables tracked.', { fontSize: '17px', color: '#e5e7eb' }).setOrigin(0.5);
    } else {
      collectables.forEach((stage) => {
        this.add
          .text(W / 2 - 300, y, stage.stage, { fontSize: '17px', color: '#e5e7eb', fontStyle: 'bold' })
          .setOrigin(0, 0.5);
        const items = stage.items.slice().sort((a, b) => (a.emoji === '🟡' ? -1 : b.emoji === '🟡' ? 1 : 0));
        const summary = items.map((it) => `${it.emoji} ${it.collected}/${it.total}`).join('    ');
        this.add.text(W / 2 + 300, y, summary, { fontSize: '18px', color: '#ffffff', align: 'right' }).setOrigin(1, 0.5);
        y += 34;
      });
    }

    this.add
      .text(W / 2, H - 34, 'Refresh your browser to play again.\nCan you make it to the top of the LIVE Leaderboard?', {
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
