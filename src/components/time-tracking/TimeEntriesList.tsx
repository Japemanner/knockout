'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  getTimeEntries, 
  deleteTimeEntry,
  updateTimeEntry
} from '@/actions/time-tracking'
import type { TimeEntry } from '@/actions/time-tracking'
import { format, formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Trash2, FileText, Clock, Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'

interface TimeEntriesListProps {
  taskId?: string
  boardId?: string
  limit?: number
}

export function TimeEntriesList({ taskId, boardId, limit = 10 }: TimeEntriesListProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    loadEntries()
  }, [taskId, boardId])

  const loadEntries = async () => {
    setLoading(true)
    try {
      const result = await getTimeEntries({ 
        limit, 
        taskId, 
        boardId 
      })
      setEntries(result.entries)
    } catch (error) {
      console.error('Error loading time entries:', error)
      toast({
        title: 'Fout bij laden',
        description: 'Kon tijdregistraties niet laden',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (entryId: string) => {
    try {
      const result = await deleteTimeEntry(entryId)
      if (result.success) {
        setEntries(entries.filter(entry => entry.id !== entryId))
        toast({
          title: 'Verwijderd',
          description: 'Tijdregistratie verwijderd'
        })
      } else {
        throw new Error(result.error || 'Kon niet verwijderen')
      }
    } catch (error) {
      console.error('Error deleting entry:', error)
      toast({
        title: 'Fout bij verwijderen',
        description: error instanceof Error ? error.message : 'Kon tijdregistratie niet verwijderen',
        variant: 'destructive'
      })
    }
  }

  const handleEditStart = (entry: TimeEntry) => {
    setEditingId(entry.id)
    setEditDescription(entry.description || '')
  }

  const handleEditSave = async () => {
    if (!editingId) return
    
    try {
      const result = await updateTimeEntry(editingId, editDescription)
      if (result.success && result.entry) {
        setEntries(entries.map(entry => 
          entry.id === editingId ? result.entry : entry
        ))
        setEditingId(null)
        toast({
          title: 'Opgeslagen',
          description: 'Beschrijving bijgewerkt'
        })
      } else {
        throw new Error(result.error || 'Kon niet opslaan')
      }
    } catch (error) {
      console.error('Error updating entry:', error)
      toast({
        title: 'Fout bij opslaan',
        description: error instanceof Error ? error.message : 'Kon beschrijving niet bijwerken',
        variant: 'destructive'
      })
    }
  }

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m`
    }
    return `${mins}m ${secs}s`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Laatste registraties</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Laden...</p>
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
                          <span>{formatDuration(entry.duration_seconds || 0)}</span>
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