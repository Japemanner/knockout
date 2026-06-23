import { createClient, getUserId } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Star } from 'lucide-react'

interface StarredCardRow {
  id: string
  title: string
  column_id: string
  is_starred: boolean
}

interface BoardRow {
  id: string
  name: string
}

interface ColumnRow {
  id: string
  name: string
  board_id: string
}

export default async function StarredPage() {
  const userId = await getUserId()
  if (!userId) return null

  const supabase = await createClient()
  const { data: boards } = await supabase
    .from('kk_boards')
    .select('id, name')
    .eq('user_id', userId)

  if (!boards || boards.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Star className="h-6 w-6 text-yellow-500" /> Gesterde items
        </h1>
        <p className="text-muted-foreground mb-8">Jouw dagelijkse focus-items uit alle borden</p>
        <p className="text-muted-foreground text-center py-12">
          Geen gesterde items. Klik op de ster bij een kaart om &apos;m hier te zien.
        </p>
      </div>
    )
  }

  const boardIds = boards.map((b: BoardRow) => b.id)
  const boardMap = new Map(boards.map((b: BoardRow) => [b.id, b.name]))

  const { data: columns } = await supabase
    .from('kk_columns')
    .select('id, name, board_id')
    .in('board_id', boardIds)

  const columnIds = (columns ?? []).map((c: ColumnRow) => c.id)
  const columnToBoard = new Map((columns ?? []).map((c: ColumnRow) => [c.id, c.board_id]))

  if (columnIds.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Star className="h-6 w-6 text-yellow-500" /> Gesterde items
        </h1>
        <p className="text-muted-foreground mb-8">Jouw dagelijkse focus-items uit alle borden</p>
        <p className="text-muted-foreground text-center py-12">
          Geen gesterde items. Klik op de ster bij een kaart om &apos;m hier te zien.
        </p>
      </div>
    )
  }

  const { data: starredCards } = await supabase
    .from('kk_cards')
    .select('id, title, column_id, is_starred')
    .in('column_id', columnIds)
    .eq('is_starred', true)
    .eq('is_archived', false)
    .order('title')

  const groupedByBoard = new Map<string, { boardName: string; cards: { id: string; title: string }[] }>()

  for (const card of (starredCards ?? []) as StarredCardRow[]) {
    const boardId = columnToBoard.get(card.column_id)
    if (!boardId) continue
    const boardName = boardMap.get(boardId) ?? 'Onbekend'
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
