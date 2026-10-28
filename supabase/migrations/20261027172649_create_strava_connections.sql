-- Strava OAuth token storage
-- Each authenticated user can link one Strava account.
-- Tokens are written/updated exclusively by Edge Functions using the
-- service_role key. Users may read and delete their own row.

create table if not exists public.strava_connections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  strava_athlete_id bigint not null,
  access_token      text not null,
  refresh_token     text not null,
  token_expires_at  timestamptz not null,
  athlete_name      text,
  connected_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint strava_connections_user_unique unique (user_id)
);

-- Index for quick lookups by user
create index if not exists idx_strava_connections_user
  on public.strava_connections (user_id);

-- RLS ----------------------------------------------------------------

alter table public.strava_connections enable row level security;

-- Users can read their own connection
create policy "Users can read own strava connection"
  on public.strava_connections for select
  using (auth.uid() = user_id);

-- Users can delete (disconnect) their own connection
create policy "Users can delete own strava connection"
  on public.strava_connections for delete
  using (auth.uid() = user_id);

-- Inserts and updates go through the service_role key (Edge Functions).
-- No insert/update policy for the authenticated role keeps tokens secure.
