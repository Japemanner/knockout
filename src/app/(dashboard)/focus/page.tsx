'use client'

import { useState, useEffect } from 'react'
import { TimeTrackingWidget } from '@/components/time-tracking/TimeTrackingWidget'
import { TimeEntriesList } from '@/components/time-tracking/TimeEntriesList'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Target, TrendingUp } from 'lucide-react'
import type { TimeEntry } from '@/actions/time-tracking'

export default function FocusPage() {
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [todayTotal, setTodayTotal] = useState(0)
  const [weekTotal, setWeekTotal] = useState(0)

  // Calculate totals when active entry changes
  useEffect(() => {
    calculateTotals()
  }, [activeEntry])

  const calculateTotals = () => {
    // In a real implementation, this would fetch actual time entries
    // For now we'll use mock data
    setTodayTotal(2 * 3600 + 30 * 60) // 2h 30m
    setWeekTotal(15 * 3600 + 45 * 60) // 15h 45m
  }

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m`
    }
    return `${mins}m`
  }

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Focus Mode</h1>
        <p className="text-muted-foreground mt-2">
          Minimalistische omgeving voor deep work en tijdregistratie
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vandaag</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(todayTotal)}</div>
            <p className="text-xs text-muted-foreground">Vandaag gewerkt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deze week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(weekTotal)}</div>
            <p className="text-xs text-muted-foreground">Weektotaal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actief</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeEntry ? (
                <Badge variant="destructive">Actief</Badge>
              ) : (
                <Badge variant="secondary">Inactief</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeEntry ? 'Timer loopt' : 'Start timer'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TimeTrackingWidget onTimeEntryChange={setActiveEntry} />
        <TimeEntriesList limit={5} />
      </div>
    </div>
  )
}