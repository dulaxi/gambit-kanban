# Quick Filters, Card Comments, Recurring Tasks — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add board-level quick filters, text-only card comments, and scheduled recurring tasks to Kolumn.

**Architecture:** Three independent features sharing no state. Filters are purely client-side (local component state filtering cards before render). Comments use a new `card_comments` DB table fetched lazily per card. Recurring tasks add columns to `cards` and a client-side check on app load that spawns overdue recurring copies.

**Tech Stack:** React 19, Zustand, Supabase (Postgres + RLS), Tailwind CSS v4, date-fns, lucide-react

---

## Task 1: Quick Filters — State & Filter Logic

**Files:**
- Modify: `src/pages/BoardsPage.jsx`
- Modify: `src/components/board/BoardView.jsx`
- Modify: `src/components/board/Column.jsx`

**Step 1: Add filter state to BoardsPage**

In `src/pages/BoardsPage.jsx`, add filter state and pass it down. The filter object shape is `{ priority: [], assignee: null, label: [], due: null }`.

```jsx
// after existing useState declarations (line 10)
const [filters, setFilters] = useState({ priority: [], assignee: null, label: [], due: null })
```

Pass `filters` and `setFilters` to `BoardSelector`, and `filters` to `BoardView`:
```jsx
<BoardSelector filters={filters} setFilters={setFilters} />
```
```jsx
<BoardView ... filters={filters} />
```

**Step 2: Apply filters in Column**

In `src/components/board/Column.jsx`, accept a `filters` prop and filter `columnCards` after sorting (line 28):

```jsx
export default function Column({ column, boardId, onCardClick, onCreateCard, onCompleteCard, inlineCardId, onInlineDone, selectedCardId, filters }) {
```

After the existing `columnCards` sort (line 28), add:
```jsx
import { isToday, isPast, isThisWeek, parseISO } from 'date-fns'

// After the .sort() on line 28:
const filteredCards = columnCards.filter((card) => {
  if (filters?.priority?.length && !filters.priority.includes(card.priority)) return false
  if (filters?.assignee && card.assignee_name !== filters.assignee) return false
  if (filters?.label?.length && !(card.labels || []).some((l) => filters.label.includes(l.text))) return false
  if (filters?.due) {
    const d = card.due_date ? parseISO(card.due_date) : null
    if (filters.due === 'overdue' && !(d && isPast(d) && !isToday(d))) return false
    if (filters.due === 'today' && !(d && isToday(d))) return false
    if (filters.due === 'week' && !(d && isThisWeek(d))) return false
    if (filters.due === 'none' && d) return false
  }
  return true
})
```

Use `filteredCards` instead of `columnCards` for rendering the card list and the card count badge. Keep `columnCards` for drag-and-drop card IDs (so DnD still works on hidden cards).

**Step 3: Pass filters through BoardView**

In `src/components/board/BoardView.jsx`, accept `filters` prop and pass to each `<Column>`:
```jsx
export default function BoardView({ boardId, onCardClick, onCreateCard, inlineCardId, onInlineDone, selectedCardId, filters }) {
```
```jsx
<Column ... filters={filters} />
```

**Step 4: Verify build**

Run: `npm run build`

**Step 5: Commit**

```bash
git add src/pages/BoardsPage.jsx src/components/board/BoardView.jsx src/components/board/Column.jsx
git commit -m "feat: add filter state and filtering logic to board columns"
```

---

## Task 2: Quick Filters — Filter Bar UI

**Files:**
- Modify: `src/components/board/BoardSelector.jsx`

**Step 1: Add filter toggle and filter bar**

In `src/components/board/BoardSelector.jsx`, add a `Filter` icon import from lucide-react and accept `filters`/`setFilters` props.

Add state for the filter bar visibility:
```jsx
const [showFilters, setShowFilters] = useState(false)
```

After the Share button (around line 205), add a Filter toggle button:
```jsx
<button
  type="button"
  onClick={() => setShowFilters(!showFilters)}
  className="relative p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
>
  <Filter className="w-4 h-4" />
  {activeFilterCount > 0 && (
    <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
      {activeFilterCount}
    </span>
  )}
</button>
```

