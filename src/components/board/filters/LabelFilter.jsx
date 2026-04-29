import Menu from '../../ui/Menu'
import FilterPill from './FilterPill'

const LABEL_COLOR_CLASSES = {
  red: 'bg-[var(--color-copper-wash)] text-[var(--label-red-text)]',
  blue: 'bg-[var(--label-blue-bg)] text-[var(--label-blue-text)]',
  green: 'bg-[var(--color-lime-wash)] text-[var(--label-green-text)]',
  yellow: 'bg-[var(--color-honey-wash)] text-[var(--label-yellow-text)]',
  purple: 'bg-[var(--color-mauve-wash)] text-[var(--label-purple-text)]',
  pink: 'bg-[var(--color-bark-wash)] text-[var(--color-bark)]',
  gray: 'bg-[var(--surface-hover)] text-[var(--text-secondary)]',
}

export default function LabelFilter({ filters, setFilters, labels }) {
  const selected = filters?.label || []

  const toggle = (value) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
    setFilters({ ...filters, label: next })
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
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${LABEL_COLOR_CLASSES[lbl.color] || LABEL_COLOR_CLASSES.gray}`}>
              {lbl.text}
            </span>
          </Menu.Item>
        ))
      )}
    </FilterPill>
  )
}
