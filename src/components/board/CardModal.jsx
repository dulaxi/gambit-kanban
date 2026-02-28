import { useState, useEffect, useRef } from 'react'
import { X, Trash2, Plus, Check } from 'lucide-react'
import { useBoardStore } from '../../store/boardStore'

const LABEL_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'gray']

const LABEL_COLOR_CLASSES = {
  red: 'bg-red-100 text-red-700 ring-red-300',
  blue: 'bg-blue-100 text-blue-700 ring-blue-300',
  green: 'bg-green-100 text-green-700 ring-green-300',
  yellow: 'bg-yellow-100 text-yellow-700 ring-yellow-300',
  purple: 'bg-purple-100 text-purple-700 ring-purple-300',
  pink: 'bg-pink-100 text-pink-700 ring-pink-300',
  gray: 'bg-gray-100 text-gray-700 ring-gray-300',
}

const COLOR_DOT_CLASSES = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  gray: 'bg-gray-500',
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', colorClass: 'bg-green-100 text-green-700 ring-green-300' },
  { value: 'medium', label: 'Medium', colorClass: 'bg-yellow-100 text-yellow-700 ring-yellow-300' },
  { value: 'high', label: 'High', colorClass: 'bg-red-100 text-red-700 ring-red-300' },
]

export default function CardModal({ cardId, onClose }) {
  const card = useBoardStore((s) => s.cards[cardId])
  const updateCard = useBoardStore((s) => s.updateCard)
  const deleteCard = useBoardStore((s) => s.deleteCard)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [labels, setLabels] = useState([])
  const [checklist, setChecklist] = useState([])
  const [newLabelText, setNewLabelText] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('blue')
  const [showLabelForm, setShowLabelForm] = useState(false)
  const [newCheckItem, setNewCheckItem] = useState('')

  const backdropRef = useRef(null)

  // Load card data into local state
  useEffect(() => {
    if (card) {
      setTitle(card.title)
      setDescription(card.description || '')
      setPriority(card.priority || 'medium')
      setDueDate(card.dueDate || '')
      setLabels(card.labels ? [...card.labels] : [])
      setChecklist(card.checklist ? card.checklist.map((item) => ({ ...item })) : [])
    }
  }, [card])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleSaveAndClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [title, description, priority, dueDate, labels, checklist])

  if (!card) return null

  const handleSave = () => {
    updateCard(cardId, {
      title: title.trim() || card.title,
      description,
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

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) {
      handleSaveAndClose()
    }
  }

  // Label actions
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

  // Checklist actions
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

  const handleCheckItemKeyDown = (e) => {
    if (e.key === 'Enter') {
      addCheckItem()
    }
  }

  const handleLabelKeyDown = (e) => {
    if (e.key === 'Enter') {
      addLabel()
    }
  }

  const checkedCount = checklist.filter((item) => item.done).length

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-16 overflow-y-auto"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 mb-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 flex-1 mr-4"
            placeholder="Card title"
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleDelete}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete card"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add a more detailed description..."
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    opt.colorClass
                  } ${
                    priority === opt.value
                      ? 'ring-2'
                      : 'opacity-50 hover:opacity-75'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due date
            </label>
            <input
              type="date"
              value={dueDate ? dueDate.split('T')[0] : ''}
              onChange={(e) =>
                setDueDate(e.target.value ? `${e.target.value}T23:59:59` : '')
              }
              className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Labels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Labels
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
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
                    className="ml-0.5 hover:opacity-70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {showLabelForm ? (
              <div className="flex items-center gap-2">
                <input
                  value={newLabelText}
                  onChange={(e) => setNewLabelText(e.target.value)}
                  onKeyDown={handleLabelKeyDown}
                  placeholder="Label text..."
                  className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <div className="flex gap-1">
                  {LABEL_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewLabelColor(color)}
                      className={`w-5 h-5 rounded-full ${COLOR_DOT_CLASSES[color]} ${
                        newLabelColor === color
                          ? 'ring-2 ring-offset-1 ring-gray-400'
                          : ''
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addLabel}
                  className="p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLabelForm(false)
                    setNewLabelText('')
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLabelForm(true)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Add label
              </button>
            )}
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Checklist
              </label>
              {checklist.length > 0 && (
                <span className="text-xs text-gray-500">
                  {checkedCount}/{checklist.length}
                </span>
              )}
            </div>

            {checklist.length > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                <div
                  className="bg-primary-600 h-1.5 rounded-full transition-all"
                  style={{
                    width: `${
                      checklist.length > 0
                        ? (checkedCount / checklist.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            )}

            <div className="space-y-1.5">
              {checklist.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 group">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleCheckItem(idx)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
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
                onKeyDown={handleCheckItemKeyDown}
                placeholder="Add an item..."
                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={addCheckItem}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="w-full px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
