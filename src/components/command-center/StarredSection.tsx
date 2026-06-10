import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Star } from 'lucide-react'

interface GroupedStarred {
  boardId: string
  boardName: string
  cards: { id: string; title: string }[]
}

export function StarredItemsList({ items }: { items: GroupedStarred[] }) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-12">
        Geen gesterde items. Klik op de ster bij een kaart om &apos;m hier te zien.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {items.map(({ boardId, boardName, cards }) => (
        <Card key={boardId}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              <Link href={`/boards/${boardId}`} className="hover:text-primary">
                {boardName}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {cards.map((card) => (
                <li key={card.id} className="text-sm text-muted-foreground">
                  <Link href={`/boards/${boardId}#${card.id}`} className="hover:text-foreground">
                    {card.title}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function StarredSection({ items }: { items: GroupedStarred[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Gesterde items
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Geen gesterde items. Klik op de ster bij een kaart om &apos;m hier te zien.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map(({ boardId, boardName, cards }) => (
              <div key={boardId}>
                <p className="text-sm font-medium mb-1">
                  <Link href={`/boards/${boardId}`} className="hover:text-primary">
                    {boardName}
                  </Link>
                </p>
                <ul className="space-y-0.5">
                  {cards.map((card) => (
                    <li key={card.id} className="text-sm text-muted-foreground pl-2">
                      <Link href={`/boards/${boardId}#${card.id}`} className="hover:text-foreground">
                        {card.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}