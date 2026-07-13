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

function isoToHHMM(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const v = String(i).padStart(2, '0')
  return { value: v, label: v }
})
const MINUTE_OPTIONS = ['00', '15', '30', '45'].map((v) => ({ value: v, label: v }))

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
  const [editDate, setEditDate] = useState('')
  const [editStartHour, setEditStartHour] = useState('')
  const [editStartMinute, setEditStartMinute] = useState('')
  const [editEndHour, setEditEndHour] = useState('')
  const [editEndMinute, setEditEndMinute] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  const editStartTime = editStartHour && editStartMinute ? `${editStartHour}:${editStartMinute}` : ''
  const editEndTime = editEndHour && editEndMinute ? `${editEndHour}:${editEndMinute}` : ''

  const editComputedHours = useMemo(() => {
    if (!editStartTime || !editEndTime || !editDate) return null
    const startISO = dateWithTime(editDate, editStartTime)
    const endISO = dateWithTime(editDate, editEndTime)
    if (!startISO || !endISO) return null
    return diffHours(startISO, endISO)
  }, [editStartTime, editEndTime, editDate])

  const editDisplayHours =
    editComputedHours !== null ? String(editComputedHours).replace('.', ',') : ''

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
    setEditDate(entry.entry_date)
    const s = isoToHHMM(entry.start_time)
    const e = isoToHHMM(entry.end_time)
    setEditStartHour(s ? s.split(':')[0] ?? '' : '')
    setEditStartMinute(s ? s.split(':')[1] ?? '' : '')
    setEditEndHour(e ? e.split(':')[0] ?? '' : '')
    setEditEndMinute(e ? e.split(':')[1] ?? '' : '')
    setEditDescription(entry.description ?? '')
    setEditError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditError(null)
  }

  const saveEdit = (entry: EntryWithClient) => {
    if (!editStartTime || !editEndTime) {
      setEditError('Start- en eindtijd zijn verplicht')
      return
    }
    const startTimeISO = dateWithTime(editDate, editStartTime)
    const endTimeISO = dateWithTime(editDate, editEndTime)
    if (!startTimeISO || !endTimeISO) {
      setEditError('Ongeldige start- of eindtijd')
      return
    }
    const diff = diffHours(startTimeISO, endTimeISO)
    if (diff === null) {
      setEditError('Eindtijd moet na starttijd liggen')
      return
    }
    updateMutation.mutate(
      {
        entryId: entry.id,
        patch: {
          entry_date: editDate,
          hours: diff,
          start_time: startTimeISO,
          end_time: endTimeISO,
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
                    {group.entries.some((e) => Number(e.hourly_rate) > 0) && (
                      <> · € {group.entries.reduce((sum, e) => sum + e.hours * Number(e.hourly_rate), 0).toFixed(2).replace('.', ',')}</>
                    )}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.entries.map((entry) =>
                    editingId === entry.id ? (
                      <div
                        key={entry.id}
                        className="p-3 border rounded-lg space-y-2 bg-muted/30"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Datum</label>
                            <Input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              max={todayISO()}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">
                              Uren (automatisch)
                            </label>
                            <Input
                              value={editDisplayHours}
                              readOnly
                              placeholder="Vul tijden in"
                              tabIndex={-1}
                              className="bg-muted/50 cursor-not-allowed"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Starttijd</label>
                            <div className="grid grid-cols-2 gap-2">
                              <Select
                                value={editStartHour}
                                onValueChange={setEditStartHour}
                                placeholder="Uur"
                                options={HOUR_OPTIONS}
                              />
                              <Select
                                value={editStartMinute}
                                onValueChange={setEditStartMinute}
                                placeholder="Min"
                                options={MINUTE_OPTIONS}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Eindtijd</label>
                            <div className="grid grid-cols-2 gap-2">
                              <Select
                                value={editEndHour}
                                onValueChange={setEditEndHour}
                                placeholder="Uur"
                                options={HOUR_OPTIONS}
                              />
                              <Select
                                value={editEndMinute}
                                onValueChange={setEditEndMinute}
                                placeholder="Min"
                                options={MINUTE_OPTIONS}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Omschrijving</label>
                          <Input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                          />
                        </div>
                        {editError && (
                          <p className="text-xs text-destructive">{editError}</p>
                        )}
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
                            {Number(entry.hourly_rate) > 0 && (
                              <span className="text-xs text-muted-foreground">
                                € {entry.hourly_rate.toFixed(2).replace('.', ',')} / uur
                                {' → '}
                                € {(entry.hours * Number(entry.hourly_rate)).toFixed(2).replace('.', ',')}
                              </span>
                            )}
                            {entry.start_time && entry.end_time && (
                              <span className="text-xs text-muted-foreground">
                                {isoToHHMM(entry.start_time)}–{isoToHHMM(entry.end_time)}
                              </span>
                            )}
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