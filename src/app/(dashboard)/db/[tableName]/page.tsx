import { LocalDynamicTable } from '@/components/db-explorer/LocalDynamicTable'
import { getLocalTableRecords, getLocalTableList } from '@/actions/local-db'
import { ArrowLeft, Table2 } from 'lucide-react'
import Link from 'next/link'

export default async function LocalTablePage({ params }: { params: Promise<{ tableName: string }> }) {
  const { tableName } = await params

  const { tables } = await getLocalTableList()
  const table = tables.find((t) => t.name === tableName)

  if (!table) {
    return <p className="text-destructive">Tabel &quot;{tableName}&quot; niet gevonden.</p>
  }

  const { rows, totalCount } = await getLocalTableRecords({ tableName, page: 1, pageSize: 25 })

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/db" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Table2 className="h-6 w-6 text-muted-foreground" /> {tableName}
          </h1>
          <p className="text-sm text-muted-foreground">{table.columns.length} kolommen{table.schema !== 'public' ? ` · ${table.schema}` : ''}</p>
        </div>
      </div>
      <LocalDynamicTable
        tableName={tableName}
        columns={table.columns}
        foreignKeys={table.foreignKeys}
        initialRows={rows as Record<string, unknown>[]}
        initialTotal={totalCount}
      />
    </div>
  )
}