import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBoardStore } from '../store/boardStore'
import { useAuthStore } from '../store/authStore'
import { format, formatDistanceToNow, parseISO, subDays, startOfDay, isToday } from 'date-fns'
import { Plus, CheckCircle2 } from 'lucide-react'
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

/* ── Completion ring SVG ── */
function CompletionRing({ percent, color, size = 42 }) {
  const r = (size / 2) - 4
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E8E2DB" strokeWidth={3} />
      {percent > 0 && (
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      )}
    </svg>
  )
}

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

/* ── Focus card ── */
function FocusCard({ card, rank, isOverdue, boardName, onClick, onComplete }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3.5 bg-white border border-[#E0DBD5] rounded-[14px] mb-2 cursor-pointer hover:shadow-sm hover:border-[#C4BFB8] transition-all"
    >
      <span className="w-[22px] h-[22px] rounded-[7px] bg-[#1B1B18] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
        {rank}
      </span>
      <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${PRIORITY_DOT[card.priority] || PRIORITY_DOT.medium}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-[#1B1B18] truncate">{card.title}</div>
        <div className="text-[10px] text-[#8E8E89]">
          {boardName} · #GB-{card.global_task_number || card.task_number}
        </div>
      </div>
      <span className={`text-[9px] font-semibold px-[7px] py-[2px] rounded-[5px] shrink-0 ${
        isOverdue ? 'bg-[#F0E0D2] text-[#7A5C44]' : 'bg-[#EEF2D6] text-[#6B7A12]'
      }`}>
        {isOverdue
          ? `${Math.ceil((Date.now() - parseISO(card.due_date).getTime()) / 86400000)}d overdue`
          : 'due today'}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onComplete() }}
        className="w-[22px] h-[22px] rounded-full border-2 border-[#E0DBD5] flex items-center justify-center shrink-0 hover:border-[#A8BA32] hover:bg-[#EEF2D6] transition-all cursor-pointer group"
      >
        <span
          className="material-symbols-outlined text-[#A8BA32] opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ fontSize: '14px', lineHeight: '14px', fontVariationSettings: "'FILL' 1, 'wght' 500" }}
        >check</span>
      </button>
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#8E8E89] text-sm">
        Loading...
      </div>
    )
  }

  const tip = TIPS[getDailyIndex(TIPS)]
  const quote = QUOTES[getDailyIndex(QUOTES)]
  const totalFocus = focusCards.length
  const boardCount = Object.keys(boards).length

  return (
    <div className="max-w-[880px]">
      {/* ─── Masthead ─── */}
      <div className="mb-1">
        <div className="text-[11px] tracking-[2px] uppercase text-[#8E8E89] mb-2">
          {format(new Date(), 'EEEE, MMMM d, yyyy')} · Week {format(new Date(), 'I')}
        </div>
        <h1 className="text-[24px] sm:text-[30px] font-bold text-[#1B1B18] font-heading leading-tight">
          {getGreeting()}, <span className="text-[#A8BA32]">{displayName}</span>
        </h1>
        <p className="text-[15px] text-[#5C5C57] font-heading italic mt-0.5">
          Here's what your day looks like.
        </p>
      </div>

      {/* ─── Forecast strip ─── */}
      <div className="flex items-center flex-wrap gap-x-5 gap-y-1 py-2 mb-4">
        <div className="flex items-center gap-1.5 text-[13px]">
          <span className="material-symbols-outlined text-[18px] text-[#D4A843]"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}>sunny</span>
          <span><strong>{dueToday}</strong> due today</span>
        </div>
        <div className="w-px h-5 bg-[#E0DBD5]" />
        <div className="flex items-center gap-1.5 text-[13px]">
          <span className="material-symbols-outlined text-[18px] text-[#C27A4A]"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}>warning</span>
          <span><strong>{overdue}</strong> overdue</span>
        </div>
        <div className="w-px h-5 bg-[#E0DBD5]" />
        <div className="flex items-center gap-1.5 text-[13px]">
          <span className="material-symbols-outlined text-[18px] text-[#A8BA32]"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}>task_alt</span>
          <span><strong>{completedYesterday}</strong> completed yesterday</span>
        </div>
        <div className="w-px h-5 bg-[#E0DBD5]" />
        <div className="flex items-center gap-1.5 text-[13px]">
          <span className="material-symbols-outlined text-[18px] text-[#8E8E89]"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}>dashboard</span>
          <span><strong>{boardCount}</strong> boards</span>
        </div>
      </div>

      {/* ─── Streak ─── */}
      <div className="flex items-center gap-3 bg-[#FAF8F6] border border-[#E0DBD5] rounded-[14px] px-3.5 py-2.5 mb-4">
        <div className="flex gap-1">
          {streakWeek.map((d, i) => (
            <StreakDay key={i} label={d.label} status={d.status} />
          ))}
        </div>
        <div className="text-[12px] text-[#5C5C57]">
          {streak > 0 ? (
            <><strong className="text-[#1B1B18]">{streak}-day streak!</strong> Complete a task today to keep it going.</>
          ) : (
            <>Complete a task today to start a streak!</>
          )}
        </div>
      </div>

      {/* ─── Main grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        {/* LEFT COLUMN */}
        <div>
          {/* Focus Queue */}
          <div className="mb-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[1.5px] text-[#8E8E89] mb-3">
              <span className="material-symbols-outlined text-[16px] text-[#C27A4A]"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}>priority_high</span>
              Focus
              {totalFocus > 0 && (
                <span className="bg-[#E8E2DB] text-[#5C5C57] px-[7px] py-px rounded-full text-[10px] tracking-normal font-semibold">
                  {totalFocus}
                </span>
              )}
            </div>

            {totalFocus === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-[#8E8E89] text-[13px] border border-dashed border-[#E0DBD5] rounded-[14px]">
                <CheckCircle2 className="w-4 h-4 text-[#A8BA32]" />
                Nothing due today — you're all clear!
              </div>
            ) : (
              focusCards.map((card, i) => (
                <FocusCard
                  key={card.id}
                  card={card}
                  rank={i + 1}
                  isOverdue={overdueCards.includes(card)}
                  boardName={getBoardName(card.board_id)}
                  onClick={() => navigateToCard(card)}
                  onComplete={() => completeCard(card)}
                />
              ))
            )}
          </div>

          {/* Boards */}
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[1.5px] text-[#8E8E89] mb-3">
              <span className="material-symbols-outlined text-[16px] text-[#8E8E89]"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}>space_dashboard</span>
              Your Boards
            </div>

            {boardSummaries.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-[#8E8E89] text-sm mb-4">Create your first board to get started</p>
                <button
                  onClick={handleNewBoard}
                  disabled={creatingBoard}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B1B18] text-white text-sm font-medium rounded-lg hover:bg-[#333] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {creatingBoard ? 'Creating...' : 'New Board'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {boardSummaries.map((board) => {
                  const doneCol = board.columns.find((c) => c.title.toLowerCase() === 'done')
                  const doneCount = doneCol?.count || 0
                  const percent = board.totalCards > 0 ? Math.round((doneCount / board.totalCards) * 100) : 0
                  return (
                    <button
                      key={board.id}
                      onClick={() => { setActiveBoard(board.id); navigate('/boards') }}
                      className="flex items-center gap-3 bg-white border border-[#E0DBD5] rounded-[14px] px-4 py-3.5 text-left cursor-pointer hover:shadow-sm hover:border-[#C4BFB8] transition-all"
                    >
                      <div className="shrink-0">
                        <CompletionRing percent={percent} color={getRingColor(percent)} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-[#1B1B18] truncate flex items-center gap-1.5">
                          {board.icon && <DynamicIcon name={board.icon} className="w-3.5 h-3.5 text-[#5C5C57]" />}
                          {board.name}
                        </div>
                        <div className="text-[10px] text-[#8E8E89]">
                          {doneCount}/{board.totalCards} · {percent}%
                          {percent === 100 && ' ✓'}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-3">
          {/* Activity */}
          <div className="bg-[#FAF8F6] border border-[#E0DBD5] rounded-2xl p-3.5 lg:sticky lg:top-6">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[1.5px] text-[#8E8E89] mb-3.5">
              <span className="material-symbols-outlined text-[16px] text-[#8E8E89]"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}>history</span>
              Activity
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-[12px] text-[#8E8E89] py-4 text-center">No recent activity</p>
            ) : (
              recentActivity.map((a, i) => (
                <ActivityItem key={i} {...a} />
              ))
            )}
          </div>

          {/* Tip of the day */}
          <div className="bg-white border border-[#E0DBD5] rounded-[14px] p-4">
            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[1.5px] text-[#D4A843] mb-2">
              <span className="material-symbols-outlined text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}>lightbulb</span>
              Tip of the day
            </div>
            <p className="text-[13px] text-[#5C5C57] leading-relaxed font-heading italic">
              "{tip}"
            </p>
          </div>
        </div>
      </div>

      {/* ─── Quote footer ─── */}
      <div className="text-center mt-6 pt-4 border-t border-[#E8E2DB]">
        <blockquote className="text-[14px] text-[#8E8E89] font-heading italic max-w-md mx-auto mb-1">
          "{quote.text}"
        </blockquote>
        <cite className="text-[11px] text-[#C4BFB8] not-italic">— {quote.author}</cite>
      </div>
    </div>
  )
}
