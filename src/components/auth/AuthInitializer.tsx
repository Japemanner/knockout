'use client'

import { useEffect, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/database.types'
import { useAuthStore } from '@/store/authStore'

export function AuthInitializer({
  user,
  profile,
  children,
}: {
  user: User
  profile: Profile | null
  children: React.ReactNode
}) {
  const initialized = useRef(false)
  const setUser = useAuthStore((s) => s.setUser)
  const setProfile = useAuthStore((s) => s.setProfile)

  useEffect(() => {
    if (!initialized.current) {
      setUser(user)
      if (profile) setProfile(profile)
      initialized.current = true
    }
  }, [user, profile, setUser, setProfile])

  return <>{children}</>
}
