# Dashboard Rework Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current bare dashboard with a "Morning Brief + Split-Flap" dashboard — greeting banner, animated stat tiles, focus task cards, and board summary grid.

**Architecture:** Single-file rewrite of `DashboardPage.jsx` plus a new `SplitFlapTile` component and CSS keyframes. All data from existing Zustand stores (no new API calls). Split-flap animation is CSS-only (3D transforms).

**Tech Stack:** React 19, Tailwind CSS v4, Zustand, date-fns, lucide-react

---

### Task 1: Create SplitFlapTile Component

The core visual element — a dark tile that displays a number with a flip animation on mount.

**Files:**
- Create: `src/components/dashboard/SplitFlapTile.jsx`

**Step 1: Create the component**

```jsx
import { useState, useEffect } from 'react'

export default function SplitFlapTile({ value, label, danger = false, delay = 0 }) {
  const [flipped, setFlipped] = useState(false)
  const display = String(value).padStart(2, '0')

  useEffect(() => {
    const timer = setTimeout(() => setFlipped(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className={`text-[10px] font-mono font-semibold uppercase tracking-widest ${danger && value > 0 ? 'text-red-500' : 'text-amber-600'}`}>
        {label}
      </span>
      <div className="relative w-14 h-16 perspective-[300px]">
        {/* Static background tile */}
        <div className={`absolute inset-0 rounded-lg ${danger && value > 0 ? 'bg-red-950' : 'bg-gray-900'} flex items-center justify-center`}>
          <span className="text-2xl font-mono font-bold text-white/20">{display}</span>
        </div>

        {/* Split line */}
        <div className="absolute left-1 right-1 top-1/2 h-px bg-black/40 z-10" />

        {/* Flip panel - top half */}
        <div
          className={`absolute inset-0 rounded-lg ${danger && value > 0 ? 'bg-red-950' : 'bg-gray-900'} origin-bottom overflow-hidden transition-transform duration-400 ease-in-out ${
            flipped ? '[transform:rotateX(-90deg)]' : ''
          }`}
          style={{ clipPath: 'inset(0 0 50% 0)', transitionDelay: `${delay}ms` }}
        >
          <div className="flex items-center justify-center h-[200%]">
            <span className="text-2xl font-mono font-bold text-white/20">00</span>
          </div>
        </div>

        {/* Flip panel - bottom half (new value) */}
        <div
          className={`absolute inset-0 rounded-lg ${danger && value > 0 ? 'bg-red-950' : 'bg-gray-900'} origin-top overflow-hidden transition-transform duration-400 ease-in-out ${
            flipped ? '' : '[transform:rotateX(90deg)]'
          }`}
          style={{ clipPath: 'inset(50% 0 0 0)', transitionDelay: `${delay + 100}ms` }}
        >
          <div className="flex items-center justify-center h-[200%] -translate-y-1/2">
            <span className="text-2xl font-mono font-bold text-white">{display}</span>
          </div>
        </div>

        {/* Small shadow under top half for depth */}
        <div className="absolute left-0 right-0 top-1/2 h-2 bg-gradient-to-b from-black/20 to-transparent z-5" />
      </div>
    </div>
  )
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds (component is created but not imported anywhere yet)

**Step 3: Commit**

```bash
git add src/components/dashboard/SplitFlapTile.jsx
git commit -m "feat: add SplitFlapTile component with CSS 3D flip animation"
```

---

### Task 2: Rewrite DashboardPage — Greeting Banner + Stats

Replace the entire `DashboardPage.jsx` with the new layout. Start with the greeting and stat tiles sections.

**Files:**
- Modify: `src/pages/DashboardPage.jsx` (full rewrite)

**Step 1: Rewrite the file**

```jsx
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBoardStore } from '../store/boardStore'
import { useAuthStore } from '../store/authStore'
import { isToday, isPast, parseISO, format, formatDistanceToNow } from 'date-fns'
import { CheckCircle2, ArrowRight, Plus } from 'lucide-react'
import DynamicIcon from '../components/board/DynamicIcon'
import SplitFlapTile from '../components/dashboard/SplitFlapTile'

const LABEL_BG = {
  red: 'bg-[#FFE0DB] text-[#CF222E]',
  blue: 'bg-[#DAF0FF] text-[#3094FF]',
  green: 'bg-[#D1FDE0] text-[#08872B]',
  yellow: 'bg-[#FFF4D4] text-[#9A6700]',
  purple: 'bg-[#EDD8FD] text-[#8534F3]',
  pink: 'bg-[#FFD6EA] text-[#BF3989]',
  gray: 'bg-[#E4EBE6] text-[#909692]',
}

const PRIORITY_DOT = {
  low: 'bg-emerald-400',
  medium: 'bg-amber-400',
  high: 'bg-rose-400',
}

