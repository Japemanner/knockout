'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTimeEntries, useDeleteTimeEntry, useUpdateTimeEntry } from '@/hooks/useTimeTracking'
import type { TimeEntry } from '@/actions/time-tracking'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Trash2, FileText, Clock, Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { formatDurationSeconds } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface TimeEntriesListProps {
  taskId?: string
  boardId?: string
  limit?: number
}

export function TimeEntriesList({ taskId, boardId, limit = 10 }: TimeEntriesListProps) {
  const { data, isLoading } = useTimeEntries({ taskId, boardId, limit })
  const deleteMutation = useDeleteTimeEntry()
  const updateMutation = useUpdateTimeEntry()
  const { toast } = useToast()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')

  const entries: TimeEntry[] = data?.entries ?? []

  const handleDelete = (entryId: string) => {
    deleteMutation.mutate(entryId, {
      onSuccess: (result) => {
        if (result.success) {
          toast({ title: 'Verwijderd', description: 'Tijdregistratie verwijderd' })
        } else {
          toast({ title: 'Fout bij verwijderen', description: result.error ?? 'Kon niet verwijderen', variant: 'destructive' })
        }
      },
    })
  }

  const handleEditStart = (entry: TimeEntry) => {
    setEditingId(entry.id)
    setEditDescription(entry.description || '')
  }

  const handleEditSave = () => {
    if (!editingId) return
    updateMutation.mutate(
      { entryId: editingId, description: editDescription },
      {
        onSuccess: (result) => {
          if (result.success) {
            setEditingId(null)
            toast({ title: 'Opgeslagen', description: 'Beschrijving bijgewerkt' })
          } else {
            toast({ title: 'Fout bij opslaan', description: result.error ?? 'Kon niet opslaan', variant: 'destructive' })
          }
        },
      }
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Laatste registraties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Laatste registraties</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nog geen tijdregistraties</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Laatste registraties</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.map((entry) => (
            <div 
              key={entry.id} 
              className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              {editingId === entry.id ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Beschrijving"
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditingId(null)}
                    >
                      Annuleren
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleEditSave}
                      disabled={updateMutation.isPending}
                    >
                      Opslaan
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">
                        {entry.description || 'Geen beschrijving'}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDurationSeconds(entry.duration_seconds || 0)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {format(new Date(entry.start_time), 'dd MMM HH:mm', { locale: nl })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditStart(entry)}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(entry.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}