import { LocalDynamicTable } from '@/components/db-explorer/LocalDynamicTable'
import { getLocalTableMeta, getLocalTableRecords } from '@/actions/local-db'
import { ArrowLeft, Table2 } from 'lucide-react'
import Link from 'next/link'

export default async function LocalTablePage({ params }: { params: Promise<{ tableName: string }> }) {
  const { tableName } = await params

  // Eén parallelle batch i.p.v. eerst de hele tabellijst ophalen (N+1-systeem):
  // meta en records zijn onafhankelijk en kunnen gelijktijdig laden.
  const [metaResult, recordsResult] = await Promise.all([
    getLocalTableMeta(tableName),
    getLocalTableRecords({ tableName, page: 1, pageSize: 25 }),
  ])

  const meta = metaResult.meta
  if (!meta) {
    return <p className="text-destructive">{metaResult.error ?? `Tabel &quot;${tableName}&quot; niet gevonden.`}</p>
  }

  const { rows, totalCount } = recordsResult

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
          <p className="text-sm text-muted-foreground">{meta.columns.length} kolommen</p>
        </div>
      </div>
      <LocalDynamicTable
        tableName={tableName}
        columns={meta.columns}
        foreignKeys={meta.foreignKeys}
        initialRows={rows as Record<string, unknown>[]}
        initialTotal={totalCount}
      />
    </div>
  )
}