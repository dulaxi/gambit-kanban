-- Add explicit FKs from *_members.user_id to public.profiles(id).
--
-- Both tables already had user_id → auth.users(id), but PostgREST won't
-- traverse a FK that crosses into the auth schema. That meant every
-- query like
--
--   .from('board_members').select('user_id, profiles(...)')
--
-- silently returned `profiles: null`, which is why members were missing
-- from the BoardShareModal members list.
--
-- profiles.id has its own FK to auth.users.id, so this second FK is a
-- redundancy at the type level but it's the canonical Supabase pattern
-- for exposing user data to PostgREST embeds.
--
-- After adding, NOTIFY pgrst so PostgREST refreshes its schema cache
-- without needing a server restart.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'board_members_user_id_profiles_fkey'
  ) then
    alter table public.board_members
      add constraint board_members_user_id_profiles_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'workspace_members_user_id_profiles_fkey'
  ) then
    alter table public.workspace_members
      add constraint workspace_members_user_id_profiles_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

notify pgrst, 'reload schema';
