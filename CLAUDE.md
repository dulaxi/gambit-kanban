# Kolumn — Project Context

## What this is

Kolumn is a Kanban-first project management app with an AI agent layered on top.
Users manage cards/boards via classic drag-and-drop, OR via a chat sidebar where
Claude operates the same data model through tools.

Stack: **React 19 + Vite 7 + Tailwind v4 + Supabase (Postgres, Auth, Realtime,
Edge Functions) + Anthropic Claude API**.

## Active focus (April 2026)

**Polish, test, debug, coherency — not features.**

"Coherency" means CSS / interaction consistency across the whole app: every
button looks like every other button, every modal animates the same way, every
focus state behaves the same. Design north star is **claude.ai-style**:
restrained, generous whitespace, single accent (lime), Mona Sans + serif accents,
soft 1px borders, 8-12px radius.

Bias: prefer extending an existing pattern over inventing a new one. Refactor
inconsistencies you encounter, but don't go on unrelated cleanup tangents.

## Commands

```bash
npm run dev          # Vite dev server (port 5173)
npm run build        # Production build
npm run preview      # Preview production build (port 4173)
npm run lint         # ESLint
npm run test         # Vitest, single run
npm run test:watch   # Vitest, watch mode
```

## Tech stack

- **React 19** + react-router-dom v7
- **Vite 7** + `@tailwindcss/vite` (Tailwind v4)
- **Zustand** for state — most stores hit Supabase, only `settingsStore` persists locally
- **Supabase** — Postgres + Auth + Realtime + Edge Functions
- **@dnd-kit/core + @dnd-kit/sortable** — drag-and-drop
- **react-hot-toast** — toast system (see Design System → Toasts)
- **@phosphor-icons/react** — primary icon library (see Coherency Rules)
- **react-markdown + remark-gfm** — chat message rendering
- **zod** — runtime validation
- **motion** — selective animation
- **date-fns**, **nanoid**
- **@sentry/react** — error tracking
- **posthog-js** — product analytics
- **Vitest + @testing-library/react + jsdom** — test infrastructure (~25 test files in `src/__tests__/`)

## Architecture

```
src/
├── main.jsx                        # Entry, font imports, auth init
├── App.jsx                         # Router + global Toaster (top-center) + UndoListener
├── index.css                       # @theme tokens, light/dark CSS vars, scrollbar, animations
├── lib/
│   ├── supabase.js                 # Supabase client singleton
│   └── migrateLocalData.js         # Legacy localStorage → Supabase migration
├── store/                          # Zustand stores
│   ├── authStore.js                # User, session, profile
│   ├── boardStore.js               # Boards, columns, cards + realtime subscriptions
│   ├── boardSharingStore.js        # Per-board members + invitations
│   ├── workspacesStore.js          # Multi-tenant workspaces + members + invitations
│   ├── chatStore.js                # AI chat threads + messages + tool calls
│   ├── noteStore.js                # Private notes
│   ├── notificationStore.js        # In-app notifications
│   ├── templateStore.js            # Board/card templates
│   ├── settingsStore.js            # Local-only: sidebar, theme, font
│   └── selectors.js                # Cross-store derived selectors
├── components/
│   ├── ui/                         # Design-system primitives (TODO: mostly empty — see Coherency Rules)
│   │   └── Avatar.jsx
│   ├── auth/ProtectedRoute.jsx
│   ├── chat/                       # Chat UI (message list, composer, tool-call cards)
│   ├── workspace/                  # Workspace switcher, settings, member list
│   ├── layout/                     # AppLayout, Sidebar, Header, OfflineBanner
│   ├── board/                      # Board, columns, cards, detail panel, modals
│   ├── ActionCard.jsx              # AI-suggested action card
│   ├── SearchDialog.jsx            # ⌘K search
│   ├── ErrorBoundary.jsx + InlineErrorBoundary.jsx
│   └── ...
├── pages/
│   ├── LandingPage.jsx             # Marketing / public landing
│   ├── LoginPage / SignupPage / ForgotPasswordPage / UpdatePasswordPage
│   ├── DashboardPage.jsx
│   ├── BoardsPage.jsx              # Primary kanban view
│   ├── ChatPage.jsx + ChatListPage.jsx
│   ├── WorkspacePage.jsx
│   ├── CalendarPage.jsx
│   ├── NotesPage.jsx
│   ├── SettingsPage.jsx
│   └── NotFoundPage.jsx
├── utils/
│   ├── formatting.js               # LABEL_BG, PRIORITY_DOT, AVATAR_COLORS class strings
│   ├── toast.js                    # showToast.{success|error|delete|...} helpers
│   ├── logger.js                   # Sentry wrapper
│   └── ...
└── __tests__/                      # Vitest specs

supabase/
├── config.toml                     # Local Supabase CLI config
├── schema.sql                      # Tables, triggers, RLS
├── migrations/                     # Versioned SQL migrations
└── functions/
    └── chat/                       # AI agent edge function
        ├── index.ts                # Entry — auth, tier check, Claude API stream
        ├── context.ts              # Builds system prompt from user's boards/cards
        ├── tools.ts                # 18 tool definitions (create_card, move_card, …)
        ├── tier.ts                 # Free/Pro gating + per-tool access list + daily limit
        └── stream.ts               # SSE writer
```

