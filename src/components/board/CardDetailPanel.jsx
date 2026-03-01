import { useState, useEffect } from 'react'
import {
  X, Trash2, Plus, Check, User, Calendar, Flag, Tag, CheckSquare,
  Briefcase, LayoutList, CheckCircle2, FileText, Smile,
} from 'lucide-react'
import { useBoardStore } from '../../store/boardStore'
import DynamicIcon from './DynamicIcon'
import IconPicker from './IconPicker'

const LABEL_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'gray']

const LABEL_COLOR_CLASSES = {
  red: 'bg-[#FFE0DB] text-[#CF222E]',
  blue: 'bg-[#DAF0FF] text-[#3094FF]',
  green: 'bg-[#D1FDE0] text-[#08872B]',
  yellow: 'bg-[#FFF4D4] text-[#9A6700]',
  purple: 'bg-[#EDD8FD] text-[#8534F3]',
  pink: 'bg-[#FFD6EA] text-[#BF3989]',
  gray: 'bg-[#E4EBE6] text-[#909692]',
}

const COLOR_DOT_CLASSES = {
  red: 'bg-[#CF222E]',
  blue: 'bg-[#3094FF]',
  green: 'bg-[#08872B]',
  yellow: 'bg-[#9A6700]',
  purple: 'bg-[#8534F3]',
  pink: 'bg-[#BF3989]',
  gray: 'bg-[#909692]',
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', dot: 'bg-emerald-200' },
  { value: 'medium', label: 'Medium', dot: 'bg-amber-200' },
  { value: 'high', label: 'High', dot: 'bg-rose-200' },
]

const AVATAR_COLORS = [
  'bg-blue-200', 'bg-emerald-200', 'bg-purple-200', 'bg-pink-200',
  'bg-amber-200', 'bg-rose-200', 'bg-teal-200',
]

function getAvatarColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function CardDetailPanel({ cardId, onClose }) {
  const card = useBoardStore((s) => s.cards[cardId])
  const updateCard = useBoardStore((s) => s.updateCard)
  const deleteCard = useBoardStore((s) => s.deleteCard)
  const completeCard = useBoardStore((s) => s.completeCard)
  const boards = useBoardStore((s) => s.boards)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignee, setAssignee] = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [labels, setLabels] = useState([])
  const [checklist, setChecklist] = useState([])
  const [newLabelText, setNewLabelText] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('blue')
  const [showLabelForm, setShowLabelForm] = useState(false)
  const [newCheckItem, setNewCheckItem] = useState('')
  const [showPriorityPicker, setShowPriorityPicker] = useState(false)
  const [editingAssignee, setEditingAssignee] = useState(false)
  const [editingDueDate, setEditingDueDate] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)

  useEffect(() => {
    if (card) {
      setTitle(card.title)
      setDescription(card.description || '')
      setAssignee(card.assignee || '')
      setPriority(card.priority || 'medium')
      setDueDate(card.dueDate || '')
      setLabels(card.labels ? [...card.labels] : [])
      setChecklist(card.checklist ? card.checklist.map((item) => ({ ...item })) : [])
      setShowLabelForm(false)
      setNewLabelText('')
      setNewCheckItem('')
      setShowPriorityPicker(false)
      setEditingAssignee(false)
      setEditingDueDate(false)
    }
  }, [cardId])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleSaveAndClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [title, description, assignee, priority, dueDate, labels, checklist])

  if (!card) return null

  // Find board name and column (status)
  const board = boards[card.boardId]
  const boardName = board?.name || '—'
  const column = board?.columns.find((col) => col.cardIds.includes(cardId))
  const statusName = column?.title || '—'

  const handleSave = () => {
    updateCard(cardId, {
      title: title.trim() || card.title,
      description,
      assignee: assignee.trim(),
      priority,
      dueDate: dueDate || null,
      labels,
      checklist,
    })
  }

  const handleSaveAndClose = () => {
    handleSave()
    onClose()
  }

  const handleDelete = () => {
    deleteCard(cardId)
    onClose()
  }

  const addLabel = () => {
    const trimmed = newLabelText.trim()
    if (trimmed) {
      setLabels([...labels, { text: trimmed, color: newLabelColor }])
      setNewLabelText('')
      setShowLabelForm(false)
    }
  }

  const removeLabel = (index) => {
    setLabels(labels.filter((_, i) => i !== index))
  }

  const addCheckItem = () => {
    const trimmed = newCheckItem.trim()
    if (trimmed) {
      setChecklist([...checklist, { text: trimmed, done: false }])
      setNewCheckItem('')
    }
  }

  const toggleCheckItem = (index) => {
    setChecklist(
      checklist.map((item, i) =>
        i === index ? { ...item, done: !item.done } : item
      )
    )
  }

  const removeCheckItem = (index) => {
    setChecklist(checklist.filter((_, i) => i !== index))
  }

  const checkedCount = checklist.filter((item) => item.done).length
  const currentPriority = PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[1]
  const dueDateDisplay = dueDate ? new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null

  return (
    <div className="fixed top-16 right-0 bottom-0 w-[420px] bg-white border-l border-gray-200 flex flex-col z-20">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100">
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          Save
        </button>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-100 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Task number + completion + Title */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => {
                if (!card.completed) completeCard(cardId)
              }}
              className="shrink-0"
            >
              <CheckCircle2 className={`w-5 h-5 transition-colors ${card.completed ? 'text-emerald-400' : 'text-gray-300 hover:text-emerald-300'}`} />
            </button>
            {card.taskNumber && (
              <span className="text-xs font-medium text-gray-500">Task #{card.taskNumber}</span>
            )}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`text-lg font-semibold bg-transparent border-none focus:outline-none w-full placeholder-gray-300 ${card.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}
            placeholder="Task name"
          />
        </div>

        {/* Fields */}
        <div className="px-5 space-y-0">
          {/* Icon */}
          <div className="flex items-center py-2.5 border-t border-gray-100 relative">
            <div className="flex items-center gap-2 w-32 shrink-0 text-gray-400">
              <Smile className="w-4 h-4" />
              <span className="text-sm">Icon</span>
            </div>
            <button
              type="button"
              onClick={() => setShowIconPicker(!showIconPicker)}
              className="flex items-center gap-2 text-sm hover:bg-gray-50 px-1.5 py-0.5 -mx-1.5 rounded-lg transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                {card.icon ? (
                  <DynamicIcon name={card.icon} className="w-3.5 h-3.5" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
              </div>
              <span className="text-gray-500">{card.icon || 'Default'}</span>
            </button>
            {showIconPicker && (
              <IconPicker
                value={card.icon}
                onChange={(iconName) => updateCard(cardId, { icon: iconName })}
                onClose={() => setShowIconPicker(false)}
              />
            )}
          </div>

          {/* Assignee */}
          <div className="flex items-center py-2.5 border-t border-gray-100">
            <div className="flex items-center gap-2 w-32 shrink-0 text-gray-400">
              <User className="w-4 h-4" />
              <span className="text-sm">Assignee</span>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {editingAssignee ? (
                <input
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  onBlur={() => setEditingAssignee(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingAssignee(false)}
                  autoFocus
                  placeholder="Type a name..."
                  className="flex-1 text-sm text-gray-700 bg-transparent border-none focus:outline-none placeholder-gray-300 min-w-0"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingAssignee(true)}
                  className="flex items-center gap-2 text-sm hover:bg-gray-50 px-1.5 py-0.5 -mx-1.5 rounded-lg transition-colors"
                >
                  {assignee.trim() ? (
                    <>
                      <span
                        className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white ${getAvatarColor(assignee)}`}
                      >
                        {getInitials(assignee)}
                      </span>
                      <span className="text-gray-700">{assignee}</span>
                    </>
                  ) : (
                    <span className="text-gray-300">No assignee</span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Due date */}
          <div className="flex items-center py-2.5 border-t border-gray-100">
            <div className="flex items-center gap-2 w-32 shrink-0 text-gray-400">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Due date</span>
            </div>
            {editingDueDate ? (
              <input
                type="date"
                value={dueDate ? dueDate.split('T')[0] : ''}
                onChange={(e) => {
                  setDueDate(e.target.value ? `${e.target.value}T23:59:59` : '')
                  setEditingDueDate(false)
                }}
                onBlur={() => setEditingDueDate(false)}
                autoFocus
                className="text-sm text-gray-700 bg-transparent border-none focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingDueDate(true)}
                className="text-sm hover:bg-gray-50 px-1.5 py-0.5 -mx-1.5 rounded-lg transition-colors"
              >
                {dueDateDisplay ? (
                  <span className="text-gray-700">{dueDateDisplay}</span>
                ) : (
                  <span className="text-gray-300">No due date</span>
                )}
              </button>
            )}
          </div>

          {/* Projects */}
          <div className="flex items-center py-2.5 border-t border-gray-100">
            <div className="flex items-center gap-2 w-32 shrink-0 text-gray-400">
              <Briefcase className="w-4 h-4" />
              <span className="text-sm">Projects</span>
            </div>
            <span className="text-sm text-gray-700">{boardName}</span>
          </div>


          {/* Fields section header */}
          <div className="pt-4 pb-1 border-t border-gray-100">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Fields</span>
          </div>

          {/* Priority */}
          <div className="flex items-center py-2.5 relative">
            <div className="flex items-center gap-2 w-32 shrink-0 text-gray-400">
              <Flag className="w-4 h-4" />
              <span className="text-sm">Priority</span>
            </div>
            <button
              type="button"
              onClick={() => setShowPriorityPicker(!showPriorityPicker)}
              className="flex items-center gap-2 text-sm hover:bg-gray-50 px-1.5 py-0.5 -mx-1.5 rounded-lg transition-colors"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${currentPriority.dot}`} />
              <span className="text-gray-700">{currentPriority.label}</span>
            </button>
            {showPriorityPicker && (
              <div className="absolute left-32 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-10 w-36">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setPriority(opt.value)
                      setShowPriorityPicker(false)
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors ${
                      priority === opt.value
                        ? 'bg-gray-50 text-gray-900 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${opt.dot}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center py-2.5 border-t border-gray-100">
            <div className="flex items-center gap-2 w-32 shrink-0 text-gray-400">
              <LayoutList className="w-4 h-4" />
              <span className="text-sm">Status</span>
            </div>
            <span className="text-sm text-gray-700">{statusName}</span>
          </div>

          {/* Labels */}
          <div className="flex items-start py-2.5 border-t border-gray-100">
            <div className="flex items-center gap-2 w-32 shrink-0 text-gray-400 pt-0.5">
              <Tag className="w-4 h-4" />
              <span className="text-sm">Labels</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1.5">
                {labels.length === 0 && !showLabelForm && (
                  <span className="text-sm text-gray-300">—</span>
                )}
                {labels.map((label, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      LABEL_COLOR_CLASSES[label.color] || LABEL_COLOR_CLASSES.gray
                    }`}
                  >
                    {label.text}
                    <button
                      type="button"
                      onClick={() => removeLabel(idx)}
                      className="hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {showLabelForm ? (
                  <div className="w-full mt-1.5 space-y-2">
                    <input
                      value={newLabelText}
                      onChange={(e) => setNewLabelText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addLabel()}
                      placeholder="Label text..."
                      autoFocus
                      className="w-full text-sm rounded-lg px-2.5 py-1.5 border border-gray-200 focus:border-blue-200 focus:outline-none"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        {LABEL_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewLabelColor(color)}
                            className={`w-4.5 h-4.5 rounded-full ${COLOR_DOT_CLASSES[color]} ${
                              newLabelColor === color
                                ? 'ring-2 ring-offset-1 ring-gray-400'
                                : ''
                            }`}
                            style={{ width: 18, height: 18 }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <button type="button" onClick={addLabel} className="p-1 bg-blue-300 text-white rounded hover:bg-blue-400">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => { setShowLabelForm(false); setNewLabelText('') }} className="p-1 text-gray-400 hover:text-gray-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowLabelForm(true)}
                    className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-600 px-1.5 py-0.5"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="px-5 pt-5 pb-2 border-t border-gray-100 mt-1">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Add details about this task..."
            className="w-full text-sm text-gray-700 rounded-lg px-3 py-2 resize-none border border-gray-200 focus:border-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-50 placeholder-gray-300"
          />
        </div>

        {/* Checklist */}
        <div className="px-5 pt-3 pb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-gray-400">
              <CheckSquare className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Checklist</span>
            </div>
            {checklist.length > 0 && (
              <span className="text-xs text-gray-400">
                {checkedCount}/{checklist.length}
              </span>
            )}
          </div>

          {checklist.length > 0 && (
            <div className="w-full bg-gray-100 rounded-full h-1 mb-3">
              <div
                className="bg-blue-300 h-1 rounded-full transition-all"
                style={{
                  width: `${checklist.length > 0 ? (checkedCount / checklist.length) * 100 : 0}%`,
                }}
              />
            </div>
          )}

          <div className="space-y-1">
            {checklist.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 group py-0.5">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleCheckItem(idx)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-300 focus:ring-blue-300"
                />
                <span
                  className={`flex-1 text-sm ${
                    item.done ? 'line-through text-gray-400' : 'text-gray-700'
                  }`}
                >
                  {item.text}
                </span>
                <button
                  type="button"
                  onClick={() => removeCheckItem(idx)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input
              value={newCheckItem}
              onChange={(e) => setNewCheckItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCheckItem()}
              placeholder="Add an item..."
              className="flex-1 text-sm rounded-lg px-2.5 py-1.5 border border-gray-200 focus:border-blue-200 focus:outline-none placeholder-gray-300"
            />
            <button
              type="button"
              onClick={addCheckItem}
              className="px-2.5 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
