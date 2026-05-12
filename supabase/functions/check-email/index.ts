// Edge function: POST /functions/v1/check-email
//
// Body: { "email": "user@example.com" }
// Reply (200): { "exists": true | false }
// Reply (429): { "error": "rate_limited" }
// Reply (400): { "error": "invalid_email" }
//
// Purpose: power the landing-page sign-in card's "does this account
// exist?" branch without exposing an unauthenticated DB endpoint that
// anyone can scrape. Rate-limit policy is dual-tier per IP:
//   - burst:    10 calls / 60 seconds
//   - sustained: 60 calls / 60 minutes
//
// Both limits must pass before the lookup runs. The lookup itself uses
// the service-role client to query auth.users directly (O(log n) on the
// existing unique index), not the paginated admin.listUsers API.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Matches the validators on auth.users.email — good enough for a
// pre-check; the real auth flow does the strict RFC validation.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  })
}

function clientIp(req: Request): string {
  // Supabase puts the real client IP in x-forwarded-for; the first hop
  // is the originator. Fallback to a static label so rate limiting
  // still functions (everyone shares one bucket) rather than failing
  // open if the header is missing.
  const xff = req.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  const real = req.headers.get("x-real-ip")
  if (real) return real
  return "unknown"
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS })
  }
  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed" })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: "misconfigured" })
  }

  let body: { email?: unknown }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: "invalid_json" })
  }

  const rawEmail = typeof body.email === "string" ? body.email : ""
  const email = rawEmail.trim().toLowerCase()
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return json(400, { error: "invalid_email" })
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const ip = clientIp(req)

  // Burst limit: 10 / 60s. Sustained limit: 60 / 3600s. Both must pass.
  // We check the cheaper (burst) first; if it denies we don't increment
  // the sustained counter, which avoids penalizing users who are about
  // to be rate-limited anyway.
  const { data: burstOk, error: burstErr } = await admin.rpc(
    "check_rate_limit",
    { p_bucket: `check_email:burst:${ip}`, p_max: 10, p_window_seconds: 60 },
  )
  if (burstErr) return json(500, { error: "rate_limiter_unavailable" })
  if (burstOk === false) return json(429, { error: "rate_limited" })

  const { data: sustainedOk, error: sustainedErr } = await admin.rpc(
    "check_rate_limit",
    {
      p_bucket: `check_email:sustained:${ip}`,
      p_max: 60,
      p_window_seconds: 3600,
    },
  )
  if (sustainedErr) return json(500, { error: "rate_limiter_unavailable" })
  if (sustainedOk === false) return json(429, { error: "rate_limited" })

  // PostgREST does not expose the auth schema (by design — auth.users
  // contains password hashes). We route the lookup through a
  // SECURITY DEFINER SQL function that returns only a boolean.
  const { data: exists, error: lookupErr } = await admin.rpc(
    "lookup_email_exists",
    { p_email: email },
  )
  if (lookupErr) return json(500, { error: "lookup_failed" })

  return json(200, { exists: Boolean(exists) })
})
