import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBoardStore } from '../store/boardStore'
import { useAuthStore } from '../store/authStore'
import { format, formatDistanceToNow, parseISO, subDays, startOfDay, isToday, isTomorrow, isPast, addDays, isBefore } from 'date-fns'
import { Plus, CheckCircle2, Target, LayoutGrid, Users, BarChart3 } from 'lucide-react'
import DynamicIcon from '../components/board/DynamicIcon'
import { PRIORITY_DOT, getGreeting } from '../utils/formatting'
import { computeTaskStats, computeBoardSummaries } from '../utils/cardStats'

const TIPS = [
  "Try tackling your hardest task first thing in the morning — your focus is sharpest before lunch.",
  "Break large tasks into smaller steps. Progress feels better when you can check things off.",
  "If a task has been sitting for days, ask: is it blocked, unclear, or just not important?",
  "Take a 5-minute break every hour. Your brain does its best work when it's rested.",
  "Done is better than perfect. Ship it, then iterate.",
  "Review your overdue items weekly — reschedule or remove what's no longer relevant.",
  "Use labels to group related tasks. Patterns emerge when you can see the big picture.",
]

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Small deeds done are better than great deeds planned.", author: "Peter Marshall" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "You don't have to see the whole staircase, just take the first step.", author: "Martin Luther King Jr." },
]

function getDailyIndex(arr) {
  const day = Math.floor(Date.now() / 86400000)
  return day % arr.length
}

const SEGMENT_COLORS = ['#d2d6c5', '#a4b55b', '#8BA32E', '#7A5C44', '#5C5C57', '#3c402b', '#1B1B18']

/* ── Streak day square ── */
function StreakDay({ label, status }) {
  const cls = status === 'done'
    ? 'bg-[#C2D64A] text-[#1B1B18]'
    : status === 'today'
    ? 'bg-[#1B1B18] text-[#C2D64A]'
    : 'bg-[#E8E2DB] text-[#8E8E89]'
  return (
    <div className={`w-5 h-5 rounded-[5px] text-[8px] font-bold flex items-center justify-center ${cls}`}>
      {label}
    </div>
  )
}

