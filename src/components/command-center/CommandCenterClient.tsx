'use client'

import { useAuthStore } from '@/store/authStore'
import { StarredKanbanSection } from '@/components/command-center/StarredKanbanSection'
import { PrioritiesSection } from '@/components/command-center/PrioritiesSection'
import type { StarredKanbanCard, StarredBoardColumns } from '@/app/(dashboard)/command-center/page'

export function CommandCenterClient({
  firstName,
  starredCards,
  boardColumns,
}: {
  firstName: string
  starredCards: StarredKanbanCard[]
  boardColumns: StarredBoardColumns
}) {
  const { profile } = useAuthStore()

  const displayName = firstName || profile?.full_name?.split(' ')[0] || 'gebruiker'

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Welkom terug, {displayName}</h1>
      <p className="text-muted-foreground mb-8">Hier is een overzicht van je omgeving</p>

      <div className="space-y-6">
        <PrioritiesSection />
        <StarredKanbanSection cards={starredCards} boardColumns={boardColumns} />
      </div>
    </div>
  )
}