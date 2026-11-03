'use client'

import { BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { pillarColors } from '@/components/content/colors'
import type { IdeaCounts } from '@/lib/content/ideas'

interface ContentOverviewProps {
  counts: IdeaCounts
  hasPillars: boolean
}

/**
 * Overzicht van het aantal ideeën per contentsoort (US2/FR-013 t/m FR-017).
 * Alle soorten komen mee, ook met 0; de groep "Geen soort" verschijnt alleen
 * als er ideeën zonder soort zijn. Gearchiveerde soorten blijven zichtbaar
 * met een archiefmarkering.
 */
export function ContentOverview({ counts, hasPillars }: ContentOverviewProps) {
  const max = Math.max(1, ...counts.rows.map((row) => row.count))

  if (!hasPillars && counts.total === 0) {
    return (
      <section className="rounded-lg border bg-card p-6 text-center" data-testid="content-overview">
        <BarChart3 className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">Nog geen inhoud om te tellen</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Maak eerst een contentsoort aan en voeg een idee toe. Daarna zie je hier het aantal per soort.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-lg border bg-card" data-testid="content-overview">
      <div className="flex items-center gap-2 border-b p-3">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-medium">Ideeën per contentsoort</h2>
        <span className="ml-auto text-xs text-muted-foreground">Totaal {counts.total}</span>
      </div>

      <div className="space-y-2 p-3">
        {counts.rows.map((row) => {
          const dot = pillarColors[row.color ?? 'gray'].dot
          return (
            <div
              key={row.pillarId ?? 'none'}
              className="rounded-md border px-3 py-2"
              data-testid="overview-row"
              data-pillar-id={row.pillarId ?? 'none'}
            >
              <div className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', dot)} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {row.name}
                  {row.archived && <span className="ml-1 text-xs text-muted-foreground">(gearchiveerd)</span>}
                </span>
                <span className="text-sm font-semibold tabular-nums" data-testid="overview-count">
                  {row.count}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full', dot)}
                  style={{ width: `${Math.round((row.count / max) * 100)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between border-t px-3 py-2 text-sm">
        <span className="font-medium">Totaal</span>
        <span className="font-semibold tabular-nums" data-testid="overview-total">
          {counts.total}
        </span>
      </div>
    </section>
  )
}
