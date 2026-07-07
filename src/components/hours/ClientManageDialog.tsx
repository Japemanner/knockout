'use client'

import { useState, FormEvent } from 'react'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useArchiveClient,
  useUnarchiveClient,
} from '@/hooks/useHours'
import { parseDecimalInput } from '@/lib/decimal'
import type { Client, ClientTargetPeriod } from '@/types/database.types'
import { Plus, Pencil, Archive, ArchiveRestore, Save, X } from 'lucide-react'

const PERIOD_OPTIONS = [
  { value: 'week', label: 'Per week' },
  { value: 'month', label: 'Per maand' },
  { value: 'total', label: 'Totaal project' },
]

export function ClientManageDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: clients } = useClients()
  const createMutation = useCreateClient()
  const updateMutation = useUpdateClient()
  const archiveMutation = useArchiveClient()
  const unarchiveMutation = useUnarchiveClient()
  const { toast } = useToast()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [targetHoursRaw, setTargetHoursRaw] = useState('')
  const [targetPeriod, setTargetPeriod] = useState<ClientTargetPeriod>('month')
  const [hoursError, setHoursError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editTargetHoursRaw, setEditTargetHoursRaw] = useState('')
  const [editTargetPeriod, setEditTargetPeriod] = useState<ClientTargetPeriod>('month')
  const [editError, setEditError] = useState<string | null>(null)

  const resetForm = () => {
    setName('')
    setTargetHoursRaw('')
    setTargetPeriod('month')
    setHoursError(null)
    setShowForm(false)
  }

  const handleCreate = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast({ title: 'Naam verplicht', variant: 'destructive' })
      return
    }
    const parsed = parseDecimalInput(targetHoursRaw, false)
    if (!parsed.ok || parsed.value === null || parsed.value < 0) {
      setHoursError(parsed.ok ? 'Target uren moeten ≥ 0 zijn' : parsed.error)
      return
    }
    setHoursError(null)
    createMutation.mutate(
      {
        name: name.trim(),
        target_hours: parsed.value,
        target_period: targetPeriod,
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            toast({ title: 'Opdrachtgever toegevoegd' })
            resetForm()
          } else {
            toast({ title: 'Fout', description: result.error, variant: 'destructive' })
          }
        },
      }
    )
  }

  const startEdit = (client: Client) => {
    setEditingId(client.id)
    setEditName(client.name)
    setEditTargetHoursRaw(String(client.target_hours).replace('.', ','))
    setEditTargetPeriod(client.target_period)
    setEditError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditError(null)
  }

  const saveEdit = (clientId: string) => {
    if (!editName.trim()) {
      toast({ title: 'Naam verplicht', variant: 'destructive' })
      return
    }
    const parsed = parseDecimalInput(editTargetHoursRaw, false)
    if (!parsed.ok || parsed.value === null || parsed.value < 0) {
      setEditError(parsed.ok ? 'Target uren moeten ≥ 0 zijn' : parsed.error)
      return
    }
    setEditError(null)
    updateMutation.mutate(
      {
        clientId,
        patch: {
          name: editName.trim(),
          target_hours: parsed.value,
          target_period: editTargetPeriod,
        },
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            toast({ title: 'Opgeslagen' })
            setEditingId(null)
          } else {
            toast({ title: 'Fout', description: result.error, variant: 'destructive' })
          }
        },
      }
    )
  }

  const handleArchiveToggle = (client: Client) => {
    const mutation = client.archived ? unarchiveMutation : archiveMutation
    mutation.mutate(client.id, {
      onSuccess: (result) => {
        if (result.success) {
          toast({ title: client.archived ? 'Hersteld' : 'Gearchiveerd' })
        } else {
          toast({ title: 'Fout', description: result.error, variant: 'destructive' })
        }
      },
    })
  }

  const allClients = clients ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Opdrachtgevers beheren</DialogTitle>
        <DialogDescription>
          Voeg opdrachtgevers toe, stel target uren in per periode, en archiveer oude opdrachtgevers.
        </DialogDescription>
      </DialogHeader>

      <DialogContent className="space-y-4">
        {/* Nieuwe opdrachtgever */}
        {!showForm ? (
          <Button onClick={() => setShowForm(true)} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe opdrachtgever
          </Button>
        ) : (
          <form onSubmit={handleCreate} className="p-3 border rounded-lg space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Naam</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="bijv. Acme BV"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Target uren</label>
                <Input
                  inputMode="decimal"
                  value={targetHoursRaw}
                  onChange={(e) => {
                    setTargetHoursRaw(e.target.value)
                    if (hoursError) setHoursError(null)
                  }}
                  placeholder="bijv. 40"
                />
                {hoursError && <p className="text-xs text-destructive">{hoursError}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Periode</label>
                <Select
                  value={targetPeriod}
                  onValueChange={(v) => setTargetPeriod(v as ClientTargetPeriod)}
                  options={PERIOD_OPTIONS}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                Annuleren
              </Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending}>
                Toevoegen
              </Button>
            </div>
          </form>
        )}

        {/* Lijst */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {allClients.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Nog geen opdrachtgevers.
            </p>
          ) : (
            allClients.map((client) =>
              editingId === client.id ? (
                <div key={client.id} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Input
                        inputMode="decimal"
                        value={editTargetHoursRaw}
                        onChange={(e) => {
                          setEditTargetHoursRaw(e.target.value)
                          if (editError) setEditError(null)
                        }}
                        placeholder="Target uren"
                      />
                      {editError && <p className="text-xs text-destructive mt-1">{editError}</p>}
                    </div>
                    <Select
                      value={editTargetPeriod}
                      onValueChange={(v) => setEditTargetPeriod(v as ClientTargetPeriod)}
                      options={PERIOD_OPTIONS}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={cancelEdit}>
                      <X className="h-3 w-3 mr-1" />
                      Annuleren
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveEdit(client.id)}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Opslaan
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{client.name}</span>
                      {client.archived && <Badge variant="outline">Gearchiveerd</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {Number(client.target_hours)} uur {client.target_period === 'week' ? 'per week' : client.target_period === 'month' ? 'per maand' : 'totaal'}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(client)}
                      aria-label="Bewerken"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleArchiveToggle(client)}
                      disabled={archiveMutation.isPending || unarchiveMutation.isPending}
                      aria-label={client.archived ? 'Herstellen' : 'Archiveren'}
                    >
                      {client.archived ? (
                        <ArchiveRestore className="h-4 w-4" />
                      ) : (
                        <Archive className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )
            )
          )}
        </div>
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Sluiten
        </Button>
      </DialogFooter>
    </Dialog>
  )
}