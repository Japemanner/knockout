'use client'

import { useState, useMemo, FormEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { useClients, useEntries, useUpdateEntry, useDeleteEntry } from '@/hooks/useHours'
import type { EntryWithClient } from '@/actions/hours'
import { parseDecimalInput } from '@/lib/decimal'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Trash2, Pencil, Save, X } from 'lucide-react'

type PeriodPreset = 'week' | 'month' | 'custom'

function startOfWeekISO(): string {
  const d = new Date()
  const day = d.getDay() || 7
  const monday = new Date(d)
  monday.setDate(d.getDate() - day + 1)
  return monday.toISOString().split('T')[0] ?? ''
}
function startOfMonthISO(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0] ?? ''
}
function todayISO(): string {
  const d = new Date()
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffset).toISOString().split('T')[0] ?? ''
}

interface DayGroup {
  date: string
  entries: EntryWithClient[]
  total: number
}

function groupByDay(entries: EntryWithClient[]): DayGroup[] {
  const map = new Map<string, EntryWithClient[]>()
  for (const e of entries) {
    const arr = map.get(e.entry_date) ?? []
    arr.push(e)
    map.set(e.entry_date, arr)
  }
  return Array.from(map.entries())
    .map(([date, dayEntries]) => ({
      date,
      entries: dayEntries,
      total: dayEntries.reduce((sum, e) => sum + e.hours, 0),
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function HoursHistory() {
  const { data: clients } = useClients()
  const [clientFilter, setClientFilter] = useState('all')
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('month')
  const [fromDate, setFromDate] = useState(startOfMonthISO())
  const [toDate, setToDate] = useState(todayISO())
  const [page, setPage] = useState(0)
  const pageSize = 50

  const query = useEntries({
    clientId: clientFilter === 'all' ? undefined : clientFilter,
    fromDate,
    toDate,
    limit: pageSize,
    offset: page * pageSize,
  })

  const updateMutation = useUpdateEntry()
  const deleteMutation = useDeleteEntry()
  const { toast } = useToast()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editHours, setEditHours] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  const applyPreset = (preset: PeriodPreset) => {
    setPeriodPreset(preset)
    setPage(0)
    if (preset === 'week') {
      setFromDate(startOfWeekISO())
      setToDate(todayISO())
    } else if (preset === 'month') {
      setFromDate(startOfMonthISO())
      setToDate(todayISO())
    }
  }

  const handleClientFilterChange = (value: string) => {
    setClientFilter(value)
    setPage(0)
  }

  const handleCustomDateChange = (kind: 'from' | 'to', value: string) => {
    setPeriodPreset('custom')
    setPage(0)
    if (kind === 'from') setFromDate(value)
    else setToDate(value)
  }

  const startEdit = (entry: EntryWithClient) => {
    setEditingId(entry.id)
    setEditHours(String(entry.hours).replace('.', ','))
    setEditDescription(entry.description ?? '')
    setEditError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditError(null)
  }

  const saveEdit = (entry: EntryWithClient) => {
    const parsed = parseDecimalInput(editHours, false)
    if (!parsed.ok || parsed.value === null || parsed.value <= 0) {
      setEditError(parsed.ok ? 'Uren moeten groter dan 0 zijn' : parsed.error)
      return
    }
    updateMutation.mutate(
      {
        entryId: entry.id,
        patch: {
          hours: parsed.value,
          description: editDescription.trim() || null,
        },
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            setEditingId(null)
            toast({ title: 'Opgeslagen' })
          } else {
            toast({ title: 'Fout', description: result.error, variant: 'destructive' })
          }
        },
      }
    )
  }

  const handleDelete = (entry: EntryWithClient) => {
    deleteMutation.mutate(entry.id, {
      onSuccess: (result) => {
        if (result.success) {
          toast({ title: 'Verwijderd' })
        } else {
          toast({ title: 'Fout', description: result.error, variant: 'destructive' })
        }
      },
    })
  }

  const entries: EntryWithClient[] = useMemo(() => query.data?.entries ?? [], [query.data])
  const total = query.data?.total ?? 0
  const dayGroups = useMemo(() => groupByDay(entries), [entries])
  const hasMore = (page + 1) * pageSize < total

  if (query.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historie</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Opdrachtgever</label>
            <Select
              value={clientFilter}
              onValueChange={handleClientFilterChange}
              options={[
                { value: 'all', label: 'Alle opdrachtgevers' },
                ...(clients ?? []).map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Periode</label>
            <Select
              value={periodPreset}
              onValueChange={(v) => applyPreset(v as PeriodPreset)}
              options={[
                { value: 'week', label: 'Deze week' },
                { value: 'month', label: 'Deze maand' },
                { value: 'custom', label: 'Aangepast' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Van</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => handleCustomDateChange('from', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tot</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => handleCustomDateChange('to', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Lijst */}
        {dayGroups.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            Geen urenregels in deze periode.
          </p>
        ) : (
          <div className="space-y-4">
            {dayGroups.map((group) => (
              <div key={group.date}>
                <div className="flex items-baseline justify-between mb-2 pb-1 border-b">
                  <span className="text-sm font-semibold capitalize">
                    {format(parseISO(group.date), 'EEEE d MMMM yyyy', { locale: nl })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {group.total.toFixed(2).replace('.', ',')} uur
                  </span>
                </div>
                <div className="space-y-2">
                  {group.entries.map((entry) =>
                    editingId === entry.id ? (
                      <div
                        key={entry.id}
                        className="p-3 border rounded-lg space-y-2 bg-muted/30"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="space-y-1 sm:col-span-1">
                            <label className="text-xs text-muted-foreground">Uren</label>
                            <Input
                              inputMode="decimal"
                              value={editHours}
                              onChange={(e) => {
                                setEditHours(e.target.value)
                                if (editError) setEditError(null)
                              }}
                              autoFocus
                            />
                            {editError && (
                              <p className="text-xs text-destructive">{editError}</p>
                            )}
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-xs text-muted-foreground">Omschrijving</label>
                            <Input
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={cancelEdit}>
                            <X className="h-3 w-3 mr-1" />
                            Annuleren
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => saveEdit(entry)}
                            disabled={updateMutation.isPending}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Opslaan
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={entry.id}
                        className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary">{entry.client_name}</Badge>
                            <span className="font-medium">{entry.hours.toFixed(2).replace('.', ',')} uur</span>
                          </div>
                          {entry.description && (
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                              {entry.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(entry)}
                            aria-label="Bewerken"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(entry)}
                            disabled={deleteMutation.isPending}
                            aria-label="Verwijderen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                  Meer laden
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}