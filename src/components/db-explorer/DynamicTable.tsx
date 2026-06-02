'use client'

import { useState, useCallback } from 'react'
import { DynamicForm } from '@/components/db-explorer/DynamicForm'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { createRecord, updateRecord, deleteRecord, getForeignKeyOptions, type ColumnInfo, type ForeignKeyInfo } from '@/actions/external-db'
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react'

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
  const [rows, setRows] = useState(initialRows)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState<'create' | { row: Record<string, unknown> } | null>(null)
  const [showDelete, setShowDelete] = useState<Record<string, unknown> | null>(null)
  const { toast } = useToast()

  const totalPages = Math.ceil(total / pageSize)
  const pk = columns.find((c) => c.isPrimaryKey)

  const loadPage = useCallback(async (pageNum: number) => {
    setLoading(true)
    const { getTableRecords } = await import('@/actions/external-db')
    const result = await getTableRecords({ connectionId, tableName, page: pageNum, pageSize })
    if (!result.error) {
      setRows(result.rows)
      setTotal(result.totalCount)
    }
    setPage(pageNum)
    setLoading(false)
  }, [connectionId, tableName, pageSize])

  const handleCreate = useCallback(async (values: Record<string, unknown>) => {
    const result = await createRecord({ connectionId, tableName, values })
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: 'Record aangemaakt' })
      setShowForm(null)
      loadPage(1)
    }
  }, [connectionId, tableName, loadPage, toast])

  const handleUpdate = useCallback(async (values: Record<string, unknown>) => {
    if (!pk || !showForm || showForm === 'create') return
    const row = showForm.row
    const result = await updateRecord({ connectionId, tableName, primaryKey: { column: pk.name, value: row[pk.name] }, values })
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: 'Record bijgewerkt' })
      setShowForm(null)
      loadPage(page)
    }
  }, [connectionId, tableName, showForm, pk, page, loadPage, toast])

  const handleDelete = useCallback(async () => {
    if (!pk || !showDelete) return
    const result = await deleteRecord({ connectionId, tableName, primaryKey: { column: pk.name, value: showDelete[pk.name] } })
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: 'Record verwijderd' })
    }
    setShowDelete(null)
    loadPage(page)
  }, [connectionId, tableName, showDelete, pk, page, loadPage, toast])

  // Preload FK options for all FK columns
  const [fkOptions, setFkOptions] = useState<Record<string, { value: unknown; label: string }[]>>({})
  useState(() => {
    foreignKeys.forEach(async (fk) => {
      const result = await getForeignKeyOptions({ connectionId, referencedTable: fk.referencedTable, referencedColumn: fk.referencedColumn })
      if (!result.error) {
        setFkOptions((prev) => ({ ...prev, [fk.columnName]: result.options }))
      }
    })
  })

  const displayColumns = columns.filter((c) => !c.isPrimaryKey).slice(0, 8)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{tableName}</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowForm('create')}>
            <Plus className="h-3 w-3 mr-1" /> Record
          </Button>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => loadPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm mx-2">{page}/{totalPages}</span>
              <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => loadPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              {displayColumns.map((c) => (
                <th key={c.name} className="text-left px-3 py-2 font-medium text-muted-foreground">{c.name}</th>
              ))}
              <th className="px-3 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={displayColumns.length + 1} className="px-3 py-4 text-center text-muted-foreground">Laden...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={displayColumns.length + 1} className="px-3 py-4 text-center text-muted-foreground">Geen records</td></tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-t hover:bg-accent/50">
                  {displayColumns.map((c) => (
                    <td key={c.name} className="px-3 py-2 truncate max-w-[200px]">
                      {row[c.name] === null ? <span className="text-muted-foreground italic text-xs">NULL</span> : String(row[c.name])}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowForm({ row })}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setShowDelete(row)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Dialog open onOpenChange={() => setShowForm(null)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{showForm === 'create' ? 'Nieuw record' : 'Record bewerken'}</DialogTitle>
            </DialogHeader>
            <DynamicForm
              columns={columns}
              foreignKeys={foreignKeys}
              fkOptions={fkOptions}
              initialValues={showForm === 'create' ? {} : showForm.row}
              onSubmit={showForm === 'create' ? handleCreate : handleUpdate}
              onCancel={() => setShowForm(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {showDelete && (
        <Dialog open onOpenChange={() => setShowDelete(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Record verwijderen</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Weet je zeker dat je dit record wilt verwijderen? Dit kan niet ongedaan worden gemaakt.</p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowDelete(null)}>Annuleren</Button>
              <Button variant="destructive" onClick={handleDelete}>Verwijderen</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
