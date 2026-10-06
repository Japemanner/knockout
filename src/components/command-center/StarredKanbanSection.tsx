'use client'

import { useCallback, useMemo, useState } from 'react'
import { useDraggable, useDroppable, DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Star, Paperclip } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useToast } from '@/components/ui/toast'
import { moveStarredCardByColumn, type StarredTargetColumn } from '@/actions/starred'
import type { StarredKanbanCard, StarredBoardColumns } from '@/app/(dashboard)/command-center/page'
import type { Card as CardType } from '@/types/database.types'

const CardDetailModal = dynamic(() =>
  import('@/components/kanban/CardDetailModal').then((m) => m.CardDetailModal),
  { ssr: false }
)

const COLUMN_NAMES: StarredTargetColumn[] = ['Backlog', 'Doing', 'Done']

interface StarredKanbanSectionProps {
  cards: StarredKanbanCard[]
  boardColumns: StarredBoardColumns
}

export function mapToCcColumn(columnName: string): StarredTargetColumn {
  const normalized = columnName.trim().toLowerCase()
  if (normalized === 'doing') return 'Doing'
  if (normalized === 'done') return 'Done'
  return 'Backlog'
}

function StarredBoardCard({
  card,
  onOpen,
}: {
  card: StarredKanbanCard
  onOpen: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id })
  const hasDetails = !!(card.description || card.url)

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={`bg-card border rounded-md p-3 text-sm hover:border-primary/50 cursor-grab active:cursor-grabbing transition-colors select-none group ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
          {card.boardName}
        </span>
        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 flex-shrink-0" />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="truncate flex-1">{card.title}</span>
        {hasDetails && <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
      </div>
      {card.deadline && (
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(card.deadline).toLocaleDateString('nl-NL')}
        </p>
      )}
    </div>
  )
}

function StarredKanbanColumn({
  columnName,
  cards,
  onOpenCard,
}: {
  columnName: StarredTargetColumn
  cards: StarredKanbanCard[]
  onOpenCard: (cardId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnName })

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 bg-muted/50 rounded-lg p-3 transition-colors w-[280px] ${
        isOver ? 'ring-2 ring-primary/50 bg-muted/80' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm">{columnName}</h3>
        <span className="text-xs text-muted-foreground">{cards.length}</span>
      </div>
      <div className="space-y-2 min-h-[40px]">
        {cards.map((card) => (
          <StarredBoardCard key={card.id} card={card} onOpen={() => onOpenCard(card.id)} />
        ))}
        {cards.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Geen kaarten</p>
        )}
      </div>
    </div>
  )
}

export function StarredKanbanSection({ cards, boardColumns }: StarredKanbanSectionProps) {
  const [localCards, setLocalCards] = useState(cards)
  const [activeCard, setActiveCard] = useState<StarredKanbanCard | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const cardsByColumn = useMemo(() => {
    const grouped: Record<StarredTargetColumn, StarredKanbanCard[]> = {
      Backlog: [],
      Doing: [],
      Done: [],
    }
    for (const card of localCards) {
      grouped[mapToCcColumn(card.sourceColumnName)].push(card)
    }
    for (const name of COLUMN_NAMES) {
      grouped[name].sort((a, b) =>
        a.boardName.localeCompare(b.boardName) || a.position - b.position
      )
    }
    return grouped
  }, [localCards])

  const selectedCard = useMemo(
    () => localCards.find((c) => c.id === selectedCardId) ?? null,
    [localCards, selectedCardId],
  )

  const handleCardUpdated = useCallback((updatedCard?: CardType) => {
    if (!updatedCard) return
    setLocalCards((prev) =>
      prev.map((c) => {
        if (c.id !== updatedCard.id) return c
        return {
          ...c,
          title: updatedCard.title,
          description: updatedCard.description,
          url: updatedCard.url,
          deadline: updatedCard.deadline,
          position: updatedCard.position,
          is_starred: updatedCard.is_starred ? (true as const) : undefined,
        }
      }).filter((c): c is StarredKanbanCard => c !== undefined && 'is_starred' in c && c.is_starred !== undefined),
    )
  }, [])

  const handleCardDeleted = useCallback((cardId: string) => {
    setLocalCards((prev) => prev.filter((c) => c.id !== cardId && c.id !== `subtask-${cardId}`))
    setSelectedCardId(null)
  }, [])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const card = localCards.find((c) => c.id === event.active.id)
      if (card) setActiveCard(card)
    },
    [localCards],
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setActiveCard(null)

      if (!over) return

      const card = localCards.find((c) => c.id === active.id)
      if (!card) return

      const targetColumn = String(over.id) as StarredTargetColumn
      if (!COLUMN_NAMES.includes(targetColumn)) return

      const currentColumn = mapToCcColumn(card.sourceColumnName)
      if (targetColumn === currentColumn) return

      const previousCards = localCards
      setLocalCards((prev) =>
        prev.map((c) =>
          c.id === card.id ? { ...c, sourceColumnName: targetColumn } : c
        ),
      )

      const result = await moveStarredCardByColumn({ cardId: card.id, targetColumn })

      if (!result.success) {
        setLocalCards(previousCards)
        toast({ title: 'Fout', description: result.error, variant: 'destructive' })
        return
      }

      const updated = result.card
      if (!updated.is_starred) {
        setLocalCards((prev) => prev.filter((c) => c.id !== updated.id))
      } else {
        setLocalCards((prev) =>
          prev.map((c) =>
            c.id === updated.id ? { ...c, position: updated.position, sourceColumnName: targetColumn } : c
          ),
        )
      }
    },
    [localCards, toast],
  )

  if (localCards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Gesterde items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Geen gesterde items. Klik op de ster bij een kaart om &apos;m hier te zien.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Gesterde items
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-2 items-start">
            {COLUMN_NAMES.map((columnName) => (
              <StarredKanbanColumn
                key={columnName}
                columnName={columnName}
                cards={cardsByColumn[columnName]}
                onOpenCard={setSelectedCardId}
              />
            ))}
          </div>

          <DragOverlay>
            {activeCard && (
              <div className="bg-card border rounded-md p-3 text-sm shadow-lg rotate-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {activeCard.boardName}
                  </span>
                </div>
                <span>{activeCard.title}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </CardContent>

      {selectedCard && (
        <CardDetailModal
          open={!!selectedCard}
          onOpenChange={(open) => { if (!open) setSelectedCardId(null) }}
          card={{
            id: selectedCard.id,
            title: selectedCard.title,
            description: selectedCard.description,
            url: selectedCard.url,
            is_starred: selectedCard.is_starred,
            is_archived: false,
            deadline: selectedCard.deadline,
            parent_id: null,
            column_id: '',
          }}
          allCards={selectedCard.subtasks as unknown as CardType[]}
          columns={boardColumns[selectedCard.boardId] ?? []}
          onUpdated={handleCardUpdated}
          onDeleted={handleCardDeleted}
        />
      )}
    </Card>
  )
}