begin;

-- Allow the new server-confirmed relic claim event.
-- The TypeScript EVENT_KEYS set must also include 'relic_claimed'.

insert into public.tobyworld_patch_definitions (
  id,
  name,
  short_description,
  lore,
  category,
  rarity,
  image_path,
  unlock_type,
  event_key,
  requirement,
  progress_mode,
  public_hint,
  is_hidden,
  sort_order,
  animation_key,
  is_active
)
values
(
  'first-relic-claimed',
  'Relic Bearer',
  'Claimed a Tobyworld milestone relic onchain.',
  'The pond opened its archive and placed a piece of remembered history in your pack.',
  'milestone_relics',
  'rare',
  '/images/patches/relics/first-relic-claimed.png',
  'counter',
  'relic_claimed',
  '{"target":1}'::jsonb,
  'increment',
  'Claim an unlocked milestone relic.',
  false,
  500,
  'golden-stitch',
  true
),
(
  'relic-collector-three',
  'Archive Keeper',
  'Claimed three different Tobyworld milestone relics.',
  'Three relics now travel together, each carrying a different age of the pond.',
  'milestone_relics',
  'mythic',
  '/images/patches/relics/relic-collector-three.png',
  'unique_counter',
  'relic_claimed',
  '{"target":3,"uniqueField":"tokenId"}'::jsonb,
  'unique',
  'Gather three different milestone relics.',
  false,
  510,
  'relic-shimmer',
  true
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
  progress_mode = excluded.progress_mode,
  public_hint = excluded.public_hint,
  sort_order = excluded.sort_order,
  animation_key = excluded.animation_key,
  is_active = true;

commit;
