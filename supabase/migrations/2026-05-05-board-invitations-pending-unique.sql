-- Replace the full-table unique on board_invitations(board_id, invited_email)
-- with a partial unique that only covers pending rows.
--
-- The old constraint blocked re-inviting someone after they had been
-- removed from a board: the historical 'accepted' or 'declined' row
-- still occupied the (board_id, invited_email) slot, so a fresh insert
-- would fail with "duplicate key value violates unique constraint
-- board_invitations_board_id_invited_email_key".
--
-- Partial unique index is the right tool — historical accept/decline
-- rows can coexist with a new pending invite, but you still can't
-- have two simultaneously pending invites for the same email + board.
alter table public.board_invitations
  drop constraint if exists board_invitations_board_id_invited_email_key;

create unique index if not exists
  board_invitations_pending_unique_idx
  on public.board_invitations (board_id, invited_email)
  where status = 'pending';
