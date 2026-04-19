import { useState, useRef } from 'react'
import { Sparkle } from '@phosphor-icons/react'
import { ArrowUp } from 'lucide-react'
import { useBoardStore } from '../../store/boardStore'
import { executeTool } from '../../lib/toolExecutor'
import { streamChat } from '../../lib/aiClient'

export default function QuickAddBar({ boardId }) {
  const [input, setInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const inputRef = useRef(null)
  const boardName = useBoardStore((s) => s.boards[boardId]?.name)

  const handleSubmit = async () => {
    const text = input.trim()
    if (!text || processing) return
    setInput('')
    setProcessing(true)

    try {
      const parts = text.includes(',')
        ? text.split(',').map((s) => s.trim()).filter(Boolean)
        : text.includes('\n')
        ? text.split('\n').map((s) => s.trim()).filter(Boolean)
        : null

      if (parts && parts.length > 1) {
        for (const title of parts) {
          await executeTool('create_card', { title, board: boardName })
        }
      } else {
        await new Promise((resolve) => {
          streamChat(
            { message: `Create a card on board "${boardName}": ${text}` },
            {
              onText: () => {},
              onToolCall: async (action, params) => {
                await executeTool(action, { ...params, board: boardName })
              },
              onTier: () => {},
              onDone: resolve,
              onError: (err) => { console.error('[QuickAdd]', err); resolve() },
            },
          )
        })
      }
    } catch (err) {
      console.error('[QuickAdd]', err)
    }

    setProcessing(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="mb-3 w-full">
      <div className="flex items-center gap-2 h-9 px-3 rounded-xl border-[0.5px] border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--text-muted)] focus-within:border-[var(--text-primary)] transition-colors">
        <Sparkle size={14} weight="fill" className="shrink-0 text-[#D4B8C8]" />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={processing ? 'Creating...' : 'Type a task or paste notes...'}
          disabled={processing}
          className="flex-1 bg-transparent text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none disabled:opacity-50"
        />
        {input.trim() && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={processing}
            className="h-6 w-6 rounded-md flex items-center justify-center bg-[var(--text-primary)] text-[var(--surface-card)] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            <ArrowUp className="w-3 h-3" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  )
}
