'use client'

import { Lightbulb } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatIdeaDate, statusLabel } from '@/lib/content/ideas'
import { pillarColors, statusBadgeClasses } from '@/components/content/colors'
import type { ContentPillar, ContentPost } from '@/types/database.types'

interface IdeaListProps {
  posts: ContentPost[]
  pillarById: Map<string, ContentPillar>
  onOpen: (post: ContentPost) => void
  isLoading?: boolean
  isError?: boolean
}

/**
 * Lijst van alle bewaarde ideeën, nieuwste bovenaan (US1/FR-010). Elke rij
 * toont titel, soort (of "Geen soort"), status en aanmaakdatum. Een klik of
 * Enter/Space opent de detail-editor.
 */
export function IdeaList({ posts, pillarById, onOpen, isLoading = false, isError = false }: IdeaListProps) {
  return (
    <section className="rounded-lg border bg-card" data-testid="idea-list">
      <div className="flex items-center gap-2 border-b p-3">
        <Lightbulb className="h-4 w-4 text-yellow-500" />
        <h2 className="text-sm font-medium">Ideeën</h2>
        <span className="text-xs text-muted-foreground">{posts.length}</span>
      </div>

      <div className="space-y-1.5 p-3">
        {isLoading && (
          <div className="space-y-1.5" aria-label="Ideeën laden">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-12 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <p className="py-4 text-center text-xs text-red-600 dark:text-red-400">
            Kon de ideeën niet laden. Probeer het opnieuw.
          </p>
        )}

        {!isLoading && !isError && posts.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Nog geen ideeën. Typ hierboven een titel en druk op Enter.
          </p>
        )}

        {!isLoading && !isError && posts.map((post) => {
          const pillar = post.pillar_id ? pillarById.get(post.pillar_id) ?? null : null
          return (
            <button
              key={post.id}
              type="button"
              onClick={() => onOpen(post)}
              className="flex w-full items-start gap-3 rounded-md border bg-card px-3 py-2 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              data-testid="idea-row"
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
                  <span className="min-w-0 truncate text-sm font-medium" data-testid="idea-row-title">
                    {post.title}
                  </span>
                  <Badge className={cn(statusBadgeClasses(post.status), 'px-1.5 py-0 text-[10px]')}>
                    {statusLabel(post.status)}
                  </Badge>
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span data-testid="idea-row-pillar" className={cn(pillar?.archived && 'opacity-70')}>
                    {pillar ? `${pillar.name}${pillar.archived ? ' (gearchiveerd)' : ''}` : 'Geen soort'}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{formatIdeaDate(post.created_at)}</span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
