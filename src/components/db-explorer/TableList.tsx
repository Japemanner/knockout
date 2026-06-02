'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getTableList, type TableInfo } from '@/actions/external-db'
import { Table2 } from 'lucide-react'

export function TableList({ connectionId }: { connectionId: string }) {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    getTableList({ connectionId }).then((result) => {
      if (result.error) setError(result.error)
      else setTables(result.tables)
      setLoading(false)
    })
  }, [connectionId])

  if (loading) return <p className="text-muted-foreground">Tabellen laden...</p>
  if (error) return <p className="text-destructive">{error}</p>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {tables.map((t) => (
        <button
          key={`${t.schema}.${t.name}`}
          className="flex items-center gap-3 p-3 border rounded-lg hover:border-primary text-left"
          onClick={() => router.push(`/settings/db/${connectionId}/${t.name}`)}
        >
          <Table2 className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">{t.name}</p>
            <p className="text-xs text-muted-foreground">{t.columns.length} kolommen</p>
          </div>
        </button>
      ))}
    </div>
  )
}
