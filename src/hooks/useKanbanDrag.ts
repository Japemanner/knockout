'use client'

import { useState, useCallback, useRef } from 'react'
import {
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { moveCard, reorderCards, moveCardToBoard, moveCardUnderParent, moveCardOutOfParent } from '@/actions/cards'
import type { Card } from '@/types/database.types'

interface UseKanbanDragProps {
  boardId: string
  otherBoards: { id: string; name: string }[]
  columns: { id: string; name: string }[]
  cards: Card[]
  onCardsChange: (cards: Card[]) => void
}

function makeCollisionDetection(): CollisionDetection {
  return (args) => {
    const { droppableContainers, pointerCoordinates } = args

    if (pointerCoordinates) {
      for (const container of droppableContainers) {
        const id = String(container.id)
        if (!id.startsWith('subtask-')) continue
        const rect = container.rect.current
        if (!rect) continue
        if (
          pointerCoordinates.x >= rect.left &&
          pointerCoordinates.x <= rect.right &&
          pointerCoordinates.y >= rect.top &&
          pointerCoordinates.y <= rect.bottom
        ) {
          return [{ id: container.id }]
        }
      }
    }

    return closestCorners(args)
  }
}

export function useKanbanDrag({ boardId, otherBoards, columns, cards, onCardsChange }: UseKanbanDragProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const collisionDetectionRef = useRef(makeCollisionDetection())

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const card = cards.find((c) => c.id === event.active.id)
      if (card) setActiveCard(card)
      setIsDragging(true)
    },
    [cards],
  )

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // collision detection handles the rest
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setActiveCard(null)
      setIsDragging(false)

      if (!over || active.id === over.id) return

      const activeCardData = cards.find((c) => c.id === active.id)
      if (!activeCardData) return

      const overId = String(over.id)

      // Subtask drop: dropped on subtask-{parentId} zone
      if (overId.startsWith('subtask-')) {
        const parentId = overId.replace('subtask-', '')
        if (parentId === activeCardData.id) return

        const parentCard = cards.find((c) => c.id === parentId)
        if (!parentCard || parentCard.parent_id !== null) return

        const subCount = cards.filter((c) => c.parent_id === parentId).length
        const updatedCard = {
          ...activeCardData,
          parent_id: parentId,
          column_id: parentCard.column_id,
          position: subCount,
        }
        const newCards = cards.map((c) => (c.id === activeCardData.id ? updatedCard : c))
        onCardsChange(newCards)
        await moveCardUnderParent(activeCardData.id, parentId)
        return
      }

      // Board-switcher: dropped on a board
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

      const isSubtask = activeCardData.parent_id !== null

      if (targetColumnId === activeCardData.column_id && !isSubtask) {
        // Reorder within same column (top-level cards only)
        const columnCards = cards
          .filter((c) => c.column_id === targetColumnId && c.parent_id === null && c.id !== activeCardData.id)
          .sort((a, b) => a.position - b.position)

        if (overCard) {
          const overIndex = columnCards.findIndex((c) => c.id === overCard.id)
          columnCards.splice(overIndex, 0, activeCardData)
        } else {
          columnCards.push(activeCardData)
        }

        const reordered = columnCards.map((c, i) => ({ ...c, position: i }))
        const newCards = [
          ...cards.filter((c) => !(c.column_id === targetColumnId && c.parent_id === null)),
          ...reordered,
        ]
        onCardsChange(newCards)
        await reorderCards(targetColumnId, reordered.map((c) => c.id))
      } else if (isSubtask) {
        // Moving a subtask out to a column
        const targetColumnCards = cards
          .filter((c) => c.column_id === targetColumnId && c.parent_id === null)
          .sort((a, b) => a.position - b.position)

        const overIndex = overCard
          ? targetColumnCards.findIndex((c) => c.id === overCard.id)
          : targetColumnCards.length

        const updatedCard = {
          ...activeCardData,
          parent_id: null,
          column_id: targetColumnId,
          position: overIndex >= 0 ? overIndex : targetColumnCards.length,
        }
        const newCards = cards.map((c) => (c.id === activeCardData.id ? updatedCard : c))
        onCardsChange(newCards)
        await moveCardOutOfParent(activeCardData.id, targetColumnId, updatedCard.position)
      } else {
        // Move top-level card to different column
        const targetColumnCards = cards
          .filter((c) => c.column_id === targetColumnId && c.parent_id === null)
          .sort((a, b) => a.position - b.position)

        const overIndex = overCard
          ? targetColumnCards.findIndex((c) => c.id === overCard.id)
          : targetColumnCards.length

        const targetColumnName = columns.find((c) => c.id === targetColumnId)?.name?.toLowerCase()
        const isDoneColumn = targetColumnName === 'done'

        const updatedCard = {
          ...activeCardData,
          column_id: targetColumnId,
          position: overIndex >= 0 ? overIndex : targetColumnCards.length,
          ...(isDoneColumn ? { is_starred: false } : {}),
        }
        const newCards = cards.map((c) => (c.id === activeCardData.id ? updatedCard : c))
        onCardsChange(newCards)
        await moveCard(activeCardData.id, targetColumnId, updatedCard.position)
      }
    },
    [cards, otherBoards, columns, onCardsChange],
  )

  return {
    sensors,
    activeCard,
    isDragging,
    collisionDetection: collisionDetectionRef.current,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  }
}
