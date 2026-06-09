'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { getLocalTableList } from '@/actions/local-db'

interface CreateCrudDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: { name: string; table_name: string; interaction_type: 'crud' | 'formulier' }) => Promise<{ id: string; error?: string }>
}

export function CreateCrudDialog({ open, onOpenChange, onCreate }: CreateCrudDialogProps) {
  const [name, setName] = useState('')
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false)
  const [tables, setTables] = useState<{ name: string; schema: string }[]>([])
  const [tableName, setTableName] = useState<string>('')
  const [tablesLoading, setTablesLoading] = useState(false)
  const [tablesError, setTablesError] = useState('')
  const [interactionType, setInteractionType] = useState<'crud' | 'formulier'>('crud')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const loadTables = useCallback(async () => {
    setTablesLoading(true)
    setTablesError('')
    setTables([])
    setTableName('')

    const result = await getLocalTableList()
    if (result.error) {
      setTablesError(result.error)
    } else {
      setTables(result.tables.map((t) => ({ name: t.name, schema: t.schema })))
    }
    setTablesLoading(false)
  }, [])

  useEffect(() => {
    if (open) {
      loadTables()
    } else {
      setName('')
      setNameManuallyEdited(false)
      setTables([])
      setTableName('')
      setTablesLoading(false)
      setTablesError('')
      setInteractionType('crud')
    }
  }, [open, loadTables])

  const handleTableChange = (value: string) => {
    setTableName(value)
    if (!nameManuallyEdited && value) {
      const displayName = value.replace(/^kk_/, '').replace(/_/g, ' ')
      const capitalized = displayName.charAt(0).toUpperCase() + displayName.slice(1)
      setName(`${capitalized} CRUD`)
    }
  }

  const handleNameChange = (value: string) => {
    setName(value)
    setNameManuallyEdited(true)
  }

  const handleCreate = async () => {
    if (!name.trim() || !tableName) return
    setIsLoading(true)
    const result = await onCreate({
      name: name.trim(),
      table_name: tableName,
      interaction_type: interactionType,
    })
    setIsLoading(false)
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return
    }
    onOpenChange(false)
  }

  const canCreate = name.trim() && tableName && !isLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nieuw CRUD overzicht</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Interactie</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                  interactionType === 'crud'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background hover:bg-accent'
                }`}
                onClick={() => setInteractionType('crud')}
              >
                CRUD
              </button>
              <button
                type="button"
                disabled
                title="Binnenkort beschikbaar"
                className="flex-1 px-3 py-2 rounded-md border text-sm font-medium border-input bg-muted text-muted-foreground cursor-not-allowed opacity-50"
              >
                Formulier
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Kies het type interactie voor dit overzicht.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Tabel</label>
            {tablesLoading && (
              <div className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                Tabellen laden...
              </div>
            )}
            {tablesError && (
              <div className="space-y-1">
                <p className="text-sm text-destructive">{tablesError}</p>
                <Button variant="outline" size="sm" onClick={loadTables}>
                  Opnieuw proberen
                </Button>
              </div>
            )}
            {!tablesLoading && !tablesError && (
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={tableName}
                onChange={(e) => handleTableChange(e.target.value)}
              >
                <option value="">-- Kies een tabel --</option>
                {tables.map((t) => (
                  <option key={`${t.schema}.${t.name}`} value={t.name}>
                    {t.name}{t.schema !== 'public' ? ` (${t.schema})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Naam</label>
            <Input
              autoFocus
              placeholder="Naam voor dit overzicht..."
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && canCreate) handleCreate() }}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button onClick={handleCreate} disabled={!canCreate}>
              Aanmaken
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}