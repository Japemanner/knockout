'use client'

import { useState, useCallback, useEffect } from 'react'
import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core'
import { useKanbanDrag } from '@/hooks/useKanbanDrag'
import { KanbanColumn } from '@/components/kanban/KanbanColumn'
import { KanbanCard } from '@/components/kanban/KanbanCard'
import { NewCardForm } from '@/components/kanban/NewCardForm'
import { CardDetailModal } from '@/components/kanban/CardDetailModal'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, ArrowLeft, Trash2 } from 'lucide-react'
import { createColumn } from '@/actions/columns'
import { createCardInColumn } from '@/actions/cards'
import { toggleStar } from '@/actions/starred'
import { deleteBoard } from '@/actions/boards'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Card } from '@/types/database.types'

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
  useEffect(() => { setCards(initialCards) }, [initialCards])
  const [newColumnName, setNewColumnName] = useState('')
  const [addingColumn, setAddingColumn] = useState(false)
  const [creatingCardColumnId, setCreatingCardColumnId] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [showDeleteBoard, setShowDeleteBoard] = useState(false)
  const [isDeletingBoard, setIsDeletingBoard] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position)
  const otherBoards = allBoards.filter((b) => b.id !== board.id)

  const {
    sensors,
    activeCard,
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

  const handleAddColumn = useCallback(async () => {
    if (!newColumnName.trim()) return
    const result = await createColumn({ boardId: board.id, name: newColumnName.trim() })
    if (result.error) toast({ title: 'Fout', description: result.error, variant: 'destructive' })
    setNewColumnName('')
    setAddingColumn(false)
    refreshBoard()
  }, [board.id, newColumnName, toast, refreshBoard])

  const handleCreateCard = useCallback(async (columnId: string, title: string) => {
    setCreatingCardColumnId(null)

    const tempId = `temp-${Date.now()}`
    const now = new Date().toISOString()
    const columnCards = cards.filter((c) => c.column_id === columnId && !c.is_archived)

    const optimisticCard: Card = {
      id: tempId,
      column_id: columnId,
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
    if (result.error) {
      setCards((prev) => prev.filter((c) => c.id !== tempId))
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return
    }
    refreshBoard()
  }, [cards, toast, refreshBoard])

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
    refreshBoard()
  }, [cards, toast, refreshBoard])

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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/boards" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">{board.name}</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDeleteBoard(true)}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-1" /> Verwijderen
        </Button>
      </div>

      <Dialog open={showDeleteBoard} onOpenChange={setShowDeleteBoard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bord verwijderen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            Weet je zeker dat je &quot;{board.name}&quot; wilt verwijderen? Alle kolommen en kaarten worden ook verwijderd. Dit kan niet ongedaan worden gemaakt.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteBoard(false)}>Annuleren</Button>
            <Button variant="destructive" onClick={handleDeleteBoard} disabled={isDeletingBoard}>
              {isDeletingBoard ? 'Verwijderen...' : 'Verwijderen'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh] items-start">
          {sortedColumns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              cards={cards.filter((c) => c.column_id === col.id && !c.is_archived)}
              isCreating={creatingCardColumnId === col.id}
              onStartCreate={() => setCreatingCardColumnId(col.id)}
              onCancelCreate={() => setCreatingCardColumnId(null)}
              onCreateCard={(title) => handleCreateCard(col.id, title)}
              onCardClick={handleCardClick}
              onToggleStar={handleToggleStar}
            />
          ))}

          {addingColumn ? (
            <div className="min-w-[280px] max-w-[320px] flex-shrink-0 bg-card border rounded-lg p-3">
              <Input
                autoFocus
                placeholder="Kolomnaam..."
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddColumn()
                  if (e.key === 'Escape') setAddingColumn(false)
                }}
                className="mb-2"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddColumn}>Toevoegen</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingColumn(false)}>Annuleren</Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="min-w-[280px] flex-shrink-0 h-12 border-2 border-dashed"
              onClick={() => setAddingColumn(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> Kolom toevoegen
            </Button>
          )}
        </div>

        <DragOverlay>
          {activeCard && (
            <div className="bg-card border rounded-md p-3 shadow-lg opacity-90 w-[280px]">
              <div className="flex items-center gap-2">
                {activeCard.is_starred && <span className="text-yellow-500 text-xs">★</span>}
                <span className="text-sm">{activeCard.title}</span>
              </div>
              {(activeCard.description || activeCard.url) && (
                <span className="text-xs text-muted-foreground mt-1 block">📎</span>
              )}
            </div>
          )}
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
          }}
          onUpdated={refreshBoard}
        />
      )}
    </div>
  )
}
