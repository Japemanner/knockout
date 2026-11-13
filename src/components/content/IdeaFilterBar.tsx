'use client'

import { useState } from 'react'
import { Filter as FilterIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { pillarColors } from '@/components/content/colors'
import type { IdeaFilter, IdeaFilterOption } from '@/lib/content/ideas'
import type { ContentPillar } from '@/types/database.types'

interface IdeaFilterBarProps {
  options: IdeaFilterOption[]
  activeFilter: IdeaFilter
  activePillar: ContentPillar | null
  onFilterChange: (filter: IdeaFilter) => void
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

function isSameFilter(a: IdeaFilter, b: IdeaFilter): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'pillar' && b.kind === 'pillar') return a.pillarId === b.pillarId
  return true
}

function countLabel(count: number): string {
  return `${count} ${count === 1 ? 'idee' : 'ideeën'}`
}

/**
 * Filterbalk boven de ideeënlijst (US1) met een alleen-lezen
 * beschrijvingsstrook voor de gekozen soort (US2). De balk is een groep native
 * buttons met aria-pressed; de tellingen komen uit de al geladen posts.
 */
export function IdeaFilterBar({
  options,
  activeFilter,
  activePillar,
  onFilterChange,
  isLoading,
  isError,
  onRetry,
}: IdeaFilterBarProps) {
  return (
    <section
      className="rounded-lg border bg-card"
      aria-labelledby="idea-filter-heading"
      data-testid="idea-filter"
    >
      <div className="flex items-center gap-2 border-b p-3">
        <FilterIcon className="h-4 w-4 text-primary" />
        <h2 id="idea-filter-heading" className="text-sm font-medium">
          Filter op soort
        </h2>
      </div>

      {isError ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs text-red-700 dark:text-red-300"
          role="alert"
          data-testid="idea-filter-error"
        >
          <span>Filteren is tijdelijk niet beschikbaar. De ideeënlijst toont alle ideeën.</span>
          <Button type="button" variant="outline" size="sm" onClick={onRetry} data-testid="idea-filter-retry">
            Opnieuw proberen
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-2 p-3" role="status" aria-label="Filter laden" data-testid="idea-filter-loading">
          <span className="sr-only">Filter laden…</span>
          <div className="flex flex-wrap gap-1.5" aria-hidden>
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="h-7 w-24 animate-pulse rounded-full bg-muted" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2 p-3">
          <div
            role="group"
            aria-label="Filter op contentsoort"
            className="flex flex-wrap gap-1.5"
          >
            {options.map((option) => {
              const active = isSameFilter(option.filter, activeFilter)
              const label = `${option.label}${option.archived ? ' (gearchiveerd)' : ''}`
              return (
                <button
                  key={option.filter.kind === 'pillar' ? `pillar:${option.filter.pillarId}` : option.filter.kind}
                  type="button"
                  onClick={() => onFilterChange(option.filter)}
                  aria-pressed={active}
                  aria-label={`${label}, ${countLabel(option.count)}`}
                  data-testid="idea-filter-option"
                  data-filter-kind={option.filter.kind}
                  data-pillar-id={
                    option.filter.kind === 'pillar' ? option.filter.pillarId : undefined
                  }
                  className={cn(
                    'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-card text-foreground hover:border-primary/50 hover:bg-accent',
                  )}
                >
                  {option.color && (
                    <span
                      className={cn('h-2.5 w-2.5 shrink-0 rounded-full', pillarColors[option.color].dot)}
                      aria-hidden
                    />
                  )}
                  <span className="min-w-0 truncate" title={option.label}>
                    {option.label}
                  </span>
                  {option.archived && (
                    <span className="shrink-0 text-[10px] opacity-70">(gearchiveerd)</span>
                  )}
                  <span
                    className="shrink-0 tabular-nums opacity-80"
                    data-testid="idea-filter-count"
                  >
                    {option.count}
                  </span>
                </button>
              )
            })}
          </div>

          {activePillar && <PillarDescription key={activePillar.id} pillar={activePillar} />}
        </div>
      )}
    </section>
  )
}

function PillarDescription({ pillar }: { pillar: ContentPillar }) {
  const [expanded, setExpanded] = useState(false)
  const description = pillar.description?.trim() ?? ''
  const isLong = description.length > 180

  return (
    <div
      className="rounded-md border bg-muted/30 p-3"
      data-testid="idea-filter-description"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span
          className={cn('h-2.5 w-2.5 shrink-0 rounded-full', pillarColors[pillar.color].dot)}
          aria-hidden
        />
        <span className="min-w-0 truncate text-sm font-medium" title={pillar.name}>
          {pillar.name}
        </span>
        {pillar.archived && (
          <span className="text-[11px] text-muted-foreground">(gearchiveerd)</span>
        )}
      </div>

      <div className="mt-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Korte beschrijving
        </p>
        {description ? (
          <>
            <p
              className={cn(
                'mt-0.5 whitespace-pre-wrap break-words text-xs text-muted-foreground',
                isLong && !expanded && 'line-clamp-3',
              )}
              data-testid="idea-filter-description-text"
            >
              {description}
            </p>
            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded((current) => !current)}
                aria-expanded={expanded}
                className="mt-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                data-testid="idea-filter-description-toggle"
              >
                {expanded ? 'Toon minder' : 'Toon volledige beschrijving'}
              </button>
            )}
          </>
        ) : (
          <p
            className="mt-0.5 text-xs text-muted-foreground"
            data-testid="idea-filter-description-text"
          >
            Geen korte beschrijving.
          </p>
        )}
      </div>
    </div>
  )
}
