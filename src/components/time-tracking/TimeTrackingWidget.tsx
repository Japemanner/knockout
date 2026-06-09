'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Play, Square, Clock, Calendar, FileText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import {
  useActiveTimeEntry,
  useStartTimeTracking,
  useStopTimeTracking,
  useUpdateTimeEntry,
} from '@/hooks/useTimeTracking'
import type { TimeEntry } from '@/actions/time-tracking'
import { useToast } from '@/components/ui/toast'
import { formatDurationSeconds } from '@/lib/utils'

interface TimeTrackingWidgetProps {
  taskId?: string
  boardId?: string
  onTimeEntryChange?: (entry: TimeEntry | null) => void
}

export function TimeTrackingWidget({ taskId, boardId, onTimeEntryChange }: TimeTrackingWidgetProps) {
  const { data: activeEntry } = useActiveTimeEntry()
  const startMutation = useStartTimeTracking()
  const stopMutation = useStopTimeTracking()
  const updateMutation = useUpdateTimeEntry()
  const { toast } = useToast()

  const [description, setDescription] = useState('')
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    if (activeEntry?.description) {
      setDescription(activeEntry.description)
    }
  }, [activeEntry?.description])

  useEffect(() => {
    if (onTimeEntryChange) {
      onTimeEntryChange(activeEntry ?? null)
    }
  }, [activeEntry, onTimeEntryChange])

  useEffect(() => {
    if (!activeEntry?.start_time) {
      setElapsed('')
      return
    }
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(activeEntry.start_time).getTime()) / 1000)
      setElapsed(formatDurationSeconds(diff))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [activeEntry?.start_time])

  const handleStart = () => {
    startMutation.mutate(
      { taskId, boardId, description: description || undefined },
      {
        onSuccess: (result) => {
          if (result.success) {
            toast({ title: 'Timer gestart', description: 'Je tijdregistratie is begonnen' })
          } else {
            toast({ title: 'Fout bij starten', description: result.error ?? 'Kon timer niet starten', variant: 'destructive' })
          }
        },
        onError: (error) => {
          toast({ title: 'Fout bij starten', description: error.message, variant: 'destructive' })
        },
      }
    )
  }

  const handleStop = () => {
    if (!activeEntry) return
    stopMutation.mutate(activeEntry.id, {
      onSuccess: (result) => {
        if (result.success) {
          toast({
            title: 'Timer gestopt',
            description: `Tijd geregistreerd: ${formatDurationSeconds(result.entry?.duration_seconds ?? 0)}`,
          })
        } else {
          toast({ title: 'Fout bij stoppen', description: result.error ?? 'Kon timer niet stoppen', variant: 'destructive' })
        }
      },
    })
  }

  const handleDescriptionChange = (newDescription: string) => {
    setDescription(newDescription)
    if (activeEntry && newDescription !== (activeEntry.description || '')) {
      updateMutation.mutate(
        { entryId: activeEntry.id, description: newDescription },
      )
    }
  }

  const isStarting = startMutation.isPending
  const isStopping = stopMutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Tijdregistratie
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Beschrijving
          </label>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <Input
              id="description"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Wat werk je aan?"
              disabled={updateMutation.isPending}
            />
          </div>
        </div>

        {activeEntry ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Actief</span>
              </div>
              <span className="font-mono text-lg">
                {elapsed}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Gestart {formatDistanceToNow(new Date(activeEntry.start_time), { 
                  addSuffix: true, 
                  locale: nl 
                })}
              </span>
            </div>
            
            <Button 
              onClick={handleStop}
              disabled={isStopping}
              className="w-full"
              variant="destructive"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Timer
            </Button>
          </div>
        ) : (
          <Button 
            onClick={handleStart}
            disabled={isStarting}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Timer
          </Button>
        )}
      </CardContent>
    </Card>
  )
}