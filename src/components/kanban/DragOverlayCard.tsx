import type { Card } from '@/types/database.types'

export function DragOverlayCard({ card }: { card: Card }) {
  const subCount = 0 // overlay doesn't have access to full card list; just show the card

  return (
    <div className="bg-card border rounded-md p-3 shadow-lg opacity-90 w-[280px]">
      <div className="flex items-center gap-2">
        {card.is_starred && <span className="text-yellow-500 text-xs">★</span>}
        <span className="text-sm">{card.title}</span>
      </div>
      {(card.description || card.url) && (
        <span className="text-xs text-muted-foreground mt-1 block">📎</span>
      )}
    </div>
  )
}