Compute `activeFilterCount`:
```jsx
const activeFilterCount = (filters?.priority?.length || 0) + (filters?.assignee ? 1 : 0) + (filters?.label?.length || 0) + (filters?.due ? 1 : 0)
```

**Step 2: Build the filter row UI**

Below the selector header, render the filter bar when `showFilters` is true. Use compact pill-style buttons that open small dropdown menus:

```jsx
{showFilters && (
  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
    {/* Priority multi-select */}
    <FilterPill label="Priority" ... />
    {/* Assignee single-select */}
    <FilterPill label="Assignee" ... />
    {/* Label multi-select */}
    <FilterPill label="Label" ... />
    {/* Due single-select */}
    <FilterPill label="Due" ... />
    {/* Clear all */}
    {activeFilterCount > 0 && (
      <button onClick={() => setFilters({ priority: [], assignee: null, label: [], due: null })}
        className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-1">
        Clear all
      </button>
    )}
  </div>
)}
```

Build each filter pill as inline dropdown components within BoardSelector (no separate file needed). Each pill shows a small popover with checkboxes (multi-select) or radio options (single-select). Use existing design tokens: 11px text, rounded-lg, gray-100 backgrounds.

For the Assignee list, derive board member names from the cards on the current board. For the Label list, derive from all labels used on current board cards.

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/components/board/BoardSelector.jsx
git commit -m "feat: add filter bar UI with priority, assignee, label, due filters"
```

---

## Task 3: Card Comments — Database Migration

**Files:**
- Modify: `supabase/schema.sql` (append to end)

**Step 1: Write the SQL migration**

Append to `supabase/schema.sql`:

```sql
-- ============================================================
-- CARD COMMENTS
-- ============================================================
create table public.card_comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '',
  text text not null default '',
  created_at timestamptz default now()
);

create index idx_card_comments_card_id on public.card_comments(card_id);

alter table public.card_comments enable row level security;

create policy "Members can view comments"
  on public.card_comments for select
  using (
    card_id in (
      select c.id from public.cards c
      where c.board_id in (
        select board_id from public.board_members where user_id = auth.uid()
      )
    )
  );

create policy "Members can create comments"
  on public.card_comments for insert
  with check (
    user_id = auth.uid()
    and card_id in (
      select c.id from public.cards c
      where c.board_id in (
        select board_id from public.board_members where user_id = auth.uid()
      )
    )
  );

create policy "Users can delete own comments"
  on public.card_comments for delete
  using (user_id = auth.uid());
```

**Step 2: Run in Supabase SQL Editor**

User must run this SQL in their Supabase dashboard SQL Editor manually.

**Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add card_comments table with RLS policies"
```

---

## Task 4: Card Comments — Store Functions

**Files:**
- Modify: `src/store/boardStore.js`

**Step 1: Add comment state and actions**

Add to the store's initial state (after `dragging: false` around line 14):
```js
comments: {},  // { [cardId]: [{ id, card_id, user_id, author_name, text, created_at }] }
```

Add three new actions before `subscribeToBoards` (around line 528):

```js
fetchComments: async (cardId) => {
  const { data, error } = await supabase
    .from('card_comments')
    .select('*')
    .eq('card_id', cardId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch comments:', error)
    return
  }

  set((state) => ({
    comments: { ...state.comments, [cardId]: data || [] },
  }))
},

addComment: async (cardId, text) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const profile = useAuthStore.getState().profile
  const authorName = profile?.display_name || user.email || 'Unknown'

  const { data, error } = await supabase
    .from('card_comments')
    .insert({ card_id: cardId, user_id: user.id, author_name: authorName, text })
    .select()
    .single()

  if (error) {
    console.error('Failed to add comment:', error)
    return
  }

  set((state) => ({
    comments: {
      ...state.comments,
      [cardId]: [...(state.comments[cardId] || []), data],
    },
  }))
},

deleteComment: async (commentId, cardId) => {
  const { error } = await supabase
    .from('card_comments')
    .delete()
    .eq('id', commentId)

  if (error) {
    console.error('Failed to delete comment:', error)
    return
  }

  set((state) => ({
    comments: {
      ...state.comments,
      [cardId]: (state.comments[cardId] || []).filter((c) => c.id !== commentId),
    },
  }))
},
```

