# Kolumn SaaS Launch — Design Spec

**Date:** 2026-04-03
**Status:** Draft
**Goal:** Deploy Kolumn as a publicly accessible free product on `kolumn.app`, with invisible infrastructure for future monetization.

---

## Context

Kolumn is a multi-user Kanban app already deployed on Railway. It has auth (email/password), board-level sharing, real-time collaboration, and a marketing landing page. The goal is to transition from "side project" to "live product anyone can sign up for" — free for now, with the architectural hooks to monetize later.

### What already exists
- Supabase Auth (email/password), RLS policies, real-time subscriptions
- Board sharing with member roles (owner/member)
- Board templates (Blank, Bug Tracker, Sprint, Content Pipeline, Hiring, Simple)
- Card templates (save/reuse)
- Empty state CTAs and welcome greeting on dashboard
- Landing page with feature showcase and "Start for free" CTAs
- Railway deployment with `railway.json` configured

### What's missing
- No concept of plans/tiers
- No usage tracking
- No error tracking or analytics
- No env var validation
- Landing page doesn't position as a real product

### Out of scope
- Organizations / multi-tenancy (board sharing is sufficient)
- Billing / Stripe / payments
- Feature gating UI
- OAuth (Google, GitHub)
- Email system (transactional emails)
- Rate limiting
- Terms of Service / Privacy Policy
- SEO & meta tags / OG image (Phase 2)

---

## Phase 1: Core SaaS Foundation

### 1. Invisible Plan Layer

**Purpose:** Add a `plan` concept to every user so that future monetization is a UI problem, not an architecture problem.

**Database changes:**

```sql
CREATE TABLE plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  limits jsonb NOT NULL DEFAULT '{}'
);

INSERT INTO plans (id, name, limits) VALUES
  ('free', 'Free', '{"boards": null, "members_per_board": null}');

ALTER TABLE profiles ADD COLUMN plan_id text DEFAULT 'free' REFERENCES plans(id);
```

**Behavior:**
- Every new user gets `plan_id = 'free'` automatically
- No UI surfaces the plan — it's purely a database marker
- `limits` is a JSONB field so plan definitions can evolve without schema changes
- `null` in limits means "unlimited"

**Future use:** When monetizing, add rows to `plans` table, add a Stripe webhook that updates `plan_id`, and gate features with `profile.plan_id` checks.

### 2. Usage Tracking

**Purpose:** Silently track per-user product usage so pricing decisions are data-driven when the time comes.

**Database changes:**

```sql
CREATE TABLE usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  metric text NOT NULL,
  value bigint NOT NULL DEFAULT 0,
  period text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, metric, period)
);

-- RLS: users can read their own metrics
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own metrics"
  ON usage_metrics FOR SELECT
  USING (auth.uid() = user_id);
```

**Tracked metrics:**
- `boards_created` — incremented via trigger on `boards` INSERT
- `cards_created` — incremented via trigger on `cards` INSERT
- `members_invited` — incremented via trigger on `board_members` INSERT
- `total_boards` — running count (not monthly)
- `storage_bytes` — if/when file attachments grow

**Period format:** `YYYY-MM` for monthly buckets (e.g., `2026-04`), `lifetime` for running totals.

**Implementation:** Supabase triggers (AFTER INSERT) on `boards`, `cards`, and `board_members` tables that upsert into `usage_metrics`. No application code changes needed for tracking.

**No UI.** Metrics are invisible to users. Queryable via Supabase dashboard or SQL for founder analytics.

### 3. Error Tracking — Sentry

**Purpose:** See production crashes with full context instead of relying on user reports.

**Package:** `@sentry/react`

**Implementation:**
- Initialize in `main.jsx` with `VITE_SENTRY_DSN` env var
- Wrap React tree with `Sentry.ErrorBoundary` (renders fallback UI on crash instead of white screen)
- Attach `user.id` and `user.email` to Sentry scope after auth
- `VITE_SENTRY_DSN` is optional — app works without it (dev environments)

**Config:**
- Sample rate: 1.0 (capture all errors — volume will be low initially)
- Environment tag: `production` / `development` based on `import.meta.env.MODE`

### 4. Product Analytics — PostHog

**Purpose:** Understand user behavior — signups, feature adoption, drop-off points. Also provides feature flags for future plan-based gating.

**Package:** `posthog-js`

