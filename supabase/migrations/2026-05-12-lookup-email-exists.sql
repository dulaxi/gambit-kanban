-- Internal lookup helper for the `check-email` edge function.
--
-- Why a SECURITY DEFINER function instead of direct REST access:
-- PostgREST (the data API behind .from()) does not expose the `auth`
-- schema by design — auth.users contains password hashes and recovery
-- tokens. Service-role has permission to read it but no REST route
-- exists. A SECURITY DEFINER SQL function lets us read auth.users
-- inside the function body and return ONLY a boolean to the caller.
--
-- Permissions: only service_role can execute. The edge function is the
-- sole intended caller and authenticates with the service-role key.

create or replace function public.lookup_email_exists(p_email text)
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select exists (
    select 1 from auth.users
    where lower(email) = lower(p_email)
  );
$$;

-- See comments in 2026-05-12-auth-rate-limits.sql: REVOKE FROM PUBLIC
-- does NOT remove Supabase's default grants to anon/authenticated.
-- Those must be revoked from the named roles explicitly or anon can
-- call /rest/v1/rpc/lookup_email_exists and bypass the rate limiter.
revoke all on function public.lookup_email_exists(text) from public;
revoke execute on function public.lookup_email_exists(text)
  from anon, authenticated;
grant execute on function public.lookup_email_exists(text) to service_role;
