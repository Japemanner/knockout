import { getUserId } from '@/lib/supabase/server'
import { getLocalPool } from '@/lib/db/local-pool'
import { redirect } from 'next/navigation'
import { CommandCenterClient } from '@/components/command-center/CommandCenterClient'
import { getCachedProfile } from '@/lib/supabase/profile'

interface StarredRow {
  board_id: string
  board_name: string
  cards: { id: string; title: string }[]
}

// Eén SQL-query met json_agg-groepering vervangt de geneste PostgREST-query
// (3-niveau nesting: kk_cards → kk_columns → kk_boards) + client-side for-loop
// groepering. Bespaart ~50-100ms (PostgREST JSON-shaping + JS-groepering vervalt).
// RLS-compensatie: expliciete WHERE b.user_id = $1 filtering.
const STARRED_QUERY = `
  SELECT b.id AS board_id, b.name AS board_name,
         COALESCE(
           json_agg(json_build_object('id', c.id, 'title', c.title))
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

export default async function CommandCenterPage() {
  const userId = await getUserId()
  if (!userId) redirect('/login')

  const pool = getLocalPool()

  const [profile, { rows: starredRows }] = await Promise.all([
    getCachedProfile(undefined, userId),
    pool.query<StarredRow>(STARRED_QUERY, [userId]),
  ])

  const firstName = (profile as { full_name: string } | null)?.full_name?.split(' ')[0] ?? 'gebruiker'

  const starredItems: { boardId: string; boardName: string; cards: { id: string; title: string }[] }[] =
    starredRows.map((row) => ({
      boardId: row.board_id,
      boardName: row.board_name,
      cards: row.cards,
    }))

  return <CommandCenterClient firstName={firstName} starredItems={starredItems} />
}