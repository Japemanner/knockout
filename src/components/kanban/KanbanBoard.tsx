'use client'

export function KanbanBoard({
  board,
  columns,
  cards,
}: {
  board: { id: string; name: string }
  columns: { id: string; name: string; position: number }[]
  cards: { id: string; column_id: string; title: string; position: number; is_starred: boolean; description?: string | null; url?: string | null }[]
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">{board.name}</h1>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div key={col.id} className="min-w-[280px] max-w-[320px] flex-shrink-0">
            <div className="bg-muted/50 rounded-lg p-3">
              <h3 className="font-medium text-sm mb-3">{col.name}</h3>
              <div className="space-y-2">
                {cards
                  .filter((c) => c.column_id === col.id)
                  .sort((a, b) => a.position - b.position)
                  .map((card) => (
                    <div
                      key={card.id}
                      className="bg-card border rounded-md p-3 text-sm hover:border-primary/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {card.is_starred && <span className="text-yellow-500 text-xs">★</span>}
                        <span>{card.title}</span>
                      </div>
                      {(card.description || card.url) && (
                        <span className="text-xs text-muted-foreground mt-1 block">📎</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
