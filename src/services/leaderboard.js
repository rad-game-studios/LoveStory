import { LEADERBOARD } from '../config/leaderboardConfig.js';

// Leaderboard with a swappable backend: uses Supabase (shared/global) when
// configured in leaderboardConfig.js, otherwise a per-device localStorage board.
// Both paths are async and share the same interface.

const LOCAL_KEY = 'loveStoryLeaderboard';

function isOnline() {
  return Boolean(LEADERBOARD.supabaseUrl && LEADERBOARD.supabaseAnonKey);
}

function sanitizeName(name) {
  const cleaned = (name || '').trim().toUpperCase().replace(/[^A-Z0-9 ._-]/g, '');
  return (cleaned || 'ANON').slice(0, 12);
}

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
  } catch {
    return [];
  }
}

function writeLocal(list) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable — ignore */
  }
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: LEADERBOARD.supabaseAnonKey,
    Authorization: `Bearer ${LEADERBOARD.supabaseAnonKey}`,
    ...extra
  };
}

// Returns true if the score was recorded to the shared/online board.
export async function submitScore(name, score) {
  const entry = { name: sanitizeName(name), score: Math.max(0, Math.round(score)) };

  if (isOnline()) {
    try {
      const res = await fetch(`${LEADERBOARD.supabaseUrl}/rest/v1/${LEADERBOARD.table}`, {
        method: 'POST',
        headers: supabaseHeaders({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify(entry)
      });
      if (res.ok) {
        return true;
      }
      console.error('[leaderboard] online submit failed', res.status);
    } catch (err) {
      console.error('[leaderboard] online submit error', err);
    }
  }

  const list = readLocal();
  list.push({ ...entry, created_at: Date.now() });
  writeLocal(list);
  return false;
}

export async function getTopScores(limit = 10) {
  if (isOnline()) {
    try {
      const url = `${LEADERBOARD.supabaseUrl}/rest/v1/${LEADERBOARD.table}?select=name,score&order=score.desc&limit=${limit}`;
      const res = await fetch(url, { headers: supabaseHeaders() });
      if (res.ok) {
        return await res.json();
      }
      console.error('[leaderboard] online fetch failed', res.status);
    } catch (err) {
      console.error('[leaderboard] online fetch error', err);
    }
  }

  return readLocal()
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function leaderboardIsShared() {
  return isOnline();
}
