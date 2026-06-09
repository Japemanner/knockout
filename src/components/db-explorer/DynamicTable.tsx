'use client'

import { GenericTable, type TableDataSource } from '@/components/db-explorer/GenericTable'
import {
  useTableRecords,
  useCreateRecord,
  useUpdateRecord,
  useDeleteRecord,
} from '@/hooks/useDbExplorer'
import { getForeignKeyOptions, getTableRecords, createRecord, updateRecord, deleteRecord } from '@/actions/external-db'
import type { ColumnInfo, ForeignKeyInfo } from '@/actions/external-db'

interface DynamicTableProps {
  connectionId: string
  tableName: string
  columns: ColumnInfo[]
  foreignKeys: ForeignKeyInfo[]
  initialRows: Record<string, unknown>[]
  initialTotal: number
  pageSize?: number
}

export function DynamicTable({
  connectionId,
  tableName,
  columns,
  foreignKeys,
  initialRows,
  initialTotal,
  pageSize = 25,
}: DynamicTableProps) {
  const createMutation = useCreateRecord(connectionId, tableName)
  const updateMutation = useUpdateRecord(connectionId, tableName)
  const deleteMutation = useDeleteRecord(connectionId, tableName)

  const dataSource: TableDataSource = {
    getRecords: async (page, size) => {
      const result = await getTableRecords({ connectionId, tableName, page, pageSize: size })
      return { rows: result.rows ?? [], totalCount: result.totalCount ?? 0, error: result.error }
    },
    createRecord: async (values) => {
      const result = await createMutation.mutateAsync(values)
      return { error: result.error }
    },
    updateRecord: async (primaryKey, values) => {
      const result = await updateMutation.mutateAsync({ primaryKey, values })
      return { error: result.error }
    },
    deleteRecord: async (primaryKey) => {
      const result = await deleteMutation.mutateAsync(primaryKey)
      return { error: result.error }
    },
    getForeignKeyOptions: async (_columnName, referencedTable, referencedColumn) => {
      const result = await getForeignKeyOptions({ connectionId, referencedTable, referencedColumn })
      return { options: result.options ?? [], error: result.error }
    },
  }

  return (
    <GenericTable
      tableName={tableName}
      columns={columns}
      foreignKeys={foreignKeys}
      initialRows={initialRows}
      initialTotal={initialTotal}
      dataSource={dataSource}
      pageSize={pageSize}
    />
  )
}