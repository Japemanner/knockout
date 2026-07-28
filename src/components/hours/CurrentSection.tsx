'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { useOpenEntries, useUpdateEntry, useDeleteEntry } from '@/hooks/useHours'
import type { EntryWithClient } from '@/actions/hours'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Clock, Trash2, Save, X } from 'lucide-react'

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const v = String(i).padStart(2, '0')
  return { value: v, label: v }
})
const MINUTE_OPTIONS = ['00', '15', '30', '45'].map((v) => ({ value: v, label: v }))

function isoToHHMM(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
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

export function CurrentSection() {
  const { data: openEntries, isLoading } = useOpenEntries()
  const updateMutation = useUpdateEntry()
  const deleteMutation = useDeleteEntry()
  const { toast } = useToast()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editEndHour, setEditEndHour] = useState('')
  const [editEndMinute, setEditEndMinute] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  const startEdit = (entry: EntryWithClient) => {
    setEditingId(entry.id)
    setEditEndHour('')
    setEditEndMinute('')
    setEditError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditError(null)
  }

  const saveEndTime = (entry: EntryWithClient) => {
    const endTime = editEndHour && editEndMinute ? `${editEndHour}:${editEndMinute}` : ''
    if (!endTime) {
      setEditError('Eindtijd is verplicht')
      return
    }
    if (!entry.start_time) {
      setEditError('Starttijd ontbreekt')
      return
    }
    const endTimeISO = dateWithTime(entry.entry_date, endTime)
    if (!endTimeISO) {
      setEditError('Ongeldige eindtijd')
      return
    }
    const diff = diffHours(entry.start_time, endTimeISO)
    if (diff === null) {
      setEditError('Eindtijd moet na starttijd liggen')
      return
    }
    updateMutation.mutate(
      {
        entryId: entry.id,
        patch: {
          hours: diff,
          end_time: endTimeISO,
        },
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            toast({ title: 'Eindtijd opgeslagen', description: `${diff} uur geregistreerd` })
            setEditingId(null)
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

  if (isLoading) {
    return null
  }

  const entries = openEntries ?? []
  if (entries.length === 0) {
    return null
  }

  return (
    <Card className="border-yellow-400/40">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-yellow-600" />
          Current
          <Badge variant="outline" className="text-yellow-700 border-yellow-400 dark:text-yellow-400">
            {entries.length} open
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between p-2 border rounded-lg bg-yellow-50/30 dark:bg-yellow-950/10"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{entry.client_name}</Badge>
                <span className="text-xs text-muted-foreground">
                  {format(parseISO(entry.entry_date), 'd MMM', { locale: nl })}
                </span>
                {entry.start_time && (
                  <span className="text-xs text-muted-foreground">
                    {isoToHHMM(entry.start_time)}–?
                  </span>
                )}
              </div>
              {entry.description && (
                <p className="text-sm text-muted-foreground mt-0.5 truncate">
                  {entry.description}
                </p>
              )}
            </div>

            {editingId === entry.id ? (
              <div className="flex items-center gap-2 shrink-0">
                <div className="grid grid-cols-2 gap-1">
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
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => saveEndTime(entry)}
                  disabled={updateMutation.isPending}
                  aria-label="Opslaan"
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={cancelEdit}
                  aria-label="Annuleren"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEdit(entry)}
                >
                  Eindtijd
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
            )}
          </div>
        ))}
        {editError && (
          <p className="text-xs text-destructive">{editError}</p>
        )}
      </CardContent>
    </Card>
  )
}