'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { updateCrudOverview } from '@/actions/crud-overviews'
import { Columns3, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { isDefaultOrder } from '@/lib/column-order'
import type { ColumnInfo } from '@/actions/local-db'

interface ColumnVisibilityDialogProps {
  crudId: string
  columns: ColumnInfo[]
  hiddenColumns: string[]
  columnOrder?: string[]
}

export function ColumnVisibilityDialog({ crudId, columns, hiddenColumns, columnOrder = [] }: ColumnVisibilityDialogProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => {
    const visible = columns.filter((c) => !c.isPrimaryKey && !hiddenColumns.includes(c.name))
    return new Set(visible.map((c) => c.name))
  })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const nonPkColumns = columns.filter((c) => !c.isPrimaryKey)

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    const newHidden = nonPkColumns.filter((c) => !selected.has(c.name)).map((c) => c.name)
    const result = await updateCrudOverview({ crudId, hidden_columns: newHidden })
    setSaving(false)
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Kolomvoorkeuren opgeslagen' })
    setOpen(false)
    router.refresh()
  }

  const handleResetOrder = async () => {
    setSaving(true)
    const result = await updateCrudOverview({ crudId, column_order: [] })
    setSaving(false)
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Kolomvolgorde hersteld' })
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground"
      >
        <Columns3 className="h-4 w-4 mr-1" /> Kolommen
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kolommen tonen/verbergen</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Vink de kolommen aan die je wilt zien in het overzicht en in het bewerkformulier.
          </p>
          <div className="space-y-2 mt-4">
            {nonPkColumns.map((col) => (
              <Checkbox
                key={col.name}
                checked={selected.has(col.name)}
                onCheckedChange={() => toggle(col.name)}
                label={col.name}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetOrder}
              disabled={saving || isDefaultOrder(columnOrder)}
              className="text-muted-foreground"
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Reset volgorde
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuleren</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Opslaan...' : 'Opslaan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
