'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { displayTime, slotState, type SlotOccurrence } from '@/lib/content/calendar'
import { PostChip } from '@/components/content/PostChip'
import { SlotPlaceholder } from '@/components/content/SlotPlaceholder'
import type { ContentPillar, ContentPost } from '@/types/database.types'

const MAX_VISIBLE_ITEMS = 3

interface DayCellContentProps {
  posts: ContentPost[]
  slots: SlotOccurrence[]
  pillarById: Map<string, ContentPillar>
  today: string
  onOpenPost: (post: ContentPost) => void
  onSlotClick: (occurrence: SlotOccurrence) => void
  /** Chips in de mobiele lijst zijn niet sleepbaar (FR-034) */
  chipsDraggable?: boolean
}

export function DayCellContent({
  posts,
  slots,
  pillarById,
  today,
  onOpenPost,
  onSlotClick,
  chipsDraggable = true,
}: DayCellContentProps) {
  const [showAll, setShowAll] = useState(false)

  const sortedPosts = [...posts].sort((a, b) => {
    const ta = displayTime(a.planned_time) ?? '99:99'
    const tb = displayTime(b.planned_time) ?? '99:99'
    return ta.localeCompare(tb)
  })
  const sortedSlots = [...slots].sort((a, b) => a.time.localeCompare(b.time))

  const items = [...sortedPosts.map((p) => ({ kind: 'post' as const, post: p })), ...sortedSlots.map((s) => ({ kind: 'slot' as const, slot: s }))]
  const visible = showAll ? items : items.slice(0, MAX_VISIBLE_ITEMS)
  const hiddenCount = items.length - visible.length

  if (items.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      {visible.map((item, i) => {
        if (item.kind === 'slot') {
          const pillar = pillarById.get(item.slot.pillarId)
          if (!pillar) return null
          return (
            <SlotPlaceholder
              key={`slot-${item.slot.pillarId}-${item.slot.time}-${i}`}
              occurrence={item.slot}
              pillar={pillar}
              state={slotState(item.slot.date, today)}
              onClick={onSlotClick}
            />
          )
        }
        return (
          <PostChip
            key={item.post.id}
            post={item.post}
            pillar={item.post.pillar_id ? pillarById.get(item.post.pillar_id) ?? null : null}
            today={today}
            onOpen={onOpenPost}
            draggable={chipsDraggable}
          />
        )
      })}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-left text-[10px] text-muted-foreground hover:text-foreground"
        >
          +{hiddenCount} meer
        </button>
      )}
    </div>
  )
}

interface DayCellProps extends DayCellContentProps {
  date: string
  inMonth: boolean
}

/** Dagcel in het maandraster: droppable met id `day:YYYY-MM-DD` (US4) */
export function DayCell({ date, inMonth, ...content }: DayCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${date}` })
  const isToday = date === content.today

  return (
    <div
      ref={setNodeRef}
      data-date={date}
      className={cn(
        'min-h-[110px] border p-1.5 lg:min-h-[130px]',
        inMonth ? 'border-border bg-card' : 'border-border/50 bg-muted/30',
        !inMonth && 'opacity-50',
        isToday && 'border-primary bg-primary/5',
        isOver && 'ring-2 ring-primary/50',
      )}
    >
      <div className="mb-1 flex items-baseline justify-between">
        <span className={cn('text-xs font-medium', isToday && 'text-primary')}>
          {format(new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))), 'd', { locale: nl })}
        </span>
        {isToday && <span className="text-[9px] uppercase tracking-wide text-primary">vandaag</span>}
      </div>
      <DayCellContent {...content} />
    </div>
  )
}