Add `import { useAuthStore } from './authStore'` at the top of boardStore.js (line 3).

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/store/boardStore.js
git commit -m "feat: add comment CRUD actions to boardStore"
```

---

## Task 5: Card Comments — UI in CardDetailPanel

**Files:**
- Modify: `src/components/board/CardDetailPanel.jsx`

**Step 1: Add comments section**

Import `formatDistanceToNow` from date-fns. Add `MessageSquare` to lucide-react imports.

After the Description section (around line 700), add a Comments section:

```jsx
{/* Comments */}
<div className="px-5 pt-4 pb-4 border-t border-gray-100">
  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 block">
    Comments
  </label>
  <div className="space-y-3 mb-3">
    {(comments || []).map((comment) => (
      <div key={comment.id} className="group">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium text-gray-700">{comment.author_name}</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
            {comment.user_id === user?.id && (
              <button
                type="button"
                onClick={() => deleteComment(comment.id, cardId)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-0.5">{comment.text}</p>
      </div>
    ))}
  </div>
  <div className="flex gap-2">
    <input
      value={commentText}
      onChange={(e) => setCommentText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && commentText.trim()) {
          addComment(cardId, commentText.trim())
          setCommentText('')
        }
      }}
      placeholder="Add a comment..."
      className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:border-blue-200 focus:outline-none placeholder-gray-300"
    />
    <button
      type="button"
      onClick={() => {
        if (commentText.trim()) {
          addComment(cardId, commentText.trim())
          setCommentText('')
        }
      }}
      className="px-3 py-1.5 text-xs font-medium bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
    >
      Send
    </button>
  </div>
</div>
```

Add state and store bindings at the top of the component:
```jsx
const [commentText, setCommentText] = useState('')
const comments = useBoardStore((s) => s.comments[cardId])
const fetchComments = useBoardStore((s) => s.fetchComments)
const addComment = useBoardStore((s) => s.addComment)
const deleteComment = useBoardStore((s) => s.deleteComment)
const user = useAuthStore((s) => s.user)
```

Fetch comments on mount (inside the existing useEffect that fetches board members):
```jsx
fetchComments(cardId)
```

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/components/board/CardDetailPanel.jsx
git commit -m "feat: add comments UI to card detail panel"
```

---

## Task 6: Recurring Tasks — Database Migration

**Files:**
- Modify: `supabase/schema.sql` (append)

**Step 1: Add recurrence columns to cards**

Append to `supabase/schema.sql`:

```sql
-- ============================================================
-- RECURRING TASKS
-- ============================================================
alter table public.cards add column recurrence_interval int;
alter table public.cards add column recurrence_unit text check (recurrence_unit in ('days', 'weeks', 'months'));
alter table public.cards add column recurrence_next_due date;
```

**Step 2: Run in Supabase SQL Editor**

User must run this SQL manually.

**Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add recurrence columns to cards table"
```

---

## Task 7: Recurring Tasks — Recurrence Picker UI

**Files:**
- Modify: `src/components/board/CardDetailPanel.jsx`

**Step 1: Add Repeat row to CardDetailPanel**

Below the Due Date row (around line 544), add a Repeat row:

```jsx
import { Repeat } from 'lucide-react'
```

Add state:
```jsx
const [showRecurrencePicker, setShowRecurrencePicker] = useState(false)
```

The Repeat row UI:
```jsx
{/* Repeat */}
<div className="flex items-center py-2.5 border-t border-gray-100">
  <div className="flex items-center gap-2 w-24 sm:w-32 shrink-0 text-gray-400">
    <Repeat className="w-4 h-4" />
    <span className="text-sm">Repeat</span>
  </div>
  <div className="relative flex-1">
    <button
      type="button"
      onClick={() => setShowRecurrencePicker(!showRecurrencePicker)}
      className="text-sm text-gray-700 hover:bg-gray-50 px-2 py-0.5 rounded-lg transition-colors"
    >
      {recurrenceLabel || 'None'}
    </button>
    {showRecurrencePicker && (
      <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20 w-52">
        {[
          { label: 'No repeat', interval: null, unit: null },
          { label: 'Daily', interval: 1, unit: 'days' },
          { label: 'Every weekday', interval: 1, unit: 'weekdays' },
          { label: 'Weekly', interval: 7, unit: 'days' },
          { label: 'Biweekly', interval: 14, unit: 'days' },
          { label: 'Monthly', interval: 1, unit: 'months' },
        ].map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => {
              handleRecurrenceChange(opt.interval, opt.unit)
              setShowRecurrencePicker(false)
            }}
            className="w-full px-3 py-1.5 text-sm text-left text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {opt.label}
          </button>
        ))}
        {/* Custom frequency */}
        <div className="border-t border-gray-100 px-3 py-2 flex items-center gap-2">
          <span className="text-xs text-gray-400">Every</span>
          <input
            type="number"
            min="1"
            value={customInterval}
            onChange={(e) => setCustomInterval(parseInt(e.target.value) || 1)}
            className="w-12 text-sm px-1.5 py-0.5 border border-gray-200 rounded-lg text-center focus:outline-none focus:border-blue-200"
          />
          <select
            value={customUnit}
            onChange={(e) => setCustomUnit(e.target.value)}
            className="text-sm px-1.5 py-0.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-200"
          >
            <option value="days">days</option>
            <option value="weeks">weeks</option>
            <option value="months">months</option>
          </select>
          <button
            type="button"
            onClick={() => {
              handleRecurrenceChange(customUnit === 'weeks' ? customInterval * 7 : customInterval, customUnit === 'weeks' ? 'days' : customUnit)
              setShowRecurrencePicker(false)
            }}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Set
          </button>
        </div>
      </div>
    )}
  </div>
