# AI Prompt Polish — Design Spec

## Problem

The Kolumn AI assistant has three gaps that make it frustrating to use:

1. **Data gap** — The system prompt shows board summaries with card counts (`To Do (3)`) but not card titles. The AI can't act on "move all to Done" because it doesn't know which cards exist.
2. **Behavior gap** — The prompt says "if ambiguous, answer with info rather than taking action," making the AI ask unnecessary clarifying questions even when intent is obvious from conversation context.
3. **Context gap** — No instruction to carry board context forward. If the user just created "Sprint 4," the AI doesn't know that "it" or "that board" refers to Sprint 4.
4. **Tool gap** — Only 5 tools exist (create/update/move/delete card, create board). Users can't manage boards, handle batch operations, manage members, or work with notes through the AI.

## Files Changed

- `supabase/functions/chat/context.ts` — system prompt rewrite
- `supabase/functions/chat/tools.ts` — 14 new tool definitions
- `src/lib/toolExecutor.js` — 14 new tool handlers + helpers

No new store methods needed — all handlers compose from existing store functions.

---

## 1. System Prompt Rewrite (`context.ts`)

### Board summary with card titles

Current format:
```
- Design Sprint: To Do (3), In Progress (1), Done (2) [6 total cards]
```

New format:
```
- Design Sprint: To Do (3: "Landing mockup", "Icon audit", "Color tokens") | In Progress (1: "Header redesign") | Done (2)
```

Done column shows count only (no titles) to save tokens — completed cards are rarely referenced.

### Add today's date

Add `Today: ${today}` to the header block so the AI can parse "tomorrow", "next Friday", etc.

### Restructured rules

Replace the current wall-of-text rules with two scannable sections:

**Always:**
- Act on clear intent. "Move all to Done" = move them. Don't ask which board if only one was discussed.
- Track the active board from conversation history. If the user just created or discussed a board, follow-up messages about "it" or "that board" refer to that board.
- Use tools immediately when the user asks to create/move/update/delete. Text alone does nothing.
- For card creation: always include title, priority, icon (from icon list), assignee (default to current user).
- For batch operations: use batch tools (move_cards, update_cards, complete_cards) instead of calling single-card tools repeatedly.
- When creating a board, call create_board AND multiple create_card tools in the same response. Every card goes in the first column unless the user explicitly says otherwise.
- Only modify the specific card(s) the user mentions.
- Parse natural language dates relative to Today.
- Infer priority from language: "urgent"/"ASAP" = high, "whenever"/"low priority" = low, default = medium.
- Always respond with text alongside tool calls. Never respond with only tool calls.
- Use markdown formatting: **bold** for names, lists for multiple items.

**Never:**
- Ask clarifying questions when conversation context makes the answer obvious.
- Use tools for read queries ("show me", "what's on", "how many") — answer from context.
- Use emojis.
- Create empty boards — always populate with cards.
- Include workspace/board names in card titles when they're just contextual references.

### Personality

Opening line: `You are Kolumn, a sharp project management assistant. You manage boards, cards, and workflow. Be direct — act on clear intent, ask only when genuinely ambiguous.`

---

## 2. New Tool Definitions (`tools.ts`)

### Batch card tools

**`move_cards`** — Move multiple cards to a column.
```
params:
  board: string (required) — board name
  from_column: string (optional) — source column filter
  card_titles: string[] (optional) — specific cards
  to_column: string (required) — destination column
```
If neither `from_column` nor `card_titles` provided, error. At least one filter required.

**`update_cards`** — Batch update fields on multiple cards.
```
params:
  board: string (optional) — filter by board
  column: string (optional) — filter by column
  card_titles: string[] (optional) — specific cards
  updates: object — fields to update (priority, assignee, labels, due_date, icon)
```
At least one filter required.

**`complete_cards`** — Mark cards as completed (sets completed flag + moves to last column).
```
params:
  board: string (optional) — filter by board
  column: string (optional) — filter by column
  card_titles: string[] (optional) — specific cards
```
At least one filter required.

