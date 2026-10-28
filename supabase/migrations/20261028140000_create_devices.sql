-- One row per install (anonymous_user_id), refreshed from the app on launch.
-- Clients write through upsert_device(). Analytics reads with the service role.

create table if not exists public.devices (
  anonymous_user_id    text primary key,
  user_id              uuid references auth.users on delete set null,

  -- Hardware and OS
  platform             text not null check (platform in ('ios', 'android')),
  os_version           text,
  os_build_id          text,
  model_name           text,
  model_id             text,
  manufacturer         text,
  device_year_class    int,
  total_memory_bytes   bigint,
  is_physical_device   boolean,

  -- Build and OTA update
  environment          text,
  app_version          text,
  native_app_version   text,
  native_build_version text,
  runtime_version      text,
  update_id            text,
  update_channel       text,
  is_embedded_launch   boolean,

  -- Locale and display
  country              text,
  locale               text,
  timezone             text,
  measurement_system   text,
  uses_24h_clock       boolean,
  font_scale           numeric(4, 2),
  color_scheme         text,

  -- Permissions
  location_foreground  text,
  location_background  text,
  location_precise     boolean,
  notifications        text,

  -- App preferences
  pace_unit            text,
  audio_cue_mode       text,
  pace_tracking        boolean,
  subscription_tier    text,

  -- Lifecycle
  installed_at         timestamptz,
  install_referrer     text,
  first_seen_at        timestamptz not null default now(),
  last_seen_at         timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_devices_user on public.devices (user_id);
create index if not exists idx_devices_last_seen on public.devices (last_seen_at);

alter table public.devices enable row level security;
revoke all on table public.devices from anon, authenticated;
grant select, insert, update, delete on table public.devices to service_role;

-- Values that change between sessions, so they are recorded per event.
alter table public.events add column if not exists platform text;
alter table public.events add column if not exists os_version text;
alter table public.events add column if not exists update_id text;

-- Fields are read by name from p_info, so the app can send new keys before
-- this function knows about them. Unknown keys are ignored.
create or replace function public.upsert_device(
  p_anonymous_user_id text,
  p_info jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_platform text := p_info->>'platform';
  max_len constant int := 80;
begin
  if p_anonymous_user_id is null or char_length(p_anonymous_user_id) > 80 then
    raise exception 'invalid anonymous id';
  end if;

  if v_platform not in ('ios', 'android') then
    raise exception 'invalid platform';
  end if;

  if p_info is null or jsonb_typeof(p_info) <> 'object' or pg_column_size(p_info) > 8192 then
    raise exception 'invalid device info';
  end if;

  insert into public.devices as d (
    anonymous_user_id,
    user_id,
    platform,
    os_version,
    os_build_id,
    model_name,
    model_id,
    manufacturer,
    device_year_class,
    total_memory_bytes,
    is_physical_device,
    environment,
    app_version,
    native_app_version,
    native_build_version,
    runtime_version,
    update_id,
    update_channel,
    is_embedded_launch,
    country,
    locale,
    timezone,
    measurement_system,
    uses_24h_clock,
    font_scale,
    color_scheme,
    location_foreground,
    location_background,
    location_precise,
    notifications,
    pace_unit,
    audio_cue_mode,
    pace_tracking,
    subscription_tier,
    installed_at,
    install_referrer,
    last_seen_at,
    updated_at
  ) values (
    p_anonymous_user_id,
    auth.uid(),
    v_platform,
    left(p_info->>'os_version', max_len),
    left(p_info->>'os_build_id', max_len),
    left(p_info->>'model_name', max_len),
    left(p_info->>'model_id', max_len),
    left(p_info->>'manufacturer', max_len),
    case when jsonb_typeof(p_info->'device_year_class') = 'number'
      then (p_info->>'device_year_class')::numeric::int end,
    case when jsonb_typeof(p_info->'total_memory_bytes') = 'number'
      then (p_info->>'total_memory_bytes')::numeric::bigint end,
    case when jsonb_typeof(p_info->'is_physical_device') = 'boolean'
      then (p_info->>'is_physical_device')::boolean end,
    left(p_info->>'environment', max_len),
    left(p_info->>'app_version', max_len),
    left(p_info->>'native_app_version', max_len),
    left(p_info->>'native_build_version', max_len),
    left(p_info->>'runtime_version', max_len),
    left(p_info->>'update_id', max_len),
    left(p_info->>'update_channel', max_len),
    case when jsonb_typeof(p_info->'is_embedded_launch') = 'boolean'
      then (p_info->>'is_embedded_launch')::boolean end,
    left(p_info->>'country', 2),
    left(p_info->>'locale', max_len),
    left(p_info->>'timezone', max_len),
    left(p_info->>'measurement_system', max_len),
    case when jsonb_typeof(p_info->'uses_24h_clock') = 'boolean'
      then (p_info->>'uses_24h_clock')::boolean end,
    case when jsonb_typeof(p_info->'font_scale') = 'number'
      then least(greatest((p_info->>'font_scale')::numeric, 0), 99)::numeric(4, 2) end,
    left(p_info->>'color_scheme', max_len),
    left(p_info->>'location_foreground', max_len),
    left(p_info->>'location_background', max_len),
    case when jsonb_typeof(p_info->'location_precise') = 'boolean'
      then (p_info->>'location_precise')::boolean end,
    left(p_info->>'notifications', max_len),
    left(p_info->>'pace_unit', max_len),
    left(p_info->>'audio_cue_mode', max_len),
    case when jsonb_typeof(p_info->'pace_tracking') = 'boolean'
      then (p_info->>'pace_tracking')::boolean end,
    left(p_info->>'subscription_tier', max_len),
    case when p_info->>'installed_at' ~ '^\d{4}-\d{2}-\d{2}T'
      then (p_info->>'installed_at')::timestamptz end,
    left(p_info->>'install_referrer', 256),
    now(),
    now()
  )
  on conflict (anonymous_user_id) do update set
    -- Keep the last signed-in user after sign-out so device rows still join to accounts.
    user_id = coalesce(auth.uid(), d.user_id),
    platform = excluded.platform,
    os_version = excluded.os_version,
    os_build_id = excluded.os_build_id,
    model_name = excluded.model_name,
    model_id = excluded.model_id,
    manufacturer = excluded.manufacturer,
    device_year_class = excluded.device_year_class,
    total_memory_bytes = excluded.total_memory_bytes,
    is_physical_device = excluded.is_physical_device,
    environment = excluded.environment,
    app_version = excluded.app_version,
    native_app_version = excluded.native_app_version,
    native_build_version = excluded.native_build_version,
    runtime_version = excluded.runtime_version,
    update_id = excluded.update_id,
    update_channel = excluded.update_channel,
    is_embedded_launch = excluded.is_embedded_launch,
    country = excluded.country,
    locale = excluded.locale,
    timezone = excluded.timezone,
    measurement_system = excluded.measurement_system,
    uses_24h_clock = excluded.uses_24h_clock,
    font_scale = excluded.font_scale,
    color_scheme = excluded.color_scheme,
    location_foreground = excluded.location_foreground,
    location_background = excluded.location_background,
    location_precise = excluded.location_precise,
    notifications = excluded.notifications,
    pace_unit = excluded.pace_unit,
    audio_cue_mode = excluded.audio_cue_mode,
    pace_tracking = excluded.pace_tracking,
    subscription_tier = excluded.subscription_tier,
    installed_at = coalesce(d.installed_at, excluded.installed_at),
    install_referrer = coalesce(d.install_referrer, excluded.install_referrer),
    last_seen_at = now(),
    updated_at = now();
end;
$$;

revoke all on function public.upsert_device(text, jsonb) from public;
grant execute on function public.upsert_device(text, jsonb) to anon, authenticated, service_role;
