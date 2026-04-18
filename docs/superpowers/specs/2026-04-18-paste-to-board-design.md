# Paste-to-Board — Design Spec

## Goal

Users describe a project in the chat, Claude creates a full board with columns and cards that animate in with an AI shimmer effect. The chat is the entry point, the board is the output.

## Flow

1. User tells chat: "Make me a board for launching a SaaS product"
2. Claude asks clarifying questions if insufficient info (timeline, structure)
3. Claude calls `create_board` (picks name, icon, columns)
4. App auto-navigates to the new board
5. Claude streams `create_card` tool calls one by one
6. Each card appears as a skeleton with AI gradient sweep, fields fill progressively
7. Card solidifies when complete

## Card Build Animation (per-card)

1. Skeleton appears — gray placeholder blocks for title, icon, labels
2. Multi-color AI gradient (mauve-lime-blue) sweeps left-to-right
3. Fields fill progressively as tool call data arrives
4. Shimmer stops, card looks normal

## Technical Approach

- No new Edge Function — uses existing `/chat` with `create_board` + `create_card` tools
- New: `AICardSkeleton.jsx` — skeleton + shimmer animation
- New: `@keyframes ai-shimmer` in `index.css`
- Modify: `toolExecutor.js` — auto-navigate after `create_board`
- Modify: `boardStore.js` — track `_aiBuildingCards` set for skeleton rendering
- Modify: `Card.jsx` or `SortableCard.jsx` — render skeleton variant while card is AI-building

## Out of Scope

- Paste-to-Board modal (not needed — chat handles it)
- Streaming column creation (columns appear instantly, cards stream in)
- Split view (chat + board side by side)
