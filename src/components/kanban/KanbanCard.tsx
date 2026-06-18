'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Star, Paperclip, ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
import type { Card } from '@/types/database.types'

interface KanbanCardProps {
  card: Card
  subtasks: Card[]
  onClick?: () => void
  onToggleStar?: () => void
}

function SubtaskCard({ card, onClick, onToggleStar }: {
  card: Card
  onClick?: () => void
  onToggleStar?: () => void
}) {
  const hasDetails = !!(card.description || card.url)

  return (
    <div
      onClick={onClick}
      className="bg-card/60 border rounded-md p-2 text-xs hover:border-primary/50 cursor-pointer transition-colors select-none group ml-4"
    >
      <div className="flex items-center gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleStar?.()
          }}
          className={`flex-shrink-0 transition-opacity ${card.is_starred ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        >
          <Star
            className={`h-3 w-3 ${
              card.is_starred ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
            }`}
          />
        </button>
        <span className="truncate flex-1">{card.title}</span>
        {hasDetails && (
          <Paperclip className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
        )}
      </div>
      {card.deadline && (
        <p className="text-[10px] text-muted-foreground mt-0.5 ml-4">
          {new Date(card.deadline).toLocaleDateString('nl-NL')}
        </p>
      )}
    </div>
  )
}

export function KanbanCard({ card, subtasks, onClick, onToggleStar }: KanbanCardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const hasSubtasks = subtasks.length > 0

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const { setNodeRef: setDropRef, isOver: isOverDrop } = useDroppable({
    id: `subtask-${card.id}`,
    disabled: card.parent_id !== null,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  const hasDetails = !!(card.description || card.url)

  return (
    <div ref={setSortableRef} style={style}>
      <div
        ref={setDropRef}
        {...attributes}
        {...listeners}
        onClick={onClick}
        className={`bg-card border rounded-md p-3 text-sm hover:border-primary/50 cursor-grab active:cursor-grabbing transition-colors select-none group ${
          isOverDrop ? 'ring-2 ring-primary/50 bg-primary/5' : ''
        }`}
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
          {hasSubtasks && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCollapsed(!collapsed)
              }}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground"
            >
              {collapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          {hasDetails && (
            <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}
        </div>
        {card.deadline && (
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(card.deadline).toLocaleDateString('nl-NL')}
          </p>
        )}
        {hasSubtasks && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {subtasks.length} subtaak{subtasks.length !== 1 ? 'en' : ''}
          </p>
        )}
      </div>

      {hasSubtasks && !collapsed && (
        <div className="space-y-1 mt-1">
          {subtasks.map((sub) => (
            <SubtaskCard
              key={sub.id}
              card={sub}
              onClick={() => onClick?.()}
              onToggleStar={() => onToggleStar?.()}
            />
          ))}
        </div>
      )}
    </div>
  )
}
