# Kolumn AI Capabilities — Design Spec

## Goal

Wire a real AI backend into Kolumn's chat interface. The AI acts as both an assistant (executes board actions) and a copilot (provides summaries, suggests priorities). It reads the user's full workspace context and creates rich, fully-populated cards rendered inline in the chat using the app's existing Card component.

---

## Role

**Assistant + Copilot.** Simple actions execute immediately. Destructive or bulk actions (delete card, move 5+ cards, clear a column) ask for confirmation first. Proactive copilot features (flag stale cards, weekly digest) are deferred to a future tier.

---

## Data Access

The AI has access to everything the user can see:

- **All boards** (owned + workspace boards the user is a member of)
- **All cards** across those boards (title, description, priority, assignee, due_date, labels, checklist, icon, column, completed status)
- **All columns** (names, positions, board associations)
- **Notes** (titles + content from the user's private notes)
- **Workspace members** (display names, roles — for assignee resolution)
- **Phosphor icon list** (from `src/data/phosphorIcons.js` — so AI picks semantically relevant icons)

### Activity Summary (injected per conversation)

Each conversation gets a rolling 7-day activity summary as system context:

```
User: {display_name}
Boards: {board names + column names + card counts}
Due today: {card titles + board names}
Overdue: {card titles + days overdue}
Recent activity (7 days):
  - Created: {card titles}
  - Completed: {card titles}
  - Moved: {card title} from {col} to {col}
Notes: {note titles + first 200 chars each}
Available icons: {phosphor icon names}
```

No persistent cross-conversation memory. Each chat starts fresh with live data.

---

## Tier Split

### Free (hook users)

| Action | Type |
|---|---|
| Search cards across boards | Read |
| Summarize a board | Read |
| List due-today / overdue cards | Read |
| Create a card (fully populated) | Write |

Rate limit: ~20 messages/day.

### Pro (where the value is)

Everything in Free, plus:

| Action | Type |
|---|---|
| Move a card between columns | Write |
| Update card fields (priority, assignee, due date, description, labels, checklist) | Write |
| Delete a card (with confirmation) | Write (destructive) |
| Create a board from description | Write |
| Duplicate a card | Write |
| Generate card descriptions from a brief | Content |
| Break a card into checklist subtasks | Content |
| Turn notes into cards | Content |
| Draft standup notes from recent activity | Content |
| Show who's working on what (workspace) | Read |

Rate limit: unlimited.

### Future / Enterprise (deferred)

| Action | Type |
|---|---|
| Suggest priorities based on due dates + workload | Proactive |
| Flag stale cards (stuck in column for N days) | Proactive |
| Weekly digest summary | Proactive |

These require background jobs — different architecture. Out of scope for this spec.

---

## Model Routing

**Smart routing** — model chosen per-request based on action type:

| Request type | Model | Why |
|---|---|---|
| Read-only queries (search, summarize, due-today) | Haiku | Fast, cheap, sufficient for data lookup |
| Write actions (create/move/update/delete card) | Sonnet | Better tool-call accuracy for structured params |
| Content generation (descriptions, checklists, notes→cards, standups) | Sonnet | Quality matters for user-facing text |
| Title generation (conversation title) | Haiku | 5-word summary task |

---

## Card Creation — Full Field Population

When the AI creates a card, it populates ALL fields intelligently:

| Field | How AI determines it |
|---|---|
| **Icon** | Picks from Phosphor icon list based on card topic (e.g. "Stripe" → `CreditCard`, "Design" → `PaintBrush`) |
| **Title** | Clear, concise — derived from user's description |
| **Description** | Fleshed out from the user's brief — adds context, acceptance criteria |
| **Priority** | Inferred from language ("urgent"/"ASAP" → high, "whenever"/"low priority" → low, default → medium) |
| **Labels** | Inferred from content (e.g. "frontend work" → `/frontend`, "fix the bug" → `/bug`) |
| **Checklist** | Auto-generated subtask items for complex cards (e.g. "Build pricing page" → ["Design tier layout", "Add monthly/annual toggle", "Wire Stripe checkout"]) |
| **Assignee** | Defaults to the user. Resolves workspace member names if specified ("assign to Sarah") |
| **Due date** | Parses natural language ("by Friday" → next Friday, "end of week" → Friday, "tomorrow" → +1 day) |
| **Board + Column** | Inferred from context. Defaults to active board's first column. User can specify ("put it in Sprint > To Do") |

Created cards are rendered inline in the chat using the existing `Card.jsx` component — same styling as the board view. Clickable to open detail panel.

---

## Architecture

### Hybrid: Edge Function brain + Client hands

```
User message
    ↓
Frontend (ChatPage)
    ↓ POST /functions/v1/chat
Supabase Edge Function
    ├── Auth check (JWT)
    ├── Tier check (free/pro)
    ├── Rate limit check (free: 20/day)
    ├── Build system context (boards, cards, notes, activity, icons)
    ├── Route to model (Haiku or Sonnet)
    ├── Call Claude API with tool definitions
    ├── Stream response via SSE
    └── Return text + tool-call instructions
    ↓
Frontend
    ├── Render streamed text in ChatMessage (markdown)
    ├── Parse tool-call instructions
    ├── Execute via boardStore/noteStore (optimistic updates, realtime, activity log)
    └── Render created/found cards inline via Card.jsx
```

### Edge Function (`/functions/v1/chat`)

**Input:**
```json
{
  "conversation_id": "uuid",
  "message": "Create 3 cards for the landing page redesign"
}
```

**Responsibilities:**
- Authenticate user via Supabase JWT
- Check tier (free/pro) from user profile or subscription table
- Enforce rate limit (free: 20 messages/day counter)
- Query user's boards, cards, columns, notes, workspace members from Supabase
- Build system prompt with full context + Phosphor icon list
- Determine model (Haiku for reads, Sonnet for writes/content)
- Call Claude API with tool definitions
- Stream response back via SSE (text chunks + tool-call JSON)

**Output (streamed via SSE):**
```
data: {"type":"text","content":"Done — created 3 cards in your **Sprint** board:\n\n"}
data: {"type":"tool_call","action":"create_card","params":{"title":"Hero section","board":"Sprint","column":"To Do","priority":"high","icon":"Layout","labels":[{"text":"frontend","color":"blue"}],"checklist":["Design hero layout","Write headline copy","Add CTA button"],"assignee":"Abdullah","due_date":"2026-04-18"}}
data: {"type":"tool_call","action":"create_card","params":{"title":"Pricing table","board":"Sprint","column":"To Do","priority":"medium","icon":"CreditCard","labels":[{"text":"frontend","color":"blue"}]}}
data: {"type":"tool_call","action":"create_card","params":{"title":"Testimonials","board":"Sprint","column":"To Do","priority":"medium","icon":"Quotes","labels":[{"text":"frontend","color":"blue"}]}}
data: {"type":"text","content":"\n\nAll assigned to you. Want me to set due dates for the other two?"}
data: {"type":"done"}
```

### Claude Tool Definitions

```json
[
  {
    "name": "create_card",
    "description": "Create a new card on a kanban board",
    "input_schema": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "description": { "type": "string" },
        "board": { "type": "string", "description": "Board name" },
        "column": { "type": "string", "description": "Column name (defaults to first column)" },
        "priority": { "type": "string", "enum": ["low", "medium", "high"] },
        "icon": { "type": "string", "description": "Phosphor icon name" },
        "labels": { "type": "array", "items": { "type": "object", "properties": { "text": { "type": "string" }, "color": { "type": "string" } } } },
        "checklist": { "type": "array", "items": { "type": "string" } },
        "assignee": { "type": "string", "description": "Display name of assignee" },
        "due_date": { "type": "string", "description": "ISO date string" }
      },
      "required": ["title"]
    }
  },
  {
    "name": "move_card",
    "description": "Move a card to a different column",
    "input_schema": {
      "type": "object",
      "properties": {
        "card_title": { "type": "string" },
        "to_column": { "type": "string" },
        "to_board": { "type": "string" }
      },
      "required": ["card_title", "to_column"]
    }
  },
  {
    "name": "update_card",
    "description": "Update fields on an existing card",
    "input_schema": {
      "type": "object",
      "properties": {
        "card_title": { "type": "string" },
        "updates": {
          "type": "object",
          "properties": {
            "title": { "type": "string" },
            "description": { "type": "string" },
            "priority": { "type": "string", "enum": ["low", "medium", "high"] },
            "icon": { "type": "string" },
            "labels": { "type": "array" },
            "checklist": { "type": "array" },
            "assignee": { "type": "string" },
            "due_date": { "type": "string" }
          }
        }
      },
      "required": ["card_title", "updates"]
    }
  },
  {
    "name": "delete_card",
    "description": "Delete a card (requires user confirmation)",
    "input_schema": {
      "type": "object",
      "properties": {
        "card_title": { "type": "string" },
        "board": { "type": "string" }
      },
      "required": ["card_title"]
    }
  },
  {
    "name": "create_board",
    "description": "Create a new board with columns",
    "input_schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "columns": { "type": "array", "items": { "type": "string" } },
        "icon": { "type": "string" }
      },
      "required": ["name"]
    }
  },
  {
    "name": "search_cards",
    "description": "Search cards across all boards",
    "input_schema": {
      "type": "object",
      "properties": {
        "query": { "type": "string" },
        "filters": {
          "type": "object",
          "properties": {
            "priority": { "type": "string" },
            "assignee": { "type": "string" },
            "due": { "type": "string", "enum": ["today", "overdue", "this_week"] },
            "board": { "type": "string" },
            "completed": { "type": "boolean" }
          }
        }
      },
      "required": ["query"]
    }
  },
  {
    "name": "summarize_board",
    "description": "Get a summary of a board's current state",
    "input_schema": {
      "type": "object",
      "properties": {
        "board": { "type": "string" }
      },
      "required": ["board"]
    }
  }
]
```

### Confirmation Flow (destructive actions)

When Claude returns a `delete_card` or bulk action (3+ tool calls):

1. Frontend shows the action preview in chat: "I'll delete **Hero section** from Sprint. Go ahead?"
2. Two buttons: **Confirm** / **Cancel**
3. On confirm → execute via boardStore, show success inline
4. On cancel → AI responds "Got it, keeping the card."

### Frontend Changes

**chatStore.js updates:**
- Replace `mockRespond` with `sendMessage(conversationId, text)` — calls Edge Function via `fetch` with SSE streaming
- Parse SSE events: `text` chunks → append to message, `tool_call` → execute via boardStore
- After tool_call execution, add created card IDs to message's `cardIds` array

**ChatPage.jsx updates:**
- Handle confirmation UI for destructive actions
- Show real streaming (replace mock token-by-token with SSE chunks)

**New: context builder utility (`src/utils/aiContext.js`)**
- `buildSystemContext(boards, cards, columns, notes, members, profile)` → returns the system prompt string
- Called by the Edge Function, but also useful for testing context shape client-side

---

## Out of Scope

- Persistent cross-conversation memory
- Proactive copilot features (background jobs)
- Voice input/output
- Image/file analysis
- Billing/subscription management (tier checks use a simple profile flag for now)
- Mobile-specific AI UI
