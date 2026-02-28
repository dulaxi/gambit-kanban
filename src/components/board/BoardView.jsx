import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useBoardStore } from '../../store/boardStore'
import Column from './Column'
import Card from './Card'

export default function BoardView({ boardId, onCardClick }) {
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [activeCardId, setActiveCardId] = useState(null)
  const inputRef = useRef(null)

  const board = useBoardStore((s) => s.boards[boardId])
  const cards = useBoardStore((s) => s.cards)
  const addColumn = useBoardStore((s) => s.addColumn)
  const moveCard = useBoardStore((s) => s.moveCard)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  useEffect(() => {
    if (isAddingColumn && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAddingColumn])

  const findColumnByCardId = useCallback(
    (cardId) => {
      if (!board) return null
      return board.columns.find((col) => col.cardIds.includes(cardId)) || null
    },
    [board]
  )

  const handleDragStart = useCallback((event) => {
    setActiveCardId(event.active.id)
  }, [])

  const handleDragOver = useCallback(
    (event) => {
      const { active, over } = event
      if (!over || !board) return

      const activeId = active.id
      const overId = over.id

      const fromColumn = findColumnByCardId(activeId)
      if (!fromColumn) return

      // Determine target column: overId might be a column id or a card id
      let toColumn = board.columns.find((col) => col.id === overId)
      if (!toColumn) {
        toColumn = findColumnByCardId(overId)
      }
      if (!toColumn) return

      // Only handle cross-column moves here
      if (fromColumn.id === toColumn.id) return

      const fromIndex = fromColumn.cardIds.indexOf(activeId)
      // If hovering over a card in the target column, insert at that position
      // If hovering over the column itself (empty area), insert at end
      let toIndex
      if (toColumn.cardIds.includes(overId)) {
        toIndex = toColumn.cardIds.indexOf(overId)
      } else {
        toIndex = toColumn.cardIds.length
      }

      moveCard(boardId, fromColumn.id, toColumn.id, fromIndex, toIndex)
    },
    [board, boardId, findColumnByCardId, moveCard]
  )

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event
      setActiveCardId(null)

      if (!over || !board) return

      const activeId = active.id
      const overId = over.id

      const fromColumn = findColumnByCardId(activeId)
      if (!fromColumn) return

      // For same-column reordering
      let toColumn = board.columns.find((col) => col.id === overId)
      if (!toColumn) {
        toColumn = findColumnByCardId(overId)
      }
      if (!toColumn || fromColumn.id !== toColumn.id) return

      const fromIndex = fromColumn.cardIds.indexOf(activeId)
      const toIndex = toColumn.cardIds.indexOf(overId)

      if (fromIndex !== toIndex) {
        moveCard(boardId, fromColumn.id, toColumn.id, fromIndex, toIndex)
      }
    },
    [board, boardId, findColumnByCardId, moveCard]
  )

  if (!board) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)] text-gray-400">
        No board selected
      </div>
    )
  }

  const handleAddColumn = () => {
    const trimmed = newColumnTitle.trim()
    if (trimmed) {
      addColumn(boardId, trimmed)
    }
    setNewColumnTitle('')
    setIsAddingColumn(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAddColumn()
    } else if (e.key === 'Escape') {
      setNewColumnTitle('')
      setIsAddingColumn(false)
    }
  }

  const activeCard = activeCardId ? cards[activeCardId] : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto h-[calc(100vh-10rem)] pb-4">
        {board.columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            boardId={boardId}
            onCardClick={onCardClick}
          />
        ))}

        {/* Add column */}
        <div className="shrink-0 w-72">
          {isAddingColumn ? (
            <div className="bg-gray-100 rounded-xl p-3 space-y-2">
              <input
                ref={inputRef}
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleAddColumn}
                placeholder="Column title..."
                className="w-full text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddColumn}
                  className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Add column
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewColumnTitle('')
                    setIsAddingColumn(false)
                  }}
                  className="p-1 rounded hover:bg-gray-200 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingColumn(true)}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-gray-500 bg-gray-100/60 hover:bg-gray-100 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add column
            </button>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeCard ? (
          <div className="rotate-3 opacity-90">
            <Card card={activeCard} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
