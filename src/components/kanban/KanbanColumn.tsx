'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanCard } from '@/components/kanban/KanbanCard'
import { NewCardForm } from '@/components/kanban/NewCardForm'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface KanbanColumnProps {
  column: { id: string; name: string; position: number }
  cards: {
    id: string
    column_id: string
    title: string
    position: number
    is_starred: boolean
    description?: string | null
    url?: string | null
  }[]
  isCreating: boolean
  onStartCreate: () => void
  onCancelCreate: () => void
  onCreateCard: (title: string) => void
}

export function KanbanColumn({
  column,
  cards,
  isCreating,
  onStartCreate,
  onCancelCreate,
  onCreateCard,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  const sortedCards = [...cards].sort((a, b) => a.position - b.position)

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
          <span className="text-xs text-muted-foreground">{sortedCards.length}</span>
        </div>

        <SortableContext items={sortedCards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 min-h-[40px]">
            {sortedCards.map((card) => (
              <KanbanCard key={card.id} card={card} />
            ))}
            {sortedCards.length === 0 && !isCreating && (
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
