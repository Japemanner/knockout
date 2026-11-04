'use client'

import { ListChecks } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { statusLabel, pipelineViewState } from '@/lib/content/ideas'
import { pillarColors, statusBadgeClasses } from '@/components/content/colors'
import type { ContentPillar, ContentPost } from '@/types/database.types'

interface PipelineBlockProps {
  /** Al gefilterd op status !== 'live', in de bestaande volgorde (nieuwste eerst). */
  posts: ContentPost[]
  /** True als de volledige posts-array items bevat; bepaalt de lege tekst. */
  hasAnyPosts: boolean
  pillarById: Map<string, ContentPillar>
  onOpen: (post: ContentPost) => void
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

/**
 * Pijplijnblok boven de volledige ideeënlijst (feature 028). Toont alle
 * niet-live ideeën, een count en klikbare rijen naar de bestaande editor.
 * Laad-, fout- en leegstaten zijn expliciet gescheiden, zodat een fout nooit
 * als lege pijplijn wordt getoond.
 */
export function PipelineBlock({
  posts,
  hasAnyPosts,
  pillarById,
  onOpen,
  isLoading,
  isError,
  onRetry,
}: PipelineBlockProps) {
  const count = posts.length
  const state = pipelineViewState({ count, isLoading, isError })
  const showInitialLoading = state === 'loading'
  const showErrorWithoutData = state === 'error-empty'
  const showEmpty = state === 'empty'
  const showErrorBanner = state === 'error-with-data'

  return (
    <section
      className="rounded-lg border bg-card"
      aria-labelledby="pipeline-heading"
      data-testid="content-pipeline"
    >
      <div className="flex items-center gap-2 border-b p-3">
        <ListChecks className="h-4 w-4 text-primary" />
        <h2 id="pipeline-heading" className="text-sm font-medium" data-testid="pipeline-heading">
          Pijplijn
        </h2>
        <span
          className="text-xs text-muted-foreground"
          data-testid="pipeline-count"
          aria-live="polite"
        >
          {count}
        </span>
      </div>

      {showInitialLoading && (
        <div className="space-y-1.5 p-3" data-testid="pipeline-loading" aria-label="Pijplijn laden">
          <p className="text-xs text-muted-foreground">Pijplijn laden…</p>
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      )}

      {showErrorWithoutData && (
        <div className="space-y-2 p-4 text-center" data-testid="pipeline-error">
          <p className="text-xs text-red-600 dark:text-red-400">Kon de pijplijn niet laden.</p>
          <Button type="button" variant="outline" size="sm" onClick={onRetry} data-testid="pipeline-retry">
            Opnieuw proberen
          </Button>
        </div>
      )}

      {showEmpty && (
        <div className="p-4 text-center" data-testid="pipeline-empty">
          <p className="text-sm font-medium">
            {hasAnyPosts ? 'Niets in de pijplijn' : 'Nog geen ideeën'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasAnyPosts
              ? 'Alle ideeën zijn live.'
              : 'Voeg hierboven een idee toe om je pijplijn te starten.'}
          </p>
        </div>
      )}

      {showErrorBanner && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300"
          data-testid="pipeline-error"
        >
          <span>Kon de pijplijn niet verversen.</span>
          <Button type="button" variant="outline" size="sm" onClick={onRetry} data-testid="pipeline-retry">
            Opnieuw proberen
          </Button>
        </div>
      )}

      {count > 0 && (
        <ul
          className="max-h-64 space-y-1.5 overflow-y-auto overscroll-contain p-3 sm:max-h-72"
          data-testid="pipeline-list"
        >
          {posts.map((post) => {
            const pillar = post.pillar_id ? pillarById.get(post.pillar_id) ?? null : null
            return (
              <li key={post.id}>
                <button
                  type="button"
                  onClick={() => onOpen(post)}
                  className="flex w-full items-start gap-3 rounded-md border bg-card px-3 py-2 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  data-testid="pipeline-row"
                  data-post-id={post.id}
                >
                  <span
                    className={cn(
                      'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full',
                      pillar ? pillarColors[pillar.color].dot : 'bg-gray-300 dark:bg-gray-600',
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span
                        className="min-w-0 truncate text-sm font-medium"
                        data-testid="pipeline-row-title"
                        title={post.title}
                      >
                        {post.title}
                      </span>
                      <Badge
                        className={cn(statusBadgeClasses(post.status), 'px-1.5 py-0 text-[10px]')}
                        data-testid="pipeline-row-status"
                      >
                        {statusLabel(post.status)}
                      </Badge>
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        data-testid="pipeline-row-pillar"
                        className={cn(pillar?.archived && 'opacity-70')}
                      >
                        {pillar ? `${pillar.name}${pillar.archived ? ' (gearchiveerd)' : ''}` : 'Geen soort'}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
