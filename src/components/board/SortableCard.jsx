import { memo, useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import Card from './Card'
import { useIsMobile } from '../../hooks/useMediaQuery'

export default memo(function SortableCard({ card, onClick, onComplete, isSelected }) {
  const [aiShimmer, setAiShimmer] = useState(false)

  useEffect(() => {
    if (card._aiCreatedAt && Date.now() - card._aiCreatedAt < 3000 && !aiShimmer) {
      setAiShimmer(true)
      const timer = setTimeout(() => setAiShimmer(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [card._aiCreatedAt])
  const isMobile = useIsMobile()
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  if (isMobile) {
    return (
      <div ref={setNodeRef} style={style} className="flex items-stretch">
        <div
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="flex items-center px-1 text-[#E0DBD5] active:text-[#8E8E89] touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <Card card={card} onClick={onClick} onComplete={onComplete} isSelected={isSelected} aiShimmer={aiShimmer} />
        </div>
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card card={card} onClick={onClick} onComplete={onComplete} isSelected={isSelected} />
    </div>
  )
})
