'use client'

import { useState, useCallback, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { moveCard, reorderCards, moveCardToBoard } from '@/actions/cards'
import type { Card } from '@/types/database.types'

interface UseKanbanDragProps {
  boardId: string
  otherBoards: { id: string; name: string }[]
  cards: Card[]
  onCardsChange: (cards: Card[]) => void
}

export function useKanbanDrag({ boardId, otherBoards, cards, onCardsChange }: UseKanbanDragProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [isOverBoardSwitcher, setIsOverBoardSwitcher] = useState(false)
  const boardSwitcherRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const card = cards.find((c) => c.id === event.active.id)
      if (card) setActiveCard(card)
    },
    [cards],
  )

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overBoardSwitcher = event.over?.id === 'board-switcher'
    setIsOverBoardSwitcher(overBoardSwitcher)
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setActiveCard(null)
      setIsOverBoardSwitcher(false)

      if (!over || active.id === over.id) return

      const activeCardData = cards.find((c) => c.id === active.id)
      if (!activeCardData) return

      // Cross-board drag: over = board-switcher, need target board from some state
      if (over.id === 'board-switcher') return

      const overId = String(over.id)

      // Check if over is a board (cross-board move)
      const targetBoard = otherBoards.find((b) => b.id === overId)
      if (targetBoard) {
        const newCards = cards.filter((c) => c.id !== activeCardData.id)
        onCardsChange(newCards)
        await moveCardToBoard(activeCardData.id, targetBoard.id)
        return
      }

      // Determine target column
      const overCard = cards.find((c) => c.id === overId)
      const targetColumnId = overCard ? overCard.column_id : overId

      if (targetColumnId === activeCardData.column_id) {
        // Reorder within same column
        const columnCards = cards
          .filter((c) => c.column_id === targetColumnId && c.id !== activeCardData.id)
          .sort((a, b) => a.position - b.position)

        if (overCard) {
          const overIndex = columnCards.findIndex((c) => c.id === overCard.id)
          columnCards.splice(overIndex, 0, activeCardData)
        } else {
          columnCards.push(activeCardData)
        }

        const reordered = columnCards.map((c, i) => ({ ...c, position: i }))
        const newCards = [
          ...cards.filter((c) => c.column_id !== targetColumnId),
          ...reordered,
        ]
        onCardsChange(newCards)
        await reorderCards(targetColumnId, reordered.map((c) => c.id))
      } else {
        // Move to different column
        const targetColumnCards = cards
          .filter((c) => c.column_id === targetColumnId)
          .sort((a, b) => a.position - b.position)

        const overIndex = overCard
          ? targetColumnCards.findIndex((c) => c.id === overCard.id)
          : targetColumnCards.length

        const updatedCard = { ...activeCardData, column_id: targetColumnId, position: overIndex >= 0 ? overIndex : targetColumnCards.length }
        const newCards = cards.map((c) => (c.id === activeCardData.id ? updatedCard : c))
        onCardsChange(newCards)
        await moveCard(activeCardData.id, targetColumnId, updatedCard.position)
      }
    },
    [cards, otherBoards, onCardsChange],
  )

  return {
    sensors,
    activeCard,
    isOverBoardSwitcher,
    boardSwitcherRef,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  }
}
