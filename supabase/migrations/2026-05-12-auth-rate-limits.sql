-- Auth-facing rate-limiting infrastructure for the `check-email` edge
-- function (and any future unauthenticated auth helpers).
--
-- Shape:
--   - One row per (bucket-key, window-start). Bucket keys are arbitrary
--     strings like "check_email:burst:1.2.3.4" so the same table serves
--     multiple endpoints with different policies.
--   - `check_rate_limit(p_bucket, p_max, p_window_seconds)` atomically
--     increments + tests the counter, returning true if the call is
--     allowed and false if the bucket is exhausted.
--
-- The function is SECURITY DEFINER so the edge function can call it
-- with the anon key — but it ONLY mutates this one table, so the blast
-- radius is contained.

create table if not exists public.auth_rate_limits (
  bucket text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

-- No RLS policies — only the SECURITY DEFINER helper below should touch
-- this table. Keep RLS on so any direct anon/auth query fails closed.
alter table public.auth_rate_limits enable row level security;

create or replace function public.check_rate_limit(
  p_bucket text,
  p_max int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_window_start timestamptz;
  v_now timestamptz := now();
begin
  -- Upsert the row and roll the window forward if it's expired.
  -- ON CONFLICT path runs atomically per row, so two concurrent calls
  -- can't both think they got the "first hit of a new window".
  insert into public.auth_rate_limits (bucket, count, window_start)
  values (p_bucket, 1, v_now)
  on conflict (bucket) do update
    set count = case
                  when public.auth_rate_limits.window_start <
                       v_now - make_interval(secs => p_window_seconds)
                    then 1
                  else public.auth_rate_limits.count + 1
                end,
        window_start = case
                         when public.auth_rate_limits.window_start <
                              v_now - make_interval(secs => p_window_seconds)
                           then v_now
                         else public.auth_rate_limits.window_start
                       end
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

-- IMPORTANT: `REVOKE ALL ... FROM PUBLIC` is NOT enough on Supabase.
-- The platform configures default privileges that directly grant
-- EXECUTE to `anon` and `authenticated` on new functions in public.
-- Those direct grants survive a revoke-from-PUBLIC. They must be
-- revoked from the named roles explicitly or anon can call this via
-- /rest/v1/rpc/check_rate_limit and bypass the edge function.
revoke all on function public.check_rate_limit(text, int, int) from public;
revoke execute on function public.check_rate_limit(text, int, int)
  from anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int)
  to service_role;

-- Optional housekeeping: prune buckets that haven't been touched in 24h.
-- Cheap to run on demand; could be wired to pg_cron later.
create or replace function public.prune_auth_rate_limits()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.auth_rate_limits
  where window_start < now() - interval '24 hours';
$$;

revoke all on function public.prune_auth_rate_limits() from public;
revoke execute on function public.prune_auth_rate_limits()
  from anon, authenticated;
grant execute on function public.prune_auth_rate_limits() to service_role;

-- Explicit deny-all policies on the rate-limit table. RLS with no
-- policies already denies anon/auth by default, but explicit policies
-- silence advisor lint 0008 and document intent for future readers.
create policy "deny all anon select" on public.auth_rate_limits
  for select to anon using (false);
create policy "deny all anon insert" on public.auth_rate_limits
  for insert to anon with check (false);
create policy "deny all anon update" on public.auth_rate_limits
  for update to anon using (false);
create policy "deny all anon delete" on public.auth_rate_limits
  for delete to anon using (false);
create policy "deny all auth select" on public.auth_rate_limits
  for select to authenticated using (false);
create policy "deny all auth insert" on public.auth_rate_limits
  for insert to authenticated with check (false);
create policy "deny all auth update" on public.auth_rate_limits
  for update to authenticated using (false);
create policy "deny all auth delete" on public.auth_rate_limits
  for delete to authenticated using (false);

-- Drop the obsolete email_exists RPC from the earlier iteration of this
-- feature, if it was ever applied. Idempotent.
drop function if exists public.email_exists(text);
