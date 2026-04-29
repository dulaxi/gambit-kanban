import { useState, useMemo, useCallback, lazy, Suspense } from 'react'
import { Archive, Funnel, Users, X } from '@phosphor-icons/react'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import PriorityFilter from './filters/PriorityFilter'
import AssigneeFilter from './filters/AssigneeFilter'
import LabelFilter from './filters/LabelFilter'
import DueFilter from './filters/DueFilter'
import SortFilter from './filters/SortFilter'
import ArchivedCardsPanel from './ArchivedCardsPanel'

const BoardShareModal = lazy(() => import('./BoardShareModal'))

export default function BoardSelector({ filters, setFilters, sortBy, setSortBy }) {
  const [showShareModal, setShowShareModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const boards = useBoardStore((s) => s.boards)
  const activeBoardId = useBoardStore((s) => s.activeBoardId)
  const cards = useBoardStore((s) => s.cards)
  const columns = useBoardStore((s) => s.columns)
  const unarchiveCard = useBoardStore((s) => s.unarchiveCard)
  const deleteCard = useBoardStore((s) => s.deleteCard)
  const user = useAuthStore((s) => s.user)

  const activeBoard = boards[activeBoardId]
  const isOwner = activeBoard && user && activeBoard.owner_id === user.id
  const isRealBoard = !!activeBoardId && activeBoardId !== '__all__'

  const boardCards = useMemo(() => {
    if (!isRealBoard) return []
    return Object.values(cards).filter((c) => c.board_id === activeBoardId && !c.archived)
  }, [cards, activeBoardId, isRealBoard])

  const archivedCards = useMemo(() => {
    if (!isRealBoard) return []
    return Object.values(cards).filter((c) => c.board_id === activeBoardId && c.archived)
  }, [cards, activeBoardId, isRealBoard])

  const uniqueAssignees = useMemo(() => {
    const names = new Set()
    boardCards.forEach((c) => {
      if (c.assignee_name && c.assignee_name.trim()) names.add(c.assignee_name.trim())
    })
    return Array.from(names).sort()
  }, [boardCards])

  const uniqueLabels = useMemo(() => {
    const labelMap = new Map()
    boardCards.forEach((c) => {
      if (c.labels && Array.isArray(c.labels)) {
        c.labels.forEach((lbl) => {
          if (lbl.text && !labelMap.has(lbl.text)) labelMap.set(lbl.text, lbl)
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
          {isRealBoard && isOwner && (
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 h-8 px-2.5 text-sm text-[var(--text-secondary)] bg-[var(--surface-card)] border-[0.5px] border-[var(--border-default)] rounded-lg hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all duration-75 cursor-pointer active:scale-[0.995]"
            >
              <Users className="w-4 h-4 -ml-0.5" />
              Share
            </button>
          )}

          {isRealBoard && <SortFilter sortBy={sortBy} setSortBy={setSortBy} />}

          {isRealBoard && (
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

          {isRealBoard && archivedCards.length > 0 && (
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

        {showFilters && isRealBoard && (
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

        {showArchived && (
          <ArchivedCardsPanel
            archivedCards={archivedCards}
            columns={columns}
            onClose={() => setShowArchived(false)}
            onRestore={unarchiveCard}
            onDelete={deleteCard}
          />
        )}
      </div>

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
