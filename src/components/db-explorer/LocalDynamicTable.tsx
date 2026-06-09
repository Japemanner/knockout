'use client'

import { GenericTable, type TableDataSource } from '@/components/db-explorer/GenericTable'
import {
  useCreateLocalRecord,
  useUpdateLocalRecord,
  useDeleteLocalRecord,
} from '@/hooks/useDbExplorer'
import { getLocalTableRecords, createLocalRecord, updateLocalRecord, deleteLocalRecord, getLocalForeignKeyOptions } from '@/actions/local-db'
import type { ColumnInfo, ForeignKeyInfo } from '@/actions/local-db'

interface LocalDynamicTableProps {
  tableName: string
  columns: ColumnInfo[]
  foreignKeys: ForeignKeyInfo[]
  initialRows: Record<string, unknown>[]
  initialTotal: number
  pageSize?: number
}

export function LocalDynamicTable({
  tableName,
  columns,
  foreignKeys,
  initialRows,
  initialTotal,
  pageSize = 25,
}: LocalDynamicTableProps) {
  const createMutation = useCreateLocalRecord(tableName)
  const updateMutation = useUpdateLocalRecord(tableName)
  const deleteMutation = useDeleteLocalRecord(tableName)

  const dataSource: TableDataSource = {
    getRecords: async (page, size) => {
      const result = await getLocalTableRecords({ tableName, page, pageSize: size })
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
      const result = await getLocalForeignKeyOptions({ referencedTable, referencedColumn })
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
      showCreateWhenNoPk={false}
    />
  )
}