### Single card tools

**`duplicate_card`** — Duplicate a card, optionally to a different board/column.
```
params:
  card_title: string (required)
  to_board: string (optional) — defaults to same board
  to_column: string (optional) — defaults to first column
```

**`toggle_checklist`** — Check or uncheck specific checklist items on a card.
```
params:
  card_title: string (required)
  items: number[] (required) — indices to toggle (0-based)
  done: boolean (required) — true = check, false = uncheck
```

### Board management tools

**`update_board`** — Rename or change icon of a board.
```
params:
  board: string (required) — current board name
  name: string (optional) — new name
  icon: string (optional) — new icon
```

**`delete_board`** — Delete a board. DESTRUCTIVE.
```
params:
  board: string (required)
```

**`add_column`** — Add a column to a board.
```
params:
  board: string (required)
  title: string (required)
  position: number (optional) — insert index, defaults to end
```

**`delete_column`** — Delete a column from a board. DESTRUCTIVE.
```
params:
  board: string (required)
  column: string (required)
```

### Member tools

**`invite_member`** — Invite a user by email to a workspace.
```
params:
  email: string (required)
  workspace: string (required) — workspace name
```

**`remove_member`** — Remove a member from a workspace. DESTRUCTIVE.
```
params:
  email: string (optional) — email or display_name, one required
  display_name: string (optional)
  workspace: string (required) — workspace name
```

### Notes tools

**`create_note`** — Create a new note.
```
params:
  title: string (required)
  content: string (optional) — markdown content
```

**`update_note`** — Update an existing note.
```
params:
  title: string (required) — find by title
  content: string (optional) — replace full content
  append: string (optional) — append to existing content
```

---

## 3. Tool Executor Changes (`toolExecutor.js`)

### New helpers

```js
findCards({ board, column, card_titles })  // Returns array of matching cards
findNoteByTitle(title)                      // Returns note by title match
findWorkspaceByName(name)                   // Returns workspace by name match
```

### Store method mapping

| Tool | Store method(s) |
|---|---|
| `move_cards` | Loop `updateCard(id, { column_id, board_id })` |
| `update_cards` | Loop `updateCard(id, updates)` |
| `complete_cards` | Loop `completeCard(cardId)` |
| `duplicate_card` | `duplicateCard(cardId)` |
| `toggle_checklist` | Read card checklist, toggle items, `updateCard(id, { checklist })` |
| `update_board` | `renameBoard(id, name)` + `updateBoardIcon(id, icon)` |
| `delete_board` | `deleteBoard(boardId)` |
| `add_column` | `addColumn(boardId, title)` |
| `delete_column` | `deleteColumn(boardId, columnId)` |
| `invite_member` | `inviteToWorkspace(wsId, email)` via workspacesStore |
| `remove_member` | `removeMember(wsId, userId)` via workspacesStore |
| `create_note` | `addNote(title)` then `updateNote(id, { content })` via noteStore |
| `update_note` | `updateNote(noteId, updates)` via noteStore |

### Destructive actions update

```js
const DESTRUCTIVE_ACTIONS = ['delete_card', 'delete_board', 'delete_column', 'remove_member']
```

### Icon name fix in tool descriptions

Tool descriptions currently say `(e.g. Layout, CreditCard, Bug)` (PascalCase). Update to match the kebab-case list in the system prompt: `(e.g. rocket, credit-card, bug)`.

---

## 4. Context data fetch changes (`context.ts`)

The `buildContext` function already fetches all cards with `select("*")`. The only change is how the board summary is formatted — instead of just counting cards per column, include titles for non-completed cards.

Token budget consideration: for boards with many cards, cap at 10 titles per column and append `+ N more`. This prevents the system prompt from exploding on large boards.

---

## Out of scope

- New store methods (all tools compose from existing)
- UI changes to the chat interface
- New API endpoints
- Tier/rate limiting changes
