import { createClient } from '@/lib/supabase/server'
import { DynamicTable } from '@/components/db-explorer/DynamicTable'
import { getTableRecords } from '@/actions/external-db'
import { getConnectionString } from '@/actions/db-connections'
import { getTables } from '@/lib/db/introspect'
import { ArrowLeft, Table2 } from 'lucide-react'
import Link from 'next/link'

interface ConnectionData {
  name: string
}

export default async function TableViewPage({ params }: { params: Promise<{ connectionId: string; tableName: string }> }) {
  const { connectionId, tableName } = await params
  const supabase = await createClient()

  const result = await supabase
    .from('db_connections')
    .select('name')
    .eq('id', connectionId)
    .single()

  const conn = result.data as ConnectionData | null

  const connStr = await getConnectionString(connectionId)
  const tables = await getTables(connectionId, connStr)
  const table = tables.find((t) => t.name === tableName)

  if (!table) {
    return <p className="text-destructive">Tabel &quot;{tableName}&quot; niet gevonden.</p>
  }

  const { rows, totalCount } = await getTableRecords({ connectionId, tableName, page: 1, pageSize: 25 })

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/settings/db/${connectionId}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Table2 className="h-6 w-6 text-muted-foreground" /> {tableName}
          </h1>
          <p className="text-sm text-muted-foreground">{conn?.name} · {table.columns.length} kolommen</p>
        </div>
      </div>
      <DynamicTable
        connectionId={connectionId}
        tableName={tableName}
        columns={table.columns}
        foreignKeys={table.foreignKeys}
        initialRows={rows as Record<string, unknown>[]}
        initialTotal={totalCount}
      />
    </div>
  )
}