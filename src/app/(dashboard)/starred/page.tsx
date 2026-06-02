import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Star } from 'lucide-react'
import type { Card as CardType } from '@/types/database.types'

interface StarredCardRow {
  id: string
  title: string
  column_id: string
  is_starred: boolean
  columns: Array<{ id: string; name: string; board_id: string; boards: Array<{ id: string; name: string; user_id: string }> }>
}

export default async function StarredPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('cards')
    .select(`
      id, title, column_id, is_starred,
      columns!inner(id, name, board_id, boards!inner(id, name, user_id))
    `)
    .eq('is_starred', true)
    .eq('is_archived', false)
    .filter('columns.boards.user_id', 'eq', user!.id)
    .order('title')

  const starredCards = data as unknown as StarredCardRow[] | null

  const groupedByBoard = new Map<string, { boardName: string; cards: { id: string; title: string }[] }>()

  starredCards?.forEach((card) => {
    const col = card.columns?.[0]
    const board = col?.boards?.[0]
    const boardName = board?.name ?? 'Onbekend'
    const boardId = board?.id ?? ''
    if (!groupedByBoard.has(boardId)) {
      groupedByBoard.set(boardId, { boardName, cards: [] })
    }
    groupedByBoard.get(boardId)!.cards.push({ id: card.id, title: card.title })
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Star className="h-6 w-6 text-yellow-500" /> Gesterde items
      </h1>
      <p className="text-muted-foreground mb-8">Jouw dagelijkse focus-items uit alle borden</p>

      {groupedByBoard.size === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          Geen gesterde items. Klik op de ster bij een kaart om &apos;m hier te zien.
        </p>
      ) : (
        <div className="space-y-6">
          {[...groupedByBoard.entries()].map(([boardId, { boardName, cards }]) => (
            <Card key={boardId}>
              <CardHeader>
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
      )}
    </div>
  )
}
