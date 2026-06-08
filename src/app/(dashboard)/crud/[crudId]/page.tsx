import { createClient } from '@/lib/supabase/server'
import { LocalTableList } from '@/components/db-explorer/LocalTableList'
import { TableList } from '@/components/db-explorer/TableList'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CRUDOverview } from '@/types/database.types'

interface CrudOverviewData {
  id: string
  name: string
  connection_id: string | null
}

interface ConnectionData {
  id: string
  name: string
}

export default async function CrudDetailPage({ params }: { params: Promise<{ crudId: string }> }) {
  const { crudId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) notFound()

  const { data: overview } = await supabase
    .from('kk_crud_overviews')
    .select('*')
    .eq('id', crudId)
    .eq('user_id', user.id)
    .single()

  const crudOverview = overview as CrudOverviewData | null
  if (!crudOverview) notFound()

  let content
  if (crudOverview.connection_id) {
    const { data: conn } = await supabase
      .from('kk_db_connections')
      .select('id, name')
      .eq('id', crudOverview.connection_id)
      .single()

    const connection = conn as ConnectionData | null

    if (!connection) {
      content = (
        <div className="text-center py-12">
          <p className="text-destructive mb-2">Connectie niet beschikbaar</p>
          <p className="text-sm text-muted-foreground">
            De gekoppelde externe databaseconnectie bestaat niet meer. Verwijder dit overzicht of koppel een andere connectie.
          </p>
        </div>
      )
    } else {
      content = <TableList connectionId={connection.id} />
    }
  } else {
    content = <LocalTableList />
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/crud" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{crudOverview.name}</h1>
          <p className="text-sm text-muted-foreground">
            {crudOverview.connection_id ? 'Externe database' : 'Eigen project'}
          </p>
        </div>
      </div>
      {content}
    </div>
  )
}