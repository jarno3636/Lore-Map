-- Tobyworld Traveler's Pack Engine v2
-- Adds atomic progress processing, correct unique counters, max-based streaks,
-- and returns newly unlocked patch IDs from one transaction.

begin;

alter table public.tobyworld_patch_definitions
  add column if not exists progress_mode text not null default 'increment';

alter table public.tobyworld_patch_definitions
  drop constraint if exists tobyworld_patch_definitions_progress_mode_check;

alter table public.tobyworld_patch_definitions
  add constraint tobyworld_patch_definitions_progress_mode_check
  check (
    progress_mode in (
      'increment',
      'maximum',
      'unique',
      'boolean'
    )
  );

drop index if exists public.tobyworld_patch_events_unique_idx;

create unique index if not exists tobyworld_patch_events_unique_idx
on public.tobyworld_patch_events (
  fid,
  event_key,
  unique_key
)
where unique_key is not null;

update public.tobyworld_patch_definitions
set progress_mode = case
  when event_key = 'daily_rite_streak' then 'maximum'
  when unlock_type = 'unique_counter' then 'unique'
  when unlock_type = 'time_window' then 'boolean'
  else 'increment'
end;

create or replace function public.tobyworld_process_patch_event(
  p_fid bigint,
  p_event_key text,
  p_event_value integer,
  p_unique_key text,
  p_idempotency_key text,
  p_context jsonb,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_now timestamptz := coalesce(p_occurred_at, now());
  v_value integer := greatest(1, least(coalesce(p_event_value, 1), 1000));
  v_definition record;
  v_current integer;
  v_target integer;
  v_next integer;
  v_completed boolean;
  v_owned_inserted boolean;
  v_unlocked text[] := '{}';
  v_duplicate boolean := false;
  v_local_hour integer;
  v_allowed_hours jsonb;
begin
  if p_fid is null or p_fid <= 0 then
    raise exception 'Invalid FID';
  end if;

  if p_event_key is null or length(p_event_key) = 0 then
    raise exception 'Missing event key';
  end if;

  if p_idempotency_key is null
     or length(p_idempotency_key) < 8
     or length(p_idempotency_key) > 180 then
    raise exception 'Invalid idempotency key';
  end if;

  begin
    insert into public.tobyworld_patch_events (
      fid,
      event_key,
      event_value,
      unique_key,
      idempotency_key,
      context,
      occurred_at
    )
    values (
      p_fid,
      p_event_key,
      v_value,
      nullif(p_unique_key, ''),
      p_idempotency_key,
      coalesce(p_context, '{}'::jsonb),
      v_now
    )
    returning id into v_event_id;
  exception
    when unique_violation then
      v_duplicate := true;
  end;

  if v_duplicate then
    return jsonb_build_object(
      'duplicate', true,
      'unlockedPatchIds', '[]'::jsonb
    );
  end if;

  for v_definition in
    select
      id,
      unlock_type,
      event_key,
      requirement,
      progress_mode,
      starts_at,
      ends_at
    from public.tobyworld_patch_definitions
    where is_active = true
      and event_key = p_event_key
      and (starts_at is null or starts_at <= v_now)
      and (ends_at is null or ends_at >= v_now)
    order by sort_order asc
  loop
    v_target := greatest(
      1,
      coalesce((v_definition.requirement ->> 'target')::integer, 1)
    );

    insert into public.tobyworld_patch_progress (
      fid,
      patch_id,
      current_value,
      target_value,
      first_seen_at,
      last_progress_at
    )
    values (
      p_fid,
      v_definition.id,
      0,
      v_target,
      v_now,
      v_now
    )
    on conflict (fid, patch_id) do nothing;

    select current_value
    into v_current
    from public.tobyworld_patch_progress
    where fid = p_fid
      and patch_id = v_definition.id
    for update;

    if v_definition.progress_mode = 'maximum' then
      v_next := greatest(coalesce(v_current, 0), v_value);

    elsif v_definition.progress_mode = 'unique' then
      select count(distinct unique_key)::integer
      into v_next
      from public.tobyworld_patch_events
      where fid = p_fid
        and event_key = p_event_key
        and unique_key is not null;

    elsif v_definition.progress_mode = 'boolean' then
      if v_definition.unlock_type = 'time_window' then
        v_allowed_hours := v_definition.requirement -> 'localHours';
        v_local_hour := nullif(p_context ->> 'localHour', '')::integer;

        if v_allowed_hours is null
           or jsonb_typeof(v_allowed_hours) <> 'array'
           or v_local_hour is null
           or not exists (
             select 1
             from jsonb_array_elements_text(v_allowed_hours) as allowed(hour_text)
             where allowed.hour_text::integer = v_local_hour
           ) then
          v_next := coalesce(v_current, 0);
        else
          v_next := 1;
        end if;
      else
        v_next := 1;
      end if;

    else
      v_next := coalesce(v_current, 0) + v_value;
    end if;

    v_completed := v_next >= v_target;

    update public.tobyworld_patch_progress
    set
      current_value = v_next,
      target_value = v_target,
      last_progress_at = v_now,
      completed_at = case
        when v_completed then coalesce(completed_at, v_now)
        else completed_at
      end
    where fid = p_fid
      and patch_id = v_definition.id;

    if v_completed then
      insert into public.tobyworld_owned_patches (
        fid,
        patch_id,
        earned_at,
        source,
        event_id
      )
      values (
        p_fid,
        v_definition.id,
        v_now,
        'engine',
        v_event_id
      )
      on conflict (fid, patch_id) do nothing;

      get diagnostics v_owned_inserted = row_count;

      if v_owned_inserted then
        v_unlocked := array_append(v_unlocked, v_definition.id);
      end if;
    end if;
  end loop;

  insert into public.tobyworld_backpack_profiles (
    fid,
    backpack_tier,
    updated_at
  )
  values (
    p_fid,
    public.tobyworld_backpack_tier(
      (
        select count(*)::integer
        from public.tobyworld_owned_patches
        where fid = p_fid
      )
    ),
    v_now
  )
  on conflict (fid) do update
  set
    backpack_tier = excluded.backpack_tier,
    updated_at = excluded.updated_at;

  return jsonb_build_object(
    'duplicate', false,
    'unlockedPatchIds', to_jsonb(v_unlocked)
  );
end;
$$;

revoke all on function public.tobyworld_process_patch_event(
  bigint,
  text,
  integer,
  text,
  text,
  jsonb,
  timestamptz
) from public, anon, authenticated;

grant execute on function public.tobyworld_process_patch_event(
  bigint,
  text,
  integer,
  text,
  text,
  jsonb,
  timestamptz
) to service_role;

commit;
