# Design: Quick Filters, Card Comments, Recurring Tasks

## 1. Quick Filters

**UI**: Funnel icon in `BoardSelector`, toggles a filter row with pill dropdowns:
- Priority (multi-select): Low / Medium / High
- Assignee (single-select): board members
- Label (multi-select): labels used on current board
- Due (single-select): Overdue / Today / This week / No date

Active filters show count badge on funnel icon. "Clear" resets all. Local state only — no persistence.

**Data flow**: Filters passed from `BoardSelector` → `BoardView` → `Column`. Each column filters its card list before rendering.

**Files**: `BoardSelector.jsx`, `BoardView.jsx`, `Column.jsx`, `BoardsPage.jsx` (state holder)

## 2. Card Comments

**DB**: New `card_comments` table:
- `id` (uuid PK), `card_id` (FK → cards), `user_id` (FK → auth.users), `text` (text), `created_at` (timestamptz default now())
- RLS: users can read/insert comments on cards in boards they're members of; users can delete their own comments

**UI**: Comments section at bottom of `CardDetailPanel` — scrollable list (author, relative time, text) + text input with Send button.

**Store**: `boardStore` gets `fetchComments(cardId)`, `addComment(cardId, text)`, `deleteComment(commentId)`. Comments fetched lazily when detail panel opens.

**Files**: `CardDetailPanel.jsx`, `boardStore.js`, SQL migration

## 3. Recurring Tasks

**DB**: Three new columns on `cards`:
- `recurrence_interval` (integer, nullable) — e.g. 7
- `recurrence_unit` (text, nullable) — 'days' | 'weeks' | 'months'
- `recurrence_next_due` (date, nullable) — next date to spawn a copy

**UI**: "Repeat" row in `CardDetailPanel` below Due Date. Picker with:
- Presets: Daily, Every weekday, Weekly, Biweekly, Monthly
- Custom: "Every [X] [days/weeks/months]"
- "No repeat" to clear

**Schedule logic** (client-side, `AppLayout` on mount):
1. Query cards where `recurrence_next_due <= today` AND `completed = true`
2. For each: create new card copy (same title, description, labels, assignee, priority, checklist reset to unchecked), `due_date = recurrence_next_due`, calculate next `recurrence_next_due`
3. Clear completed card's `recurrence_*` fields

**Files**: `CardDetailPanel.jsx`, `boardStore.js`, `AppLayout.jsx`, SQL migration
