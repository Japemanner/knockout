'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Paperclip } from 'lucide-react'

interface KanbanCardProps {
  card: {
    id: string
    title: string
    position: number
    is_starred: boolean
    description?: string | null
    url?: string | null
  }
}

export function KanbanCard({ card }: KanbanCardProps) {
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
      className="bg-card border rounded-md p-3 text-sm hover:border-primary/50 cursor-grab active:cursor-grabbing transition-colors select-none"
    >
      <div className="flex items-center gap-2">
        {card.is_starred && <span className="text-yellow-500 text-xs flex-shrink-0">★</span>}
        <span className="truncate flex-1">{card.title}</span>
        {hasDetails && (
          <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        )}
      </div>
    </div>
  )
}
