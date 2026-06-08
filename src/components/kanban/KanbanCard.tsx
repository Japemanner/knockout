'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Star, Paperclip } from 'lucide-react'

interface KanbanCardProps {
  card: {
    id: string
    title: string
    position: number
    is_starred: boolean
    description?: string | null
    url?: string | null
    is_archived?: boolean
    deadline?: string | null
  }
  onClick?: () => void
  onToggleStar?: () => void
}

export function KanbanCard({ card, onClick, onToggleStar }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  const hasDetails = !!(card.description || card.url)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-card border rounded-md p-3 text-sm hover:border-primary/50 cursor-grab active:cursor-grabbing transition-colors select-none group"
    >
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleStar?.()
          }}
          className={`flex-shrink-0 transition-opacity ${card.is_starred ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        >
          <Star
            className={`h-3.5 w-3.5 ${
              card.is_starred ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
            }`}
          />
        </button>
        <span className="truncate flex-1">{card.title}</span>
        {hasDetails && (
          <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        )}
      </div>
      {card.deadline && (
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(card.deadline).toLocaleDateString('nl-NL')}
        </p>
      )}
    </div>
  )
}
