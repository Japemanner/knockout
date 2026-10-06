'use client'

import { useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import type { Profile } from '@/types/database.types'

type ProfilePatch = Pick<Profile, 'full_name' | 'role' | 'avatar_url'>

export function AuthInitializer({
  userId,
  profile,
  children,
}: {
  userId: string
  profile: ProfilePatch | null
  children: React.ReactNode
}) {
  const initialized = useRef(false)
  const setUserId = useAuthStore((s) => s.setUserId)
  const setProfile = useAuthStore((s) => s.setProfile)

  if (!initialized.current) {
    setUserId(userId)
    if (profile) setProfile(profile as Profile)
    initialized.current = true
  }

  return <>{children}</>
}
