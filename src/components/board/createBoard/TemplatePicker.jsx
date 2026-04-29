import { Kanban } from '@phosphor-icons/react'
import DynamicIcon from '../DynamicIcon'
import { TEMPLATES } from './templates'

export default function TemplatePicker({ selectedKey, onSelect }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-[var(--text-secondary)]">
        Template
      </label>
      <div className="flex flex-col gap-1">
        {TEMPLATES.map((tpl) => {
          const isActive = selectedKey === tpl.key
          return (
            <button
              key={tpl.key}
              type="button"
              onClick={() => onSelect(tpl)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                isActive
                  ? 'bg-[var(--soft-lime)]'
                  : 'hover:bg-[var(--surface-raised)]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive
                    ? 'bg-black/8 text-[var(--text-primary)]'
                    : 'bg-[var(--surface-hover)] text-[var(--text-muted)]'
                }`}
              >
                {tpl.icon ? (
                  <DynamicIcon name={tpl.icon} className="w-4 h-4" />
                ) : (
                  <Kanban className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                  {tpl.label}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] truncate">
                  {tpl.description}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
