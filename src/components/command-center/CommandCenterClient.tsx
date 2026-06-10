'use client'

import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'
import { QuickCaptureWidget } from '@/components/tasks/QuickCaptureWidget'
import { TimeTrackingWidget } from '@/components/time-tracking/TimeTrackingWidget'
import { StarredSection } from '@/components/command-center/StarredSection'
import { useState } from 'react'

interface GroupedStarred {
  boardId: string
  boardName: string
  cards: { id: string; title: string }[]
}

export function CommandCenterClient({
  firstName,
  starredItems,
}: {
  firstName: string
  starredItems: GroupedStarred[]
}) {
  const { profile } = useAuthStore()
  const [key, setKey] = useState(0)

  const displayName = firstName || profile?.full_name?.split(' ')[0] || 'gebruiker'

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Welkom terug, {displayName}</h1>
      <p className="text-muted-foreground mb-8">Hier is een overzicht van je omgeving</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <StarredSection items={starredItems} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Tijdregistratie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TimeTrackingWidget />
            </CardContent>
          </Card>

          <QuickCaptureWidget key={key} onCardCreated={() => setKey(prev => prev + 1)} />
        </div>
      </div>
    </div>
  )
}