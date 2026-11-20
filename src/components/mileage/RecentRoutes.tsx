'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatKmNL, type RecentRoute } from '@/lib/mileage/trips'
import { ArrowRight, RotateCcw } from 'lucide-react'

export function RecentRoutes({
  routes,
  onReuse,
}: {
  routes: RecentRoute[]
  onReuse: (route: RecentRoute) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <RotateCcw className="h-4 w-4" />
          Recente routes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {routes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Zodra je een rit hebt opgeslagen, verschijnen hier je vaste routes voor hergebruik.
          </p>
        ) : (
          <ul className="space-y-2">
            {routes.map((route, index) => (
              <li
                key={`${route.from_location}-${route.to_location}-${route.purpose}-${route.distance_km}-${index}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border p-2.5"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium flex-wrap">
                    <span className="truncate">{route.from_location}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{route.to_location}</span>
                    {route.is_return && <Badge variant="outline">Retour</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {route.purpose} · {formatKmNL(route.distance_km)} km
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 self-start sm:self-auto"
                  onClick={() => onReuse(route)}
                >
                  Gebruik
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
