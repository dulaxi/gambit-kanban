-- Add invitations + notifications tables to the realtime publication so
-- the notification bell, "Shared with me" sub-sidebar, and pending
-- invitations update live instead of only on page reload.
--
-- Workspaces / workspace_members / workspace_invitations were already
-- in the publication on prod; this migration is idempotent against an
-- already-added table by guarding with `do` blocks.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'board_invitations'
  ) then
    alter publication supabase_realtime add table public.board_invitations;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workspaces'
  ) then
    alter publication supabase_realtime add table public.workspaces;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workspace_members'
  ) then
    alter publication supabase_realtime add table public.workspace_members;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workspace_invitations'
  ) then
    alter publication supabase_realtime add table public.workspace_invitations;
  end if;
end $$;
