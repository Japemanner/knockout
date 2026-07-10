'use client'

import { useRef } from 'react'
import { useAuthStore } from '@/store/authStore'

type PartialProfile = {
  full_name: string | null
  role: string | null
  avatar_url: string | null
}

export function AuthInitializer({
  userId,
  profile,
  children,
}: {
  userId: string
  profile: PartialProfile | null
  children: React.ReactNode
}) {
  const initialized = useRef(false)
  const setUserId = useAuthStore((s) => s.setUserId)
  const setProfile = useAuthStore((s) => s.setProfile)

  if (!initialized.current) {
    setUserId(userId)
    if (profile) setProfile(profile as any)
    initialized.current = true
  }

  return <>{children}</>
}
