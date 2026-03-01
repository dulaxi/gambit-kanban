import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useBoardStore } from '../../store/boardStore'
import Column from './Column'
import Card from './Card'

export default function BoardView({ boardId, onCardClick, onCreateCard, inlineCardId, onInlineDone, selectedCardId }) {
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [activeCardId, setActiveCardId] = useState(null)
  const inputRef = useRef(null)

  const board = useBoardStore((s) => s.boards[boardId])
  const cards = useBoardStore((s) => s.cards)
  const addColumn = useBoardStore((s) => s.addColumn)
  const moveCard = useBoardStore((s) => s.moveCard)
  const completeCard = useBoardStore((s) => s.completeCard)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // Custom collision: prefer pointerWithin (cards), fallback to rectIntersection (columns)
  const collisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) return pointerCollisions
    return rectIntersection(args)
  }, [])

  useEffect(() => {
    if (isAddingColumn && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAddingColumn])

  const handleDragStart = useCallback((event) => {
    setActiveCardId(event.active.id)
  }, [])

  const getBoard = useCallback(() => {
    return useBoardStore.getState().boards[boardId]
  }, [boardId])

  const findCol = useCallback(
    (b, cardId) => b.columns.find((col) => col.cardIds.includes(cardId)) || null,
    []
  )

  const handleDragOver = useCallback(
    (event) => {
      const { active, over } = event
      if (!over) return

      const b = getBoard()
      if (!b) return

      const activeId = active.id
      const overId = over.id

      const fromColumn = findCol(b, activeId)
      if (!fromColumn) return

      let toColumn = b.columns.find((col) => col.id === overId)
      if (!toColumn) {
        toColumn = findCol(b, overId)
      }
      if (!toColumn) return

      if (fromColumn.id === toColumn.id) return

      const fromIndex = fromColumn.cardIds.indexOf(activeId)
      let toIndex
      if (toColumn.cardIds.includes(overId)) {
        toIndex = toColumn.cardIds.indexOf(overId)
      } else {
        toIndex = toColumn.cardIds.length
      }

      moveCard(boardId, fromColumn.id, toColumn.id, fromIndex, toIndex)
    },
    [boardId, getBoard, findCol, moveCard]
  )

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event
      setActiveCardId(null)

      if (!over) return

      const b = getBoard()
      if (!b) return

      const activeId = active.id
      const overId = over.id

      const fromColumn = findCol(b, activeId)
      if (!fromColumn) return

      let toColumn = b.columns.find((col) => col.id === overId)
      if (!toColumn) {
        toColumn = findCol(b, overId)
      }
      if (!toColumn || fromColumn.id !== toColumn.id) return

      const fromIndex = fromColumn.cardIds.indexOf(activeId)
      const toIndex = toColumn.cardIds.indexOf(overId)

      if (fromIndex !== toIndex) {
        moveCard(boardId, fromColumn.id, toColumn.id, fromIndex, toIndex)
      }
    },
    [boardId, getBoard, findCol, moveCard]
  )

  if (!board) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
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
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-5 overflow-x-auto h-full pb-4">
        {board.columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            boardId={boardId}
            onCardClick={onCardClick}
            onCreateCard={onCreateCard}
            onCompleteCard={completeCard}
            inlineCardId={inlineCardId}
            onInlineDone={onInlineDone}
            selectedCardId={selectedCardId}
          />
        ))}

        {/* Add section */}
        <div className="shrink-0 w-[290px]">
          {isAddingColumn ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 space-y-2">
              <input
                ref={inputRef}
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleAddColumn}
                placeholder="Section name"
                className="w-full text-[13px] px-0 py-0 border-none focus:outline-none focus:ring-0 placeholder-gray-400 bg-transparent"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddColumn}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Add section
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewColumnTitle('')
                    setIsAddingColumn(false)
                  }}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingColumn(true)}
              className="flex items-center gap-2 w-full px-0.5 py-2 text-[13px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add section
            </button>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeCard ? (
          <div className="rotate-2 opacity-90">
            <Card card={activeCard} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
