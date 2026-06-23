import { createClient, getUserId } from '@/lib/supabase/server'
import { ConnectionList } from '@/components/db-explorer/ConnectionList'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function DBConnectionsPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Database Connecties</h1>
      </div>
      <DBConnectionsPageContent />
    </div>
  )
}

async function DBConnectionsPageContent() {
  const userId = await getUserId()
  if (!userId) return null

  const supabase = await createClient()
  const { data: connections } = await supabase
    .from('kk_db_connections')
    .select('id, name, created_at')
    .eq('user_id', userId)
    .order('name')

  return (
    <ConnectionList
      connections={(connections ?? []) as { id: string; name: string; created_at: string }[]}
      onRefresh={async () => { 'use server' }}
    />
  )
}
