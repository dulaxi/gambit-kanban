import { useMemo } from 'react'
import { useBoardStore } from '../store/boardStore'
import { filterCards, sortCards } from '../utils/cardFilters'

/**
 * Compute the linearized list of card IDs visible on the active board,
 * ordered column-by-column (left → right) and within each column by the
 * column's effective sort. Excludes archived cards.
 *
 * Used by keyboard navigation so j/k or ↑/↓ steps through cards in the
 * same order the user sees them.
 */
export function useBoardCardOrder(boardId, filters, sortBy) {
  const cards = useBoardStore((s) => s.cards)
  const columns = useBoardStore((s) => s.columns)

  return useMemo(() => {
    if (!boardId || boardId === '__all__') return []

    const orderedColumns = Object.values(columns)
      .filter((c) => c.board_id === boardId)
      .sort((a, b) => a.position - b.position)

    const all = []
    for (const col of orderedColumns) {
      const colCards = Object.values(cards)
        .filter((c) => c.column_id === col.id && !c.archived)
        .sort((a, b) => a.position - b.position)
      const visible = sortCards(filterCards(colCards, filters), sortBy)
      for (const card of visible) all.push(card.id)
    }
    return all
  }, [boardId, cards, columns, filters, sortBy])
}
