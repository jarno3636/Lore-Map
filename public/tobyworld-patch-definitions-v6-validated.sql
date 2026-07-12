-- ============================================================================
-- TOBYWORLD PATCH DEFINITIONS V6
-- Corrected for exact category and rarity enums in this Supabase project.
--
-- Categories:
-- daily_rite, pond_passport, atlas_exploration, community,
-- milestone_relics, secret_discoveries, seasonal, special
--
-- Rarities:
-- field, keepsake, rare, mythic, legend
--
-- Preserves:
-- seven-still-suns
-- whole-world-session
-- ============================================================================

begin;

-- ============================================================================
-- TOBYWORLD PATCH DEFINITIONS V3
--
-- Goals:
-- 1. Preserve the existing IDs:
--      seven-still-suns
--      whole-world-session
-- 2. Add missing Atlas, Shrine, Relic, Secret, Legend, and Seasonal definitions.
-- 3. Use practical trigger events that are easy to emit from the Home, Atlas,
--    Shrine, Passport, and Milestone pages.
-- 4. Never delete owned patches, progress, layouts, or event history.
--
-- Safe to rerun.
-- ============================================================================

-- --------------------------------------------------------------------------
-- A. Preserve and normalize the two existing records.
-- --------------------------------------------------------------------------

update public.tobyworld_patch_definitions
set
  image_path = '/images/patches/base/seven-still-suns.png',
  updated_at = now()
where id = 'seven-still-suns';

update public.tobyworld_patch_definitions
set
  name = 'The Long Way Around',
  image_path = '/images/patches/secrets/whole-world-session.png',
  updated_at = now()
where id = 'whole-world-session';

