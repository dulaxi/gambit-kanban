import { format, isPast, parseISO } from 'date-fns'
import { Calendar, CheckSquare, AlignLeft, CheckCircle2, FileText } from 'lucide-react'
import DynamicIcon from './DynamicIcon'

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

const AVATAR_COLORS = [
  'bg-blue-200',
  'bg-emerald-200',
  'bg-purple-200',
  'bg-pink-200',
  'bg-amber-200',
  'bg-rose-200',
  'bg-teal-200',
]

function getAvatarColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function Card({ card, onClick, onComplete, isSelected }) {
  const { title, description, labels, priority, dueDate, checklist, assignee, taskNumber, completed, icon } = card

  const checkedCount = checklist?.filter((item) => item.done).length || 0
  const totalCount = checklist?.length || 0
  const hasChecklist = totalCount > 0
  const hasDescription = description && description.trim().length > 0
  const hasAssignee = assignee && assignee.trim().length > 0

  const dueDateObj = dueDate ? parseISO(dueDate) : null
  const overdue = dueDateObj ? isPast(dueDateObj) : false

  const priDot = PRIORITY_DOT[priority] || PRIORITY_DOT.medium

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(card.id)}
      className={`w-full rounded-xl border shadow-sm transition-all text-left cursor-pointer flex ${
        isSelected
          ? 'bg-blue-50/60 border-blue-100'
          : 'bg-white border-gray-200 hover:shadow-md'
      }`}
    >
      {/* Icon — left center */}
      <div className="flex items-center pl-3 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
          {icon ? (
            <DynamicIcon name={icon} className="w-4 h-4" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* Card content */}
      <div className="flex-1 min-w-0 pl-2.5 pr-3.5 py-3">
        {/* Labels row */}
        {labels?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {labels.map((label, idx) => (
              <span
                key={idx}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  LABEL_BG[label.color] || LABEL_BG.gray
                }`}
              >
                {label.text}
              </span>
            ))}
          </div>
        )}

        {/* Task number + check + Title */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (onComplete) onComplete(card.id)
            }}
            className="shrink-0"
          >
            <CheckCircle2 className={`w-4 h-4 transition-colors ${completed ? 'text-emerald-400' : 'text-gray-300 hover:text-emerald-300'}`} />
          </button>
          {taskNumber && (
            <span className="text-[11px] font-medium text-gray-500">Task {taskNumber}</span>
          )}
          <span className={`w-2 h-2 rounded-full ${priDot}`} title={priority} />
        </div>
        <p className={`text-[13px] font-medium leading-snug ${completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
          {title}
        </p>

        {/* Description preview */}
        {hasDescription && (
          <p className="text-[12px] text-gray-400 leading-relaxed mt-1 line-clamp-2">
            {description}
          </p>
        )}

        {/* Bottom row: badges + assignee */}
        <div className="flex items-center justify-between gap-2 mt-2.5">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {dueDateObj && (
              <span
                className={`text-[10px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-full ${
                  overdue
                    ? 'bg-rose-100 text-rose-300'
                    : 'bg-gray-100 text-gray-300'
                }`}
              >
                <Calendar className="w-3 h-3" />
                {format(dueDateObj, 'MMM d')}
              </span>
            )}

            {hasChecklist && (
              <span
                className={`text-[10px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-full ${
                  checkedCount === totalCount
                    ? 'bg-emerald-100 text-emerald-300'
                    : 'bg-gray-100 text-gray-300'
                }`}
              >
                <CheckSquare className="w-3 h-3" />
                {checkedCount}/{totalCount}
              </span>
            )}

            {hasDescription && (
              <span className="text-[10px] text-gray-300 flex items-center">
                <AlignLeft className="w-3 h-3" />
              </span>
            )}
          </div>

          {/* Assignee avatar — bottom right */}
          {hasAssignee && (
            <span
              className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white ${getAvatarColor(assignee)}`}
              title={assignee}
            >
              {getInitials(assignee)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
