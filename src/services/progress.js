// Tiny persistence for run progress: whether the player has beaten the game at
// least once (unlocks stage select), plus the most recent run's scorecard.
const BEATEN_KEY = 'loveStory.beaten';
const SCORECARD_KEY = 'loveStory.lastScorecard';
const ZERO_KEY = 'loveStory.zeroUnlocked';

export function markGameBeaten() {
  try {
    localStorage.setItem(BEATEN_KEY, '1');
  } catch {
    // localStorage may be unavailable (private mode / sandboxed iframe) — ignore.
  }
}

export function hasBeatenGame() {
  try {
    return localStorage.getItem(BEATEN_KEY) === '1';
  } catch {
    return false;
  }
}

// Persist the finished run's scorecard so it can be revisited from stage select.
export function saveLastScorecard(results = {}) {
  try {
    localStorage.setItem(
      SCORECARD_KEY,
      JSON.stringify({ finalScore: results.finalScore || 0, collectables: results.collectables || [] })
    );
  } catch {
    // ignore
  }
}

export function getLastScorecard() {
  try {
    return JSON.parse(localStorage.getItem(SCORECARD_KEY)) || null;
  } catch {
    return null;
  }
}

// Zero the dog becomes playable once unlocked (all 3 blue coins on his stage, or
// beating the game with a score over 3000).
export function markZeroUnlocked() {
  try {
    localStorage.setItem(ZERO_KEY, '1');
  } catch {
    // ignore
  }
}

export function isZeroUnlocked() {
  try {
    return localStorage.getItem(ZERO_KEY) === '1';
  } catch {
    return false;
  }
}
