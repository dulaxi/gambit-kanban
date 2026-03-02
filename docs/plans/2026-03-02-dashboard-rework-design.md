# Dashboard Rework — "Morning Brief + Split-Flap" Design

**Goal:** Redesign the dashboard to be visually rich, personally actionable, and memorable — combining a warm greeting, focus tasks, and board overviews with split-flap (Solari board) display elements.

**Aesthetic:** Light background (`bg-gray-50`) with dark split-flap digit tiles as accent widgets. Mono font inside tiles, Mona Sans elsewhere. Landing page's blue gradient for the greeting name. Amber accents on split-flap labels.

---

## Section 1: Greeting Banner

- **"Good morning, Dulaxi"** — `text-2xl font-bold`, name rendered with landing page blue gradient (`from-[#103783] to-[#9BAFD9]` + `bg-clip-text text-transparent`)
- **Date line**: "Sunday, March 2" in `text-sm text-gray-400`
- **Summary pill**: Rounded badge with pulsing green dot + "3 due today · 1 overdue"
- Time-aware: morning/afternoon/evening based on current hour
- No quick action buttons — sidebar and bottom tabs handle navigation

## Section 2: Split-Flap Stat Tiles

A horizontal row of 4 stat counters, each styled as a split-flap display:

| Label | Value | Color |
|-------|-------|-------|
| DUE TODAY | `03` | amber label |
| OVERDUE | `01` | red tint if > 0 |
| IN PROGRESS | `05` | amber label |
| COMPLETED | `12` | amber label |

**Tile design:**
- Dark background: `bg-gray-900 text-white rounded-md`
- Horizontal hairline through the middle (the "split")
- Mono/tabular font for digits
- CSS 3D flip animation on mount (top half rotates -90deg to reveal number)
- Staggered animation delays per tile
- Tiny uppercase tracking-wider labels above each tile in `text-amber-600 font-mono`

**Responsive:** 4 tiles in a row on desktop, 2x2 grid on mobile.

## Section 3: Focus Cards — "Due Today" & "Overdue"

**"Due Today" section:**
- Section label with count badge
- Rich mini-cards showing:
  - Priority dot (left)
  - Task number (`#GB-42`) in gray
  - Title (bold, truncated)
  - Board name as gray pill
  - Labels if present (colored pills from label palette)
- Click navigates to board with card selected
- Card style: `bg-white border border-gray-200/80 rounded-xl shadow-sm` + hover

**"Overdue" section:**
- Same card format with subtle red accent (red left border)
- Only shown when overdue tasks exist

**Empty state:** "Nothing due today — you're all clear" with checkmark icon

## Section 4: Board Summary Grid

**Layout:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

**Each board card** (`bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4`):
- Board icon (DynamicIcon) + board name (bold) + total card count
- Horizontal segmented progress bar: proportional column counts with colors from label palette
- Small text labels with counts below the bar
- "Updated 2h ago" in small gray text
- Click navigates to board

**Empty state:** "Create your first board to get started" with + New Board button

## Split-Flap Animation (CSS-only)

```css
@keyframes flipDown {
  0% { transform: rotateX(0deg); }
  100% { transform: rotateX(-90deg); }
}

@keyframes flipUp {
  0% { transform: rotateX(90deg); }
  100% { transform: rotateX(0deg); }
}
```

- Each tile has a top half and bottom half (using `overflow: hidden` + `height: 50%`)
- On mount: top half flips down (old value), bottom half flips up (new value)
- `perspective: 300px` on parent for 3D depth
- `animation-delay` staggered: 0s, 0.1s, 0.2s, 0.3s per tile
- `animation-duration: 0.4s` with `ease-in-out`
- No JS animation library — pure CSS + React state

## Data Sources

All data from existing Zustand `boardStore`:
- `boards`, `columns`, `cards` objects
- `authStore.profile` for user name
- No new API calls or database changes needed

## No Charts

Explicit decision: no Recharts, no graphs. Visual richness comes from the split-flap tiles, card layouts, and progress bars.
