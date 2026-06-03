import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FolderKanban } from 'lucide-react'
import type { Board } from '@/types/database.types'

export default async function BoardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('kk_boards')
    .select('*')
    .eq('user_id', user!.id)
    .order('position', { ascending: true })

  const boards: Board[] = data ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Borden</h1>
          <p className="text-muted-foreground">Je Kanban-borden</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Nieuw bord
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {boards.length > 0 ? (
          boards.map((board: Board) => (
            <Link key={board.id} href={`/boards/${board.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FolderKanban className="h-5 w-5 text-muted-foreground" />
                    {board.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {board.is_inbox ? 'Inbox — quick capture bestemming' : 'Kanban-bord'}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <p className="text-muted-foreground col-span-full text-center py-12">
            Nog geen borden. Maak je eerste bord aan met de knop hierboven.
          </p>
        )}
      </div>
    </div>
  )
}
