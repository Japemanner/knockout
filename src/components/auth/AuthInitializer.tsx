'use client'

import { useRef } from 'react'
import type { Profile } from '@/types/database.types'
import { useAuthStore } from '@/store/authStore'

export function AuthInitializer({
  userId,
  profile,
  children,
}: {
  userId: string
  profile: Profile | null
  children: React.ReactNode
}) {
  const initialized = useRef(false)
  const setUserId = useAuthStore((s) => s.setUserId)
  const setProfile = useAuthStore((s) => s.setProfile)

  if (!initialized.current) {
    setUserId(userId)
    if (profile) setProfile(profile)
    initialized.current = true
  }

  return <>{children}</>
}