/* ── Calendar heatmap (numbered with task badges) ── */
function CalendarHeatmap({ cards, profile }) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow = new Date(year, month, 1).getDay()
  const startOffset = firstDow === 0 ? 6 : firstDow - 1

  const displayName = profile?.display_name

  const dayCounts = {}
  Object.values(cards).forEach((c) => {
    if (!c.due_date || c.archived) return
    if (displayName && c.assignee_name !== displayName) return
    const d = c.due_date.split('T')[0]
    const [y, m] = d.split('-').map(Number)
    if (y === year && m - 1 === month) {
      const day = parseInt(d.split('-')[2], 10)
      dayCounts[day] = (dayCounts[day] || 0) + 1
    }
  })

  const doneCounts = {}
  Object.values(cards).forEach((c) => {
    if (!c.updated_at || !c.completed) return
    if (displayName && c.assignee_name !== displayName) return
    const d = c.updated_at.split('T')[0]
    const [y, m] = d.split('-').map(Number)
    if (y === year && m - 1 === month) {
      const day = parseInt(d.split('-')[2], 10)
      doneCounts[day] = (doneCounts[day] || 0) + 1
    }
  })

  const todayDate = now.getDate()
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  function getRingColor(day) {
    const count = dayCounts[day] || 0
    const done = doneCounts[day] || 0
    if (count === 0) return null
    if (day > todayDate) return '#A8BA32'
    if (done > 0 && done >= count) return '#A8BA32'
    if (done > 0) return '#D4A843'
    return '#C27A4A'
  }

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div>
      <div className="grid grid-cols-7 gap-[3px] mb-[3px]">
        {dayLabels.map((l, i) => (
          <div key={i} className="text-[9px] font-bold text-[#C4BFB8] text-center">{l}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-[3px]">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const isToday = day === todayDate
          const isWeekend = (() => { const d = new Date(year, month, day); return d.getDay() === 0 || d.getDay() === 6 })()
          const ring = getRingColor(day)
          const hasTasks = (dayCounts[day] || 0) > 0
          return (
            <div
              key={i}
              className="aspect-square rounded-full flex items-center justify-center"
              style={{
                fontSize: '11px',
                fontWeight: isToday ? 700 : hasTasks ? 600 : 500,
                color: isToday ? '#C2D64A' : hasTasks ? '#1B1B18' : isWeekend ? '#C4BFB8' : '#8E8E89',
                background: isToday ? '#1B1B18' : 'transparent',
                outline: ring && !isToday ? `2px solid ${ring}` : 'none',
                outlineOffset: '-2px',
              }}
              title={`${dayCounts[day] || 0} tasks, ${doneCounts[day] || 0} done`}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Timeline task row ── */
function TimelineTask({ card, onClick, onComplete }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2 py-1 pl-2.5 cursor-pointer group"
    >
      <span className="flex-1 text-[12px] font-medium text-[#1B1B18] truncate group-hover:text-[#A8BA32] transition-colors">{card.title}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onComplete() }}
        className="w-[13px] h-[13px] rounded-full border-[1.5px] border-[#E0DBD5] shrink-0 hover:border-[#A8BA32] hover:bg-[#EEF2D6] transition-all cursor-pointer"
      />
    </div>
  )
}

/* ── Activity item ── */
function ActivityItem({ icon, iconBg, iconColor, text, time }) {
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-[#E8E2DB] last:border-none">
      <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '13px', lineHeight: '13px', color: iconColor, fontVariationSettings: "'FILL' 1, 'wght' 500" }}
        >{icon}</span>
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-medium text-[#1B1B18] leading-snug">{text}</div>
        <div className="text-[10px] text-[#8E8E89] font-mono mt-0.5">{time}</div>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  DashboardPage                                                      */
/* ================================================================== */
export default function DashboardPage() {
  const navigate = useNavigate()
  const boards = useBoardStore((s) => s.boards)
  const columns = useBoardStore((s) => s.columns)
  const cards = useBoardStore((s) => s.cards)
  const loading = useBoardStore((s) => s.loading)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const addBoard = useBoardStore((s) => s.addBoard)
  const updateCard = useBoardStore((s) => s.updateCard)
  const profile = useAuthStore((s) => s.profile)

  const [creatingBoard, setCreatingBoard] = useState(false)
  const displayName = profile?.display_name || 'there'

  const {
    dueToday, overdue, inProgress, completed, completedYesterday,
    focusCards, overdueCards, streak,
  } = useMemo(
    () => computeTaskStats(cards, columns, profile?.display_name),
    [cards, columns, profile]
  )

  const boardSummaries = useMemo(
    () => computeBoardSummaries(boards, columns, cards, profile?.display_name),
    [boards, columns, cards, profile]
  )

  // Timeline groups
  const timelineGroups = useMemo(() => {
    const displayName = profile?.display_name
    const myCards = Object.values(cards).filter((c) =>
      !c.completed && !c.archived && c.due_date &&
      (!displayName || c.assignee_name === displayName)
    )
    const now = new Date()
    const endOfWeek = addDays(startOfDay(now), 7 - now.getDay())

    const groups = []
    const overdueList = myCards.filter((c) => { const d = parseISO(c.due_date); return isPast(d) && !isToday(d) })
    const todayList = myCards.filter((c) => isToday(parseISO(c.due_date)))
    const tomorrowList = myCards.filter((c) => isTomorrow(parseISO(c.due_date)))
    const thisWeekList = myCards.filter((c) => {
      const d = parseISO(c.due_date)
      return !isPast(d) && !isToday(d) && !isTomorrow(d) && isBefore(d, endOfWeek)
    })

    const byDue = (a, b) => new Date(a.due_date) - new Date(b.due_date)

    if (overdueList.length > 0) groups.push({ label: 'Overdue', color: '#C27A4A', cards: overdueList.sort(byDue) })
    if (todayList.length > 0) groups.push({ label: `Today — ${format(now, 'EEEE, MMM d')}`, color: '#D4A843', cards: todayList.sort(byDue) })
    if (tomorrowList.length > 0) groups.push({ label: `Tomorrow — ${format(addDays(now, 1), 'EEEE, MMM d')}`, color: '#A8BA32', cards: tomorrowList.sort(byDue) })
    if (thisWeekList.length > 0) groups.push({ label: 'This Week', color: '#E0DBD5', cards: thisWeekList.sort(byDue) })

    return groups
  }, [cards, columns, profile])

  // Recent activity from card updates
  const recentActivity = useMemo(() => {
    const allCards = Object.values(cards).filter((c) => c.updated_at)
    const allCols = Object.values(columns)
    const doneIds = new Set(allCols.filter((c) => c.title.toLowerCase() === 'done').map((c) => c.id))

    return allCards
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 8)
      .map((card) => {
        const isDone = doneIds.has(card.column_id)
        const col = allCols.find((c) => c.id === card.column_id)
        const time = formatDistanceToNow(parseISO(card.updated_at), { addSuffix: true })
        if (isDone && card.completed) {
          return { icon: 'check_circle', iconBg: 'bg-[#EEF2D6]', iconColor: '#A8BA32', text: `Completed "${card.title}"`, time }
        }
        return { icon: 'edit', iconBg: 'bg-[#EEF2D6]', iconColor: '#A8BA32', text: `Updated "${card.title}"${col ? ` in ${col.title}` : ''}`, time }
      })
  }, [cards, columns])

  // Streak week data
  const streakWeek = useMemo(() => {
    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    const today = new Date()
    const todayDow = today.getDay() // 0=Sun
    const mondayOffset = todayDow === 0 ? 6 : todayDow - 1

    const allDone = Object.values(cards).filter((c) => c.updated_at && c.completed)
    const doneDays = new Set(allDone.map((c) => format(parseISO(c.updated_at), 'yyyy-MM-dd')))

    return dayLabels.map((label, i) => {
      const dayOffset = mondayOffset - i
      if (dayOffset < 0) return { label, status: 'future' }
      if (dayOffset === 0) return { label, status: 'today' }
      const d = format(subDays(today, dayOffset), 'yyyy-MM-dd')
      return { label, status: doneDays.has(d) ? 'done' : 'future' }
    })
  }, [cards])

  function navigateToCard(card) {
    setActiveBoard(card.board_id)
    navigate('/boards')
  }

  function completeCard(card) {
    const allCols = Object.values(columns)
    const doneCol = allCols.find((c) => c.board_id === card.board_id && c.title.toLowerCase() === 'done')
    if (doneCol) {
      updateCard(card.id, { column_id: doneCol.id, completed: true })
    } else {
      updateCard(card.id, { completed: true })
    }
  }

  async function handleNewBoard() {
    if (creatingBoard) return
    setCreatingBoard(true)
    const id = await addBoard('New Board')
    setCreatingBoard(false)
    if (id) {
      setActiveBoard(id)
      navigate('/boards')
    }
  }

  function getBoardName(boardId) {
    return boards[boardId]?.name || ''
  }

  function getRingColor(percent) {
    if (percent >= 75) return '#A8BA32'
    if (percent >= 40) return '#D4A843'
    return '#C27A4A'
  }

  const hasData = Object.keys(boards).length > 0 || Object.keys(cards).length > 0
  if (loading && !hasData) {
    return (
      <div className="flex items-center justify-center h-64 text-[#8E8E89] text-sm">
        Loading...
      </div>
    )
  }

  const tip = TIPS[getDailyIndex(TIPS)]
  const quote = QUOTES[getDailyIndex(QUOTES)]
  const boardCount = Object.keys(boards).length

  // ─── First-time user dashboard ───
  if (boardCount === 0) {
    return (
      <div className="w-full flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 7rem)' }}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[11px] tracking-[1.5px] uppercase text-[#8E8E89] mb-1">
              {format(new Date(), 'EEEE, MMMM d')}
            </div>
            <h1 className="text-[26px] sm:text-[30px] font-bold text-[#1B1B18] font-heading leading-tight">
              Welcome, <span className="text-[#A8BA32]">{displayName}</span>
            </h1>
            <p className="text-[14px] text-[#5C5C57] font-heading italic mt-0.5">
              Let's get you set up.
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center -mt-12">
          <div className="w-14 h-14 rounded-2xl bg-[#EEF2D6] flex items-center justify-center mb-5">
            <Target className="w-7 h-7 text-[#A8BA32]" />
          </div>
          <h2 className="text-lg font-bold text-[#1B1B18] mb-1.5">Your dashboard lives here</h2>
          <p className="text-sm text-[#8E8E89] text-center max-w-sm mb-6">
            Stats, calendar, timeline, and activity will fill in as you create boards and complete tasks.
          </p>
          <button
            onClick={handleNewBoard}
            disabled={creatingBoard}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B1B18] text-white text-sm font-medium rounded-xl hover:bg-[#333] transition-colors cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {creatingBoard ? 'Creating...' : 'Create your first board'}
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10 max-w-lg w-full">
            <div className="bg-white border border-[#E0DBD5] rounded-xl p-4 text-center">
              <LayoutGrid className="w-5 h-5 text-[#A8BA32] mx-auto mb-2" />
              <div className="text-[12px] font-semibold text-[#1B1B18] mb-0.5">Boards</div>
              <div className="text-[11px] text-[#8E8E89]">Organize tasks into columns</div>
            </div>
            <div className="bg-white border border-[#E0DBD5] rounded-xl p-4 text-center">
              <Users className="w-5 h-5 text-[#D4A843] mx-auto mb-2" />
              <div className="text-[12px] font-semibold text-[#1B1B18] mb-0.5">Collaborate</div>
              <div className="text-[11px] text-[#8E8E89]">Invite your team to boards</div>
            </div>
            <div className="bg-white border border-[#E0DBD5] rounded-xl p-4 text-center">
              <BarChart3 className="w-5 h-5 text-[#C27A4A] mx-auto mb-2" />
              <div className="text-[12px] font-semibold text-[#1B1B18] mb-0.5">Track</div>
              <div className="text-[11px] text-[#8E8E89]">Stats and streaks appear here</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center pt-3 border-t border-[#E8E2DB] shrink-0">
          <span className="text-[12px] text-[#C4BFB8] font-heading italic">
            "{quote.text}" — {quote.author}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 7rem)' }}>
      {/* ─── Header ─── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[11px] tracking-[1.5px] uppercase text-[#8E8E89] mb-1">
            {format(new Date(), 'EEEE, MMMM d')}
          </div>
          <h1 className="text-[26px] sm:text-[30px] font-bold text-[#1B1B18] font-heading leading-tight">
            {getGreeting()}, <span className="text-[#A8BA32]">{displayName}</span>
          </h1>
          <p className="text-[14px] text-[#5C5C57] font-heading italic mt-0.5">
            Here's what your day looks like.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 pt-2">
          <div className="flex items-center gap-1.5 bg-white border border-[#E0DBD5] rounded-xl px-3 py-1.5 shadow-sm font-mono text-[12px] text-[#1B1B18]">
            <span className="text-[14px] font-bold text-[#D4A843]">{dueToday}</span> due today
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-[#E0DBD5] rounded-xl px-3 py-1.5 shadow-sm font-mono text-[12px] text-[#1B1B18]">
            <span className="text-[14px] font-bold text-[#C27A4A]">{overdue}</span> overdue
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-[#E0DBD5] rounded-xl px-3 py-1.5 shadow-sm font-mono text-[12px] text-[#1B1B18]">
            <span className="text-[14px] font-bold text-[#A8BA32]">{completedYesterday}</span> done y'day
          </div>
        </div>
      </div>

      {/* ─── Main grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 flex-1 min-h-0 overflow-hidden">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
          {/* Boards */}
          <div className="shrink-0">
            <div className="text-[10px] font-mono font-semibold text-[#C4BFB8] uppercase tracking-[1.5px] mb-3">Boards</div>
            {boardSummaries.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-[#8E8E89] text-sm mb-4">Create your first board to get started</p>
                <button onClick={handleNewBoard} disabled={creatingBoard}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B1B18] text-white text-sm font-medium rounded-lg hover:bg-[#333] transition-colors cursor-pointer disabled:opacity-50">
                  <Plus className="w-4 h-4" />
                  {creatingBoard ? 'Creating...' : 'New Board'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {boardSummaries.slice(0, 4).map((board) => (
                  <button
                    key={board.id}
                    onClick={() => { setActiveBoard(board.id); navigate('/boards') }}
                    className="bg-white border border-[#E0DBD5] rounded-xl p-3.5 text-left cursor-pointer hover:shadow-sm hover:border-[#C4BFB8] transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2.5">
                      {board.icon && <DynamicIcon name={board.icon} className="w-[18px] h-[18px] text-[#5C5C57]" />}
                      <span className="text-[13px] font-bold text-[#1B1B18] flex-1 truncate">{board.name}</span>
                      <span className="text-[11px] text-[#8E8E89]">{board.totalCards} tasks</span>
                    </div>
                    {board.totalCards > 0 && (
                      <div className="h-1 rounded-full overflow-hidden flex bg-[#E8E2DB] mb-2">
                        {board.columns.map((col, i) =>
                          col.count > 0 ? (
                            <div key={col.id} className="h-full" style={{ width: `${(col.count / board.totalCards) * 100}%`, background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} />
                          ) : null
                        )}
                      </div>
                    )}
                    {board.columns.length > 0 && (
                      <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 mb-1.5">
                        {board.columns.map((col, i) => (
                          <span key={col.id} className="flex items-center gap-1 text-[10px] text-[#8E8E89]">
                            <span className="w-[5px] h-[5px] rounded-full" style={{ background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} />
                            {col.title}
                          </span>
                        ))}
                      </div>
                    )}
                    {board.lastUpdated && (
                      <div className="text-[10px] font-mono text-[#C4BFB8]">
                        Updated {formatDistanceToNow(new Date(board.lastUpdated), { addSuffix: true })}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Up next */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="text-[10px] font-mono font-semibold text-[#C4BFB8] uppercase tracking-[1.5px] mb-3 shrink-0">Up next</div>
            <div className="flex-1 min-h-0 overflow-y-auto">
            {timelineGroups.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-6 text-[#8E8E89] text-[13px]">
                <CheckCircle2 className="w-4 h-4 text-[#A8BA32]" />
                Nothing upcoming — you're all clear!
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {timelineGroups.map((group) => (
                  <div key={group.label}>
                    <div className="flex items-center gap-1.5 text-[9px] font-mono font-semibold uppercase tracking-[1px] py-0.5" style={{ color: group.color }}>
                      <span className="w-[5px] h-[5px] rounded-full" style={{ background: group.color }} />
                      {group.label}
                    </div>
                    {group.cards.map((card) => (
                      <TimelineTask
                        key={card.id}
                        card={card}
                        onClick={() => navigateToCard(card)}
                        onComplete={() => completeCard(card)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
          {/* Calendar */}
          <div className="bg-white border border-[#E0DBD5] rounded-xl p-3.5 shadow-sm shrink-0">
            <div className="text-[13px] font-bold text-[#1B1B18] mb-3">{format(new Date(), 'MMMM')}</div>
            <CalendarHeatmap cards={cards} profile={profile} />
          </div>

          {/* Activity */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="text-[10px] font-mono font-semibold text-[#C4BFB8] uppercase tracking-[1.5px] mb-2.5 shrink-0">Activity</div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <p className="text-[12px] text-[#8E8E89] py-4 text-center">No recent activity</p>
              ) : (
                recentActivity.map((a, i) => (
                  <ActivityItem key={i} {...a} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <div className="flex items-center justify-between pt-3 border-t border-[#E8E2DB] shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-[3px]">
            {streakWeek.map((d, i) => (
              <StreakDay key={i} label={d.label} status={d.status} />
            ))}
          </div>
          <span className="text-[11px] text-[#8E8E89]">
            {streak > 0 ? <><strong className="text-[#1B1B18]">{streak}</strong> day streak</> : 'Start a streak!'}
          </span>
        </div>
        <span className="text-[12px] text-[#C4BFB8] font-heading italic">
          "{quote.text}"
        </span>
      </div>
    </div>
  )
}
