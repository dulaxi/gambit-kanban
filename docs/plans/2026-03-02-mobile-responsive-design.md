# Mobile Responsive Design

**Date:** 2026-03-02
**Approach:** Hybrid — CSS responsive layouts + bottom tab bar for mobile navigation

## Breakpoint Strategy

| Size | Range | Tailwind | Behavior |
|------|-------|----------|----------|
| Phone | < 640px | default | Bottom tabs, overlay sidebar, snap-scroll columns, full-screen panels |
| Tablet | 640-1023px | `sm:` / `md:` | Bottom tabs, overlay sidebar, side panel (340px), horizontal scroll columns |
| Desktop | 1024px+ | `lg:` | Current layout unchanged — inline sidebar, 420px detail panel, 290px columns |

## 1. Navigation Shell

### Mobile & Tablet (< 1024px)

**Top bar (Header):**
- Hamburger icon (left) to open sidebar overlay
- App title / board name (center)
- User avatar (right)
- Search bar: hidden on phone, icon-trigger on tablet

**Bottom tab bar** (fixed, ~56px):
- 5 tabs: Board, Dashboard, Calendar, Notes, Settings
- Lucide icons + small labels
- Active tab highlighted with accent color
- Hidden on desktop (`lg:hidden`)

**Sidebar:**
- Hidden from normal document flow on mobile/tablet
- Opens as full-height left overlay (280px) with dark backdrop on hamburger tap
- Contains board list, board switching, board icon picker
- Close via backdrop tap, X button, or selecting a board

### Desktop (1024px+)
- No changes. Current inline sidebar, top header, no bottom tabs.

## 2. Board View

### Phone (< 640px)
- Columns: full viewport width, one visible at a time
- `scroll-snap-type: x mandatory` on container, `scroll-snap-align: start` on each column
- Column position indicator (dot or "1/4" counter) at top
- "Add section" as a floating + at indicator area
- **Drag-and-drop disabled** — cards get "Move to..." in detail panel or long-press menu
- Tapping a card opens full-screen detail sheet

### Tablet (640-1023px)
- Columns at 260px width with horizontal scroll
- Drag-and-drop enabled
- Cards open in 340px side panel

### Desktop (1024px+)
- Columns at 290px, drag-and-drop enabled, 420px detail panel. Unchanged.

## 3. Card Detail Panel

### Phone (< 640px)
- Full-screen slide-up sheet (covers entire screen)
- Top bar: back arrow, card title, actions menu
- Scrollable content
- Close via back arrow

### Tablet (640-1023px)
- Right-side panel at 340px (narrower than desktop 420px)
- Same content layout, adjusted widths

### Desktop (1024px+)
- 420px fixed right panel. Unchanged.

## 4. Modals (ShareModal, IconPicker)

- Phone: full-screen takeover
- Tablet/Desktop: centered modal (unchanged)

## 5. Inline Card Editor

- Phone: bottom sheet overlay instead of inline-in-column
- Tablet/Desktop: inline in column (unchanged)

## 6. Other Pages

### Dashboard
- Stats: `grid-cols-2` on phone, `grid-cols-4` on desktop
- Chart and activity list: full-width stacked on all sizes

### Calendar
- Phone: calendar full-width, upcoming tasks panel stacks below
- Tablet: two-column, sidebar shrinks to 240px
- Desktop: unchanged

### Notes
- Phone: list-or-editor pattern — notes list full-width, selecting a note replaces list with editor, back button to return
- Tablet: two-column with 200px list
- Desktop: unchanged

### Settings
- Single-column on all sizes, padding adjustments only

### Login/Signup
- Already centered card layout, minor padding tweaks

## 7. New Components / Hooks

| Item | Purpose |
|------|---------|
| `useMediaQuery` hook | Detects phone/tablet/desktop for conditional rendering (nav shell, DnD enable) |
| `BottomTabBar.jsx` | 5-tab fixed bottom navigation for mobile/tablet |
| `MobileSidebar.jsx` | Overlay sidebar wrapper with backdrop (or modify existing `Sidebar.jsx`) |

## 8. What Does NOT Change

- All Supabase logic, stores, auth flow
- Desktop layout (1024px+) is completely untouched
- Card data model, board sharing, realtime subscriptions
- Landing page (already has basic responsiveness)

## 9. Key Implementation Notes

- Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) for all layout changes
- CSS `scroll-snap` for phone board columns — no JS library needed
- `useMediaQuery` should be a simple `matchMedia` listener hook, no dependency
- Disable `@dnd-kit` sensors on phone via `useSensors` conditional config
- Bottom tab bar routes match existing sidebar nav items
- Sidebar overlay uses existing `sidebarCollapsed` state from `settingsStore`
