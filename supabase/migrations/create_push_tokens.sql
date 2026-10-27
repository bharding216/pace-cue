-- Opt-in device tokens for feature-release push notifications.
-- Clients register through RPCs. The admin app reads and sends with the service role.

create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  anonymous_user_id text,
  user_id uuid references auth.users on delete set null,
  platform text not null check (platform in ('ios', 'android')),
  environment text not null check (environment in ('development', 'preview', 'production')),
  app_version text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_push_tokens_enabled_environment
  on push_tokens (environment)
  where enabled;

create table if not exists push_sends (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  url text,
  environments text[] not null,
  recipient_count int not null,
  error_count int not null default 0,
  tickets jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  receipts_checked_at timestamptz
);

alter table push_tokens enable row level security;
alter table push_sends enable row level security;

revoke all on table public.push_tokens from anon, authenticated;
revoke all on table public.push_sends from anon, authenticated;

-- The service role bypasses RLS but still needs table privileges.
grant select, insert, update, delete on table public.push_tokens to service_role;
grant select, insert, update, delete on table public.push_sends to service_role;

-- auth.uid() is schema-qualified so a locked search_path still resolves it.
create or replace function public.register_push_token(
  p_token text,
  p_anonymous_user_id text,
  p_platform text,
  p_environment text,
  p_app_version text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is null
     or char_length(p_token) > 200
     or p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$' then
    raise exception 'invalid push token';
  end if;

  if p_anonymous_user_id is not null and char_length(p_anonymous_user_id) > 80 then
    raise exception 'invalid anonymous id';
  end if;

  if p_platform not in ('ios', 'android') then
    raise exception 'invalid platform';
  end if;

  if p_environment not in ('development', 'preview', 'production') then
    raise exception 'invalid environment';
  end if;

  if p_app_version is not null and char_length(p_app_version) > 32 then
    raise exception 'invalid app version';
  end if;

  insert into public.push_tokens (
    token,
    anonymous_user_id,
    user_id,
    platform,
    environment,
    app_version,
    enabled,
    last_seen_at,
    updated_at
  ) values (
    p_token,
    p_anonymous_user_id,
    auth.uid(),
    p_platform,
    p_environment,
    p_app_version,
    true,
    now(),
    now()
  )
  on conflict (token) do update set
    anonymous_user_id = excluded.anonymous_user_id,
    user_id = auth.uid(),
    platform = excluded.platform,
    environment = excluded.environment,
    app_version = excluded.app_version,
    enabled = true,
    last_seen_at = now(),
    updated_at = now();
end;
$$;

create or replace function public.disable_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is null
     or char_length(p_token) > 200
     or p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$' then
    raise exception 'invalid push token';
  end if;

  update public.push_tokens
  set enabled = false,
      updated_at = now()
  where token = p_token;
end;
$$;

revoke all on function public.register_push_token(text, text, text, text, text) from public;
revoke all on function public.disable_push_token(text) from public;

grant execute on function public.register_push_token(text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.disable_push_token(text) to anon, authenticated, service_role;
