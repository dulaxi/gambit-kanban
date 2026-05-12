-- Add 'team' to the allowed values for profiles.tier so the
-- post-signup plan picker can choose Free / Pro / Team.
--
-- The original constraint was added inline as `CHECK (tier IN
-- ('free', 'pro'))` and Postgres auto-named it. We look up the name
-- dynamically before dropping so we don't depend on whichever name
-- Postgres generated at table-create time.

do $$
declare
  v_constraint_name text;
begin
  select c.conname
    into v_constraint_name
  from pg_constraint c
  join pg_class t on c.conrelid = t.oid
  where t.relname = 'profiles'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%tier%';

  if v_constraint_name is not null then
    execute format('alter table public.profiles drop constraint %I', v_constraint_name);
  end if;
end$$;

alter table public.profiles
  add constraint profiles_tier_check
  check (tier in ('free', 'pro', 'team'));
