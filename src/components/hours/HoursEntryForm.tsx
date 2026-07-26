'use client'

import { useState, FormEvent, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { useClients, useCreateEntry } from '@/hooks/useHours'
import { Plus, Clock } from 'lucide-react'

function todayISO(): string {
  const d = new Date()
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffset).toISOString().split('T')[0] ?? ''
}

function dateWithTime(dateISO: string, timeHHMM: string): string | null {
  if (!dateISO || !timeHHMM) return null
  const parts = timeHHMM.split(':')
  const h = parts[0] !== undefined ? Number(parts[0]) : NaN
  const m = parts[1] !== undefined ? Number(parts[1]) : NaN
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  const d = new Date(`${dateISO}T00:00:00`)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

function diffHours(startISO: string, endISO: string): number | null {
  const start = new Date(startISO)
  const end = new Date(endISO)
  const diffMs = end.getTime() - start.getTime()
  if (diffMs <= 0) return null
  return Math.round((diffMs / 3_600_000) * 100) / 100
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const v = String(i).padStart(2, '0')
  return { value: v, label: v }
})
const MINUTE_OPTIONS = ['00', '15', '30', '45'].map((v) => ({ value: v, label: v }))

export function HoursEntryForm() {
  const { data: clients } = useClients()
  const activeClients = (clients ?? []).filter((c) => !c.archived)
  const createMutation = useCreateEntry()
  const { toast } = useToast()

  const [clientId, setClientId] = useState('')
  const [entryDate, setEntryDate] = useState(todayISO())
  const [startHour, setStartHour] = useState('')
  const [startMinute, setStartMinute] = useState('')
  const [endHour, setEndHour] = useState('')
  const [endMinute, setEndMinute] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const startTime = startHour && startMinute ? `${startHour}:${startMinute}` : ''
  const endTime = endHour && endMinute ? `${endHour}:${endMinute}` : ''

  const computedHours = useMemo(() => {
    if (!startTime || !endTime || !entryDate) return null
    const startISO = dateWithTime(entryDate, startTime)
    const endISO = dateWithTime(entryDate, endTime)
    if (!startISO || !endISO) return null
    return diffHours(startISO, endISO)
  }, [startTime, endTime, entryDate])

  const displayHours = computedHours !== null ? String(computedHours).replace('.', ',') : ''

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!clientId) {
      setFormError('Opdrachtgever is verplicht')
      return
    }
    if (!entryDate) {
      setFormError('Datum is verplicht')
      return
    }
    if (!startTime || !endTime) {
      setFormError('Start- en eindtijd zijn verplicht')
      return
    }

    const startTimeISO = dateWithTime(entryDate, startTime)
    const endTimeISO = dateWithTime(entryDate, endTime)
    if (!startTimeISO || !endTimeISO) {
      setFormError('Ongeldige start- of eindtijd')
      return
    }
    const diff = diffHours(startTimeISO, endTimeISO)
    if (diff === null) {
      setFormError('Eindtijd moet na starttijd liggen')
      return
    }

    createMutation.mutate(
      {
        client_id: clientId,
        entry_date: entryDate,
        hours: diff,
        start_time: startTimeISO,
        end_time: endTimeISO,
        description: description.trim() || null,
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            toast({ title: 'Opgeslagen', description: `${diff} uur geregistreerd` })
            setStartHour('')
            setStartMinute('')
            setEndHour('')
            setEndMinute('')
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
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Uren schrijven
        </CardTitle>
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
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Starttijd</label>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={startHour}
                onValueChange={setStartHour}
                placeholder="Uur"
                options={HOUR_OPTIONS}
              />
              <Select
                value={startMinute}
                onValueChange={setStartMinute}
                placeholder="Min"
                options={MINUTE_OPTIONS}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Eindtijd</label>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={endHour}
                onValueChange={setEndHour}
                placeholder="Uur"
                options={HOUR_OPTIONS}
              />
              <Select
                value={endMinute}
                onValueChange={setEndMinute}
                placeholder="Min"
                options={MINUTE_OPTIONS}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="hours-amount" className="text-xs font-medium text-muted-foreground">
              Uren (automatisch berekend)
            </label>
            <Input
              id="hours-amount"
              value={displayHours}
              readOnly
              placeholder="Vul start- en eindtijd in"
              tabIndex={-1}
              className="bg-muted/50 cursor-not-allowed"
              aria-invalid={!!formError}
            />
          </div>
          <div className="space-y-1 sm:col-span-1 lg:col-span-3">
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
          {formError && (
            <p className="text-xs text-destructive sm:col-span-2 lg:col-span-4">{formError}</p>
          )}
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