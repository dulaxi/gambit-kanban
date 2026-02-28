import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'

const createDefaultBoard = () => {
  const boardId = nanoid()
  return {
    id: boardId,
    name: 'My Tasks',
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

      addBoard: (name) => {
        const board = {
          id: nanoid(),
          name,
          columns: [
            { id: nanoid(), title: 'To Do', cardIds: [] },
            { id: nanoid(), title: 'In Progress', cardIds: [] },
            { id: nanoid(), title: 'Done', cardIds: [] },
          ],
        }
        set((state) => ({
          boards: { ...state.boards, [board.id]: board },
          activeBoardId: board.id,
        }))
        return board.id
      },

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
        const card = {
          id: nanoid(),
          boardId,
          title: cardData.title,
          description: cardData.description || '',
          labels: cardData.labels || [],
          dueDate: cardData.dueDate || null,
          priority: cardData.priority || 'medium',
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

      deleteCard: (cardId) =>
        set((state) => {
          const card = state.cards[cardId]
          const { [cardId]: deleted, ...restCards } = state.cards
          const board = state.boards[card.boardId]
          return {
            cards: restCards,
            boards: {
              ...state.boards,
              [card.boardId]: {
                ...board,
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

      getAllCards: () => Object.values(get().cards),
    }),
    {
      name: 'gambit-boards',
    }
  )
)
