'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
import { LocalDynamicTable } from '@/components/db-explorer/LocalDynamicTable'
import { updateCrudOverview } from '@/actions/crud-overviews'
import type { ColumnFilters } from '@/lib/column-filters'
import type { ColumnInfo, ForeignKeyInfo } from '@/actions/local-db'

interface CrudTableWrapperProps {
  crudId: string
  tableName: string
  columns: ColumnInfo[]
  foreignKeys: ForeignKeyInfo[]
  hiddenColumns: string[]
  columnOrder: string[]
  filters: ColumnFilters
  initialRows: Record<string, unknown>[]
  initialTotal: number
}

export function CrudTableWrapper({
  crudId,
  tableName,
  columns,
  foreignKeys,
  hiddenColumns,
  columnOrder,
  filters,
  initialRows,
  initialTotal,
}: CrudTableWrapperProps) {
  const router = useRouter()
  const { toast } = useToast()

  const handleColumnReorder = useCallback(async (newOrder: string[]) => {
    const result = await updateCrudOverview({ crudId, column_order: newOrder })
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return
    }
    router.refresh()
  }, [crudId, router, toast])

  const handleFiltersChange = useCallback(async (newFilters: ColumnFilters) => {
    const result = await updateCrudOverview({ crudId, column_filters: newFilters })
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return
    }
    router.refresh()
  }, [crudId, router, toast])

  return (
    <LocalDynamicTable
      tableName={tableName}
      columns={columns}
      foreignKeys={foreignKeys}
      hiddenColumns={hiddenColumns}
      columnOrder={columnOrder}
      onColumnReorder={handleColumnReorder}
      filters={filters}
      onFiltersChange={handleFiltersChange}
      initialRows={initialRows}
      initialTotal={initialTotal}
    />
  )
}