// Colors for board progress segments
const SEGMENT_COLORS = [
  'bg-blue-400',
  'bg-amber-400',
  'bg-emerald-400',
  'bg-purple-400',
  'bg-rose-400',
  'bg-teal-400',
  'bg-pink-400',
  'bg-orange-400',
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const boards = useBoardStore((s) => s.boards)
  const columns = useBoardStore((s) => s.columns)
  const cards = useBoardStore((s) => s.cards)
  const loading = useBoardStore((s) => s.loading)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const profile = useAuthStore((s) => s.profile)

  const allCards = useMemo(() => Object.values(cards), [cards])
  const allColumns = useMemo(() => Object.values(columns), [columns])
  const allBoards = useMemo(() => Object.values(boards), [boards])

  const doneColumnIds = useMemo(
    () => new Set(allColumns.filter((c) => c.title.toLowerCase() === 'done').map((c) => c.id)),
    [allColumns]
  )

  const stats = useMemo(() => {
    const inProgressIds = new Set(
      allColumns.filter((c) => c.title.toLowerCase() === 'in progress').map((c) => c.id)
    )
    const dueToday = allCards.filter((c) => {
      if (!c.due_date || doneColumnIds.has(c.column_id)) return false
      return isToday(parseISO(c.due_date))
    }).length
    const overdue = allCards.filter((c) => {
      if (!c.due_date || doneColumnIds.has(c.column_id)) return false
      const d = parseISO(c.due_date)
      return isPast(d) && !isToday(d)
    }).length
    const inProgress = allCards.filter((c) => inProgressIds.has(c.column_id)).length
    const completed = allCards.filter((c) => doneColumnIds.has(c.column_id)).length
    return { dueToday, overdue, inProgress, completed }
  }, [allCards, allColumns, doneColumnIds])

  const dueTodayCards = useMemo(
    () =>
      allCards
        .filter((c) => c.due_date && !doneColumnIds.has(c.column_id) && isToday(parseISO(c.due_date)))
        .sort((a, b) => (a.priority === 'high' ? -1 : 1)),
    [allCards, doneColumnIds]
  )

  const overdueCards = useMemo(
    () =>
      allCards
        .filter((c) => {
          if (!c.due_date || doneColumnIds.has(c.column_id)) return false
          const d = parseISO(c.due_date)
          return isPast(d) && !isToday(d)
        })
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date)),
    [allCards, doneColumnIds]
  )

  const boardSummaries = useMemo(
    () =>
      allBoards.map((board) => {
        const boardColumns = allColumns
          .filter((c) => c.board_id === board.id)
          .sort((a, b) => a.position - b.position)
        const boardCards = allCards.filter((c) => c.board_id === board.id)
        const columnCounts = boardColumns.map((col) => ({
          id: col.id,
          title: col.title,
          count: boardCards.filter((c) => c.column_id === col.id).length,
        }))
        const lastActivity = boardCards.reduce((latest, c) => {
          const t = c.updated_at ? new Date(c.updated_at).getTime() : 0
          return t > latest ? t : latest
        }, 0)
        return { ...board, columnCounts, totalCards: boardCards.length, lastActivity }
      }),
    [allBoards, allColumns, allCards]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading...
      </div>
    )
  }

  const displayName = profile?.display_name || 'there'

  return (
    <div className="max-w-4xl mx-auto">
      {/* Greeting Banner */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {getGreeting()},{' '}
          <span className="bg-gradient-to-r from-[#103783] to-[#9BAFD9] bg-clip-text text-transparent">
            {displayName}
          </span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {format(new Date(), 'EEEE, MMMM d')}
        </p>
        {(stats.dueToday > 0 || stats.overdue > 0) && (
          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-gray-500">
              {stats.dueToday > 0 && `${stats.dueToday} due today`}
              {stats.dueToday > 0 && stats.overdue > 0 && ' · '}
              {stats.overdue > 0 && (
                <span className="text-red-500">{stats.overdue} overdue</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Split-Flap Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-10">
        <SplitFlapTile label="Due Today" value={stats.dueToday} delay={0} />
        <SplitFlapTile label="Overdue" value={stats.overdue} danger delay={100} />
        <SplitFlapTile label="In Progress" value={stats.inProgress} delay={200} />
        <SplitFlapTile label="Completed" value={stats.completed} delay={300} />
      </div>

      {/* Due Today Cards */}
      {dueTodayCards.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Due Today</h2>
            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
              {dueTodayCards.length}
            </span>
          </div>
          <div className="space-y-2">
            {dueTodayCards.map((card) => (
              <TaskRow key={card.id} card={card} boards={boards} navigate={navigate} setActiveBoard={setActiveBoard} />
            ))}
          </div>
        </div>
      )}

      {/* Overdue Cards */}
      {overdueCards.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-red-600">Overdue</h2>
            <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
              {overdueCards.length}
            </span>
          </div>
          <div className="space-y-2">
            {overdueCards.map((card) => (
              <TaskRow key={card.id} card={card} boards={boards} navigate={navigate} setActiveBoard={setActiveBoard} overdue />
            ))}
          </div>
        </div>
      )}

      {/* Empty state if nothing due */}
      {dueTodayCards.length === 0 && overdueCards.length === 0 && (
        <div className="flex items-center gap-2 mb-8 py-6 justify-center text-gray-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm">Nothing due today — you're all clear</span>
        </div>
      )}

      {/* Board Summaries */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Your Boards</h2>
        {boardSummaries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-8 text-center">
            <p className="text-sm text-gray-400 mb-3">Create your first board to get started</p>
            <button
              onClick={() => navigate('/boards')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boardSummaries.map((board) => (
              <button
                key={board.id}
                type="button"
                onClick={() => {
                  setActiveBoard(board.id)
                  navigate('/boards')
                }}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 text-left hover:shadow-md hover:border-gray-300/80 transition-all cursor-pointer"
              >
                {/* Board header */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    {board.icon ? (
                      <DynamicIcon name={board.icon} className="w-4 h-4 text-gray-600" />
                    ) : (
                      <span className="text-sm">📋</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{board.name}</p>
                    <p className="text-[11px] text-gray-400">{board.totalCards} tasks</p>
                  </div>
                </div>

                {/* Progress bar */}
                {board.totalCards > 0 && (
                  <div className="mb-2">
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100">
                      {board.columnCounts.map((col, i) =>
                        col.count > 0 ? (
                          <div
                            key={col.id}
                            className={`${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}`}
                            style={{ width: `${(col.count / board.totalCards) * 100}%` }}
                          />
                        ) : null
                      )}
                    </div>
                    <div className="flex gap-3 mt-1.5 flex-wrap">
                      {board.columnCounts.map((col, i) => (
                        <span key={col.id} className="text-[10px] text-gray-400 flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}`} />
                          {col.title} {col.count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Last activity */}
                {board.lastActivity > 0 && (
                  <p className="text-[10px] text-gray-300 mt-2">
                    Updated {formatDistanceToNow(new Date(board.lastActivity), { addSuffix: true })}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---- Task Row sub-component ---- */
function TaskRow({ card, boards, navigate, setActiveBoard, overdue = false }) {
  const board = boards[card.board_id]
  return (
    <button
      type="button"
      onClick={() => {
        setActiveBoard(card.board_id)
        navigate('/boards')
      }}
      className={`flex items-center gap-3 w-full bg-white rounded-xl border shadow-sm px-4 py-3 hover:shadow-md hover:border-gray-300/80 transition-all text-left cursor-pointer ${
        overdue ? 'border-red-200/80' : 'border-gray-200/80'
      }`}
    >
      {/* Priority dot */}
      <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[card.priority] || PRIORITY_DOT.medium}`} />

      {/* Task number */}
      <span className="text-[11px] font-mono text-gray-400 shrink-0">
        #{card.global_task_number || card.task_number}
      </span>

      {/* Title */}
      <span className="text-sm font-medium text-gray-900 flex-1 truncate">{card.title}</span>

      {/* Labels */}
      {card.labels?.length > 0 && (
        <div className="hidden sm:flex items-center gap-1">
          {card.labels.slice(0, 2).map((l) => (
            <span key={l} className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${LABEL_BG[l] || LABEL_BG.gray}`}>
              {l}
            </span>
          ))}
        </div>
      )}

      {/* Board name */}
      {board && (
        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline">
          {board.name}
        </span>
      )}

      <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
    </button>
  )
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "feat: rewrite dashboard with greeting, split-flap stats, focus cards, board grid"
```

---

### Task 3: Visual Polish & Verify

Do a visual check and fix any issues.

**Files:**
- Possibly tweak: `src/components/dashboard/SplitFlapTile.jsx`
- Possibly tweak: `src/pages/DashboardPage.jsx`

**Step 1: Start dev server and check at 375px (mobile)**

Run: `npm run dev`
Check:
- Greeting shows with gradient name
- Split-flap tiles animate on load (2x2 grid on mobile)
- Focus cards show (if any tasks have due dates)
- Board cards stack in single column
- Bottom tab bar visible, no overflow

**Step 2: Check at 1440px (desktop)**

Check:
- Split-flap tiles in 4-column row
- Board cards in 3-column grid
- Labels and board name pills visible on task rows
- `max-w-4xl mx-auto` centers content

**Step 3: Fix any visual issues found**

Common things to fix:
- Tile sizing on mobile
- Overflow/truncation on card titles
- Progress bar colors
- Animation timing

**Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix: dashboard visual polish and responsive tweaks"
```

---

### Task 4: Remove Recharts dependency (cleanup)

The old dashboard imported Recharts. Since we're not using charts anymore, check if Recharts is used elsewhere. If not, remove it.

**Files:**
- Modify: `package.json` (remove recharts if unused)

**Step 1: Check if recharts is imported anywhere**

Run: `grep -r "recharts" src/`
Expected: No results (if only the old dashboard used it)

**Step 2: Remove if unused**

Run: `npm uninstall recharts`

**Step 3: Verify build still passes**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove unused recharts dependency"
```
