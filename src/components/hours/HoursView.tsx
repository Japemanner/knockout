'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { HoursDashboard } from '@/components/hours/HoursDashboard'
import { HoursEntryForm } from '@/components/hours/HoursEntryForm'
import { HoursHistory } from '@/components/hours/HoursHistory'
import { ClientManageDialog } from '@/components/hours/ClientManageDialog'
import { Settings2 } from 'lucide-react'
import type { Client } from '@/types/database.types'

export function HoursView({ initialClients }: { initialClients: Client[] }) {
  const [manageOpen, setManageOpen] = useState(false)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Urenregistratie</h1>
          <p className="text-muted-foreground">Houd je gewerkte uren per opdrachtgever bij</p>
        </div>
        <Button variant="outline" onClick={() => setManageOpen(true)}>
          <Settings2 className="h-4 w-4 mr-2" />
          Beheer opdrachtgevers
        </Button>
      </div>

      {/* Sectie 1: Dashboard */}
      <HoursDashboard />

      {/* Sectie 2: Tijdschrijf-formulier */}
      <HoursEntryForm />

      {/* Sectie 3: Historie met filters */}
      <HoursHistory />

      <ClientManageDialog open={manageOpen} onOpenChange={setManageOpen} />

      {/* initialClients is used for SSR hydration; TanStack Query takes over after mount */}
      <span className="hidden" data-initial-clients={initialClients.length} />
    </div>
  )
}