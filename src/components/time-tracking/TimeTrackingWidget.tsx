'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Play, Square, Clock, Calendar, FileText } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import { 
  startTimeTracking, 
  stopTimeTracking, 
  getActiveTimeEntry,
  updateTimeEntry
} from '@/actions/time-tracking'
import type { TimeEntry } from '@/actions/time-tracking'
import { useToast } from '@/components/ui/toast'

interface TimeTrackingWidgetProps {
  taskId?: string
  boardId?: string
  onTimeEntryChange?: (entry: TimeEntry | null) => void
}

export function TimeTrackingWidget({ taskId, boardId, onTimeEntryChange }: TimeTrackingWidgetProps) {
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [description, setDescription] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  // Load active time entry on mount
  useEffect(() => {
    loadActiveEntry()
  }, [])

  const loadActiveEntry = async () => {
    try {
      const entry = await getActiveTimeEntry()
      setActiveEntry(entry)
      if (entry?.description) {
        setDescription(entry.description)
      }
      if (onTimeEntryChange) {
        onTimeEntryChange(entry)
      }
    } catch (error) {
      console.error('Error loading active entry:', error)
    }
  }

  const handleStart = async () => {
    if (isStarting) return
    setIsStarting(true)
    
    try {
      const result = await startTimeTracking({
        taskId,
        boardId,
        description: description || undefined
      })
      
      if (result.success && result.entry) {
        setActiveEntry(result.entry)
        if (onTimeEntryChange) {
          onTimeEntryChange(result.entry)
        }
        toast({
          title: 'Timer gestart',
          description: 'Je tijdregistratie is begonnen'
        })
      } else {
        throw new Error(result.error || 'Kon timer niet starten')
      }
    } catch (error) {
      console.error('Error starting timer:', error)
      toast({
        title: 'Fout bij starten',
        description: error instanceof Error ? error.message : 'Kon timer niet starten',
        variant: 'destructive'
      })
    } finally {
      setIsStarting(false)
    }
  }

  const handleStop = async () => {
    if (!activeEntry || isStopping) return
    setIsStopping(true)
    
    try {
      const result = await stopTimeTracking(activeEntry.id)
      
      if (result.success && result.entry) {
        setActiveEntry(null)
        if (onTimeEntryChange) {
          onTimeEntryChange(null)
        }
        toast({
          title: 'Timer gestopt',
          description: `Tijd geregistreerd: ${formatDuration(result.entry.duration_seconds || 0)}`
        })
      } else {
        throw new Error(result.error || 'Kon timer niet stoppen')
      }
    } catch (error) {
      console.error('Error stopping timer:', error)
      toast({
        title: 'Fout bij stoppen',
        description: error instanceof Error ? error.message : 'Kon timer niet stoppen',
        variant: 'destructive'
      })
    } finally {
      setIsStopping(false)
    }
  }

  const handleDescriptionChange = async (newDescription: string) => {
    setDescription(newDescription)
    
    // Update description in real-time if there's an active entry
    if (activeEntry && newDescription !== (activeEntry.description || '')) {
      setIsUpdating(true)
      try {
        const result = await updateTimeEntry(activeEntry.id, newDescription)
        if (result.success && result.entry) {
          setActiveEntry(result.entry)
        }
      } catch (error) {
        console.error('Error updating description:', error)
      } finally {
        setIsUpdating(false)
      }
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

  const formatElapsedTime = (startTime: string): string => {
    const start = new Date(startTime)
    const now = new Date()
    const diffSeconds = Math.floor((now.getTime() - start.getTime()) / 1000)
    return formatDuration(diffSeconds)
  }

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
              disabled={isUpdating}
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
                {formatElapsedTime(activeEntry.start_time)}
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