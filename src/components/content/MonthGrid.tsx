'use client'

import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import type { GridDay, SlotOccurrence } from '@/lib/content/calendar'
import { DayCell, DayCellContent } from '@/components/content/DayCell'
import type { ContentPillar, ContentPost } from '@/types/database.types'

const WEEKDAY_HEADERS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

interface MonthGridProps {
  weeks: GridDay[][]
  postsByDate: Map<string, ContentPost[]>
  slotsByDate: Map<string, SlotOccurrence[]>
  pillarById: Map<string, ContentPillar>
  today: string
  onOpenPost: (post: ContentPost) => void
  onSlotClick: (occurrence: SlotOccurrence) => void
}

/** Maandraster van hele weken (maandag t/m zondag), dagen buiten de maand gedimd */
export function MonthGrid({ weeks, postsByDate, slotsByDate, pillarById, today, onOpenPost, onSlotClick }: MonthGridProps) {
  return (
    <div>
      <div className="mb-1 grid grid-cols-7">
        {WEEKDAY_HEADERS.map((label) => (
          <div key={label} className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((day) => (
              <DayCell
                key={day.date}
                date={day.date}
                inMonth={day.inMonth}
                posts={postsByDate.get(day.date) ?? []}
                slots={slotsByDate.get(day.date) ?? []}
                pillarById={pillarById}
                today={today}
                onOpenPost={onOpenPost}
                onSlotClick={onSlotClick}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Lijstweergave per dag onder 768 px: alleen dagen met posts of slots (FR-034, US5) */
export function MobileDayList({
  weeks,
  postsByDate,
  slotsByDate,
  pillarById,
  today,
  onOpenPost,
  onSlotClick,
}: MonthGridProps) {
  const daysWithContent = weeks
    .flat()
    .filter((day) => day.inMonth)
    .filter((day) => (postsByDate.get(day.date)?.length ?? 0) + (slotsByDate.get(day.date)?.length ?? 0) > 0)

  if (daysWithContent.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Geen posts of slots deze maand.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {daysWithContent.map((day) => (
        <div key={day.date} className="rounded-lg border bg-card p-2">
          <p className="mb-1.5 text-xs font-medium capitalize">
            {format(
              new Date(Number(day.date.slice(0, 4)), Number(day.date.slice(5, 7)) - 1, Number(day.date.slice(8, 10))),
              'EEEE d MMMM',
              { locale: nl },
            )}
          </p>
          <DayCellContent
            posts={postsByDate.get(day.date) ?? []}
            slots={slotsByDate.get(day.date) ?? []}
            pillarById={pillarById}
            today={today}
            onOpenPost={onOpenPost}
            onSlotClick={onSlotClick}
            chipsDraggable={false}
          />
        </div>
      ))}
    </div>
  )
}