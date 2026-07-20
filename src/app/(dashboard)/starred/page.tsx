import { getUserId } from '@/lib/supabase/server'
import { getLocalPool } from '@/lib/db/local-pool'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Star } from 'lucide-react'

interface StarredRow {
  board_id: string
  board_name: string
  cards: { id: string; title: string }[]
}

// Eén SQL-query met json_agg-groepering vervangt de geneste PostgREST-query
// (3-niveau: kk_cards -> kk_columns -> kk_boards) + client-side for-loop
// groepering. Bespaart ~50-100ms. RLS-compensatie: expliciete WHERE b.user_id = $1.
const STARRED_QUERY = `
  SELECT b.id AS board_id, b.name AS board_name,
         COALESCE(
           json_agg(json_build_object('id', c.id, 'title', c.title) ORDER BY c.title)
             FILTER (WHERE c.id IS NOT NULL),
           '[]'::json
         ) AS cards
  FROM kk_boards b
  JOIN kk_columns col ON col.board_id = b.id
  JOIN kk_cards c ON c.column_id = col.id
    AND c.is_starred = true
    AND c.is_archived = false
  WHERE b.user_id = $1
  GROUP BY b.id, b.name
  ORDER BY b.name
`

export default async function StarredPage() {
  const userId = await getUserId()
  if (!userId) return null

  const pool = getLocalPool()
  const { rows } = await pool.query<StarredRow>(STARRED_QUERY, [userId])

  const groupedByBoard = rows.map((row) => ({
    boardId: row.board_id,
    boardName: row.board_name,
    cards: row.cards,
  }))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Star className="h-6 w-6 text-yellow-500" /> Gesterde items
      </h1>
      <p className="text-muted-foreground mb-8">Jouw dagelijkse focus-items uit alle borden</p>

      {groupedByBoard.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          Geen gesterde items. Klik op de ster bij een kaart om &apos;m hier te zien.
        </p>
      ) : (
        <div className="space-y-6">
          {groupedByBoard.map(({ boardId, boardName, cards }) => (
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