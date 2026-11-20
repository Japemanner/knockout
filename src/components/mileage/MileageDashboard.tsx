'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMileageStats } from '@/hooks/useMileage'
import { MileageAmount } from '@/components/mileage/MileageAmount'
import { formatKmNL } from '@/lib/mileage/trips'
import { Car, Euro, CalendarDays, Wallet } from 'lucide-react'

function StatCard({
  title,
  value,
  hint,
  icon,
  testId,
}: {
  title: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon: React.ReactNode
  testId?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={testId}>{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  )
}

export function MileageDashboard() {
  const { data: stats, isLoading, isError, refetch } = useMileageStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (isError || !stats) {
    return (
      <Card>
        <CardContent className="py-6 flex flex-col items-center gap-2 text-center">
          <p className="text-sm text-muted-foreground">Kon de kilometercijfers niet laden.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Opnieuw proberen
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        title="Km deze maand"
        value={`${formatKmNL(stats.monthKm)} km`}
        icon={<Car className="h-4 w-4" />}
        testId="stat-month-km"
      />
      <StatCard
        title="Vergoeding deze maand"
        value={<MileageAmount value={stats.monthAmount} />}
        icon={<Euro className="h-4 w-4" />}
        testId="stat-month-amount"
      />
      <StatCard
        title="Vergoeding dit jaar"
        value={<MileageAmount value={stats.yearAmount} />}
        hint={`${formatKmNL(stats.yearKm)} km`}
        icon={<CalendarDays className="h-4 w-4" />}
        testId="stat-year-amount"
      />
      <StatCard
        title="Openstaand"
        value={<MileageAmount value={stats.openAmount} />}
        hint={`${stats.openCount} ${stats.openCount === 1 ? 'rit' : 'ritten'} nog niet uitbetaald`}
        icon={<Wallet className="h-4 w-4" />}
        testId="stat-openstaand"
      />
    </div>
  )
}
