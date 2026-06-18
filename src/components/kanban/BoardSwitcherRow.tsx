'use client'

import { useDroppable } from '@dnd-kit/core'

interface BoardSwitcherRowProps {
  boards: { id: string; name: string }[]
  isVisible: boolean
}

function BoardDropTarget({ board }: { board: { id: string; name: string } }) {
  const { setNodeRef, isOver } = useDroppable({ id: board.id })

  return (
    <div
      ref={setNodeRef}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer border ${
        isOver
          ? 'bg-primary text-primary-foreground border-primary scale-105 shadow-md'
          : 'bg-muted/80 border-border hover:bg-muted hover:border-primary/50'
      }`}
    >
      {board.name}
    </div>
  )
}

export function BoardSwitcherRow({ boards, isVisible }: BoardSwitcherRowProps) {
  if (!isVisible || boards.length === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center py-2 pointer-events-none">
      <div className="flex gap-2 items-center bg-background/95 backdrop-blur border rounded-lg px-4 py-2 shadow-lg pointer-events-auto">
        <span className="text-xs text-muted-foreground mr-1">Verplaats naar:</span>
        {boards.map((board) => (
          <BoardDropTarget key={board.id} board={board} />
        ))}
      </div>
    </div>
  )
}
