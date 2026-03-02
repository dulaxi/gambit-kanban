# Mobile Responsive Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Gambit Kanban fully responsive across phone, tablet, and desktop with a hybrid approach — CSS responsive layouts + bottom tab bar for mobile navigation.

**Architecture:** CSS-first responsive using Tailwind breakpoints (`sm:`, `md:`, `lg:`). A `useMediaQuery` hook drives conditional logic (DnD disable, nav shell). Sidebar becomes a drawer overlay below `lg:`. Bottom tab bar replaces sidebar navigation on mobile/tablet. Detail panel becomes full-screen sheet on phone, narrower side panel on tablet.

**Tech Stack:** Tailwind CSS v4 responsive prefixes, CSS scroll-snap, React hooks (`useMediaQuery`), existing `@dnd-kit` sensor configuration.

**Design doc:** `docs/plans/2026-03-02-mobile-responsive-design.md`

---

### Task 1: Create `useMediaQuery` Hook

**Files:**
- Create: `src/hooks/useMediaQuery.js`

**Step 1: Create the hook**

```js
import { useState, useEffect } from 'react'

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}

export function useIsMobile() {
  return !useMediaQuery('(min-width: 640px)')
}

export function useIsTablet() {
  const aboveMobile = useMediaQuery('(min-width: 640px)')
  const belowDesktop = !useMediaQuery('(min-width: 1024px)')
  return aboveMobile && belowDesktop
}

export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)')
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds (unused export is fine, tree-shaken)

**Step 3: Commit**

```bash
git add src/hooks/useMediaQuery.js
git commit -m "feat: add useMediaQuery hook for responsive breakpoints"
```

---

### Task 2: Add `mobileMenuOpen` State to Settings Store

**Files:**
- Modify: `src/store/settingsStore.js` (19 lines total)

**Step 1: Add mobileMenuOpen state and toggle**

At line 10, after `toggleSidebar`, add `mobileMenuOpen` state and `toggleMobileMenu` / `closeMobileMenu` actions:

```js
// Current state shape at lines 6-9:
//   sidebarCollapsed: false,
//   theme: 'default',
//   font: 'mona-sans',

// Add after line 9:
mobileMenuOpen: false,

// Add after toggleSidebar (line 12):
toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
closeMobileMenu: () => set({ mobileMenuOpen: false }),
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/store/settingsStore.js
git commit -m "feat: add mobileMenuOpen state for sidebar drawer"
```

---

### Task 3: Create `BottomTabBar` Component

**Files:**
- Create: `src/components/layout/BottomTabBar.jsx`

**Step 1: Create the component**

5 tabs: Board, Dashboard, Calendar, Notes, Settings. Uses `NavLink` from react-router-dom. Hidden on desktop via `lg:hidden`.

```jsx
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Columns3, Calendar, StickyNote, Settings } from 'lucide-react'

