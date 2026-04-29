import { useState, useRef, useEffect, useMemo, useCallback, lazy, Suspense } from 'react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { Archive, ArrowCounterClockwise, ArrowsDownUp, CaretDown, Check, Copy, Funnel, Plus, SquaresFour, Stack, Trash, Users, X } from '@phosphor-icons/react'

import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import DynamicIcon from './DynamicIcon'
import { PRIORITY_OPTIONS } from '../../constants/colors'
import Popover from '../ui/Popover'
import Menu from '../ui/Menu'
const BoardShareModal = lazy(() => import('./BoardShareModal'))

function FilterPill({ label, active, children }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
      placement="bottom-start"
      panel={children}
      panelClassName="min-w-[160px]"
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 h-8 px-2.5 text-sm rounded-lg border-[0.5px] transition-all duration-75 cursor-pointer active:scale-[0.995] ${
          active
            ? 'bg-[var(--soft-lime)] text-[var(--text-primary)] border-[var(--soft-lime)]'
            : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
        }`}
      >
        {label}
        <CaretDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
    </Popover>
  )
}

function PriorityFilter({ filters, setFilters }) {
  const priorities = PRIORITY_OPTIONS.map((o) => ({ value: o.value, label: o.label, color: o.dot }))
  const selected = filters?.priority || []

  const toggle = (value) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
    setFilters({ ...filters, priority: next })
  }

  return (
    <FilterPill label="Priority" active={selected.length > 0}>
      {priorities.map((p) => (
        <Menu.Item
          key={p.value}
          checkbox
          selected={selected.includes(p.value)}
          onSelect={() => toggle(p.value)}
        >
          <span className={`w-2 h-2 rounded-full inline-block mr-2 ${p.color}`} />
          {p.label}
        </Menu.Item>
      ))}
    </FilterPill>
  )
}

function AssigneeFilter({ filters, setFilters, assignees }) {
  const selected = filters?.assignee || null

  const select = (value) => {
    setFilters({ ...filters, assignee: selected === value ? null : value })
  }

  return (
    <FilterPill label="Assignee" active={!!selected}>
      {assignees.length === 0 ? (
        <div className="px-2.5 py-2 text-xs text-[var(--text-muted)]">No assignees</div>
      ) : (
        assignees.map((name) => (
          <Menu.Item
            key={name}
            selected={selected === name}
            onSelect={() => select(name)}
            icon={
              <span className="w-5 h-5 rounded-full bg-[#E0DBD5] flex items-center justify-center text-[10px] font-medium text-[var(--text-secondary)]">
                {name.charAt(0).toUpperCase()}
              </span>
            }
          >
            {name}
          </Menu.Item>
        ))
      )}
    </FilterPill>
  )
}

function LabelFilter({ filters, setFilters, labels }) {
  const selected = filters?.label || []

  const toggle = (value) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
    setFilters({ ...filters, label: next })
  }

  const labelColors = {
    red: 'bg-[var(--color-copper-wash)] text-[var(--label-red-text)]',
    blue: 'bg-[var(--label-blue-bg)] text-[var(--label-blue-text)]',
    green: 'bg-[var(--color-lime-wash)] text-[var(--label-green-text)]',
    yellow: 'bg-[var(--color-honey-wash)] text-[var(--label-yellow-text)]',
    purple: 'bg-[var(--color-mauve-wash)] text-[var(--label-purple-text)]',
    pink: 'bg-[var(--color-bark-wash)] text-[var(--color-bark)]',
    gray: 'bg-[var(--surface-hover)] text-[var(--text-secondary)]',
  }

  return (
    <FilterPill label="Label" active={selected.length > 0}>
      {labels.length === 0 ? (
        <div className="px-2.5 py-2 text-xs text-[var(--text-muted)]">No labels</div>
      ) : (
        labels.map((lbl) => (
          <Menu.Item
            key={lbl.text}
            checkbox
            selected={selected.includes(lbl.text)}
            onSelect={() => toggle(lbl.text)}
          >
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${labelColors[lbl.color] || labelColors.gray}`}>
              {lbl.text}
            </span>
          </Menu.Item>
        ))
      )}
    </FilterPill>
  )
}

