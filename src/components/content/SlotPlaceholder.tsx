'use client'

import { cn } from '@/lib/utils'
import { pillarColors } from '@/components/content/colors'
import type { SlotOccurrence, SlotState } from '@/lib/content/calendar'
import type { ContentPillar } from '@/types/database.types'

interface SlotPlaceholderProps {
  occurrence: SlotOccurrence
  pillar: ContentPillar
  state: SlotState
  /** Klik op een open slot maakt een Concept-post met datum/tijd/soort (FR-013) */
  onClick: (occurrence: SlotOccurrence) => void
}

/**
 * Leeg weekslot op een concrete dag: open = gestippeld kader in de kleur van
 * de contentsoort met "Soortnaam · tijd"; gemist (datum vóór vandaag) = grijs
 * en niet klikbaar (FR-012, FR-014).
 */
export function SlotPlaceholder({ occurrence, pillar, state, onClick }: SlotPlaceholderProps) {
  if (state === 'gemist') {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-md border border-dashed px-2 py-1 text-[10px] text-muted-foreground/60',
        )}
        aria-label={`${pillar.name} · ${occurrence.time} (gemist)`}
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" />
        <span className="truncate">
          {pillar.name} · {occurrence.time} · gemist
        </span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onClick(occurrence)}
      className={cn(
        'flex w-full items-center gap-1.5 rounded-md border border-dashed border-2 px-2 py-1 text-left text-[10px] transition-colors hover:bg-accent',
        pillarColors[pillar.color].slotBorder,
      )}
      aria-label={`Nieuwe ${pillar.name}-post op ${occurrence.date} ${occurrence.time}`}
      title={`Klik om een nieuwe post te maken (${pillar.name}, ${occurrence.time})`}
    >
      <span className="truncate">
        {pillar.name} · {occurrence.time}
      </span>
    </button>
  )
}