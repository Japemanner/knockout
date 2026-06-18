'use client'

import { useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanCard } from '@/components/kanban/KanbanCard'
import { NewCardForm } from '@/components/kanban/NewCardForm'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { Card } from '@/types/database.types'

interface KanbanColumnProps {
  column: { id: string; name: string; position: number }
  cards: Card[]
  isCreating: boolean
  onStartCreate: () => void
  onCancelCreate: () => void
  onCreateCard: (title: string) => void
  onCardClick?: (cardId: string) => void
  onToggleStar?: (cardId: string) => void
}

export function KanbanColumn({
  column,
  cards,
  isCreating,
  onStartCreate,
  onCancelCreate,
  onCreateCard,
  onCardClick,
  onToggleStar,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  const columnCards = useMemo(
    () => cards.filter((c) => c.column_id === column.id && !c.is_archived),
    [cards, column.id],
  )

  const topLevelCards = useMemo(
    () => columnCards.filter((c) => c.parent_id === null).sort((a, b) => a.position - b.position),
    [columnCards],
  )

  const subtaskMap = useMemo(() => {
    const map: Record<string, Card[]> = {}
    for (const card of columnCards) {
      if (card.parent_id) {
        if (!map[card.parent_id]) map[card.parent_id] = []
        map[card.parent_id]!.push(card)
      }
    }
    for (const key of Object.keys(map)) {
      map[key]!.sort((a, b) => a.position - b.position)
    }
    return map
  }, [columnCards])

  const sortableIds = useMemo(() => topLevelCards.map((c) => c.id), [topLevelCards])

  return (
    <div
      ref={setNodeRef}
      className={`min-w-[280px] max-w-[320px] flex-shrink-0 bg-muted/50 rounded-lg transition-colors ${
        isOver ? 'ring-2 ring-primary/50 bg-muted/80' : ''
      }`}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sm">{column.name}</h3>
          <span className="text-xs text-muted-foreground">{columnCards.length}</span>
        </div>

        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 min-h-[40px]">
            {topLevelCards.map((card) => (
              <KanbanCard
                key={card.id}
                card={card}
                subtasks={subtaskMap[card.id] || []}
                onClick={() => onCardClick?.(card.id)}
                onToggleStar={() => onToggleStar?.(card.id)}
              />
            ))}
            {topLevelCards.length === 0 && !isCreating && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Geen kaarten
              </p>
            )}
          </div>
        </SortableContext>

        {isCreating ? (
          <div className="mt-2">
            <NewCardForm onSubmit={onCreateCard} onCancel={onCancelCreate} />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-muted-foreground hover:text-foreground"
            onClick={onStartCreate}
          >
            <Plus className="h-3 w-3 mr-1" /> Kaart
          </Button>
        )}
      </div>
    </div>
  )
}
