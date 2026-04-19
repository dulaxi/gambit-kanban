# Quick Add Bar — Design Spec

## Goal

A minimal AI-powered input bar above board columns. Type natural language, cards appear with shimmer animation. Replaces chat as the primary way to create cards via AI.

## UI

Minimal input line above columns, always visible on board view:
```
[✦ Type a task or paste notes...                    ↵]
```
- Sparkle icon (Phosphor) on the left in mauve wash
- Placeholder: "Type a task or paste notes..."
- Enter to submit, Shift+Enter for newline
- Send button appears when input has text (same pattern as ChatInput)

## Behavior

### Single task
"hire a janitor for night shift" → 1 skeleton shimmers in first column → reveals full card

### Multiple tasks (comma/newline split)
"hero section, pricing page, testimonials" → parsed locally (no API call) → 3 skeletons shimmer in → 3 cards appear

### Natural language batch
"I need to redesign the hero, build a pricing page and add testimonials" → sent to Claude → Claude returns multiple create_card tool calls → skeletons shimmer in → cards appear

### Detection logic
- Input contains commas or newlines → local split, each part becomes a card title → call create_card tool for each (to get icon/priority/labels)
- Input is a single natural sentence → send full text to Claude

## Card placement
All cards go in the first column of the active board.

## Technical approach

### New component
`src/components/board/QuickAddBar.jsx` — the input bar

### Where it mounts
`src/components/board/BoardView.jsx` — above the columns area

### How it creates cards
- Local split path: calls `executeTool('create_card', { title, board })` for each part
- Claude path: calls `streamChat()` with the full input, Claude returns tool calls
- Both use existing `toolExecutor.js` → `boardStore.addCard()`
- Both trigger `AICardSkeleton` shimmer via `isAIBuilding` tracking

### Edge Function
No changes — uses existing `/chat` Edge Function. The Quick Add Bar is just a different UI entry point to the same Claude + tool system.

## Out of scope
- Board Builder (separate feature)
- Card AI Actions (separate feature)
- Drag-to-reorder from Quick Add results
