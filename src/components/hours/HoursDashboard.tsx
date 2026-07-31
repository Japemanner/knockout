'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardStats, useRevenueStats, useClients } from '@/hooks/useHours'
import { EuroSymbol } from '@/components/hours/EuroSymbol'
import { useHoursFilterStore } from '@/store/hoursFilterStore'
import type { ClientWithProgress } from '@/actions/hours'
import { cn } from '@/lib/utils'

function ProgressBar({ percentage }: { percentage: number }) {
  const color =
    percentage >= 100 ? 'bg-green-500' : percentage >= 80 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-300', color)}
        style={{ width: `${Math.min(100, percentage)}%` }}
      />
    </div>
  )
}

function DashboardCard({ stat }: { stat: ClientWithProgress }) {
  const ahead = stat.percentage >= 100
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium truncate">{stat.name}</CardTitle>
        <Badge variant="outline">{stat.target_label}</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold">{stat.current_hours}</span>
          <span className="text-sm text-muted-foreground">/ {stat.target_hours} uur</span>
        </div>
        <ProgressBar percentage={stat.percentage} />
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{stat.percentage}%</span>
          <span className={cn('font-medium', ahead ? 'text-green-600' : 'text-muted-foreground')}>
            {ahead ? 'Target bereikt' : `${(stat.target_hours - stat.current_hours).toFixed(1)} uur te gaan`}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function RevenueCard() {
  const selectedClientId = useHoursFilterStore((s) => s.selectedClientId)
  const { data: clients } = useClients()
  const clientId = selectedClientId === 'all' ? undefined : selectedClientId
  const { data: revenue, isLoading } = useRevenueStats(clientId)

  const clientName =
    clientId && clients
      ? clients.find((c) => c.id === clientId)?.name ?? null
      : null
  const title = clientName ? `Omzet ${clientName}` : 'Totale omzet'

  if (isLoading || !revenue) {
    return <Skeleton className="h-28 w-full rounded-xl" />
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium truncate">{title}</CardTitle>
        <Badge variant="secondary">deze periode</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Deze week</div>
            <div className="text-xl font-bold">
              <EuroSymbol value={revenue.week} />
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Deze maand</div>
            <div className="text-xl font-bold">
              <EuroSymbol value={revenue.month} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function HoursDashboard() {
  const { data: stats, isLoading } = useDashboardStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (!stats || stats.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nog geen opdrachtgevers. Voeg er een toe via &quot;Beheer opdrachtgevers&quot;.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <RevenueCard />
      {stats.map((stat) => (
        <DashboardCard key={stat.id} stat={stat} />
      ))}
    </div>
  )
}