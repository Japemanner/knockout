import { createClient } from '@/lib/supabase/server'
import { TableList } from '@/components/db-explorer/TableList'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ConnectionData {
  name: string
}

export default async function ConnectionPage({ params }: { params: Promise<{ connectionId: string }> }) {
  const { connectionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const result = await supabase
    .from('kk_db_connections')
    .select('name')
    .eq('id', connectionId)
    .eq('user_id', user!.id)
    .single()

  const conn = result.data as ConnectionData | null

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/settings/db" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">{conn?.name ?? 'Connectie'}</h1>
      </div>
      <TableList connectionId={connectionId} />
    </div>
  )
}