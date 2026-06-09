'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getLocalTableList, type TableInfo } from '@/actions/local-db'
import { Table2 } from 'lucide-react'

export function LocalTableList() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    console.debug('[LocalTableList] Fetching table list...')
    getLocalTableList().then((result) => {
      console.debug('[LocalTableList] Result:', result.error ? `ERROR: ${result.error}` : `${result.tables.length} tables`)
      if (result.error) setError(result.error)
      else setTables(result.tables)
      setLoading(false)
    })
  }, [])

  if (loading) return <p className="text-muted-foreground">Tabellen laden...</p>
  if (error) return (
    <div className="space-y-2">
      <p className="text-destructive">{error}</p>
      <p className="text-sm text-muted-foreground">
        Zorg dat DIRECT_DATABASE_URL is geconfigureerd in je omgevingsvariabelen.
      </p>
    </div>
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {tables.map((t) => (
        <button
          key={`${t.schema}.${t.name}`}
          className="flex items-center gap-3 p-3 border rounded-lg hover:border-primary text-left"
          onClick={() => router.push(`/db/${t.name}`)}
        >
          <Table2 className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">{t.name}</p>
            <p className="text-xs text-muted-foreground">{t.columns.length} kolommen{t.schema !== 'public' ? ` · ${t.schema}` : ''}</p>
          </div>
        </button>
      ))}
    </div>
  )
}