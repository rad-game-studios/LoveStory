// Tiny persistence for run progress. Currently just tracks whether the player
// has beaten the game at least once (which unlocks stage select).
const BEATEN_KEY = 'loveStory.beaten';

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