const tabs = [
  { to: '/boards', icon: Columns3, label: 'Board' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/notes', icon: StickyNote, label: 'Notes' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function BottomTabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around h-14 z-30 lg:hidden">
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors ${
              isActive ? 'text-gray-900' : 'text-gray-400'
            }`
          }
        >
          <Icon className="w-5 h-5" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/layout/BottomTabBar.jsx
git commit -m "feat: add BottomTabBar component for mobile/tablet navigation"
```

---

### Task 4: Make Sidebar a Responsive Drawer

**Files:**
- Modify: `src/components/layout/Sidebar.jsx` (337 lines)

This is the largest single change. The sidebar currently is `fixed top-0 left-0 h-screen` at line 85 with `w-16` or `w-60`. On mobile/tablet (< 1024px), it needs to:
- Be hidden off-screen by default
- Open as an overlay when `mobileMenuOpen` is true
- Show a dark backdrop behind it
- Close when backdrop is tapped or a board is selected

**Step 1: Import `useIsDesktop` and `closeMobileMenu`**

At the top of the file (after existing imports around line 1-21), add:

```js
import { useIsDesktop } from '../../hooks/useMediaQuery'
```

**Step 2: Add hooks inside the component**

Inside the `Sidebar` component (around line 43-62), add:

```js
const isDesktop = useIsDesktop()
const { mobileMenuOpen, closeMobileMenu } = useSettingsStore()
```

Note: `useSettingsStore` is already imported at line 12. Just destructure the new fields.

**Step 3: Modify the `<aside>` wrapper at line 83-88**

Replace the current `<aside>` className logic. The sidebar should:
- On desktop (`lg:`): behave exactly as now — `fixed`, `w-16`/`w-60`, always visible
- On mobile/tablet: `fixed`, `w-60`, translated off-screen by default (`-translate-x-full`), slides in when `mobileMenuOpen` is true (`translate-x-0`)

Replace line 85's className with:

```jsx
className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-200 z-30
  ${isDesktop
    ? (sidebarCollapsed ? 'w-16' : 'w-60')
    : `w-60 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`
  }`}
```

**Step 4: Add backdrop overlay**

Wrap the `<aside>` return. Before the `<aside>`, add a backdrop div that shows on mobile when menu is open:

```jsx
{!isDesktop && mobileMenuOpen && (
  <div
    className="fixed inset-0 bg-black/30 z-20"
    onClick={closeMobileMenu}
  />
)}
```

**Step 5: Auto-close sidebar on board selection**

In `handleSelectBoard` (around line 71-74), add `closeMobileMenu()` at the end:

```js
const handleSelectBoard = (id) => {
  setActiveBoardId(id)
  closeMobileMenu()
}
```

Also close on nav item clicks. In the `NavLink` components for Dashboard, Calendar, Notes, Settings (around lines 104-300), add `onClick={closeMobileMenu}` to each `NavLink`.

**Step 6: Hide collapse toggle on mobile**

The collapse toggle button at lines 319-334 should only show on desktop. Wrap it with:

```jsx
{isDesktop && (
  <button ... > {/* existing collapse toggle */} </button>
)}
```

**Step 7: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 8: Commit**

```bash
git add src/components/layout/Sidebar.jsx
git commit -m "feat: make sidebar a responsive drawer overlay on mobile/tablet"
```

---

### Task 5: Make Header Responsive + Add Hamburger

**Files:**
- Modify: `src/components/layout/Header.jsx` (93 lines)

**Step 1: Import dependencies**

Add to imports:

```js
import { Menu } from 'lucide-react'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import useSettingsStore from '../../store/settingsStore'
```

**Step 2: Add hooks**

Inside the component, add:

```js
const isDesktop = useIsDesktop()
const toggleMobileMenu = useSettingsStore((s) => s.toggleMobileMenu)
```

**Step 3: Add hamburger button**

Before the `<h1>` at line 33, add:

```jsx
{!isDesktop && (
  <button
    onClick={toggleMobileMenu}
    className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
  >
    <Menu className="w-5 h-5 text-gray-600" />
  </button>
)}
```

**Step 4: Make search bar responsive**

Change the search container at line 36 from `w-80` to responsive:

```jsx
className="relative hidden sm:block sm:w-64 lg:w-80"
```

This hides the search entirely on phone, shows it at 256px on tablet, 320px on desktop.

**Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/components/layout/Header.jsx
git commit -m "feat: add hamburger menu and responsive search bar to header"
```

---

### Task 6: Make AppLayout Responsive + Wire BottomTabBar

**Files:**
- Modify: `src/components/layout/AppLayout.jsx` (122 lines)

**Step 1: Import dependencies**

Add:

```js
import BottomTabBar from './BottomTabBar'
import { useIsDesktop } from '../../hooks/useMediaQuery'
```

**Step 2: Add hook**

Inside the component:

```js
const isDesktop = useIsDesktop()
```

**Step 3: Make main content margin responsive**

At line 84-88, the content div has conditional `ml-16`/`ml-60`. On mobile/tablet, it should have no left margin (sidebar is overlay, not pushing content). Change to:

```jsx
className={`transition-all duration-200 ${
  isDesktop
    ? (sidebarCollapsed ? 'ml-16' : 'ml-60')
    : 'ml-0'
}`}
```

**Step 4: Add bottom padding for tab bar**

The main content area (around line 90, the `<main>` with `p-6`) needs bottom padding on mobile/tablet so content isn't hidden behind the bottom tab bar:

```jsx
<main className={`p-4 sm:p-6 ${isDesktop ? '' : 'pb-20'}`}>
```

Also reduce padding to `p-4` on mobile for more space.

**Step 5: Add BottomTabBar to render**

After the `</main>` closing tag (but inside the root wrapper), add:

```jsx
<BottomTabBar />
```

**Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/components/layout/AppLayout.jsx
git commit -m "feat: make AppLayout responsive with bottom tab bar"
```

---

### Task 7: Make CardDetailPanel Responsive

**Files:**
- Modify: `src/components/board/CardDetailPanel.jsx` (702 lines)

**Step 1: Import hook**

```js
import { useIsMobile } from '../../hooks/useMediaQuery'
```

**Step 2: Add hook inside component**

```js
const isMobile = useIsMobile()
```

**Step 3: Make panel root responsive**

At line 232, the panel is `fixed top-16 right-0 bottom-0 w-[420px]`. Change to:

```jsx
className={`fixed bg-white border-l border-gray-200 flex flex-col z-20 ${
  isMobile
    ? 'inset-0'
    : 'top-16 right-0 bottom-0 w-[340px] md:w-[340px] lg:w-[420px]'
}`}
```

On phone: `inset-0` makes it full-screen.
On tablet: 340px side panel.
On desktop: 420px side panel (unchanged).

**Step 4: Adjust top bar for mobile**

At line 234, the top bar has save/delete/close buttons. On mobile (full-screen mode), add a back arrow as the primary close action. Replace the close button area:

```jsx
{isMobile ? (
  <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
    <ArrowLeft className="w-5 h-5 text-gray-500" />
  </button>
) : (
  <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
    <X className="w-5 h-5 text-gray-500" />
  </button>
)}
```

Import `ArrowLeft` from lucide-react at the top.

**Step 5: Make field label widths responsive**

At line 293, field labels are `w-32` (128px). On mobile this is too wide. Change to:

```jsx
className="flex items-center gap-2 w-24 sm:w-32 shrink-0 text-gray-400"
```

**Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/components/board/CardDetailPanel.jsx
git commit -m "feat: make CardDetailPanel full-screen on phone, 340px on tablet"
```

---

### Task 8: Make BoardsPage Responsive

**Files:**
- Modify: `src/pages/BoardsPage.jsx` (67 lines)

**Step 1: Import hook**

```js
import { useIsMobile } from '../hooks/useMediaQuery'
```

**Step 2: Add hook**

```js
const isMobile = useIsMobile()
```

**Step 3: Remove fixed margin-right when detail panel is open**

At line 29-31, the `mr-[400px]` conditional pushes content right. On mobile/tablet, the detail panel overlays, so no margin needed:

```jsx
className={`h-[calc(100vh-7rem)] flex flex-col transition-all duration-200 ${
  selectedCardId && !isMobile ? 'lg:mr-[420px] md:mr-[340px]' : ''
}`}
```

Actually, simplify: On phone the detail panel is full-screen (covers everything), on tablet it's 340px side panel, on desktop 420px:

```jsx
className={`h-[calc(100vh-7rem)] flex flex-col transition-all duration-200 ${
  selectedCardId ? 'md:mr-[340px] lg:mr-[420px]' : ''
}`}
```

This means: no margin on phone (panel overlays), 340px margin on tablet, 420px on desktop.

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/pages/BoardsPage.jsx
git commit -m "feat: make BoardsPage detail panel margin responsive"
```

---

### Task 9: Make BoardView Columns Responsive with Scroll-Snap

**Files:**
- Modify: `src/components/board/BoardView.jsx` (288 lines)
- Modify: `src/components/board/Column.jsx` (174 lines)

**Step 1: Import hook in BoardView**

```js
import { useIsMobile } from '../../hooks/useMediaQuery'
```

**Step 2: Add hook in BoardView**

```js
const isMobile = useIsMobile()
```

**Step 3: Disable DnD sensors on mobile**

At lines 37-40, the sensors are configured. Wrap to disable on mobile:

```js
const sensors = useSensors(
  ...(isMobile ? [] : [
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  ])
)
```

When `sensors` is empty, DnD won't activate on mobile.

**Step 4: Add scroll-snap to column container**

At line 218, the column container is `flex gap-5 overflow-x-auto h-full pb-4`. Add scroll-snap classes for mobile:

```jsx
className="flex gap-3 sm:gap-5 overflow-x-auto h-full pb-4 snap-x snap-mandatory sm:snap-none"
```

- `snap-x snap-mandatory` on phone: snaps to each column
- `sm:snap-none` on tablet+: free scroll

**Step 5: Make Column width responsive**

In `Column.jsx` at line 73, change `w-[290px] shrink-0` to:

```jsx
className="flex flex-col w-[85vw] sm:w-[260px] lg:w-[290px] shrink-0 snap-start"
```

- Phone: 85% viewport width (fits one column with peek of next)
- Tablet: 260px
- Desktop: 290px (unchanged)
- `snap-start`: snap alignment point

**Step 6: Make "Add section" slot responsive too**

In `BoardView.jsx` at line 234, the add-section slot is `w-[290px]`. Match the column widths:

```jsx
className="shrink-0 w-[85vw] sm:w-[260px] lg:w-[290px] snap-start"
```

**Step 7: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 8: Commit**

```bash
git add src/components/board/BoardView.jsx src/components/board/Column.jsx
git commit -m "feat: add scroll-snap columns on mobile, disable DnD on phone"
```

---

### Task 10: Make IconPicker Responsive

**Files:**
- Modify: `src/components/board/IconPicker.jsx` (299 lines)

**Step 1: Import hook**

```js
import { useIsMobile } from '../../hooks/useMediaQuery'
```

**Step 2: Add hook inside IconPicker component**

```js
const isMobile = useIsMobile()
```

**Step 3: Make modal container responsive**

At line 158, change `w-[640px] max-h-[80vh]` to:

```jsx
className={`bg-white shadow-2xl flex flex-col overflow-hidden ${
  isMobile
    ? 'fixed inset-0 rounded-none'
    : 'rounded-2xl w-[640px] max-h-[80vh]'
}`}
```

Phone: full-screen. Tablet/Desktop: current 640px modal.

**Step 4: Make icon grid responsive**

At line 72 (in the `IconGrid` component), change `grid grid-cols-10` to:

```jsx
className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-10 gap-1"
```

6 columns on phone, 8 on tablet, 10 on desktop.

**Step 5: Hide category sidebar on mobile**

At line 207, the category sidebar is `w-44 shrink-0 border-r`. Hide on mobile:

```jsx
className="hidden sm:block w-44 shrink-0 border-r border-gray-100 overflow-y-auto py-2"
```

On mobile, all icons show in a flat list (or search is the primary navigation).

**Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/components/board/IconPicker.jsx
git commit -m "feat: make IconPicker full-screen on mobile with responsive grid"
```

---

### Task 11: Make CalendarPage Responsive

**Files:**
- Modify: `src/pages/CalendarPage.jsx` (214 lines)

**Step 1: Make root layout responsive**

At line 64, change `flex gap-4` to a responsive layout:

```jsx
className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-7rem)]"
```

Phone/tablet: stack vertically. Desktop: side-by-side (unchanged).

**Step 2: Make side panel responsive**

At line 165, change `w-72 shrink-0` to:

```jsx
className="w-full lg:w-72 shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden max-h-64 lg:max-h-none"
```

Phone/tablet: full-width, max-height so calendar still visible above. Desktop: 288px sidebar (unchanged).

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/pages/CalendarPage.jsx
git commit -m "feat: make CalendarPage stack vertically on mobile"
```

---

### Task 12: Make NotesPage Responsive

**Files:**
- Modify: `src/pages/NotesPage.jsx` (144 lines)

**Step 1: Import hook**

```js
import { useIsMobile } from '../hooks/useMediaQuery'
```

**Step 2: Add hook + local state for mobile view toggle**

```js
const isMobile = useIsMobile()
const [showEditor, setShowEditor] = useState(false)
```

**Step 3: Handle mobile note selection**

Modify the note click handler to show editor on mobile:

```js
// When a note is selected on mobile, switch to editor view
const handleSelectNote = (noteId) => {
  setSelectedNoteId(noteId)
  if (isMobile) setShowEditor(true)
}
```

Add a back handler:

```js
const handleBackToList = () => setShowEditor(false)
```

**Step 4: Make root layout responsive**

At line 61, change to:

```jsx
className="flex gap-0 h-[calc(100vh-7rem)]"
```

No change needed on the root flex — instead, conditionally show list vs editor on mobile.

**Step 5: Conditionally render list/editor on mobile**

At line 63, the notes list is `w-72 shrink-0`. On mobile, either show the list OR the editor:

Notes list panel:
```jsx
className={`${isMobile ? (showEditor ? 'hidden' : 'flex-1') : 'w-72 shrink-0'} bg-white border border-gray-200 rounded-l-2xl shadow-sm flex flex-col ${isMobile ? 'rounded-2xl' : ''}`}
```

Editor panel (around line 112):
```jsx
className={`${isMobile ? (showEditor ? 'flex-1' : 'hidden') : 'flex-1'} bg-white border border-gray-200 border-l-0 rounded-r-2xl shadow-sm flex flex-col ${isMobile ? 'border-l rounded-2xl' : ''}`}
```

**Step 6: Add back button on mobile editor**

In the editor header (around line 115), add a back button for mobile:

```jsx
{isMobile && (
  <button onClick={handleBackToList} className="p-1.5 rounded-lg hover:bg-gray-100 mr-2">
    <ArrowLeft className="w-5 h-5 text-gray-500" />
  </button>
)}
```

Import `ArrowLeft` from lucide-react.

**Step 7: Wire up note item clicks to use `handleSelectNote`**

In the note list items (around line 85), change `onClick={() => setSelectedNoteId(note.id)}` to `onClick={() => handleSelectNote(note.id)}`.

**Step 8: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 9: Commit**

```bash
git add src/pages/NotesPage.jsx
git commit -m "feat: make NotesPage show list-or-editor on mobile"
```

---

### Task 13: Make SettingsPage Responsive

**Files:**
- Modify: `src/pages/SettingsPage.jsx` (375 lines)

**Step 1: Add centering and responsive padding**

At line 117, `max-w-2xl` has no centering. Change to:

```jsx
className="max-w-2xl mx-auto"
```

This centers the settings content on wide screens and has no effect on mobile (content is already narrower than 672px).

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/pages/SettingsPage.jsx
git commit -m "feat: center SettingsPage content for responsive layout"
```

---

### Task 14: Add CSS Scroll-Snap Utilities to index.css

**Files:**
- Modify: `src/index.css` (62 lines)

Tailwind v4 includes scroll-snap utilities by default (`snap-x`, `snap-mandatory`, `snap-start`, `snap-none`), so no custom CSS should be needed. However, we should add smooth scrolling behavior for the board columns and ensure the bottom tab bar safe area on iOS.

**Step 1: Add safe area and scroll behavior**

After the existing scrollbar styles (around line 61), add:

```css
/* Mobile safe areas for bottom tab bar */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .pb-safe {
    padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
  }
}
```

**Step 2: Update BottomTabBar to use safe area**

In `src/components/layout/BottomTabBar.jsx`, add `pb-safe` to the nav element and add a `<meta>` viewport note (the viewport meta is in `index.html`).

Actually, check if `index.html` has `viewport-fit=cover`:

Look at `index.html` and add `viewport-fit=cover` to the viewport meta tag if not present.

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/index.css src/components/layout/BottomTabBar.jsx
git commit -m "feat: add iOS safe area support for bottom tab bar"
```

---

### Task 15: Make BoardShareModal Full-Screen on Mobile

**Files:**
- Modify: `src/components/board/BoardShareModal.jsx` (246 lines)

The modal already uses `w-full max-w-md mx-4` (line 121), which is nearly mobile-friendly. But on very small screens the centered modal with backdrop is better as full-screen.

**Step 1: Import hook**

```js
import { useIsMobile } from '../../hooks/useMediaQuery'
```

**Step 2: Add hook**

```js
const isMobile = useIsMobile()
```

**Step 3: Make modal full-screen on mobile**

At line 121, change the modal container:

```jsx
className={`bg-white shadow-xl ${
  isMobile
    ? 'fixed inset-0'
    : 'rounded-2xl w-full max-w-md mx-4'
}`}
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/components/board/BoardShareModal.jsx
git commit -m "feat: make BoardShareModal full-screen on mobile"
```

---

### Task 16: Final Integration Testing & Visual Verification

**Files:**
- No new files

**Step 1: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Start dev server and test manually**

Run: `npm run dev`

Test in browser devtools responsive mode at:
- 375px (iPhone SE)
- 390px (iPhone 14)
- 768px (iPad)
- 1024px (iPad landscape / small desktop)
- 1440px (desktop)

**Verify:**
- [ ] Bottom tab bar visible on phone/tablet, hidden on desktop
- [ ] Hamburger opens sidebar as overlay on mobile
- [ ] Sidebar backdrop closes on tap
- [ ] Board columns snap-scroll on phone (one column at a time)
- [ ] Card detail panel is full-screen on phone
- [ ] Card detail panel is 340px on tablet
- [ ] Card detail panel is 420px on desktop (unchanged)
- [ ] IconPicker is full-screen on mobile
- [ ] Calendar stacks vertically on mobile
- [ ] Notes shows list-or-editor toggle on mobile
- [ ] Settings is centered
- [ ] No horizontal overflow on any page at 375px
- [ ] DnD is disabled on phone, works on tablet/desktop
- [ ] All existing desktop behavior unchanged at 1440px

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: responsive layout polish and integration fixes"
```
