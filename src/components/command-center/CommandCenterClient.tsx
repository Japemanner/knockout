'use client'

import { useAuthStore } from '@/store/authStore'
import { StarredSection } from '@/components/command-center/StarredSection'
import { PrioritiesSection } from '@/components/command-center/PrioritiesSection'

interface GroupedStarred {
  boardId: string
  boardName: string
  cards: { id: string; title: string }[]
}

export function CommandCenterClient({
  firstName,
  starredItems,
}: {
  firstName: string
  starredItems: GroupedStarred[]
}) {
  const { profile } = useAuthStore()

  const displayName = firstName || profile?.full_name?.split(' ')[0] || 'gebruiker'

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Welkom terug, {displayName}</h1>
      <p className="text-muted-foreground mb-8">Hier is een overzicht van je omgeving</p>

      <div className="space-y-6">
        <PrioritiesSection />
        <StarredSection items={starredItems} />
      </div>
    </div>
  )
}