function DueFilter({ filters, setFilters }) {
  const options = [
    { value: 'overdue', label: 'Overdue' },
    { value: 'today', label: 'Today' },
    { value: 'this_week', label: 'This week' },
    { value: 'no_date', label: 'No date' },
  ]
  const selected = filters?.due || null

  const select = (value) => {
    setFilters({ ...filters, due: selected === value ? null : value })
  }

  return (
    <FilterPill label="Due" active={!!selected}>
      {options.map((opt) => (
        <Menu.Item
          key={opt.value}
          selected={selected === opt.value}
          onSelect={() => select(opt.value)}
        >
          {opt.label}
        </Menu.Item>
      ))}
    </FilterPill>
  )
}

const SORT_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'due_date', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'created', label: 'Newest first' },
  { value: 'alpha', label: 'Alphabetical' },
]

export default function BoardSelector({ filters, setFilters, sortBy, setSortBy, onCreateBoard }) {
  const [open, setOpen] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const dropdownRef = useClickOutside(() => setOpen(false))

  const boards = useBoardStore((s) => s.boards)
  const activeBoardId = useBoardStore((s) => s.activeBoardId)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const cards = useBoardStore((s) => s.cards)
  const columns = useBoardStore((s) => s.columns)
  const unarchiveCard = useBoardStore((s) => s.unarchiveCard)
  const deleteCard = useBoardStore((s) => s.deleteCard)
  const user = useAuthStore((s) => s.user)

  const boardList = Object.values(boards)
  const activeBoard = boards[activeBoardId]
  const isOwner = activeBoard && user && activeBoard.owner_id === user.id

  // Derive unique assignees and labels from cards on the current board
  const boardCards = useMemo(() => {
    if (!activeBoardId || activeBoardId === '__all__') return []
    return Object.values(cards).filter((c) => c.board_id === activeBoardId && !c.archived)
  }, [cards, activeBoardId])

  const archivedCards = useMemo(() => {
    if (!activeBoardId || activeBoardId === '__all__') return []
    return Object.values(cards).filter((c) => c.board_id === activeBoardId && c.archived)
  }, [cards, activeBoardId])

  const uniqueAssignees = useMemo(() => {
    const names = new Set()
    boardCards.forEach((c) => {
      if (c.assignee_name && c.assignee_name.trim()) {
        names.add(c.assignee_name.trim())
      }
    })
    return Array.from(names).sort()
  }, [boardCards])

  const uniqueLabels = useMemo(() => {
    const labelMap = new Map()
    boardCards.forEach((c) => {
      if (c.labels && Array.isArray(c.labels)) {
        c.labels.forEach((lbl) => {
          if (lbl.text && !labelMap.has(lbl.text)) {
            labelMap.set(lbl.text, lbl)
          }
        })
      }
    })
    return Array.from(labelMap.values()).sort((a, b) => a.text.localeCompare(b.text))
  }, [boardCards])

  const activeFilterCount =
    (filters?.priority?.length || 0) +
    (filters?.assignee ? 1 : 0) +
    (filters?.label?.length || 0) +
    (filters?.due ? 1 : 0)

  const clearFilters = useCallback(() => {
    setFilters({ priority: [], assignee: null, label: [], due: null })
  }, [setFilters])

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {/* Share button — visible for board owners */}
          {activeBoard && activeBoardId !== '__all__' && isOwner && (
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 h-8 px-2.5 text-sm text-[var(--text-secondary)] bg-[var(--surface-card)] border-[0.5px] border-[var(--border-default)] rounded-lg hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all duration-75 cursor-pointer active:scale-[0.995]"
            >
              <Users className="w-4 h-4 -ml-0.5" />
              Share
            </button>
          )}

          {/* Sort dropdown */}
          {activeBoardId && activeBoardId !== '__all__' && (
            <FilterPill label={sortBy === 'manual' ? 'Sort' : SORT_OPTIONS.find((o) => o.value === sortBy)?.label} active={sortBy !== 'manual'}>
              {SORT_OPTIONS.map((opt) => (
                <Menu.Item
                  key={opt.value}
                  selected={sortBy === opt.value}
                  onSelect={() => setSortBy(opt.value)}
                >
                  {opt.label}
                </Menu.Item>
              ))}
            </FilterPill>
          )}

          {/* Filter toggle button */}
          {activeBoardId && activeBoardId !== '__all__' && (
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`relative flex items-center gap-1.5 h-8 px-2.5 text-sm rounded-lg border-[0.5px] transition-all duration-75 cursor-pointer active:scale-[0.995] ${
                showFilters || activeFilterCount > 0
                  ? 'bg-[var(--soft-lime)] text-[var(--text-primary)] border-[var(--soft-lime)]'
                  : 'text-[var(--text-secondary)] bg-[var(--surface-card)] border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Funnel className="w-4 h-4 -ml-0.5" />
              Filter
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center w-4 h-4 text-[10px] font-semibold text-white bg-[var(--color-lime)] rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          {/* Archive toggle */}
          {activeBoardId && activeBoardId !== '__all__' && archivedCards.length > 0 && (
            <button
              type="button"
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-1.5 h-8 px-2.5 text-sm rounded-lg border-[0.5px] transition-all duration-75 cursor-pointer active:scale-[0.995] ${
                showArchived
                  ? 'bg-[var(--color-honey-wash)] text-[var(--color-honey)] border-[var(--color-honey)]'
                  : 'text-[var(--text-secondary)] bg-[var(--surface-card)] border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Archive className="w-4 h-4 -ml-0.5" />
              Archived ({archivedCards.length})
            </button>
          )}
        </div>

        {/* Filter bar */}
        {showFilters && activeBoardId && activeBoardId !== '__all__' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <PriorityFilter filters={filters} setFilters={setFilters} />
            <AssigneeFilter filters={filters} setFilters={setFilters} assignees={uniqueAssignees} />
            <LabelFilter filters={filters} setFilters={setFilters} labels={uniqueLabels} />
            <DueFilter filters={filters} setFilters={setFilters} />
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>
        )}
        {/* Archived cards panel */}
        {showArchived && archivedCards.length > 0 && (
          <div className="bg-[var(--color-honey-wash)]/50 border border-[var(--color-honey)] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--color-walnut)] uppercase tracking-wider">Archived Tasks</span>
              <button type="button" onClick={() => setShowArchived(false)} className="text-[var(--color-honey)] hover:text-[var(--color-walnut)]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {archivedCards.map((card) => (
                <div key={card.id} className="flex items-center justify-between py-1.5 px-2 bg-[var(--surface-card)] rounded-lg group">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--text-secondary)] truncate">{card.title}</p>
                    <p className="text-[10px] text-[var(--text-faint)]">{columns[card.column_id]?.title || 'Unknown section'}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => unarchiveCard(card.id)}
                      className="p-1 text-[var(--text-faint)] hover:text-[var(--color-lime-dark)] transition-colors"
                      title="Restore"
                    >
                      <ArrowCounterClockwise className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCard(card.id)}
                      className="p-1 text-[var(--text-faint)] hover:text-[var(--color-copper)] transition-colors"
                      title="Delete permanently"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Share modal */}
      {showShareModal && activeBoard && (
        <Suspense fallback={null}>
          <BoardShareModal
            board={activeBoard}
            onClose={() => setShowShareModal(false)}
          />
        </Suspense>
      )}
    </>
  )
}