</div>
```

Add state and helpers:
```jsx
const [customInterval, setCustomInterval] = useState(1)
const [customUnit, setCustomUnit] = useState('days')

const recurrenceLabel = card?.recurrence_interval
  ? card.recurrence_unit === 'months'
    ? card.recurrence_interval === 1 ? 'Monthly' : `Every ${card.recurrence_interval} months`
    : card.recurrence_interval === 1 ? 'Daily'
    : card.recurrence_interval === 7 ? 'Weekly'
    : card.recurrence_interval === 14 ? 'Biweekly'
    : `Every ${card.recurrence_interval} days`
  : null

const handleRecurrenceChange = (interval, unit) => {
  if (!interval) {
    updateCard(cardId, { recurrence_interval: null, recurrence_unit: null, recurrence_next_due: null })
  } else {
    const nextDue = dueDate ? addRecurrenceInterval(parseISO(dueDate), interval, unit) : null
    updateCard(cardId, {
      recurrence_interval: interval,
      recurrence_unit: unit,
      recurrence_next_due: nextDue ? format(nextDue, 'yyyy-MM-dd') : null,
    })
  }
}
```

Add `addRecurrenceInterval` helper (import `addDays`, `addMonths` from date-fns):
```jsx
function addRecurrenceInterval(date, interval, unit) {
  if (unit === 'months') return addMonths(date, interval)
  return addDays(date, interval)
}
```

**Step 2: Update updateCard in boardStore**

In `src/store/boardStore.js`, in the `updateCard` action's `dbUpdates` mapping (around line 295), add:
```js
if ('recurrence_interval' in updates) dbUpdates.recurrence_interval = updates.recurrence_interval
if ('recurrence_unit' in updates) dbUpdates.recurrence_unit = updates.recurrence_unit
if ('recurrence_next_due' in updates) dbUpdates.recurrence_next_due = updates.recurrence_next_due
```

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/components/board/CardDetailPanel.jsx src/store/boardStore.js
git commit -m "feat: add recurrence picker UI and store support"
```