**Implementation:**
- Initialize in `main.jsx` with `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST`
- Call `posthog.identify(user.id, { email, display_name, plan_id })` after auth
- Both env vars are optional — app works without them

**Key events to capture:**

| Event | Where | Properties |
|-------|-------|------------|
| `user_signed_up` | `authStore.signUp` | — |
| `user_signed_in` | `authStore.signIn` | — |
| `board_created` | `boardStore.addBoard` | `template` |
| `card_created` | `boardStore.addCard` | `board_id` |
| `card_completed` | `boardStore.updateCard` | `board_id` |
| `member_invited` | `BoardShareModal` | — |
| `board_shared` | `BoardShareModal` | `member_count` |
| `feature_used` | Calendar, Notes, Dashboard pages | `feature_name` |

**Session replays:** Enabled via PostHog config (no code). Lets you watch real user sessions.

### 5. Environment Validation

**Purpose:** Fail fast with a clear error when required env vars are missing.

**Implementation:** New file `src/lib/env.js`:

```js
const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const optional = ['VITE_SENTRY_DSN', 'VITE_POSTHOG_KEY', 'VITE_POSTHOG_HOST'];

for (const key of required) {
  if (!import.meta.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN || null,
  posthogKey: import.meta.env.VITE_POSTHOG_KEY || null,
  posthogHost: import.meta.env.VITE_POSTHOG_HOST || null,
};
```

Import `env` in `main.jsx` and `lib/supabase.js` instead of accessing `import.meta.env` directly.

### 6. Landing Page v2

**Purpose:** Reposition the landing page to present Kolumn as a real product.

**Approach:** Duplicate current `LandingPage.jsx` to `LandingPageV2.jsx` for side-by-side comparison before replacing.

**Changes:**
- Hero tagline: explicitly mention "free" as a differentiator
- Add a "100% free" or "Free forever" badge/callout
- Add a social proof placeholder (user count, updated as signups grow)
- Add minimal footer with contact email
- Refine CTA copy to reduce friction

**What stays:** Feature grid, board showcase, tools section — all unchanged.

**Review process:** Build v2 on a separate route (e.g., `/landing-v2`) so the user can compare both versions in-browser before deciding.

### 7. Custom Domain

**Purpose:** Point `kolumn.app` to the Railway deployment.

**Implementation:** Railway dashboard configuration only, no code changes.
- Add custom domain in Railway project settings
- Configure DNS: CNAME record pointing to Railway's provided domain
- Railway handles SSL automatically

---

## Phase 2: Post-Launch Polish

These items are deferred — to be tackled after launch based on real user feedback:

1. **SEO & meta tags** — OG image, Twitter cards, page titles, robots.txt, sitemap.xml
2. **OAuth** — Google and GitHub sign-in
3. **Legal pages** — Privacy policy, terms of service
4. **Usage limits** — If abuse becomes a problem
5. **Billing** — When ready to monetize (Stripe integration, plan upgrade UI)

---

## File Changes Summary

| File | Change |
|------|--------|
| `supabase/schema.sql` (or new migration) | Add `plans`, `usage_metrics` tables; add `plan_id` to `profiles`; add usage tracking triggers |
| `package.json` | Add `@sentry/react`, `posthog-js` |
| `src/lib/env.js` | New — env var validation and export |
| `src/lib/supabase.js` | Import `env` instead of raw `import.meta.env` |
| `src/main.jsx` | Initialize Sentry + PostHog, import env validation |
| `src/store/authStore.js` | PostHog identify/reset on sign-in/sign-out, capture signup event |
| `src/store/boardStore.js` | PostHog capture for board/card creation |
| `src/components/board/BoardShareModal.jsx` | PostHog capture for invites |
| `src/pages/CalendarPage.jsx` | PostHog capture `feature_used` |
| `src/pages/NotesPage.jsx` | PostHog capture `feature_used` |
| `src/pages/DashboardPage.jsx` | PostHog capture `feature_used` |
| `src/pages/LandingPageV2.jsx` | New — duplicate of LandingPage with SaaS positioning |
| `src/App.jsx` | Add `/landing-v2` route for review |
| `.env.example` | Add `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` |

---

## New Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL (existing) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key (existing) |
| `VITE_SENTRY_DSN` | No | Sentry error tracking DSN |
| `VITE_POSTHOG_KEY` | No | PostHog project API key |
| `VITE_POSTHOG_HOST` | No | PostHog instance URL |
