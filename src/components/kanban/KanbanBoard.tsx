'use client'

import { useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { useKanbanDrag } from '@/hooks/useKanbanDrag'
import { KanbanColumn } from '@/components/kanban/KanbanColumn'
import { BoardHeader } from '@/components/kanban/BoardHeader'
import { DeleteBoardDialog } from '@/components/kanban/DeleteBoardDialog'
import { AddColumnForm } from '@/components/kanban/AddColumnForm'
import { BoardSwitcherRow } from '@/components/kanban/BoardSwitcherRow'
import { DragOverlayCard } from '@/components/kanban/DragOverlayCard'
import { useToast } from '@/components/ui/toast'
import { createColumn } from '@/actions/columns'
import { createCardInColumn } from '@/actions/cards'
import { toggleStar } from '@/actions/starred'
import { deleteBoard } from '@/actions/boards'
import { useRouter } from 'next/navigation'
import type { Card } from '@/types/database.types'

const CardDetailModal = dynamic(() =>
  import('@/components/kanban/CardDetailModal').then((m) => m.CardDetailModal),
  { ssr: false }
)

export function KanbanBoard({
  board,
  allBoards,
  columns,
  cards: initialCards,
}: {
  board: { id: string; name: string }
  allBoards: { id: string; name: string }[]
  columns: { id: string; name: string; position: number }[]
  cards: Card[]
}) {
  const [cards, setCards] = useState(initialCards)
  const [creatingCardColumnId, setCreatingCardColumnId] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [showDeleteBoard, setShowDeleteBoard] = useState(false)
  const [isDeletingBoard, setIsDeletingBoard] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const sortedColumns = useMemo(() => [...columns].sort((a, b) => a.position - b.position), [columns])
  const otherBoards = useMemo(() => allBoards.filter((b) => b.id !== board.id), [allBoards, board.id])

  const {
    sensors,
    activeCard,
    isDragging,
    collisionDetection,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useKanbanDrag({
    boardId: board.id,
    otherBoards,
    cards,
    onCardsChange: setCards,
  })

  const refreshBoard = useCallback(() => {
    router.refresh()
  }, [router])

  const handleCardUpdated = useCallback((updatedCard?: Card) => {
    if (updatedCard) {
      setCards((prev) => prev.map((c) => c.id === updatedCard.id ? updatedCard : c))
      setSelectedCard(updatedCard)
    }
  }, [])

  const handleCardDeleted = useCallback((cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId && c.parent_id !== cardId))
    setSelectedCard(null)
  }, [])

  const handleAddColumn = useCallback(async (name: string) => {
    if (!name) return
    const result = await createColumn({ boardId: board.id, name })
    if (result.error) toast({ title: 'Fout', description: result.error, variant: 'destructive' })
    refreshBoard()
  }, [board.id, toast, refreshBoard])

  const handleCreateCard = useCallback(async (columnId: string, title: string) => {
    setCreatingCardColumnId(null)

    const tempId = `temp-${Date.now()}`
    const now = new Date().toISOString()
    const columnCards = cards.filter((c) => c.column_id === columnId && c.parent_id === null && !c.is_archived)

    const optimisticCard: Card = {
      id: tempId,
      column_id: columnId,
      parent_id: null,
      title,
      description: null,
      url: null,
      is_starred: false,
      is_archived: false,
      position: columnCards.length,
      deadline: null,
      created_at: now,
      updated_at: now,
    }

    setCards((prev) => [...prev, optimisticCard])

    const result = await createCardInColumn({ columnId, title })
    if (result.error || !result.card) {
      setCards((prev) => prev.filter((c) => c.id !== tempId))
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return
    }
    setCards((prev) => prev.map((c) => c.id === tempId ? result.card! : c))
  }, [cards, toast])

  const handleToggleStar = useCallback(async (cardId: string) => {
    if (cardId.startsWith('temp-')) return
    const card = cards.find((c) => c.id === cardId)
    if (!card) return
    const newVal = !card.is_starred
    setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, is_starred: newVal } : c))
    const result = await toggleStar({ cardId, isStarred: newVal })
    if (result.error) {
      setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, is_starred: !newVal } : c))
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
    }
  }, [cards, toast])

  const handleCardClick = useCallback((cardId: string) => {
    const card = cards.find((c) => c.id === cardId)
    if (card && !card.id.startsWith('temp-')) setSelectedCard(card)
  }, [cards])

  const handleDeleteBoard = useCallback(async () => {
    setIsDeletingBoard(true)
    const result = await deleteBoard({ boardId: board.id })
    setIsDeletingBoard(false)
    setShowDeleteBoard(false)
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return
    }
    router.push('/boards')
  }, [board.id, toast, router])

  return (
    <div>
      <BoardHeader boardName={board.name} onDeleteClick={() => setShowDeleteBoard(true)} />

      <DeleteBoardDialog
        open={showDeleteBoard}
        onOpenChange={setShowDeleteBoard}
        boardName={board.name}
        isDeleting={isDeletingBoard}
        onConfirm={handleDeleteBoard}
      />

      <BoardSwitcherRow boards={otherBoards} isVisible={isDragging} />

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh] items-start">
          {sortedColumns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              cards={cards}
              isCreating={creatingCardColumnId === col.id}
              onStartCreate={() => setCreatingCardColumnId(col.id)}
              onCancelCreate={() => setCreatingCardColumnId(null)}
              onCreateCard={(title) => handleCreateCard(col.id, title)}
              onCardClick={handleCardClick}
              onToggleStar={handleToggleStar}
            />
          ))}
          <AddColumnForm onAddColumn={handleAddColumn} />
        </div>

        <DragOverlay>
          {activeCard && <DragOverlayCard card={activeCard} />}
        </DragOverlay>
      </DndContext>

      {selectedCard && (
        <CardDetailModal
          open={!!selectedCard}
          onOpenChange={(open) => { if (!open) setSelectedCard(null) }}
          card={{
            id: selectedCard.id,
            title: selectedCard.title,
            description: selectedCard.description,
            url: selectedCard.url,
            is_starred: selectedCard.is_starred,
            is_archived: selectedCard.is_archived,
            deadline: selectedCard.deadline,
            parent_id: selectedCard.parent_id,
          }}
          allCards={cards}
          onUpdated={handleCardUpdated}
          onDeleted={handleCardDeleted}
        />
      )}
    </div>
  )
}
