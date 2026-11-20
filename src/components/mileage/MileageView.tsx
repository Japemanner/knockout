'use client'

import { useMemo, useState } from 'react'
import { PrivacyToggle } from '@/components/hours/PrivacyToggle'
import { MileageDashboard } from '@/components/mileage/MileageDashboard'
import { TripEntryForm, type ReuseRouteRequest } from '@/components/mileage/TripEntryForm'
import { RecentRoutes } from '@/components/mileage/RecentRoutes'
import { TripHistory } from '@/components/mileage/TripHistory'
import { useClients } from '@/hooks/useHours'
import { useTrips } from '@/hooks/useMileage'
import { defaultTripFilters, type TripFilters } from '@/lib/mileage/queries'
import { recentRoutes, type RecentRoute } from '@/lib/mileage/trips'

export function MileageView() {
  const [filters, setFilters] = useState<TripFilters>(() => defaultTripFilters())
  const [reuseRoute, setReuseRoute] = useState<ReuseRouteRequest | null>(null)
  const tripsQuery = useTrips(filters)
  const { data: clients } = useClients()

  const routes = useMemo(() => recentRoutes(tripsQuery.data ?? []), [tripsQuery.data])

  const handleReuse = (route: RecentRoute) => {
    setReuseRoute({ route, nonce: Date.now() })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kilometerregistratie</h1>
          <p className="text-muted-foreground">
            Leg zakelijke ritten vast en houd bij wat de BV nog moet vergoeden
          </p>
        </div>
        <PrivacyToggle />
      </div>

      <MileageDashboard />

      <TripEntryForm reuseRoute={reuseRoute} />

      <RecentRoutes routes={routes} onReuse={handleReuse} />

      <TripHistory
        trips={tripsQuery.data ?? []}
        isLoading={tripsQuery.isLoading}
        isError={tripsQuery.isError}
        onRetry={() => {
          void tripsQuery.refetch()
        }}
        filters={filters}
        onFiltersChange={setFilters}
        clients={clients ?? []}
      />
    </div>
  )
}
