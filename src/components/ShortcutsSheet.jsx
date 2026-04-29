import Modal from './ui/Modal'

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)
const MOD = isMac ? '⌘' : 'Ctrl'

const GROUPS = [
  {
    title: 'Global',
    items: [
      { keys: [MOD, 'K'], desc: 'Open search' },
      { keys: ['/'], desc: 'Focus search (alias)' },
      { keys: [MOD, 'B'], desc: 'Toggle sidebar' },
      { keys: ['?'], desc: 'Show / hide this sheet' },
      { keys: ['Esc'], desc: 'Close any open dialog' },
    ],
  },
]

function Kbd({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-[11px] font-mono font-medium text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border-default)] rounded-md shadow-[0_1px_0_0_var(--border-default)]">
      {children}
    </kbd>
  )
}

export default function ShortcutsSheet({ open, onClose }) {
  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} contentClassName="flex items-center justify-center">
      <div className="bg-[var(--surface-card)] rounded-2xl shadow-xl w-full max-w-md mx-4 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Keyboard shortcuts</h2>
          <span className="text-xs text-[var(--text-muted)]">Press <Kbd>?</Kbd> to toggle</span>
        </div>

        <div className="space-y-5">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.items.map(({ keys, desc }) => (
                  <li key={desc} className="flex items-center justify-between gap-3 py-1">
                    <span className="text-sm text-[var(--text-secondary)]">{desc}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-xs text-[var(--text-faint)]">+</span>}
                          <Kbd>{k}</Kbd>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
