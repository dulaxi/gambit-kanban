import { useState } from 'react'
import { useBoardStore } from '../store/boardStore'
import BoardSelector from '../components/board/BoardSelector'
import BoardView from '../components/board/BoardView'
import AllBoardsView from '../components/board/AllBoardsView'
import CardDetailPanel from '../components/board/CardDetailPanel'

export default function BoardsPage() {
  const [editingCardId, setEditingCardId] = useState(null)
  const [inlineCardId, setInlineCardId] = useState(null)
  const activeBoardId = useBoardStore((s) => s.activeBoardId)

  const handleCardClick = (cardId) => {
    setInlineCardId(null)
    setEditingCardId(cardId)
  }

  const handleCreateCard = (cardId) => {
    setEditingCardId(null)
    setInlineCardId(cardId)
  }

  const handleInlineDone = () => {
    setInlineCardId(null)
  }

  return (
    <div
      className={`h-[calc(100vh-7rem)] flex flex-col transition-all duration-200 ${
        editingCardId ? 'mr-[400px]' : ''
      }`}
    >
      <div className="mb-4 shrink-0">
        <BoardSelector />
      </div>

      <div className="flex-1 min-h-0">
        {activeBoardId === '__all__' ? (
          <AllBoardsView
            onCardClick={handleCardClick}
            selectedCardId={editingCardId}
          />
        ) : activeBoardId ? (
          <BoardView
            boardId={activeBoardId}
            onCardClick={handleCardClick}
            onCreateCard={handleCreateCard}
            inlineCardId={inlineCardId}
            onInlineDone={handleInlineDone}
            selectedCardId={editingCardId}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Create a board to get started
          </div>
        )}
      </div>

      {editingCardId && (
        <CardDetailPanel
          cardId={editingCardId}
          onClose={() => setEditingCardId(null)}
        />
      )}
    </div>
  )
}
