import { Kanban } from '@phosphor-icons/react'

export default function TypingIndicator() {
  return (
    <div className="flex items-center py-3 pl-1">
      <Kanban
        size={16}
        weight="fill"
        className="text-[#8BA32E] animate-[glitch-pulse_1.2s_steps(5,end)_infinite]"
      />
      <style>{`
        @keyframes glitch-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          20% { opacity: 0.3; transform: scale(0.95); }
          40% { opacity: 1; transform: scale(1.05); }
          60% { opacity: 0.5; transform: scale(0.98); }
          80% { opacity: 0.9; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
