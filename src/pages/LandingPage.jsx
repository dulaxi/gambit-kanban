import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import '@fontsource-variable/plus-jakarta-sans'
import {
  ArrowRight, Columns3, Users, Zap, Calendar, StickyNote,
  Share2, BarChart3, GripVertical, Tag, CheckSquare, Clock,
  Shield, Sparkles, MousePointerClick, ArrowUpRight,
  Check, Square, AlignLeft, User, Plus, FileText, CheckCircle2,
  LayoutDashboard, Settings, ChevronsRight, SquareKanban, Kanban as LucideKanban,
} from 'lucide-react'
import { Kanban } from '@phosphor-icons/react'
import {
  DndContext, DragOverlay, pointerWithin, rectIntersection,
  PointerSensor, useSensor, useSensors, useDroppable,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import SortableCard from '../components/board/SortableCard'
import Card from '../components/board/Card'
import { useAuthStore } from '../store/authStore'

/* ── Mock board data for hero preview ── */
const mockColumns = [
  {
    title: 'To Do',
    color: '#E8E2DB',
    cards: [
      {
        title: 'Design system tokens',
        desc: 'Define color, spacing, and typography tokens for the component library',
        labels: [{ text: 'Design', bg: 'bg-[#E8DDE2]', fg: 'text-[#6E5A65]' }],
        priority: 'high',
        id: 1,
      },
      {
        title: 'Set up CI pipeline',
        labels: [{ text: 'DevOps', bg: 'bg-[#DAE0F0]', fg: 'text-[#4A5578]' }],
        priority: 'medium',
        dueDate: 'Mar 8',
        id: 2,
      },
      {
        title: 'Write onboarding docs',
        labels: [{ text: 'Docs', bg: 'bg-[#F5EDCF]', fg: 'text-[#8B7322]' }],
        checklist: { done: 1, total: 5 },
        id: 3,
      },
    ],
  },
  {
    title: 'In Progress',
    color: '#DAE0F0',
    cards: [
      {
        title: 'Auth flow redesign',
        desc: 'Migrate from session-based to JWT tokens with refresh flow',
        labels: [{ text: 'Feature', bg: 'bg-[#EEF2D6]', fg: 'text-[#6B7A12]' }],
        priority: 'high',
        assignee: 'A',
        checklist: { done: 3, total: 6 },
        id: 4,
      },
      {
        title: 'API rate limiting',
        labels: [{ text: 'Backend', bg: 'bg-[#F2D9C7]', fg: 'text-[#8B5A33]' }],
        priority: 'medium',
        assignee: 'M',
        dueDate: 'Mar 5',
        id: 5,
      },
    ],
  },
  {
    title: 'Review',
    color: '#F5EDCF',
    cards: [
      {
        title: 'Landing page copy',
        desc: 'Final copy review for hero section and feature descriptions',
        labels: [{ text: 'Content', bg: 'bg-[#E8DDE2]', fg: 'text-[#6E5A65]' }],
        assignee: 'S',
        checklist: { done: 4, total: 4 },
        id: 6,
      },
      {
        title: 'Mobile nav polish',
        labels: [{ text: 'UI', bg: 'bg-[#E8DDE2]', fg: 'text-[#6E5A65]' }],
        priority: 'low',
        assignee: 'J',
        dueDate: 'Mar 10',
        id: 7,
      },
    ],
  },
  {
    title: 'Done',
    color: '#EEF2D6',
    cards: [
      {
        title: 'User signup flow',
        labels: [{ text: 'Feature', bg: 'bg-[#EEF2D6]', fg: 'text-[#6B7A12]' }],
        assignee: 'A',
        id: 8,
        done: true,
      },
      {
        title: 'Database schema v2',
        labels: [{ text: 'Backend', bg: 'bg-[#F2D9C7]', fg: 'text-[#8B5A33]' }],
        assignee: 'M',
        id: 9,
        done: true,
        checklist: { done: 8, total: 8 },
      },
    ],
  },
]

/* ── Mock card detail panel data ── */
const mockDetailCard = {
  title: 'Auth flow redesign',
  taskNumber: 'GB-24',
  desc: 'Migrate the authentication system from session-based cookies to JWT tokens with a refresh token rotation strategy. This includes updating all protected API endpoints and the client-side token management.',
  labels: [
    { text: 'Feature', bg: 'bg-[#EEF2D6]', fg: 'text-[#6B7A12]' },
    { text: 'Backend', bg: 'bg-[#F2D9C7]', fg: 'text-[#8B5A33]' },
  ],
  priority: 'high',
  assignee: { name: 'Alex Chen', initial: 'A' },
  dueDate: 'Mar 12, 2026',
  checklist: [
    { text: 'Research JWT libraries', done: true },
    { text: 'Design token refresh flow', done: true },
    { text: 'Implement auth middleware', done: true },
    { text: 'Update protected routes', done: false },
    { text: 'Add token rotation', done: false },
    { text: 'Write integration tests', done: false },
  ],
}

const stats = [
  { value: '10x', label: 'Faster planning' },
  { value: '100%', label: 'Real-time sync' },
  { value: '0', label: 'Config needed' },
  { value: '∞', label: 'Boards & cards' },
]

const features = [
  {
    icon: Columns3,
    title: 'Kanban Boards',
    desc: 'Organize work into columns that match your workflow. Drag cards between stages with buttery-smooth interactions.',
  },
  {
    icon: Users,
    title: 'Real-Time Collaboration',
    desc: 'Share boards with your team. Every change syncs instantly across all connected users — no refresh needed.',
  },
  {
    icon: Zap,
    title: 'Smart Organization',
    desc: 'Priorities, color-coded labels, checklists, and due dates. Everything you need to stay on top of your work.',
  },
  {
    icon: Shield,
    title: 'Secure by Default',
    desc: 'Row-level security on every table. Your data is private to your team with zero configuration.',
  },
  {
    icon: MousePointerClick,
    title: 'Drag & Drop Everything',
    desc: 'Reorder cards, move between columns, rearrange your entire board — all with natural drag interactions.',
  },
  {
    icon: Sparkles,
    title: 'Clean Interface',
    desc: 'No bloat, no clutter. A focused workspace that gets out of your way so you can focus on shipping.',
  },
]

const tools = [
  { icon: Calendar, title: 'Calendar', desc: 'Timeline view for all tasks' },
  { icon: StickyNote, title: 'Notes', desc: 'Capture ideas and context' },
  { icon: Share2, title: 'Sharing', desc: 'One-click team invites' },
  { icon: Tag, title: 'Labels', desc: 'Color-coded categorization' },
  { icon: CheckSquare, title: 'Checklists', desc: 'Subtask tracking' },
  { icon: BarChart3, title: 'Dashboard', desc: 'Progress at a glance' },
  { icon: GripVertical, title: 'Drag & Drop', desc: 'Fluid card management' },
  { icon: Clock, title: 'Due Dates', desc: 'Never miss a deadline' },
]

/* ── Priority dot ── */
function PriorityDot({ priority }) {
  if (!priority) return null
  const colors = { high: 'bg-[#C27A4A]', medium: 'bg-[#D4A843]', low: 'bg-[#A8BA32]' }
  return <span className={`w-1.5 h-1.5 rounded-full ${colors[priority]}`} />
}

/* ── Mock card component (enriched) ── */
function MockCard({ card }) {
  return (
    <div className="bg-white rounded-lg p-2.5 shadow-sm border border-[#E8E2DB] hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-2">
        <p className={`text-[11px] font-medium leading-snug ${card.done ? 'text-[#8E8E89] line-through' : 'text-[#1B1B18]'}`}>
          {card.title}
        </p>
        <PriorityDot priority={card.priority} />
      </div>
      {card.desc && (
        <p className="text-[9px] text-[#8E8E89] leading-snug mt-1 line-clamp-1">{card.desc}</p>
      )}
      <div className="flex items-center justify-between mt-2 gap-2">
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          {card.labels?.map((l) => (
            <span key={l.text} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${l.bg} ${l.fg}`}>
              {l.text}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {card.dueDate && (
            <span className="text-[8px] text-[#8E8E89] font-medium flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {card.dueDate}
            </span>
          )}
          {card.assignee && (
            <span className="w-5 h-5 rounded-full bg-[#1B1B18] text-white text-[9px] font-bold flex items-center justify-center">
              {card.assignee}
            </span>
          )}
        </div>
      </div>
      {card.checklist && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex-1 h-1 bg-[#E8E2DB] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${card.checklist.done === card.checklist.total ? 'bg-[#A8BA32]' : 'bg-[#A8BA32]'}`}
              style={{ width: `${(card.checklist.done / card.checklist.total) * 100}%` }}
            />
          </div>
          <span className={`text-[8px] font-semibold ${card.checklist.done === card.checklist.total ? 'text-[#A8BA32]' : 'text-[#8E8E89]'}`}>
            {card.checklist.done}/{card.checklist.total}
          </span>
        </div>
      )}
    </div>
  )
}

/* ── Mock column component ── */
function MockColumn({ column }) {
  return (
    <div className="min-w-[195px] flex-1">
      <div className="flex items-center gap-2 mb-2.5 px-1">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color }} />
        <span className="text-[11px] font-bold text-[#5C5C57] uppercase tracking-wider">{column.title}</span>
        <span className="text-[10px] text-[#8E8E89] font-medium ml-auto">{column.cards.length}</span>
      </div>
      <div className="space-y-2">
        {column.cards.map((card) => (
          <MockCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  )
}

/* ── Mock card detail panel ── */
function MockDetailPanel() {
  const card = mockDetailCard
  const checkDone = card.checklist.filter((c) => c.done).length
  return (
    <div className="rounded-2xl border border-[#E0DBD5]/80 bg-white shadow-2xl shadow-[#E0DBD5]/60 overflow-hidden w-full max-w-sm">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-[#E8E2DB]">
        <div className="text-[10px] text-[#8E8E89] font-medium mb-1">{card.taskNumber}</div>
        <h3 className="text-sm font-bold text-[#1B1B18] leading-snug" style={{ fontFamily: 'var(--font-logo)' }}>{card.title}</h3>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Meta row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[9px] text-[#8E8E89] font-medium uppercase tracking-wider mb-1">Assignee</div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#1B1B18] text-white text-[9px] font-bold flex items-center justify-center">{card.assignee.initial}</span>
              <span className="text-[11px] text-[#5C5C57] font-medium">{card.assignee.name}</span>
            </div>
          </div>
          <div>
            <div className="text-[9px] text-[#8E8E89] font-medium uppercase tracking-wider mb-1">Due Date</div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#8E8E89]" />
              <span className="text-[11px] text-[#5C5C57] font-medium">{card.dueDate}</span>
            </div>
          </div>
          <div>
            <div className="text-[9px] text-[#8E8E89] font-medium uppercase tracking-wider mb-1">Priority</div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#C27A4A]" />
              <span className="text-[11px] text-[#5C5C57] font-medium capitalize">{card.priority}</span>
            </div>
          </div>
          <div>
            <div className="text-[9px] text-[#8E8E89] font-medium uppercase tracking-wider mb-1">Labels</div>
            <div className="flex items-center gap-1">
              {card.labels.map((l) => (
                <span key={l.text} className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${l.bg} ${l.fg}`}>
                  {l.text}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlignLeft className="w-3 h-3 text-[#8E8E89]" />
            <span className="text-[9px] text-[#8E8E89] font-medium uppercase tracking-wider">Description</span>
          </div>
          <p className="text-[11px] text-[#5C5C57] leading-relaxed">{card.desc}</p>
        </div>

        {/* Checklist */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <CheckSquare className="w-3 h-3 text-[#8E8E89]" />
              <span className="text-[9px] text-[#8E8E89] font-medium uppercase tracking-wider">Checklist</span>
            </div>
            <span className="text-[9px] font-semibold text-[#5C5C57]">{checkDone}/{card.checklist.length}</span>
          </div>
          <div className="h-1 bg-[#E8E2DB] rounded-full overflow-hidden mb-2.5">
            <div
              className="h-full bg-[#A8BA32] rounded-full"
              style={{ width: `${(checkDone / card.checklist.length) * 100}%` }}
            />
          </div>
          <div className="space-y-1">
            {card.checklist.map((item) => (
              <div key={item.text} className="flex items-center gap-2 py-0.5">
                {item.done ? (
                  <div className="w-3.5 h-3.5 rounded bg-[#A8BA32] flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                ) : (
                  <Square className="w-3.5 h-3.5 text-[#8E8E89] shrink-0" />
                )}
                <span className={`text-[11px] ${item.done ? 'text-[#8E8E89] line-through' : 'text-[#5C5C57]'}`}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Realistic app demo: card creation + detail panel flow ── */
const APP_DEMO_TITLE = 'Auth flow redesign'
const APP_DEMO_DESCRIPTION = 'Migrate the auth system from session cookies to JWT tokens with refresh rotation.'
const APP_DEMO_CHECKLIST = [
  'Research JWT libraries',
  'Design token refresh flow',
  'Implement auth middleware',
  'Update protected routes',
  'Add token rotation',
  'Write integration tests',
]

// Animation timeline — milliseconds from loop start
const APP_T = {
  // Phase 1: cursor enters scene from offscreen
  CURSOR_TO_ADD: 700,
  CURSOR_AT_ADD: 1100,
  // Phase 2: click → editor opens
  CLICK_ADD: 1100,
  EDITOR_OPEN: 1250,
  // Phase 3: title types into editor
  TITLE_START: 1500,
  TITLE_END: 3300,
  // Phase 4: enter pressed → card created (editor → real card)
  CARD_CREATED: 3600,
  // Phase 5: cursor moves to card
  CURSOR_TO_CARD: 4100,
  CURSOR_AT_CARD: 4500,
  // Phase 6: click → panel opens
  CLICK_CARD: 4500,
  PANEL_OPEN: 4650,
  PANEL_OPEN_END: 5250,
  // Phase 7: priority cycles low → medium → high
  PRIORITY_LOW: 5500,
  PRIORITY_MEDIUM: 5750,
  PRIORITY_HIGH: 6000,
  // Phase 8: labels appear
  LABEL_1: 6200,
  LABEL_2: 6400,
  // Phase 9: assignee + due date
  ASSIGNEE: 6600,
  DUE_DATE: 6800,
  // Phase 10: description types into panel textarea
  DESC_START: 7100,
  DESC_END: 9300,
  // Phase 11: checklist items cascade in
  CHECK_VISIBLE_START: 9600,
  CHECK_VISIBLE_GAP: 180,
  // Phase 12: items get auto-checked
  CHECK_DONE_START: 11000,
  CHECK_DONE_GAP: 280,
  // Phase 13: hold complete state, then loop
  TOTAL: 14500,
}

const APP_PRIORITY_DOT = { high: 'bg-[#C27A4A]', medium: 'bg-[#D4A843]', low: 'bg-[#A8BA32]' }

/* Mock visual replica of the real Card component (simplified for landing) */
function MockRealCard({ title, priority, showLabel1, showLabel2, checkedCount, totalCount, isHighlighted }) {
  const dotColor = priority ? APP_PRIORITY_DOT[priority] : 'bg-[#E0DBD5]'
  return (
    <div
      className={`w-full rounded-xl border shadow-sm text-left flex transition-all ${
        isHighlighted ? 'bg-[#EEF2D6]/60 border-[#EEF2D6]' : 'bg-white border-[#E0DBD5]'
      }`}
    >
      {/* Icon — left center */}
      <div className="flex items-center pl-3 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-[#E8E2DB] flex items-center justify-center text-[#8E8E89]">
          <FileText className="w-4 h-4" />
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0 pl-2.5 pr-3.5 py-3">
        {/* Labels */}
        {(showLabel1 || showLabel2) && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {showLabel1 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#D1FDE0] text-[#08872B]">Feature</span>
            )}
            {showLabel2 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FFE0DB] text-[#CF222E]">Backend</span>
            )}
          </div>
        )}
        {/* Task # row */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <CheckCircle2 className="w-4 h-4 text-[#8E8E89] shrink-0" />
          <span className="text-[11px] font-medium text-[#5C5C57]">Task #24</span>
          <span className={`w-2 h-2 rounded-full ${dotColor} transition-colors`} />
        </div>
        {/* Title */}
        <p className="text-[13px] font-medium leading-snug text-[#1B1B18]">{title}</p>
        {/* Bottom badges */}
        {totalCount > 0 && (
          <div className="flex items-center gap-1.5 mt-2.5">
            <span className="text-[10px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8E2DB] text-[#8E8E89]">
              <CheckSquare className="w-3 h-3" />
              {checkedCount}/{totalCount}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/* Mock inline editor — matches the real InlineCardEditor visual (simplified) */
function MockInlineEditor({ typedTitle, isTyping }) {
  return (
    <div className="rounded-xl border border-[#C2D64A] bg-white shadow-md p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#E8E2DB] flex items-center justify-center text-[#8E8E89]">
          <FileText className="w-4 h-4" />
        </div>
        <span className="text-[11px] text-[#8E8E89] font-medium">Task #24</span>
      </div>
      <div className="text-[13px] font-medium text-[#1B1B18] min-h-[20px]">
        {typedTitle || <span className="text-[#8E8E89]">Task name</span>}
        {isTyping && <span className="inline-block w-[1.5px] h-[12px] bg-[#1B1B18] ml-px align-middle animate-pulse" />}
      </div>
      <div className="flex items-center gap-1.5 pt-1 border-t border-[#E8E2DB]">
        <span className="text-[10px] text-[#8E8E89] flex items-center gap-1">
          <User className="w-3 h-3" /> Assignee
        </span>
        <span className="text-[10px] text-[#8E8E89] flex items-center gap-1">
          <Calendar className="w-3 h-3" /> Date
        </span>
      </div>
    </div>
  )
}

/* Animated cursor SVG */
function AnimatedCursor({ x, y, visible, clicking }) {
  return (
    <div
      className={`absolute z-30 pointer-events-none transition-all ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transitionDuration: '700ms',
        transitionProperty: 'left, top, opacity',
      }}
    >
      <svg width="22" height="22" viewBox="0 0 20 20" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }}>
        <path d="M3 2L17 11L10 12L7 19L3 2Z" fill="#1B1B18" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      {clicking && (
        <span className="absolute -top-2 -left-2 w-9 h-9 rounded-full bg-[#A8BA32] opacity-40 animate-ping" />
      )}
    </div>
  )
}

function AppDemoFlow() {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((prev) => (prev + 30 >= APP_T.TOTAL ? 0 : prev + 30))
    }, 30)
    return () => clearInterval(id)
  }, [])

  // Phase booleans
  const editorOpen = elapsed >= APP_T.EDITOR_OPEN && elapsed < APP_T.CARD_CREATED
  const cardExists = elapsed >= APP_T.CARD_CREATED
  const panelOpen = elapsed >= APP_T.PANEL_OPEN
  const cardHighlighted = panelOpen

  // Title typing
  const titleCharsShown = elapsed < APP_T.TITLE_START
    ? 0
    : elapsed >= APP_T.TITLE_END
      ? APP_DEMO_TITLE.length
      : Math.floor(((elapsed - APP_T.TITLE_START) / (APP_T.TITLE_END - APP_T.TITLE_START)) * APP_DEMO_TITLE.length)
  const typedTitle = APP_DEMO_TITLE.slice(0, titleCharsShown)
  const isTypingTitle = titleCharsShown > 0 && titleCharsShown < APP_DEMO_TITLE.length

  // Description typing (only after panel opens)
  const descCharsShown = elapsed < APP_T.DESC_START
    ? 0
    : elapsed >= APP_T.DESC_END
      ? APP_DEMO_DESCRIPTION.length
      : Math.floor(((elapsed - APP_T.DESC_START) / (APP_T.DESC_END - APP_T.DESC_START)) * APP_DEMO_DESCRIPTION.length)
  const typedDesc = APP_DEMO_DESCRIPTION.slice(0, descCharsShown)
  const isTypingDesc = descCharsShown > 0 && descCharsShown < APP_DEMO_DESCRIPTION.length

  // Priority cycles low → medium → high
  const priority =
    elapsed < APP_T.PRIORITY_LOW ? null
    : elapsed < APP_T.PRIORITY_MEDIUM ? 'low'
    : elapsed < APP_T.PRIORITY_HIGH ? 'medium'
    : 'high'

  const showLabel1 = elapsed >= APP_T.LABEL_1
  const showLabel2 = elapsed >= APP_T.LABEL_2
  const showAssignee = elapsed >= APP_T.ASSIGNEE
  const showDueDate = elapsed >= APP_T.DUE_DATE

  // Checklist visibility cascade
  const checkVisible = elapsed < APP_T.CHECK_VISIBLE_START
    ? 0
    : Math.min(APP_DEMO_CHECKLIST.length, Math.floor((elapsed - APP_T.CHECK_VISIBLE_START) / APP_T.CHECK_VISIBLE_GAP) + 1)
  const checkedCount = elapsed < APP_T.CHECK_DONE_START
    ? 0
    : Math.min(3, Math.floor((elapsed - APP_T.CHECK_DONE_START) / APP_T.CHECK_DONE_GAP) + 1)

  // Cursor position (in pixels relative to demo body top-left)
  let cursorX, cursorY, cursorVisible
  if (elapsed < APP_T.CURSOR_TO_ADD) {
    cursorX = -40; cursorY = 200; cursorVisible = false
  } else if (elapsed < APP_T.EDITOR_OPEN + 100) {
    cursorX = 90; cursorY = 280; cursorVisible = true // at "Add task"
  } else if (elapsed < APP_T.CURSOR_TO_CARD) {
    cursorX = 90; cursorY = 280; cursorVisible = false // hidden while typing
  } else if (elapsed < APP_T.PANEL_OPEN + 100) {
    cursorX = 130; cursorY = 110; cursorVisible = true // moved up to the new card
  } else {
    cursorX = 130; cursorY = 110; cursorVisible = false // hidden after panel opens
  }

  // Click pulse on cursor
  const clickingAdd = elapsed >= APP_T.CLICK_ADD - 80 && elapsed < APP_T.EDITOR_OPEN + 200
  const clickingCard = elapsed >= APP_T.CLICK_CARD - 80 && elapsed < APP_T.PANEL_OPEN + 200
  const isClicking = clickingAdd || clickingCard

  return (
    <div className="w-full max-w-4xl">
      <div className="relative rounded-2xl border border-[#E0DBD5]/80 bg-[#FAF8F6] shadow-2xl shadow-[#E0DBD5]/60 overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F2EDE8] border-b border-[#E8E2DB]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <span className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-4 py-1 rounded-md bg-white border border-[#E0DBD5] text-[10px] text-[#8E8E89] font-medium">
              kolumn.app/boards/product-launch
            </div>
          </div>
          <div className="w-12" />
        </div>

        {/* Board area */}
        <div className="relative flex font-sans" style={{ minHeight: '500px' }}>
          {/* Column on the left */}
          <div className="w-72 p-4 shrink-0">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C2D64A]" />
                <span className="text-xs font-bold text-[#5C5C57] uppercase tracking-wider">In Progress</span>
              </div>
              <span className="text-xs text-[#8E8E89]">{cardExists ? 1 : 0}</span>
            </div>

            <div className="space-y-2">
              {/* Inline editor (active during create flow) */}
              {editorOpen && <MockInlineEditor typedTitle={typedTitle} isTyping={isTypingTitle} />}

              {/* Real card (after creation) */}
              {cardExists && (
                <MockRealCard
                  title={APP_DEMO_TITLE}
                  priority={priority}
                  showLabel1={showLabel1}
                  showLabel2={showLabel2}
                  checkedCount={checkedCount}
                  totalCount={panelOpen ? APP_DEMO_CHECKLIST.length : 0}
                  isHighlighted={cardHighlighted}
                />
              )}

              {/* Add task button (hidden when editor is open) */}
              {!editorOpen && (
                <div
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors ${
                    elapsed >= APP_T.CURSOR_AT_ADD - 100 && elapsed < APP_T.EDITOR_OPEN
                      ? 'bg-[#EEF2D6] text-[#1B1B18]'
                      : 'text-[#8E8E89]'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add task
                </div>
              )}
            </div>
          </div>

          {/* Detail panel — slides in from the right when panelOpen */}
          <div
            className={`absolute top-0 bottom-0 right-0 bg-white border-l border-[#E0DBD5] transform transition-transform duration-500 ease-out ${
              panelOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{ width: '420px' }}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#E8E2DB]">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#5C5C57]" />
                <span className="text-xs font-medium text-[#5C5C57]">Save</span>
              </div>
              <span className="text-[#8E8E89] text-xs">×</span>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4 overflow-hidden">
              {/* Task # + title */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-[#8E8E89]" />
                  <span className="text-[11px] font-medium text-[#5C5C57]">Task #24</span>
                </div>
                <div className="text-base font-semibold text-[#1B1B18]" style={{ fontFamily: 'var(--font-logo)' }}>
                  {APP_DEMO_TITLE}
                </div>
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[#E8E2DB]">
                <div>
                  <div className="text-[9px] text-[#8E8E89] font-medium uppercase tracking-wider mb-1">Assignee</div>
                  <div className={`flex items-center gap-1.5 transition-all duration-500 ${showAssignee ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}>
                    <span className="w-5 h-5 rounded-full bg-[#1B1B18] text-white text-[9px] font-bold flex items-center justify-center">A</span>
                    <span className="text-[11px] text-[#5C5C57] font-medium">Alex Chen</span>
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-[#8E8E89] font-medium uppercase tracking-wider mb-1">Due Date</div>
                  <div className={`flex items-center gap-1 transition-all duration-500 ${showDueDate ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}>
                    <Calendar className="w-3 h-3 text-[#8E8E89]" />
                    <span className="text-[11px] text-[#5C5C57] font-medium">Mar 12, 2026</span>
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-[#8E8E89] font-medium uppercase tracking-wider mb-1">Priority</div>
                  <div className={`flex items-center gap-1.5 transition-opacity duration-300 ${priority ? 'opacity-100' : 'opacity-0'}`}>
                    <span className={`w-2 h-2 rounded-full transition-colors duration-300 ${priority ? APP_PRIORITY_DOT[priority] : 'bg-transparent'}`} />
                    <span className="text-[11px] text-[#5C5C57] font-medium capitalize">{priority || '—'}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-[#8E8E89] font-medium uppercase tracking-wider mb-1">Labels</div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-[#D1FDE0] text-[#08872B] transition-all duration-300 ${showLabel1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                      Feature
                    </span>
                    <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-[#FFE0DB] text-[#CF222E] transition-all duration-300 ${showLabel2 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                      Backend
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="text-[9px] text-[#8E8E89] font-medium uppercase tracking-wider mb-1.5">Description</div>
                <div className="text-[11px] text-[#5C5C57] leading-relaxed min-h-[40px] rounded-lg border border-[#E0DBD5] px-3 py-2">
                  {typedDesc || <span className="text-[#8E8E89]">Add details about this task...</span>}
                  {isTypingDesc && <span className="inline-block w-[1.5px] h-[10px] bg-[#5C5C57] ml-px align-middle animate-pulse" />}
                </div>
              </div>

              {/* Checklist */}
              <div className={`transition-opacity duration-300 ${checkVisible > 0 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[9px] text-[#8E8E89] font-medium uppercase tracking-wider">Checklist</div>
                  <span className="text-[9px] font-semibold text-[#5C5C57]">{checkedCount}/{APP_DEMO_CHECKLIST.length}</span>
                </div>
                <div className="h-1 bg-[#E8E2DB] rounded-full overflow-hidden mb-2.5">
                  <div
                    className="h-full bg-[#A8BA32] rounded-full transition-all duration-500"
                    style={{ width: `${(checkedCount / APP_DEMO_CHECKLIST.length) * 100}%` }}
                  />
                </div>
                <div className="space-y-1">
                  {APP_DEMO_CHECKLIST.map((item, idx) => {
                    const isChecked = idx < checkedCount
                    const isVisible = idx < checkVisible
                    return (
                      <div
                        key={item}
                        className={`flex items-center gap-2 py-0.5 transition-all duration-300 ${
                          isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                        }`}
                      >
                        {isChecked ? (
                          <div className="w-3.5 h-3.5 rounded bg-[#A8BA32] flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                          </div>
                        ) : (
                          <Square className="w-3.5 h-3.5 text-[#8E8E89] shrink-0" />
                        )}
                        <span className={`text-[11px] ${isChecked ? 'text-[#8E8E89] line-through' : 'text-[#5C5C57]'}`}>
                          {item}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Animated cursor (overlay) */}
          <AnimatedCursor x={cursorX} y={cursorY} visible={cursorVisible} clicking={isClicking} />
        </div>
      </div>
    </div>
  )
}


/* ── Demo board data ── */
const DEMO_COLUMNS = [
  { id: 'demo-col-1', title: 'To Do', position: 0 },
  { id: 'demo-col-2', title: 'In Progress', position: 1 },
]

const DEMO_CARDS_INIT = [
  {
    id: 'demo-1', title: 'Design system tokens', description: 'Define color, spacing, and typography tokens for the component library',
    column_id: 'demo-col-1', position: 0, priority: 'high', task_number: 1, completed: false,
    labels: [{ text: 'Design', color: 'purple' }], checklist: null, due_date: null, assignee_name: null, icon: null, board_id: 'demo', archived: false,
  },
  {
    id: 'demo-2', title: 'Set up CI pipeline', description: '',
    column_id: 'demo-col-1', position: 1, priority: 'medium', task_number: 2, completed: false,
    labels: [{ text: 'DevOps', color: 'blue' }], checklist: null, due_date: '2026-04-10', assignee_name: 'Marcus', icon: null, board_id: 'demo', archived: false,
  },
  {
    id: 'demo-3', title: 'Write onboarding docs', description: '',
    column_id: 'demo-col-1', position: 2, priority: 'low', task_number: 3, completed: false,
    labels: [{ text: 'Docs', color: 'yellow' }], checklist: [{ text: 'Intro guide', done: true }, { text: 'API reference', done: false }, { text: 'Tutorials', done: false }], due_date: null, assignee_name: null, icon: null, board_id: 'demo', archived: false,
  },
  {
    id: 'demo-4', title: 'Auth flow redesign', description: 'Migrate from session-based to JWT tokens with refresh flow',
    column_id: 'demo-col-2', position: 0, priority: 'high', task_number: 4, completed: false,
    labels: [{ text: 'Feature', color: 'green' }], checklist: [{ text: 'JWT setup', done: true }, { text: 'Refresh flow', done: true }, { text: 'Session migration', done: false }], due_date: null, assignee_name: 'Aisha', icon: null, board_id: 'demo', archived: false,
  },
  {
    id: 'demo-5', title: 'API rate limiting', description: '',
    column_id: 'demo-col-2', position: 1, priority: 'medium', task_number: 5, completed: false,
    labels: [{ text: 'Backend', color: 'red' }], checklist: null, due_date: '2026-04-08', assignee_name: 'Marcus', icon: null, board_id: 'demo', archived: false,
  },
]

function DemoBoard() {
  const [cards, setCards] = useState(DEMO_CARDS_INIT)
  const [activeCardId, setActiveCardId] = useState(null)
  const cardsRef = useRef(cards)
  cardsRef.current = cards

  const sensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  const sensors = useSensors(sensor)

  const getColumnCards = useCallback((colId) =>
    cards.filter((c) => c.column_id === colId).sort((a, b) => a.position - b.position),
  [cards])

  const collisionDetection = useCallback((args) => {
    const p = pointerWithin(args)
    return p.length > 0 ? p : rectIntersection(args)
  }, [])

  const findTargetColumn = useCallback((overId) => {
    if (DEMO_COLUMNS.find((col) => col.id === overId)) return overId
    const overCard = cardsRef.current.find((c) => c.id === overId)
    return overCard?.column_id || null
  }, [])

  const handleDragStart = useCallback((event) => {
    setActiveCardId(event.active.id)
  }, [])

  const handleDragOver = useCallback((event) => {
    const { active, over } = event
    if (!over) return

    const overColId = findTargetColumn(over.id)
    if (!overColId) return

    setCards((prev) => {
      const activeCard = prev.find((c) => c.id === active.id)
      if (!activeCard || activeCard.column_id === overColId) return prev

      const fromCards = prev.filter((c) => c.column_id === activeCard.column_id && c.id !== active.id)
      const toCards = prev.filter((c) => c.column_id === overColId)
      const overIndex = toCards.findIndex((c) => c.id === over.id)
      const insertAt = overIndex >= 0 ? overIndex : toCards.length
      toCards.splice(insertAt, 0, { ...activeCard, column_id: overColId })

      const updated = {}
      fromCards.forEach((c, i) => { updated[c.id] = { ...c, position: i } })
      toCards.forEach((c, i) => { updated[c.id] = { ...c, position: i } })

      return prev.map((c) => updated[c.id] || c)
    })
  }, [findTargetColumn])

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    setActiveCardId(null)
    if (!over) return

    const overColId = findTargetColumn(over.id)
    if (!overColId) return

    setCards((prev) => {
      const activeCard = prev.find((c) => c.id === active.id)
      if (!activeCard) return prev

      const targetColId = activeCard.column_id === overColId ? overColId : overColId

      const colCards = prev
        .filter((c) => c.column_id === targetColId && c.id !== active.id)
        .sort((a, b) => a.position - b.position)

      const overIndex = colCards.findIndex((c) => c.id === over.id)
      const insertIndex = overIndex >= 0 ? overIndex : colCards.length
      colCards.splice(insertIndex, 0, { ...activeCard, column_id: targetColId })

      const updatedIds = new Set(colCards.map((c) => c.id))
      return [
        ...prev.filter((c) => !updatedIds.has(c.id)),
        ...colCards.map((c, i) => ({ ...c, position: i })),
      ]
    })
  }, [findTargetColumn])

  const activeCard = activeCardId ? cards.find((c) => c.id === activeCardId) : null

  function DroppableColumn({ col, colCards }) {
    const { setNodeRef } = useDroppable({ id: col.id })
    return (
      <div ref={setNodeRef} className="flex-1 min-w-0 flex flex-col h-full">
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-sm font-semibold text-[#1B1B18] font-logo">{col.title}</span>
          <span className="text-xs text-[#8E8E89]">{colCards.length}</span>
        </div>
        <SortableContext items={colCards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2 flex-1 rounded-xl p-1">
            {colCards.map((card) => (
              <SortableCard key={card.id} card={card} onClick={() => {}} onComplete={() => {}} isSelected={false} />
            ))}
          </div>
        </SortableContext>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 h-full">
        {DEMO_COLUMNS.map((col) => (
          <DroppableColumn key={col.id} col={col} colCards={getColumnCards(col.id)} />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeCard && <Card card={activeCard} onClick={() => {}} onComplete={() => {}} isSelected={false} />}
      </DragOverlay>
    </DndContext>
  )
}

function HeroAuthCard() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState('email') // 'email' | 'signup' | 'signin'
  const signUp = useAuthStore((s) => s.signUp)
  const signIn = useAuthStore((s) => s.signIn)
  const navigate = useNavigate()

  const handleEmailContinue = (e) => {
    e.preventDefault()
    if (!email) return
    setMode('signup')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        if (password.length < 6) { setError('Password must be at least 6 characters'); setSubmitting(false); return }
        await signUp(email, password, name || email.split('@')[0])
      } else {
        await signIn(email, password)
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (mode === 'signup' && err.message?.includes('already')) {
        setMode('signin')
        setError('Account exists — enter your password to sign in')
      } else {
        setError(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-sm">
      <div className="bg-white border border-[#E0DBD5] rounded-2xl p-5 shadow-[0_4px_24px_0_rgba(0,0,0,0.04),0_2px_64px_0_rgba(0,0,0,0.02)] space-y-4">
        {error && (
          <div className="text-sm text-[#7A5C44] bg-[#F0E0D2] rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        {mode === 'email' ? (
          <form onSubmit={handleEmailContinue} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full text-sm rounded-[0.6rem] px-3 py-2.5 border border-[#E0DBD5] hover:border-[#C2D64A]/50 focus:border-[#C2D64A] focus:outline-none focus:ring-1 focus:ring-[#EEF2D6] transition-colors"
            />
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1B1B18] text-white text-sm font-medium rounded-[0.6rem] transition-transform will-change-transform ease-[cubic-bezier(0.165,0.85,0.45,1)] duration-150 hover:scale-y-[1.015] hover:scale-x-[1.005]"
            >
              Continue with email
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-center text-xs text-[#8E8E89] pt-1">
              Already have an account?{' '}
              <Link to="/login" className="text-[#5C5C57] underline underline-offset-2 decoration-[#E0DBD5] hover:decoration-[#5C5C57] transition-colors">
                Sign in
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#F2EDE8] rounded-[0.6rem] text-sm text-[#5C5C57]">
              <span className="truncate flex-1">{email}</span>
              <button type="button" onClick={() => { setMode('email'); setError('') }} className="text-xs text-[#8E8E89] hover:text-[#5C5C57] shrink-0">
                Change
              </button>
            </div>
            {mode === 'signup' && (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoFocus
                className="w-full text-sm rounded-[0.6rem] px-3 py-2.5 border border-[#E0DBD5] hover:border-[#C2D64A]/50 focus:border-[#C2D64A] focus:outline-none focus:ring-1 focus:ring-[#EEF2D6] transition-colors"
              />
            )}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
              required
              autoFocus={mode === 'signin'}
              className="w-full text-sm rounded-[0.6rem] px-3 py-2.5 border border-[#E0DBD5] hover:border-[#C2D64A]/50 focus:border-[#C2D64A] focus:outline-none focus:ring-1 focus:ring-[#EEF2D6] transition-colors"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1B1B18] text-white text-sm font-medium rounded-[0.6rem] transition-transform will-change-transform ease-[cubic-bezier(0.165,0.85,0.45,1)] duration-150 hover:scale-y-[1.015] hover:scale-x-[1.005] disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
            <p className="text-center text-xs text-[#8E8E89] pt-1">
              {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError('') }} className="text-[#5C5C57] underline underline-offset-2 decoration-[#E0DBD5] hover:decoration-[#5C5C57] transition-colors">
                {mode === 'signup' ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

export default function LandingPage() {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center">
        <div className="text-sm text-[#8E8E89]">Loading...</div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className={`landing-font min-h-screen bg-[#FAF8F6] transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>

      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-50 bg-[#FAF8F6]">
        <div className="flex items-center justify-between max-w-[90rem] mx-auto" style={{ width: 'calc(100% - (2 * clamp(2rem, 1.43rem + 2.86vw, 4rem)))' }}>
          <div className="flex items-center">
            <Kanban size={30} weight="fill" className="text-[#8BA32E]" />
            <span className="text-[23px] font-[450] text-[#1B1B18] tracking-tight leading-none ml-2 font-logo">Kolumn</span>
          </div>
          <div className="flex items-center gap-3 py-6">
            <Link
              to="/login"
              className="inline-flex items-center justify-center h-9 px-5 min-w-[5rem] whitespace-nowrap text-[15px] font-normal text-[#5C5C57] hover:text-[#1B1B18] border-[0.5px] border-[#E0DBD5] rounded-lg transition-all duration-200"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center h-9 px-5 min-w-[5rem] whitespace-nowrap text-[15px] font-normal bg-[#1B1B18] text-white rounded-lg overflow-hidden transition-transform will-change-transform ease-[cubic-bezier(0.165,0.85,0.45,1)] duration-150 hover:scale-y-[1.015] hover:scale-x-[1.005]"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="px-6 sm:px-10 pb-8 max-w-[90rem] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left — Copy (center-aligned) */}
            <div className="flex w-full min-h-[85vh] items-center">
            <div className="text-center flex flex-col items-center w-full">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF2D6] text-[#6B7A12] text-xs font-normal mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                100% free — no credit card required
              </span>
              <h1 className="text-5xl sm:text-6xl lg:text-[3.5rem] xl:text-6xl font-light text-[#1B1B18] tracking-tight leading-[1.08] mb-5">
                Project management
                <br />
                that feels{' '}
                <span className="text-[#8BA32E] font-heading">effortless</span>
              </h1>
              <p className="text-base sm:text-lg text-[#5C5C57] max-w-lg mb-8 leading-relaxed">
                A clean Kanban workspace for teams that value focus over features.
                Organize, collaborate, and ship — without the clutter.
              </p>
              <HeroAuthCard />
              <p className="mt-6 text-sm text-[#8E8E89]">
                Trusted by early adopters · launching 2026
              </p>
            </div>
            </div>

            {/* Right — Live Demo Board */}
            <div className="hidden lg:flex justify-center items-center w-full">
              <div className="rounded-2xl w-full h-[85vh] min-h-[500px] overflow-hidden border border-[#E0DBD5]/80 bg-[#FEFDFD] shadow-[0_4px_20px_0_rgba(0,0,0,0.04)]">
              <div className="relative w-full h-full flex flex-col">
                {/* Browser title bar */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F2EDE8] border-b border-[#E8E2DB]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                    <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                    <span className="w-3 h-3 rounded-full bg-[#28C840]" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-4 py-1 rounded-md bg-white border border-[#E0DBD5] text-[10px] text-[#8E8E89] font-medium">
                      kolumn.app/boards/product-launch
                    </div>
                  </div>
                  <div className="w-12" />
                </div>

                {/* Board content */}
                <div className="flex flex-1 overflow-hidden">
                  {/* Mini sidebar — matches real collapsed Sidebar.jsx */}
                  <div className="flex w-16 bg-[#FAF8F6] border-r border-[#E0DBD5] flex-col shrink-0 h-full">
                    <div className="flex items-center justify-center h-16 border-b border-[#E0DBD5]">
                      <Kanban size={26} weight="fill" className="text-[#8BA32E]" />
                    </div>
                    <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                      <div className="flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium text-[#5C5C57]">
                        <LayoutDashboard className="w-5 h-5 shrink-0" />
                      </div>
                      <div className="flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium bg-[#EEF2D6] text-[#1B1B18]">
                        <LucideKanban className="w-5 h-5 shrink-0" />
                      </div>
                      <div className="flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium text-[#5C5C57]">
                        <Calendar className="w-5 h-5 shrink-0" />
                      </div>
                      <div className="flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium text-[#5C5C57]">
                        <StickyNote className="w-5 h-5 shrink-0" />
                      </div>
                    </nav>
                    <div className="border-t border-[#E0DBD5] py-4 px-2 space-y-1">
                      <div className="flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium text-[#5C5C57]">
                        <Settings className="w-5 h-5 shrink-0" />
                      </div>
                      <div className="flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium text-[#5C5C57]">
                        <ChevronsRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Live columns */}
                  <div className="flex-1 p-4 overflow-x-auto overflow-y-auto h-full font-sans">
                    <DemoBoard />
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="px-6 sm:px-10 py-12 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-4xl sm:text-5xl font-normal text-[#8BA32E] tracking-tight font-logo">{s.value}</div>
              <div className="text-xs text-[#8E8E89] font-normal mt-1 uppercase tracking-wider font-logo">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Card Detail Showcase ─── */}
      <section className="px-6 sm:px-10 py-14 max-w-6xl mx-auto">
        {/* Heading + intro centered */}
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-normal text-[#1B1B18] tracking-tight mb-3">
            Every detail,{' '}
            <span className="text-[#8BA32E] font-heading">one click away</span>
          </h2>
          <p className="text-sm text-[#5C5C57] leading-relaxed">
            Click any card to open a rich detail panel. Add descriptions, track progress with checklists,
            assign teammates, set priorities, and manage due dates — all without leaving your board.
          </p>
        </div>

        {/* Feature bullets — horizontal row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10 max-w-4xl mx-auto">
          {[
            { icon: AlignLeft, text: 'Rich descriptions with full context' },
            { icon: CheckSquare, text: 'Checklists with progress tracking' },
            { icon: Tag, text: 'Color-coded labels and priorities' },
            { icon: Users, text: 'Assign tasks with one click' },
          ].map((item) => (
            <div key={item.text} className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-[#C2D64A]/20 flex items-center justify-center shrink-0 mt-0.5">
                <item.icon className="w-3.5 h-3.5 text-[#1B1B18]" />
              </div>
              <p className="text-[12px] text-[#5C5C57] leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>

        {/* Full-width animated app demo */}
        <div className="flex justify-center">
          <AppDemoFlow />
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="px-6 sm:px-10 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-normal text-[#1B1B18] tracking-tight mb-2">Built for how teams <span className="text-[#8BA32E] font-heading">actually work</span></h2>
          <p className="text-sm text-[#5C5C57] max-w-md mx-auto">No bloat, no learning curve. Just the tools that matter — designed to feel invisible.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group bg-white border border-[#E0DBD5]/80 rounded-2xl p-5 hover:shadow-lg hover:border-[#E0DBD5]/80 transition-all duration-300"
            >
              <div className="w-9 h-9 rounded-xl bg-[#C2D64A]/20 group-hover:bg-[#1B1B18] flex items-center justify-center mb-3.5 transition-colors duration-300">
                <f.icon className="w-4.5 h-4.5 text-[#1B1B18] group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-base font-normal text-[#1B1B18] mb-1">{f.title}</h3>
              <p className="text-[13px] text-[#5C5C57] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Tools Strip ─── */}
      <section className="px-6 sm:px-10 py-14 max-w-5xl mx-auto">
        <div className="bg-white border border-[#E0DBD5]/80 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-normal text-[#1B1B18]">Everything you <span className="text-[#8BA32E] font-heading">need</span></h2>
              <p className="text-xs text-[#8E8E89] mt-0.5">All the tools, none of the complexity.</p>
            </div>
            <Link
              to="/signup"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-normal text-[#5C5C57] hover:text-[#1B1B18] transition-colors"
            >
              Try it free
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tools.map((t) => (
              <div
                key={t.title}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#F2EDE8] hover:bg-[#E8E2DB] transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#C2D64A]/20 flex items-center justify-center shrink-0 transition-colors">
                  <t.icon className="w-4 h-4 text-[#1B1B18]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-normal text-[#1B1B18] truncate">{t.title}</div>
                  <div className="text-[10px] text-[#8E8E89] truncate">{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative px-6 sm:px-10 py-16 max-w-5xl mx-auto text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-[#1B1B18]/25 to-[#C2D64A]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
        <div className="w-10 h-[1px] bg-[#E0DBD5] mx-auto mb-10" />
        <h2 className="text-3xl sm:text-4xl font-normal text-[#1B1B18] tracking-tight mb-3">
          Your team's <span className="text-[#8BA32E] font-heading">next move</span> starts here
        </h2>
        <p className="text-sm text-[#5C5C57] max-w-sm mx-auto mb-8 leading-relaxed">
          Set up your first board in under 60 seconds. No credit card, no setup wizard.
        </p>
        <Link
          to="/signup"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1B1B18] text-white text-sm font-normal rounded-lg hover:bg-[#333] transition-colors"
        >
          Get started free
          <ArrowRight className="w-4 h-4" />
        </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="px-6 sm:px-10 pb-8 pt-4 max-w-5xl mx-auto">
        <div className="border-t border-[#E0DBD5] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#8E8E89]">
            <Kanban size={16} weight="regular" className="text-[#8E8E89]" />
            <span className="font-bold font-logo">Kolumn</span>
            <span className="text-[#8E8E89] mx-1">&middot;</span>
            <span>Built for teams that ship.</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#8E8E89]">
            <a href="mailto:hello@kolumn.app" className="hover:text-[#5C5C57] transition-colors">Contact</a>
            <Link to="/login" className="hover:text-[#5C5C57] transition-colors">Sign in</Link>
            <Link to="/signup" className="hover:text-[#5C5C57] transition-colors">Sign up</Link>
          </div>
        </div>
        <p className="text-center text-xs text-[#C4BFB8] mt-4">&copy; {new Date().getFullYear()} Kolumn. All rights reserved.</p>
      </footer>
    </div>
  )
}
