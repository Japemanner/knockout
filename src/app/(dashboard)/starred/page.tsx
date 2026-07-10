import { createClient, getUserId } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Star } from 'lucide-react'

interface StarredCardRow {
  id: string
  title: string
  column_id: string
  is_starred: boolean
  kk_columns: Array<{ board_id: string; kk_boards: Array<{ id: string; name: string }> }>
}

export default async function StarredPage() {
  const userId = await getUserId()
  if (!userId) return null

  const supabase = await createClient()

  // Single nested query with !inner joins: cards → columns → boards
  // Previously: boards → columns → cards = 3 sequential round-trips.
  const { data: starredCards } = await supabase
    .from('kk_cards')
    .select('id, title, column_id, is_starred, kk_columns!inner(board_id, kk_boards!inner(id, name, user_id))')
    .eq('kk_columns.kk_boards.user_id', userId)
    .eq('is_starred', true)
    .eq('is_archived', false)
    .order('title')

  const groupedByBoard = new Map<string, { boardName: string; cards: { id: string; title: string }[] }>()

  for (const card of (starredCards ?? []) as StarredCardRow[]) {
    const col = card.kk_columns?.[0]
    if (!col) continue
    const board = col.kk_boards?.[0]
    if (!board) continue
    const boardId = board.id
    const boardName = board.name
    if (!groupedByBoard.has(boardId)) {
      groupedByBoard.set(boardId, { boardName, cards: [] })
    }
    groupedByBoard.get(boardId)!.cards.push({ id: card.id, title: card.title })
  }

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
