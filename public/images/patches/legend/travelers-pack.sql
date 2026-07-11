-- Tobyworld Atlas: Traveler's Pack
-- Production-oriented schema for collectible backpack patches.
-- Run in Supabase SQL Editor with an owner/service-role connection.

create extension if not exists pgcrypto;

do $$ begin
  create type public.tobyworld_patch_category as enum (
    'daily_rite',
    'pond_passport',
    'atlas_exploration',
    'community',
    'milestone_relics',
    'secret_discoveries',
    'seasonal',
    'special'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tobyworld_patch_rarity as enum (
    'field',
    'keepsake',
    'rare',
    'mythic',
    'legend'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tobyworld_unlock_type as enum (
    'counter',
    'unique_counter',
    'sequence',
    'time_window',
    'seasonal',
    'manual',
    'external'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tobyworld_patch_source as enum (
    'engine',
    'season',
    'admin',
    'external',
    'migration'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.tobyworld_patch_definitions (
  id text primary key,
  name text not null,
  short_description text not null,
  lore text not null,
  category public.tobyworld_patch_category not null,
  rarity public.tobyworld_patch_rarity not null default 'field',
  image_path text not null,
  unlock_type public.tobyworld_unlock_type not null,
  event_key text,
  requirement jsonb not null default '{}'::jsonb,
  public_hint text,
  is_hidden boolean not null default false,
  is_active boolean not null default true,
  season_key text,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  backpack_slot_hint text,
  animation_key text,
  external_requirement jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tobyworld_patch_season_window
    check (starts_at is null or ends_at is null or starts_at < ends_at)
);

create index if not exists tobyworld_patch_definitions_active_idx
  on public.tobyworld_patch_definitions (is_active, category, sort_order);

create index if not exists tobyworld_patch_definitions_event_idx
  on public.tobyworld_patch_definitions (event_key)
  where event_key is not null and is_active = true;

create table if not exists public.tobyworld_patch_events (
  id uuid primary key default gen_random_uuid(),
  fid bigint not null check (fid > 0),
  event_key text not null,
  event_value integer not null default 1 check (event_value > 0 and event_value <= 1000),
  unique_key text,
  idempotency_key text not null,
  context jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint tobyworld_patch_events_idempotent unique (fid, idempotency_key)
);

create index if not exists tobyworld_patch_events_lookup_idx
  on public.tobyworld_patch_events (fid, event_key, occurred_at desc);

create index if not exists tobyworld_patch_events_unique_idx
  on public.tobyworld_patch_events (fid, event_key, unique_key)
  where unique_key is not null;

create table if not exists public.tobyworld_patch_progress (
  fid bigint not null check (fid > 0),
  patch_id text not null references public.tobyworld_patch_definitions(id) on delete cascade,
  current_value integer not null default 0 check (current_value >= 0),
  target_value integer not null default 1 check (target_value > 0),
  state jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_progress_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (fid, patch_id)
);

create index if not exists tobyworld_patch_progress_fid_idx
  on public.tobyworld_patch_progress (fid, completed_at, last_progress_at desc);

create table if not exists public.tobyworld_owned_patches (
  id uuid primary key default gen_random_uuid(),
  fid bigint not null check (fid > 0),
  patch_id text not null references public.tobyworld_patch_definitions(id) on delete restrict,
  earned_at timestamptz not null default now(),
  source public.tobyworld_patch_source not null default 'engine',
  source_reference text,
  event_id uuid references public.tobyworld_patch_events(id) on delete set null,
  featured boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint tobyworld_owned_patches_unique unique (fid, patch_id)
);

create unique index if not exists tobyworld_one_featured_patch_per_fid
  on public.tobyworld_owned_patches (fid)
  where featured = true;

create index if not exists tobyworld_owned_patches_recent_idx
  on public.tobyworld_owned_patches (earned_at desc);

create table if not exists public.tobyworld_backpack_profiles (
  fid bigint primary key check (fid > 0),
  backpack_tier text not null default 'wanderer',
  backpack_variant text not null default 'field-canvas',
  equipped_charm_ids text[] not null default '{}',
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.tobyworld_backpack_placements (
  fid bigint not null check (fid > 0),
  patch_id text not null references public.tobyworld_patch_definitions(id) on delete cascade,
  x numeric(6,3) not null check (x between 0 and 100),
  y numeric(6,3) not null check (y between 0 and 100),
  rotation numeric(6,2) not null default 0 check (rotation between -180 and 180),
  scale numeric(5,3) not null default 1 check (scale between 0.35 and 2.5),
  z_index integer not null default 1 check (z_index between 0 and 500),
  updated_at timestamptz not null default now(),
  primary key (fid, patch_id)
);

create table if not exists public.tobyworld_seasons (
  season_key text primary key,
  name text not null,
  description text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  art_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint tobyworld_season_window check (starts_at < ends_at)
);

create table if not exists public.tobyworld_patch_shares (
  id uuid primary key default gen_random_uuid(),
  fid bigint not null check (fid > 0),
  patch_id text references public.tobyworld_patch_definitions(id) on delete set null,
  share_type text not null default 'patch',
  platform text,
  share_token text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.tobyworld_patch_admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  fid bigint,
  patch_id text,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.tobyworld_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tobyworld_patch_definitions_touch on public.tobyworld_patch_definitions;
create trigger tobyworld_patch_definitions_touch
before update on public.tobyworld_patch_definitions
for each row execute function public.tobyworld_touch_updated_at();

drop trigger if exists tobyworld_backpack_profiles_touch on public.tobyworld_backpack_profiles;
create trigger tobyworld_backpack_profiles_touch
before update on public.tobyworld_backpack_profiles
for each row execute function public.tobyworld_touch_updated_at();

create or replace function public.tobyworld_backpack_tier(patch_count integer)
returns text
language sql
immutable
as $$
  select case
    when patch_count >= 75 then 'atlas_legend'
    when patch_count >= 50 then 'relic_seeker'
    when patch_count >= 30 then 'cartographer'
    when patch_count >= 15 then 'pathfinder'
    when patch_count >= 5 then 'trailkeeper'
    else 'wanderer'
  end;
$$;

create or replace function public.tobyworld_set_featured_patch(
  p_fid bigint,
  p_patch_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tobyworld_owned_patches
  set featured = false
  where fid = p_fid and featured = true;

  if p_patch_id is not null then
    update public.tobyworld_owned_patches
    set featured = true
    where fid = p_fid and patch_id = p_patch_id;

    if not found then
      raise exception 'Patch is not owned by this explorer';
    end if;
  end if;
end;
$$;

create or replace function public.tobyworld_replace_patch_layout(
  p_fid bigint,
  p_placements jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  if jsonb_typeof(p_placements) <> 'array' then
    raise exception 'placements must be an array';
  end if;

  if jsonb_array_length(p_placements) > 150 then
    raise exception 'too many placements';
  end if;

  delete from public.tobyworld_backpack_placements where fid = p_fid;

  for item in select * from jsonb_array_elements(p_placements)
  loop
    if exists (
      select 1 from public.tobyworld_owned_patches
      where fid = p_fid and patch_id = item->>'patchId'
    ) then
      insert into public.tobyworld_backpack_placements (
        fid, patch_id, x, y, rotation, scale, z_index
      ) values (
        p_fid,
        item->>'patchId',
        greatest(0, least(100, coalesce((item->>'x')::numeric, 50))),
        greatest(0, least(100, coalesce((item->>'y')::numeric, 50))),
        greatest(-180, least(180, coalesce((item->>'rotation')::numeric, 0))),
        greatest(0.35, least(2.5, coalesce((item->>'scale')::numeric, 1))),
        greatest(0, least(500, coalesce((item->>'zIndex')::integer, 1)))
      );
    end if;
  end loop;
end;
$$;

alter table public.tobyworld_patch_definitions enable row level security;
alter table public.tobyworld_patch_events enable row level security;
alter table public.tobyworld_patch_progress enable row level security;
alter table public.tobyworld_owned_patches enable row level security;
alter table public.tobyworld_backpack_profiles enable row level security;
alter table public.tobyworld_backpack_placements enable row level security;
alter table public.tobyworld_seasons enable row level security;
alter table public.tobyworld_patch_shares enable row level security;
alter table public.tobyworld_patch_admin_audit enable row level security;

-- Publicly safe catalog reads. Secret requirements remain protected because the API
-- should select only safe columns; do not grant direct anon access to requirement.
create policy "public reads active visible patch catalog"
on public.tobyworld_patch_definitions
for select
using (is_active = true and is_hidden = false);

create policy "public reads active seasons"
on public.tobyworld_seasons
for select
using (is_active = true);

revoke all on public.tobyworld_patch_events from anon, authenticated;
revoke all on public.tobyworld_patch_progress from anon, authenticated;
revoke all on public.tobyworld_owned_patches from anon, authenticated;
revoke all on public.tobyworld_backpack_profiles from anon, authenticated;
revoke all on public.tobyworld_backpack_placements from anon, authenticated;
revoke all on public.tobyworld_patch_shares from anon, authenticated;
revoke all on public.tobyworld_patch_admin_audit from anon, authenticated;

-- Seed definitions. Keep hidden requirement details server-side.
insert into public.tobyworld_patch_definitions (
  id, name, short_description, lore, category, rarity, image_path,
  unlock_type, event_key, requirement, public_hint, is_hidden,
  sort_order, backpack_slot_hint, animation_key
) values
  (
    'first-rite',
    'First Light',
    'Completed a first Daily Rite.',
    'The first promise is the smallest, and often the one that changes the road.',
    'daily_rite',
    'field',
    '/images/patches/base/first-rite.png',
    'counter',
    'daily_rite_completed',
    '{"target":1}',
    'Complete a Daily Rite.',
    false,
    10,
    'front-upper',
    'thread-glint'
  ),
  (
    'seven-still-suns',
    'Seven Still Suns',
    'Kept the rite for seven days.',
    'Seven quiet mornings became a trail no map had marked.',
    'daily_rite',
    'keepsake',
    '/images/patches/base/seven-still-suns.png',
    'counter',
    'daily_rite_streak',
    '{"target":7}',
    'Keep a seven-day rite streak.',
    false,
    20,
    'front-center',
    'sun-pulse'
  ),
  (
    'pond-cartographer',
    'Pond Cartographer',
    'Opened and explored the Pond Passport.',
    'Every traveler begins by learning the shape of home.',
    'pond_passport',
    'field',
    '/images/patches/base/pond-cartographer.png',
    'counter',
    'passport_opened',
    '{"target":1}',
    'Open the Pond Passport.',
    false,
    30,
    'front-lower',
    'paper-breathe'
  ),
  (
    'passport-herald',
    'Passport Herald',
    'Shared three Pond Passports.',
    'A journey remembered alone is a story. A journey shared becomes a road.',
    'pond_passport',
    'rare',
    '/images/patches/base/passport-herald.png',
    'counter',
    'passport_shared',
    '{"target":3}',
    'Share three passports.',
    false,
    40,
    'side-pocket',
    'gold-spark'
  ),
  (
    'atlas-wayfinder',
    'Atlas Wayfinder',
    'Visited seven different Atlas nodes.',
    'The Atlas answers those who wander without demanding a destination.',
    'atlas_exploration',
    'keepsake',
    '/images/patches/base/atlas-wayfinder.png',
    'unique_counter',
    'atlas_node_visited',
    '{"target":7,"uniqueField":"nodeId"}',
    'Discover seven Atlas locations.',
    false,
    50,
    'front-center',
    'compass-turn'
  ),
  (
    'relic-witness',
    'Relic Witness',
    'Visited every known milestone relic.',
    'History does not ask to be owned. Only witnessed.',
    'milestone_relics',
    'rare',
    '/images/patches/relics/relic-witness.png',
    'unique_counter',
    'relic_viewed',
    '{"target":5,"uniqueField":"relicId"}',
    'Study each milestone relic.',
    false,
    60,
    'strap-left',
    'relic-ember'
  ),
  (
    'echo-keeper',
    'Echo Keeper',
    'Added fifty weighted echoes to the community.',
    'Some voices fade. Others become part of the place itself.',
    'community',
    'rare',
    '/images/patches/base/echo-keeper.png',
    'counter',
    'community_echo_added',
    '{"target":50}',
    'Leave a lasting echo.',
    false,
    70,
    'front-upper',
    'echo-ring'
  ),
  (
    'the-fifty-taps',
    'The Patient Knock',
    'A tiny frog eventually answered.',
    'There are doors in Tobyworld that only patience knows are doors.',
    'secret_discoveries',
    'mythic',
    '/images/patches/secrets/the-fifty-taps.png',
    'counter',
    'toby_clicked',
    '{"target":50}',
    null,
    true,
    1000,
    'hidden',
    'frog-hop'
  ),
  (
    'midnight-atlas',
    'Midnight Atlas',
    'Visited the Atlas in the quiet hour.',
    'At midnight the ink remembers routes it refuses to show by day.',
    'secret_discoveries',
    'mythic',
    '/images/patches/secrets/midnight-atlas.png',
    'time_window',
    'atlas_opened',
    '{"localHours":[0]}',
    null,
    true,
    1010,
    'hidden',
    'constellation'
  ),
  (
    'whole-world-session',
    'The Long Way Around',
    'Visited every major Tobyworld chamber in one session.',
    'The backpack grew heavier, but the world felt smaller.',
    'secret_discoveries',
    'legend',
    '/images/patches/secrets/whole-world-session.png',
    'unique_counter',
    'page_visited',
    '{"target":6,"uniqueField":"pageKey","sessionScoped":true}',
    null,
    true,
    1020,
    'hidden',
    'map-redraw'
  ),
  (
    'genesis-explorer',
    'Genesis Explorer',
    'A founding traveler of the Tobyworld Atlas.',
    'Before the trails had names, a few explorers still chose to walk them.',
    'special',
    'legend',
    '/images/patches/legend/genesis-explorer.png',
    'manual',
    null,
    '{}',
    'Reserved for founding explorers.',
    false,
    2000,
    'front-crown',
    'legend-shimmer'
  )
on conflict (id) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  lore = excluded.lore,
  category = excluded.category,
  rarity = excluded.rarity,
  image_path = excluded.image_path,
  unlock_type = excluded.unlock_type,
  event_key = excluded.event_key,
  requirement = excluded.requirement,
  public_hint = excluded.public_hint,
  is_hidden = excluded.is_hidden,
  sort_order = excluded.sort_order,
  backpack_slot_hint = excluded.backpack_slot_hint,
  animation_key = excluded.animation_key,
  is_active = true;