## Subsystems

### AI agent (`supabase/functions/chat/`)

Edge Function that streams Claude responses via SSE. Loads the user's boards/cards
into a system prompt (`context.ts`), exposes 18 tools (`tools.ts`), gates by tier
(`tier.ts`), and writes results back to Supabase via the same RLS-protected APIs
the frontend uses.

Tools: `create_card`, `move_card`, `update_card`, `delete_card`, `create_board`,
`move_cards`, `update_cards`, `complete_cards`, `duplicate_card`, `toggle_checklist`,
`update_board`, `delete_board`, `add_column`, `delete_column`, `invite_member`,
`remove_member`, `create_note`, `update_note`.

### Tier system (`supabase/functions/chat/tier.ts`)

- **Free**: 20 messages/day, Haiku model only, write tools blocked. Read-only-ish.
- **Pro**: unlimited, all tools enabled.
- `PRO_ONLY_TOOLS` array is the source of truth for which tools require Pro.
- `profiles.tier` column drives the gate; daily counter via `increment_chat_usage` RPC.
- Currently Pro and Free both run Haiku — `classifyModel` is wired but routes both paths to Haiku.

### Workspaces (`workspacesStore.js`)

Multi-tenant containers. Tables: `workspaces`, `workspace_members`,
`workspace_invitations`. Boards can be **workspace-scoped** (`workspace_id` set) or
**personal** (`workspace_id` null, optionally shared via `board_members`). The
two sharing systems coexist — `boardSharingStore` handles the lightweight per-board
flow, `workspacesStore` handles tenant-scoped membership.

### Realtime sync

`boardStore` subscribes to `postgres_changes` on `boards`, `columns`, `cards`
after auth, tears down on unmount. Last-write-wins merge.

### localStorage migration

`migrateLocalData.js` is wired into `AppLayout` and offers a banner to import
legacy localStorage data into Supabase on first sign-in. Likely vestigial — verify
before removing.

## Design System

### Tokens (source of truth: `src/index.css`)

All design tokens are CSS variables defined in `@theme {}` and `:root /
[data-theme="light"|"dark"]` blocks. **Never hardcode hex codes — always reference
the token.**

- Surfaces: `--surface-page`, `--surface-card`, `--surface-raised`, `--surface-hover`, `--surface-input`, `--surface-sidebar`
- Borders: `--border-default`, `--border-subtle`, `--border-focus`
- Text: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-faint`
- Accents: `--accent-lime`, `--accent-lime-dark`, `--accent-lime-wash`
- Buttons: `--btn-primary-bg`, `--btn-primary-text`, `--btn-primary-hover`
- Labels: `--label-{red|blue|green|yellow|purple|pink|gray}-{bg|text}`
- Phosphor palette (raw): `--color-{cream|sand|ink|charcoal|stone|mist|lime|copper|honey|mauve|...}`

Both light and dark variants are defined. Components use `var(--token)` via
Tailwind arbitrary values: `bg-[var(--surface-card)]`.

### Typography stack

| Token            | Font                  | Use                                |
|------------------|-----------------------|------------------------------------|
| `--font-sans`    | Mona Sans Variable    | Main app text                      |
| `--font-logo`    | Clash Grotesk         | "Kolumn" wordmark only             |
| `--font-heading` | Sentient (serif)      | Display headings, avatar initials  |
| `--font-mono`    | IBM Plex Mono         | Code, IDs, paths                   |
| `--font-pill`    | Google Sans Text      | Pill labels (PRO, BETA, NEW)       |
| `.landing-font`  | Plus Jakarta Sans     | Landing page only (scoped class)   |

### Existing primitives

- `src/components/ui/Avatar.jsx` — initials avatar, hash-derived color, 4 sizes, optional ring for stacking.
- `src/utils/formatting.js` — `LABEL_BG`, `LABEL_BG_QUIET`, `PRIORITY_DOT`, `AVATAR_COLORS` exported as Tailwind class strings (not components).
- `src/utils/toast.js` — `showToast.{success|error|delete|archive|restore|info|warn|overdue}`. Powered by `react-hot-toast`. Configured globally as `<Toaster position="top-center">` in `App.jsx`. Style: 420px fixed width, 1px solid `#1B1B18` border, 10px radius, IBM Plex Mono / SF Mono 12px, Phosphor icon + message + dismiss button. Eight intents each with their own background color and duration (3-5s). **Never roll your own toast — always import this helper.**

### Missing primitives (coherency-phase TODO)

`src/components/ui/` is the design-system layer but currently only contains `Avatar`.
Extract these from existing inline usages, in roughly this priority order based
on usage frequency:

