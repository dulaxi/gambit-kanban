import Skeleton from '../../ui/Skeleton'

// Deterministic ghost-card heights per column index; cycles for 4+
const GHOST_CARD_PATTERNS = [
  [40, 56, 32],
  [52, 36],
  [44, 60, 48],
  [36, 44],
]

export default function BoardSkeletonPreview({ columns }) {
  return (
    <div className="flex gap-2 p-1">
      {columns.map((col, ci) => {
        const pattern = GHOST_CARD_PATTERNS[ci % GHOST_CARD_PATTERNS.length]
        return (
          <div
            key={col}
            className="flex-1 min-w-0 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)]/60 p-2.5"
          >
            <div className="text-[11px] font-medium text-[var(--text-muted)] truncate mb-3">
              {col}
            </div>
            <div className="flex flex-col gap-2">
              {pattern.map((h, gi) => (
                <Skeleton key={gi} className="rounded-lg" height={h} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
