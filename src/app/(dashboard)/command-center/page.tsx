'use client'

import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Users, ClipboardList, Plus, Clock, BarChart3, Bot, ExternalLink } from 'lucide-react'
import { QuickCaptureWidget } from '@/components/tasks/QuickCaptureWidget'
import { TimeTrackingWidget } from '@/components/time-tracking/TimeTrackingWidget'
import { useState } from 'react'

export default function CommandCenterPage() {
  const { profile } = useAuthStore()
  const [key, setKey] = useState(0) // For re-rendering the widget

  const stats = { teamMembers: '-' }

  const handleCardCreated = () => {
    // Force re-render of the widget to reset form
    setKey(prev => prev + 1)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Welkom terug, {profile?.full_name?.split(' ')[0] ?? 'gebruiker'}</h1>
      <p className="text-muted-foreground mb-8">Hier is een overzicht van je omgeving</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-6">
          <QuickCaptureWidget key={key} onCardCreated={handleCardCreated} />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Teamleden</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><p className="text-2xl font-bold">{stats.teamMembers}</p></CardContent>
            </Card>
            <Card className="border-dashed">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Taken</CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">Binnenkort beschikbaar</p></CardContent>
            </Card>
          </div>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Snelle acties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <QuickCaptureWidget compact onCardCreated={handleCardCreated} />
            </CardContent>
          </Card>
          
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
          
          <Card>
            <CardHeader>
              <CardTitle>Snelkoppelingen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a
                href="https://dashboards.jaaphoeve.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center w-full rounded-md border px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Metabase
                <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
              </a>
              <a
                href="https://jape-darwin.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center w-full rounded-md border px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Bot className="h-4 w-4 mr-2" />
                Darwin
                <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}