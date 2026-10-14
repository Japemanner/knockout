'use client'

import { useDraggable } from '@dnd-kit/core'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { displayTime, isOverdue, statusLabel } from '@/lib/content/calendar'
import { pillarColors, statusBadgeClasses } from '@/components/content/colors'
import type { ContentPillar, ContentPost } from '@/types/database.types'

interface PostChipProps {
  post: ContentPost
  pillar: ContentPillar | null
  today: string
  onOpen: (post: ContentPost) => void
  /** false in de mobiele lijst (geen drag nodig); live is nooit sleepbaar */
  draggable?: boolean
}

/**
 * Compacte post-chip voor dagcellen en ideeënbak: kleurstreep van de
 * contentsoort, tijd, afgekaptte titel, statusbadge, verlopen-markering
 * (rood, FR-015), "URL ontbreekt"-badge bij live zonder LinkedIn-URL
 * (FR-025) en de gedimde soortnaam bij gearchiveerde soorten.
 */
export function PostChip({ post, pillar, today, onOpen, draggable = true }: PostChipProps) {
  if (draggable && post.status !== 'live') {
    return <DraggablePostChip post={post} pillar={pillar} today={today} onOpen={onOpen} />
  }
  return <PostChipContent post={post} pillar={pillar} today={today} onOpen={onOpen} />
}

function DraggablePostChip(props: Omit<PostChipProps, 'draggable'>) {
  const { post, onOpen } = props
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: post.id })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(post)}
      className={cn(PostChipBaseClass(post, props.today, props.pillar), 'cursor-grab active:cursor-grabbing select-none', isDragging && 'opacity-30')}
    >
      <PostChipInner post={post} pillar={props.pillar} />
    </div>
  )
}

function PostChipContent({ post, pillar, today, onOpen }: Omit<PostChipProps, 'draggable'>) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(post)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(post)
        }
      }}
      className={PostChipBaseClass(post, today, pillar)}
    >
      <PostChipInner post={post} pillar={pillar} />
    </div>
  )
}

function PostChipBaseClass(post: ContentPost, today: string, _pillar: ContentPillar | null): string {
  return cn(
    'w-full rounded-md border bg-card px-2 py-1 text-left hover:border-primary/50 transition-colors',
    isOverdue(post, today) && 'border-l-2 border-l-red-500',
  )
}

function PostChipInner({ post, pillar }: { post: ContentPost; pillar: ContentPillar | null }) {
  const time = displayTime(post.planned_time)
  const missingUrl = post.status === 'live' && !post.linkedin_url

  return (
    <>
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            pillar ? pillarColors[pillar.color].dot : 'bg-gray-300 dark:bg-gray-600',
          )}
        />
        {time && <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{time}</span>}
        <span className="min-w-0 flex-1 truncate text-xs">{post.title}</span>
        <Badge className={cn(statusBadgeClasses(post.status), 'px-1.5 py-0 text-[10px]')}>
          {statusLabel(post.status)}
        </Badge>
      </div>
      {(pillar || missingUrl) && (
        <div className="mt-0.5 flex items-center gap-1.5 pl-3.5">
          {pillar && (
            <span
              className={cn(
                'truncate text-[10px] text-muted-foreground',
                pillar.archived && 'opacity-60',
              )}
            >
              {pillar.name}
              {pillar.archived ? ' (gearchiveerd)' : ''}
            </span>
          )}
          {missingUrl && (
            <Badge className="bg-amber-100 px-1.5 py-0 text-[10px] text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
              URL ontbreekt
            </Badge>
          )}
        </div>
      )}
    </>
  )
}