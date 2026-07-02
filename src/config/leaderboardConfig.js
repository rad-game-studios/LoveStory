// Shared online leaderboard config.
//
// To enable the GLOBAL board (shared across all wedding guests), fill these in
// with a Supabase project (free tier). Until then, the game falls back to a
// per-device localStorage board so everything still works.
//
// Setup (once):
//  1. Create a project at https://supabase.com  → copy Project URL + anon public key.
//  2. In the SQL editor, create the table + open policies:
//       create table leaderboard (
//         id bigint generated always as identity primary key,
//         name text not null,
//         score int not null,
//         created_at timestamptz default now()
//       );
//       alter table leaderboard enable row level security;
//       create policy "public read"  on leaderboard for select using (true);
//       create policy "public insert" on leaderboard for insert with check (true);
//  3. Paste the URL + anon key below. That's it — the game will use the shared board.
export const LEADERBOARD = {
  supabaseUrl: 'https://cbmfsyoyrbdwenafuluk.supabase.co',
  // Publishable client key (safe to ship; the table's row-level security policies
  // are what actually protect it). Used as both the apikey and Bearer token.
  supabaseAnonKey: 'sb_publishable_4rCxyuTooPHyANNVst0UwQ_4hEkkMgh',
  table: 'leaderboard'
};
