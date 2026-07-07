'use client'

import { useState, FormEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { useClients, useCreateEntry } from '@/hooks/useHours'
import { parseDecimalInput } from '@/lib/decimal'
import { Plus } from 'lucide-react'

function todayISO(): string {
  const d = new Date()
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffset).toISOString().split('T')[0] ?? ''
}

export function HoursEntryForm() {
  const { data: clients } = useClients()
  const activeClients = (clients ?? []).filter((c) => !c.archived)
  const createMutation = useCreateEntry()
  const { toast } = useToast()

  const [clientId, setClientId] = useState('')
  const [entryDate, setEntryDate] = useState(todayISO())
  const [hoursRaw, setHoursRaw] = useState('')
  const [description, setDescription] = useState('')
  const [hoursError, setHoursError] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!clientId) {
      toast({ title: 'Opdrachtgever verplicht', variant: 'destructive' })
      return
    }
    if (!entryDate) {
      toast({ title: 'Datum verplicht', variant: 'destructive' })
      return
    }
    const parsed = parseDecimalInput(hoursRaw, false)
    if (!parsed.ok) {
      setHoursError(parsed.error)
      return
    }
    if (parsed.value === null || parsed.value <= 0) {
      setHoursError('Uren moeten groter dan 0 zijn')
      return
    }
    setHoursError(null)

    createMutation.mutate(
      {
        client_id: clientId,
        entry_date: entryDate,
        hours: parsed.value,
        description: description.trim() || null,
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            toast({ title: 'Opgeslagen', description: `${parsed.value} uur geregistreerd` })
            setHoursRaw('')
            setDescription('')
          } else {
            toast({ title: 'Fout bij opslaan', description: result.error, variant: 'destructive' })
          }
        },
        onError: (err) => {
          toast({ title: 'Fout bij opslaan', description: err.message, variant: 'destructive' })
        },
      }
    )
  }

  if (activeClients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Uren schrijven</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Voeg eerst een opdrachtgever toe via &quot;Beheer opdrachtgevers&quot;.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uren schrijven</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label htmlFor="hours-client" className="text-xs font-medium text-muted-foreground">
              Opdrachtgever
            </label>
            <Select
              value={clientId}
              onValueChange={setClientId}
              placeholder="Kies..."
              options={activeClients.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="hours-date" className="text-xs font-medium text-muted-foreground">
              Datum
            </label>
            <Input
              id="hours-date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              max={todayISO()}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="hours-amount" className="text-xs font-medium text-muted-foreground">
              Uren
            </label>
            <Input
              id="hours-amount"
              inputMode="decimal"
              value={hoursRaw}
              onChange={(e) => {
                setHoursRaw(e.target.value)
                if (hoursError) setHoursError(null)
              }}
              placeholder="bijv. 1,5 of 2.25"
              aria-invalid={!!hoursError}
            />
            {hoursError && <p className="text-xs text-destructive">{hoursError}</p>}
          </div>
          <div className="space-y-1">
            <label htmlFor="hours-desc" className="text-xs font-medium text-muted-foreground">
              Omschrijving (optioneel)
            </label>
            <Input
              id="hours-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Waar heb je aan gewerkt?"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <Button type="submit" disabled={createMutation.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Toevoegen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}