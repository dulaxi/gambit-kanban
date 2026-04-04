-- Fix: card_activity, card_comments, card_attachments SELECT/INSERT policies
-- use deeply nested subqueries (cards → board_members) that chain through
-- multiple RLS-protected tables. Simplify with a SECURITY DEFINER helper.

-- Step 1: Create helper that returns card IDs the user can access
create or replace function public.get_my_card_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select c.id from public.cards c
  where c.board_id in (
    select board_id from public.board_members where user_id = auth.uid()
  )
$$;

-- Step 2: Fix card_activity policies
drop policy if exists "Members can view card activity" on public.card_activity;
create policy "Members can view card activity"
  on public.card_activity for select
  to authenticated
  using (card_id in (select get_my_card_ids()));

drop policy if exists "Members can create card activity" on public.card_activity;
create policy "Members can create card activity"
  on public.card_activity for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and card_id in (select get_my_card_ids())
  );

-- Step 3: Fix card_comments policies
drop policy if exists "Members can view comments" on public.card_comments;
create policy "Members can view comments"
  on public.card_comments for select
  to authenticated
  using (card_id in (select get_my_card_ids()));

drop policy if exists "Members can create comments" on public.card_comments;
create policy "Members can create comments"
  on public.card_comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and card_id in (select get_my_card_ids())
  );

-- Step 4: Fix card_attachments policies
drop policy if exists "Members can view attachments" on public.card_attachments;
create policy "Members can view attachments"
  on public.card_attachments for select
  to authenticated
  using (card_id in (select get_my_card_ids()));

drop policy if exists "Members can upload attachments" on public.card_attachments;
create policy "Members can upload attachments"
  on public.card_attachments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and card_id in (select get_my_card_ids())
  );
