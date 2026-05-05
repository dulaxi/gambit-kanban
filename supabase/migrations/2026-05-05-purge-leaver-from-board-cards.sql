-- Purge a former board member's name from card assignees on that board.
--
-- Mirror of the workspace-scoped trigger added on 2026-04-15. Fires
-- when a row is deleted from board_members (user leaves the board, or
-- the owner removes them from the share modal). Strips the leaver's
-- display_name from `cards.assignees` and clears `assignee_name` if it
-- matched, scoped to cards on that one board.
--
-- Same tradeoff as the workspace version: a legit external collaborator
-- whose name exactly matches an ex-member is also stripped; user can
-- re-add via free-text in the assignee picker.

create or replace function public.purge_leaver_from_board_cards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  leaver_name text;
begin
  select display_name into leaver_name from public.profiles where id = old.user_id;
  if leaver_name is null or leaver_name = '' then
    return old;
  end if;

  update public.cards
  set
    assignees = array_remove(assignees, leaver_name),
    assignee_name = case
      when assignee_name = leaver_name then ''
      else assignee_name
    end
  where board_id = old.board_id
    and (leaver_name = any(assignees) or assignee_name = leaver_name);

  return old;
end;
$$;

drop trigger if exists on_board_member_leave_purge_cards on public.board_members;
create trigger on_board_member_leave_purge_cards
after delete on public.board_members
for each row execute function public.purge_leaver_from_board_cards();

-- Retro cleanup for already-orphaned assignees on personal-share boards.
-- (Workspace boards were cleaned up by the 2026-04-15 migration.)
with current_member_names as (
  select distinct b.id as board_id, p.display_name
  from public.boards b
  join public.board_members bm on bm.board_id = b.id
  join public.profiles p on p.id = bm.user_id
  where b.workspace_id is null
    and p.display_name is not null
    and p.display_name <> ''
),
card_cleanup as (
  select
    c.id,
    coalesce(
      array_agg(a) filter (
        where a in (select display_name from current_member_names where board_id = c.board_id)
      ),
      '{}'
    ) as kept_assignees
  from public.cards c
  join public.boards b on b.id = c.board_id
  left join lateral unnest(c.assignees) as a on true
  where b.workspace_id is null
  group by c.id
)
update public.cards c
set
  assignees = cc.kept_assignees,
  assignee_name = case
    when cc.kept_assignees = '{}' then ''
    when c.assignee_name = any(cc.kept_assignees) then c.assignee_name
    else cc.kept_assignees[1]
  end
from card_cleanup cc
where c.id = cc.id
  and c.assignees is distinct from cc.kept_assignees;