-- --------------------------------------------------------------------------
-- B. Automatically earnable definitions using events already supported by
--    the Traveler Pack route / engine.
-- --------------------------------------------------------------------------

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
  'atlas-opened',
  'Atlas Awakened',
  'Opened the living Tobyworld Atlas.',
  'The old map stirred beneath the water and remembered another traveler.',
  'atlas_exploration',
  'keepsake',
  '/images/patches/base/atlas-opened.png',
  'counter',
  'atlas_opened',
  '{"target":1}'::jsonb,
  'increment',
  'Open the living Atlas.',
  false,
  200,
  'map-unfurl',
  true
),
(
  'atlas-wayfinder',
  'Atlas Wayfinder',
  'Visited every major region of the living Atlas.',
  'Every current was touched, and every path bent back toward the pond.',
  'atlas_exploration',
  'rare',
  '/images/patches/base/atlas-wayfinder.png',
  'unique_counter',
  'atlas_node_visited',
  '{"target":6,"uniqueField":"nodeId"}'::jsonb,
  'unique',
  'Visit all six true Atlas regions.',
  false,
  210,
  'compass-glow',
  true
),
(
  'shrine-visitor',
  'Shrine Visitor',
  'Entered the Community Shrine.',
  'The traveler found the hall where the pond keeps its living echoes.',
  'community',
  'keepsake',
  '/images/patches/base/shrine-visitor.png',
  'unique_counter',
  'page_visited',
  '{"target":1,"uniqueField":"pageKey"}'::jsonb,
  'unique',
  'Visit the Community Shrine.',
  false,
  300,
  'lantern-light',
  true
),
(
  'community-echo',
  'Community Echo',
  'Added a legitimate Daily Rite echo to the pond.',
  'One quiet act joined the larger current and made the shared water brighter.',
  'community',
  'field',
  '/images/patches/base/community-echo.png',
  'counter',
  'community_echo_added',
  '{"target":1}'::jsonb,
  'increment',
  'Complete a Daily Rite and leave an echo.',
  false,
  310,
  'pond-ripple',
  true
),
(
  'relic-witness',
  'Relic Witness',
  'Studied a milestone relic.',
  'Before carrying history, the traveler stopped long enough to witness it.',
  'milestone_relics',
  'keepsake',
  '/images/patches/relics/relic-witness.png',
  'unique_counter',
  'relic_viewed',
  '{"target":1,"uniqueField":"tokenId"}'::jsonb,
  'unique',
  'Study a milestone relic.',
  false,
  500,
  'relic-glint',
  true
),
(
  'first-relic-claimed',
  'Relic Bearer',
  'Claimed a Tobyworld milestone relic onchain.',
  'The pond opened its archive and placed a piece of remembered history in the pack.',
  'milestone_relics',
  'rare',
  '/images/patches/relics/first-relic-claimed.png',
  'counter',
  'relic_claimed',
  '{"target":1}'::jsonb,
  'increment',
  'Claim an unlocked milestone relic.',
  false,
  510,
  'golden-stitch',
  true
),
(
  'relic-collector-three',
  'Archive Keeper',
  'Claimed three different Tobyworld milestone relics.',
  'Three ages of the pond now travel together on one explorer pack.',
  'milestone_relics',
  'mythic',
  '/images/patches/relics/relic-collector-three.png',
  'unique_counter',
  'relic_claimed',
  '{"target":3,"uniqueField":"tokenId"}'::jsonb,
  'unique',
  'Gather three different milestone relics.',
  false,
  520,
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
  is_hidden = excluded.is_hidden,
  sort_order = excluded.sort_order,
  animation_key = excluded.animation_key,
  is_active = excluded.is_active,
  updated_at = now();

-- --------------------------------------------------------------------------
-- C. Real, easy-to-implement secrets.
--
-- These use events your current Traveler Pack route already accepts:
--   atlas_opened
--   page_visited
--   toby_clicked
--   floating_star_clicked
--   session_duration_reached
--   secret_sequence_completed
--
-- The app must include the described context fields when emitting the event.
-- --------------------------------------------------------------------------

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
  'midnight-atlas',
  'Midnight Atlas',
  'Opened the Atlas during the midnight hour.',
  'At midnight, the constellations rearranged themselves above the pond.',
  'secret_discoveries',
  'rare',
  '/images/patches/secrets/midnight-atlas.png',
  'time_window',
  'atlas_opened',
  '{"localHours":[0]}'::jsonb,
  'increment',
  null,
  true,
  700,
  'constellation-align',
  true
),
(
  'hidden-frog',
  'Hidden Frog',
  'Found the tiny frog hiding on the Home screen.',
  'A pair of small eyes watched from behind the edge of the pond.',
  'secret_discoveries',
  'rare',
  '/images/patches/secrets/hidden-frog.png',
  'counter',
  'secret_sequence_completed',
  '{"target":1}'::jsonb,
  'increment',
  null,
  true,
  701,
  'tiny-hop',
  true
),
(
  'fifty-taps',
  'The Fifty Taps',
  'Tapped Toby fifty times.',
  'Toby remained still for forty-nine taps. On the fiftieth, he blinked.',
  'secret_discoveries',
  'mythic',
  '/images/patches/secrets/fifty-taps.png',
  'counter',
  'toby_clicked',
  '{"target":50}'::jsonb,
  'increment',
  null,
  true,
  702,
  'frog-blink',
  true
),
(
  'star-sweeper',
  'Star Sweeper',
  'Collected every floating star in one visit.',
  'The last star fell into the pond and became a quiet ripple.',
  'secret_discoveries',
  'mythic',
  '/images/patches/secrets/star-sweeper.png',
  'unique_counter',
  'floating_star_clicked',
  '{"target":8,"uniqueField":"starId"}'::jsonb,
  'unique',
  null,
  true,
  703,
  'star-shower',
  true
),
(
  'still-for-thirty',
  'Still for Thirty',
  'Stayed with Tobyworld for thirty minutes.',
  'The traveler stopped watching the clock, and the pond noticed.',
  'secret_discoveries',
  'rare',
  '/images/patches/secrets/still-for-thirty.png',
  'counter',
  'session_duration_reached',
  '{"target":30}'::jsonb,
  'increment',
  null,
  true,
  704,
  'mist-roll',
  true
),
(
  'forgotten-root',
  'Forgotten Root',
  'Completed the hidden root sequence.',
  'The map remembered a road it had intentionally forgotten.',
  'secret_discoveries',
  'mythic',
  '/images/patches/secrets/forgotten-root.png',
  'counter',
  'secret_sequence_completed',
  '{"target":1}'::jsonb,
  'increment',
  null,
  true,
  705,
  'root-awaken',
  true
),
(
  'moon-lotus',
  'Moon Lotus',
  'Completed the moon-lotus sequence.',
  'The flower opened only when nobody was trying to force it open.',
  'secret_discoveries',
  'mythic',
  '/images/patches/secrets/moon-lotus.png',
  'counter',
  'secret_sequence_completed',
  '{"target":1}'::jsonb,
  'increment',
  null,
  true,
  706,
  'lotus-bloom',
  true
),
(
  'ghost-frog',
  'Ghost Frog',
  'Encountered the forgotten traveler of the old pond.',
  'A pale frog crossed the water without making a ripple.',
  'secret_discoveries',
  'legend',
  '/images/patches/secrets/ghost-frog.png',
  'counter',
  'secret_sequence_completed',
  '{"target":1}'::jsonb,
  'increment',
  null,
  true,
  707,
  'ghost-drift',
  true
),
(
  'rainbow-frog',
  'Rare Rainbow Frog',
  'Encountered the rarest wandering frog in Tobyworld.',
  'For one impossible moment, every current carried a different color.',
  'secret_discoveries',
  'mythic',
  '/images/patches/secrets/rainbow-frog.png',
  'counter',
  'secret_sequence_completed',
  '{"target":1}'::jsonb,
  'increment',
  null,
  true,
  708,
  'rainbow-shimmer',
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
  is_hidden = excluded.is_hidden,
  sort_order = excluded.sort_order,
  animation_key = excluded.animation_key,
  is_active = excluded.is_active,
  updated_at = now();

-- Preserve your existing whole-world-session ID and make it a real
-- unique-page secret. The image path remains the file name you chose.
update public.tobyworld_patch_definitions
set
  name = 'The Long Way Around',
  short_description = 'Visited every major Tobyworld destination in one session.',
  lore = 'The traveler refused the shortcut and discovered why the long path mattered.',
  category = 'secret_discoveries',
  rarity = 'mythic',
  image_path = '/images/patches/secrets/whole-world-session.png',
  unlock_type = 'unique_counter',
  event_key = 'page_visited',
  requirement = '{"target":5,"uniqueField":"pageKey"}'::jsonb,
  progress_mode = 'unique',
  public_hint = null,
  is_hidden = true,
  sort_order = 709,
  animation_key = 'map-redraw',
  is_active = true,
  updated_at = now()
where id = 'whole-world-session';

-- --------------------------------------------------------------------------
-- D. Catalog-only definitions for later trusted integrations.
--
-- These appear in the Patch Book but will not unlock until the app emits the
-- dedicated event key from a trusted or intentional action.
-- --------------------------------------------------------------------------

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
  'toby-node',
  'The Still Center',
  'Found Toby at the center of the living Atlas.',
  'The world moved. Toby stayed still.',
  'atlas_exploration',
  'keepsake',
  '/images/patches/base/toby-node.png',
  'counter',
  'atlas_toby_discovered',
  '{"target":1}'::jsonb,
  'increment',
  'Listen at the center of the pond.',
  false,
  220,
  'pond-breathe',
  true
),
(
  'patience-node',
  'Red Grain',
  'Fully awakened the Patience region.',
  'The first ripple answered only after the traveler stopped rushing.',
  'atlas_exploration',
  'field',
  '/images/patches/base/patience-node.png',
  'counter',
  'atlas_patience_awakened',
  '{"target":1}'::jsonb,
  'increment',
  'Hold the red grain until the ripple sleeps.',
  false,
  221,
  'triangle-pulse',
  true
),
(
  'taboshi-node',
  'Leaf Binder',
  'Completed the Taboshi leaf garden.',
  'A leaf settled into still water and quietly became a root.',
  'atlas_exploration',
  'field',
  '/images/patches/base/taboshi-node.png',
  'counter',
  'atlas_taboshi_bloomed',
  '{"target":1}'::jsonb,
  'increment',
  'Complete the leaf garden.',
  false,
  222,
  'leaf-drift',
  true
),
(
  'sato-node',
  'Returning Current',
  'Fully awakened the Sato current.',
  'The blue current crossed the outer world and remembered the way home.',
  'atlas_exploration',
  'field',
  '/images/patches/base/sato-node.png',
  'counter',
  'atlas_sato_awakened',
  '{"target":1}'::jsonb,
  'increment',
  'Wake the returning current.',
  false,
  223,
  'current-flow',
  true
),
(
  'loreland-node',
  'Rootbed Walker',
  'Entered Loreland beneath the pond.',
  'The roots finally reached bedrock, and the hidden country opened below.',
  'atlas_exploration',
  'rare',
  '/images/patches/base/loreland-node.png',
  'counter',
  'atlas_loreland_entered',
  '{"target":1}'::jsonb,
  'increment',
  'Reach Loreland after awakening the wheel.',
  false,
  224,
  'root-glow',
  true
),
(
  'golden-gate-node',
  'Golden Gate Witness',
  'Studied the sealed Golden Gate.',
  'The traveler saw the next layer without forcing it open.',
  'atlas_exploration',
  'rare',
  '/images/patches/base/golden-gate-node.png',
  'counter',
  'atlas_golden_gate_studied',
  '{"target":1}'::jsonb,
  'increment',
  'Study the sealed gate.',
  false,
  225,
  'gate-shimmer',
  true
),
(
  'bronze-relic',
  'Bronze Relic',
  'Claimed the bronze-era milestone relic.',
  'The earliest metal carried the first weight of remembered echoes.',
  'milestone_relics',
  'field',
  '/images/patches/relics/bronze-relic.png',
  'counter',
  'bronze_relic_claimed',
  '{"target":1}'::jsonb,
  'increment',
  'Claim the bronze milestone relic.',
  false,
  530,
  'bronze-glint',
  true
),
(
  'silver-relic',
  'Silver Relic',
  'Claimed the silver-era milestone relic.',
  'Moonlight gathered on the relic like water on a quiet stone.',
  'milestone_relics',
  'rare',
  '/images/patches/relics/silver-relic.png',
  'counter',
  'silver_relic_claimed',
  '{"target":1}'::jsonb,
  'increment',
  'Claim the silver milestone relic.',
  false,
  531,
  'silver-glint',
  true
),
(
  'gold-relic',
  'Golden Relic',
  'Claimed the golden-era milestone relic.',
  'The archive answered with a piece of sunlight stitched into history.',
  'milestone_relics',
  'legend',
  '/images/patches/relics/gold-relic.png',
  'counter',
  'gold_relic_claimed',
  '{"target":1}'::jsonb,
  'increment',
  'Claim the golden milestone relic.',
  false,
  532,
  'gold-radiance',
  true
),
(
  'mythic-relic',
  'Mythic Relic',
  'Claimed a mythic Tobyworld relic.',
  'The oldest layer of the pond briefly surfaced and chose a bearer.',
  'milestone_relics',
  'mythic',
  '/images/patches/relics/mythic-relic.png',
  'counter',
  'mythic_relic_claimed',
  '{"target":1}'::jsonb,
  'increment',
  'Claim the mythic milestone relic.',
  false,
  533,
  'mythic-aura',
  true
),
(
  'og-explorer',
  'OG Explorer',
  'Recognized as an early Tobyworld explorer.',
  'This patch was carried before the trail had signs.',
  'special',
  'legend',
  '/images/patches/legend/og-explorer.png',
  'counter',
  'admin_og_explorer_granted',
  '{"target":1}'::jsonb,
  'increment',
  'Reserved for early explorers.',
  false,
  800,
  'founder-glow',
  true
),
(
  'founder',
  'Founder',
  'Recognized as a founding Tobyworld supporter.',
  'Some travelers joined the expedition before anyone knew how far it would go.',
  'special',
  'mythic',
  '/images/patches/legend/founder.png',
  'counter',
  'admin_founder_granted',
  '{"target":1}'::jsonb,
  'increment',
  'A founding expedition award.',
  false,
  801,
  'crown-sparkle',
  true
),
(
  'developer-award',
  'Pond Builder',
  'Helped build or maintain Tobyworld.',
  'The pond remembers the hands that shaped its banks.',
  'special',
  'legend',
  '/images/patches/legend/developer-award.png',
  'counter',
  'admin_developer_award_granted',
  '{"target":1}'::jsonb,
  'increment',
  'Awarded to Tobyworld builders.',
  false,
  802,
  'blueprint-glow',
  true
),
(
  'legend-circle',
  'Legend Circle',
  'Earned recognition through a future Legend Circle.',
  'A circle became a path, and the path became part of the Atlas.',
  'special',
  'mythic',
  '/images/patches/legend/legend-circle.png',
  'counter',
  'b20_legend_circle_verified',
  '{"target":1}'::jsonb,
  'increment',
  'Future B20-compatible award.',
  false,
  803,
  'circle-radiance',
  true
),
(
  'genesis-holder',
  'Genesis Holder',
  'Verified a future Tobyworld genesis holding.',
  'The first stone remembers the first ripple.',
  'special',
  'mythic',
  '/images/patches/legend/genesis-holder.png',
  'counter',
  'genesis_holder_verified',
  '{"target":1}'::jsonb,
  'increment',
  'Future verified holder award.',
  false,
  804,
  'genesis-pulse',
  true
),
(
  'spring-bloom',
  'Spring Bloom',
  'Joined a Tobyworld spring celebration.',
  'New leaves gathered where the winter water had been still.',
  'seasonal',
  'keepsake',
  '/images/patches/seasons/spring-bloom.png',
  'counter',
  'season_spring_completed',
  '{"target":1}'::jsonb,
  'increment',
  'Available during a spring expedition.',
  false,
  900,
  'petal-drift',
  true
),
(
  'summer-camp',
  'Summer Camp',
  'Joined a Tobyworld summer celebration.',
  'The expedition stayed awake beside the fire while the pond reflected the stars.',
  'seasonal',
  'keepsake',
  '/images/patches/seasons/summer-camp.png',
  'counter',
  'season_summer_completed',
  '{"target":1}'::jsonb,
  'increment',
  'Available during a summer expedition.',
  false,
  901,
  'campfire-flicker',
  true
),
(
  'autumn-trail',
  'Autumn Trail',
  'Joined a Tobyworld autumn celebration.',
  'Every fallen leaf became another marker on the old trail.',
  'seasonal',
  'keepsake',
  '/images/patches/seasons/autumn-trail.png',
  'counter',
  'season_autumn_completed',
  '{"target":1}'::jsonb,
  'increment',
  'Available during an autumn expedition.',
  false,
  902,
  'leaf-fall',
  true
),
(
  'winter-pond',
  'Winter Pond',
  'Joined a Tobyworld winter celebration.',
  'The surface froze, but the oldest current continued moving underneath.',
  'seasonal',
  'keepsake',
  '/images/patches/seasons/winter-pond.png',
  'counter',
  'season_winter_completed',
  '{"target":1}'::jsonb,
  'increment',
  'Available during a winter expedition.',
  false,
  903,
  'snow-glimmer',
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
  is_hidden = excluded.is_hidden,
  sort_order = excluded.sort_order,
  animation_key = excluded.animation_key,
  is_active = excluded.is_active,
  updated_at = now();

commit;

-- ============================================================================
-- IMPORTANT
--
-- These are UI-only assets and should NOT be inserted into patch definitions:
--
-- /images/patches/notifications/*
-- /images/patches/tiers/*
-- /images/patches/rarity/*
-- /images/patches/overlays/*
-- /images/patches/placeholders/*
-- ============================================================================

select
  id,
  name,
  category,
  rarity,
  image_path,
  unlock_type,
  event_key,
  requirement,
  is_hidden,
  is_active
from public.tobyworld_patch_definitions
order by sort_order, id;