1. **Button** — 5 variants (primary/accent/secondary/ghost/destructive), 3 sizes, loading + disabled states.
2. **Input / Textarea** — with label, helper, error states. Search variant with leading icon.
3. **Modal / Dialog** — backdrop (no blur), scale-in, header/body/footer, escape + outside-click close.
4. **Menu / Dropdown** — anchored popover with items, dividers, shortcut hints, destructive variant.
5. **Tooltip** — replace scattered `title` attributes.
6. **Skeleton** — generalize the AI-card shimmer pattern in `index.css`.

Reference: `public/ui-inventory.html` has live mockups of all of these in the
target style. Open via `npm run dev` then `/ui-inventory.html`.

## Coherency Rules

These are the rules that make the app feel like one app. Don't violate them
without a deliberate reason discussed with the user.

- **Icons: Phosphor only.** `@phosphor-icons/react` is canonical. `DynamicIcon` has a `LEGACY_ICON_REMAP` table that translates old lucide-style names persisted in DB rows — leave it in place, do not extend it.
- **Colors: tokens only.** Reference `var(--token)` from `src/index.css`. No new hex codes anywhere.
- **Inputs: 1px ink (`#1B1B18`) border on focus.** No lime focus ring, no glow. Hover bumps border from sand to mist.
- **Modals: no backdrop blur.** Just dimmed ink overlay (`rgba(27,27,24,0.45)`). Perf + visual win.
- **Toasts: always `showToast.*` from `src/utils/toast.js`.** Never roll inline. Pick the most specific intent (`delete` not `error`, `restore` not `success`).
- **Buttons: ink primary, lime accent for create/save/positive, copper for destructive.**
- **Border radius: 8px small (buttons, inputs), 10-12px raised (cards, modals, panels).**
- **Shadows: minimal.** Default raised shadow is `0 4px 24px rgba(27,27,24,0.10)` (matches toasts).
- **Card field names are snake_case** (DB columns). See Key Data Shapes.

## Key data shapes

### Card (`cards` table — DB uses snake_case)
```
id, board_id, column_id, position,
task_number, global_task_number,
title, description, icon, completed,
assignee_name, priority, due_date,
labels, checklist,
created_at, updated_at
```

Common pitfall: it's `assignee_name`, NOT `assignee`. It's `due_date`, NOT `dueDate`.

### Board store shape (Zustand)
```js
{
  boards:        { [id]: { id, name, icon, owner_id, workspace_id, next_task_number } },
  columns:       { [id]: { id, board_id, title, position } },
  cards:         { [id]: <Card> },
  activeBoardId,
  loading,
}
```

### Card creation vs editing
- **New task** → creates card in Supabase, shows `InlineCardEditor` inline.
- **Existing task** → click opens `CardDetailPanel` (right-side fixed 420px panel).

## Database

Tables: `profiles`, `workspaces`, `workspace_members`, `workspace_invitations`,
`boards`, `board_members`, `board_invitations`, `columns`, `cards`, `notes`,
plus chat tables (`chat_threads`, `chat_messages`, etc.).

Triggers:
- Auto-create profile on signup
- Auto-add owner to `board_members` on board creation
- Auto-accept pending invitations on new user signup
- Auto-update `updated_at` on cards / notes

RLS: users see boards they're members of. Notes are private per user. Workspaces
have member-based RLS.

Migrations live in `supabase/migrations/`; the canonical full schema is
`supabase/schema.sql`.

## Conventions

- **Commits**: conventional with scope — `feat(ai):`, `fix(chat):`, `style(ai):`, `refactor(board):`, `docs:`.
- **Plans / specs**: `docs/superpowers/{plans,specs}/YYYY-MM-DD-<topic>.md`. Use the superpowers skills (`brainstorming` → `writing-plans` → `executing-plans`) for non-trivial work.
- **Verifying changes**: `npm run build` for type/syntax sanity, `npm run test` for behavior, `npm run lint` for style.
- **UI changes**: open the dev server in a browser and exercise the feature, including edge cases. Don't claim "done" without seeing it run.

## Environment setup

1. Create a Supabase project at supabase.com, disable email confirmation in Auth settings.
2. Run `supabase/schema.sql` in the SQL Editor (or use `supabase db push` with the CLI).
3. Copy `.env.example` to `.env.local` and fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Edge Functions need `ANTHROPIC_API_KEY` set in Supabase → Edge Functions → Secrets.

## Important notes

- Tailwind v4 uses `@theme {}` blocks in CSS — there is no `tailwind.config.js`.
- `lucide-react` was removed; `@phosphor-icons/react` is the only icon library. Legacy lucide names persisted in DB are remapped at render time by `DynamicIcon`.
- `settingsStore` is the only store that persists locally (sidebar, theme, font). All other state lives in Supabase.
- Realtime is wired but uses last-write-wins; expect transient flicker on simultaneous edits.
- Sentry + PostHog are wired in production; check `src/utils/logger.js` before adding ad-hoc `console.error`.
