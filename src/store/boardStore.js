import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'

const createDefaultBoard = () => {
  const boardId = nanoid()
  return {
    id: boardId,
    name: 'My Tasks',
    icon: 'ClipboardList',
    nextTaskNumber: 1,
    columns: [
      { id: nanoid(), title: 'To Do', cardIds: [] },
      { id: nanoid(), title: 'In Progress', cardIds: [] },
      { id: nanoid(), title: 'Review', cardIds: [] },
      { id: nanoid(), title: 'Done', cardIds: [] },
    ],
  }
}

const defaultBoard = createDefaultBoard()

export const useBoardStore = create(
  persist(
    (set, get) => ({
      boards: { [defaultBoard.id]: defaultBoard },
      cards: {},
      activeBoardId: defaultBoard.id,

      // Board actions
      setActiveBoard: (boardId) => set({ activeBoardId: boardId }),

      addBoard: (name, icon) => {
        const board = {
          id: nanoid(),
          name,
          icon: icon || null,
          nextTaskNumber: 1,
          columns: [
            { id: nanoid(), title: 'To Do', cardIds: [] },
            { id: nanoid(), title: 'In Progress', cardIds: [] },
            { id: nanoid(), title: 'Review', cardIds: [] },
            { id: nanoid(), title: 'Done', cardIds: [] },
          ],
        }
        set((state) => ({
          boards: { ...state.boards, [board.id]: board },
          activeBoardId: board.id,
        }))
        return board.id
      },

      updateBoardIcon: (boardId, icon) =>
        set((state) => ({
          boards: {
            ...state.boards,
            [boardId]: { ...state.boards[boardId], icon },
          },
        })),

      renameBoard: (boardId, name) =>
        set((state) => ({
          boards: {
            ...state.boards,
            [boardId]: { ...state.boards[boardId], name },
          },
        })),

      deleteBoard: (boardId) =>
        set((state) => {
          const { [boardId]: deleted, ...rest } = state.boards
          const cards = { ...state.cards }
          Object.keys(cards).forEach((cardId) => {
            if (cards[cardId].boardId === boardId) delete cards[cardId]
          })
          const remainingIds = Object.keys(rest)
          return {
            boards: rest,
            cards,
            activeBoardId:
              state.activeBoardId === boardId
                ? remainingIds[0] || null
                : state.activeBoardId,
          }
        }),

      // Column actions
      addColumn: (boardId, title) =>
        set((state) => {
          const board = state.boards[boardId]
          return {
            boards: {
              ...state.boards,
              [boardId]: {
                ...board,
                columns: [...board.columns, { id: nanoid(), title, cardIds: [] }],
              },
            },
          }
        }),

      renameColumn: (boardId, columnId, title) =>
        set((state) => {
          const board = state.boards[boardId]
          return {
            boards: {
              ...state.boards,
              [boardId]: {
                ...board,
                columns: board.columns.map((col) =>
                  col.id === columnId ? { ...col, title } : col
                ),
              },
            },
          }
        }),

      deleteColumn: (boardId, columnId) =>
        set((state) => {
          const board = state.boards[boardId]
          const column = board.columns.find((c) => c.id === columnId)
          const cards = { ...state.cards }
          column.cardIds.forEach((cardId) => delete cards[cardId])
          return {
            boards: {
              ...state.boards,
              [boardId]: {
                ...board,
                columns: board.columns.filter((col) => col.id !== columnId),
              },
            },
            cards,
          }
        }),

      // Card actions
      addCard: (boardId, columnId, cardData) => {
        const board = get().boards[boardId]
        const taskNumber = board.nextTaskNumber || 1
        const card = {
          id: nanoid(),
          boardId,
          taskNumber,
          title: cardData.title,
          description: cardData.description || '',
          assignee: cardData.assignee || 'Abdullah H.',
          labels: cardData.labels || [],
          dueDate: cardData.dueDate || null,
          priority: cardData.priority || 'medium',
          icon: cardData.icon || null,
          completed: cardData.completed || false,
          checklist: cardData.checklist || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((state) => {
          const board = state.boards[boardId]
          return {
            cards: { ...state.cards, [card.id]: card },
            boards: {
              ...state.boards,
              [boardId]: {
                ...board,
                nextTaskNumber: taskNumber + 1,
                columns: board.columns.map((col) =>
                  col.id === columnId
                    ? { ...col, cardIds: [...col.cardIds, card.id] }
                    : col
                ),
              },
            },
          }
        })
        return card.id
      },

      updateCard: (cardId, updates) =>
        set((state) => ({
          cards: {
            ...state.cards,
            [cardId]: {
              ...state.cards[cardId],
              ...updates,
              updatedAt: new Date().toISOString(),
            },
          },
        })),

      completeCard: (cardId) =>
        set((state) => {
          const card = state.cards[cardId]
          if (!card) return state
          const board = state.boards[card.boardId]
          if (!board) return state

          const currentColIndex = board.columns.findIndex((col) =>
            col.cardIds.includes(cardId)
          )
          if (currentColIndex === -1) return state

          const nextColIndex = Math.min(currentColIndex + 1, board.columns.length - 1)
          const columns = board.columns.map((col, i) => {
            if (i === currentColIndex) {
              return { ...col, cardIds: col.cardIds.filter((id) => id !== cardId) }
            }
            if (i === nextColIndex && nextColIndex !== currentColIndex) {
              return { ...col, cardIds: [...col.cardIds, cardId] }
            }
            return col
          })

          return {
            cards: {
              ...state.cards,
              [cardId]: {
                ...card,
                completed: true,
                updatedAt: new Date().toISOString(),
              },
            },
            boards: {
              ...state.boards,
              [card.boardId]: { ...board, columns },
            },
          }
        }),

      deleteCard: (cardId) =>
        set((state) => {
          const card = state.cards[cardId]
          const { [cardId]: deleted, ...restCards } = state.cards
          const board = state.boards[card.boardId]
          // If this was the last created task, reclaim its number
          const reclaimNumber = card.taskNumber === (board.nextTaskNumber || 1) - 1
          return {
            cards: restCards,
            boards: {
              ...state.boards,
              [card.boardId]: {
                ...board,
                nextTaskNumber: reclaimNumber ? card.taskNumber : board.nextTaskNumber,
                columns: board.columns.map((col) => ({
                  ...col,
                  cardIds: col.cardIds.filter((id) => id !== cardId),
                })),
              },
            },
          }
        }),

      moveCard: (boardId, fromColumnId, toColumnId, fromIndex, toIndex) =>
        set((state) => {
          const board = state.boards[boardId]
          const columns = board.columns.map((col) => ({ ...col, cardIds: [...col.cardIds] }))
          const fromCol = columns.find((c) => c.id === fromColumnId)
          const toCol = columns.find((c) => c.id === toColumnId)
          const [movedCardId] = fromCol.cardIds.splice(fromIndex, 1)
          toCol.cardIds.splice(toIndex, 0, movedCardId)
          return {
            boards: {
              ...state.boards,
              [boardId]: { ...board, columns },
            },
          }
        }),

      getActiveBoard: () => {
        const state = get()
        return state.boards[state.activeBoardId] || null
      },

      getBoardCards: (boardId) => {
        const state = get()
        const board = state.boards[boardId]
        if (!board) return []
        return board.columns.flatMap((col) =>
          col.cardIds.map((id) => state.cards[id]).filter(Boolean)
        )
      },

      resetTaskCounters: () =>
        set((state) => {
          const boards = {}
          for (const [id, board] of Object.entries(state.boards)) {
            boards[id] = { ...board, nextTaskNumber: 1 }
          }
          // Also reset taskNumber on all existing cards
          const cards = {}
          let boardCounters = {}
          for (const [cid, card] of Object.entries(state.cards)) {
            if (!boardCounters[card.boardId]) boardCounters[card.boardId] = 1
            cards[cid] = { ...card, taskNumber: boardCounters[card.boardId]++ }
          }
          // Update boards with correct next number
          for (const [bid, next] of Object.entries(boardCounters)) {
            if (boards[bid]) boards[bid].nextTaskNumber = next
          }
          return { boards, cards }
        }),

      getAllCards: () => Object.values(get().cards),
    }),
    {
      name: 'gambit-boards',
    }
  )
)