---

## Task 8: Recurring Tasks — Client-Side Spawn on Load

**Files:**
- Modify: `src/store/boardStore.js`
- Modify: `src/components/layout/AppLayout.jsx`

**Step 1: Add spawnRecurringTasks action to boardStore**

```js
spawnRecurringTasks: async () => {
  const today = new Date().toISOString().split('T')[0]

  const { data: dueTasks, error } = await supabase
    .from('cards')
    .select('*')
    .eq('completed', true)
    .not('recurrence_next_due', 'is', null)
    .lte('recurrence_next_due', today)

  if (error || !dueTasks?.length) return

  for (const task of dueTasks) {
    // Create new card copy
    const newDueDate = task.recurrence_next_due + 'T23:59:59'
    const nextDue = addRecurrenceInterval(
      new Date(task.recurrence_next_due),
      task.recurrence_interval,
      task.recurrence_unit
    )

    const newCard = {
      board_id: task.board_id,
      column_id: task.column_id,
      position: task.position,
      task_number: 0,  // Will be set by addCard logic if needed
      global_task_number: 0,
      title: task.title,
      description: task.description || '',
      assignee_name: task.assignee_name || '',
      priority: task.priority || 'medium',
      due_date: newDueDate,
      icon: task.icon,
      completed: false,
      labels: task.labels || [],
      checklist: (task.checklist || []).map((item) => ({ ...item, done: false })),
      recurrence_interval: task.recurrence_interval,
      recurrence_unit: task.recurrence_unit,
      recurrence_next_due: format(nextDue, 'yyyy-MM-dd'),
    }

    const { data: created } = await supabase.from('cards').insert(newCard).select().single()

    if (created) {
      set((state) => ({
        cards: { ...state.cards, [created.id]: created },
      }))
    }

    // Clear recurrence on the completed original
    await supabase.from('cards').update({
      recurrence_interval: null,
      recurrence_unit: null,
      recurrence_next_due: null,
    }).eq('id', task.id)

    set((state) => ({
      cards: {
        ...state.cards,
        [task.id]: {
          ...state.cards[task.id],
          recurrence_interval: null,
          recurrence_unit: null,
          recurrence_next_due: null,
        },
      },
    }))
  }
},
```

Import date-fns at the top of boardStore:
```js
import { addDays, addMonths, format } from 'date-fns'
```

Add the `addRecurrenceInterval` helper function above the store:
```js
function addRecurrenceInterval(date, interval, unit) {
  if (unit === 'months') return addMonths(date, interval)
  return addDays(date, interval)
}
```

**Step 2: Trigger on app load**

In `src/components/layout/AppLayout.jsx`, add to the existing useEffect (line 50-65):

```jsx
const spawnRecurringTasks = useBoardStore((s) => s.spawnRecurringTasks)
```

Inside the `if (user)` block, after `subscribeToBoards()`:
```jsx
// Spawn any overdue recurring tasks
fetchBoards().then(() => spawnRecurringTasks())
```

Note: Move the `fetchBoards()` call into `.then()` chaining so recurring tasks spawn after boards are loaded. The original `fetchBoards()` call on line 52 should be replaced with this chained version.

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/store/boardStore.js src/components/layout/AppLayout.jsx
git commit -m "feat: spawn recurring tasks on app load"
```

---

## Task 9: Final Integration Test & Push

**Step 1: Full build**

Run: `npm run build`

**Step 2: Manual browser test**

1. Open app → create a board with columns
2. Test filters: click funnel icon, filter by priority, verify cards hide/show
3. Test comments: open a card, add a comment, verify it persists after refresh
4. Test recurrence: set a card to repeat weekly, complete it, refresh page, verify new copy appears

**Step 3: Commit any fixes and push**

```bash
git push
```
