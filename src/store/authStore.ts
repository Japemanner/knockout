import { create } from 'zustand'
import type { Profile } from '@/types/database.types'

interface AuthState {
  userId: string | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  setUserId: (userId: string | null) => void
  setProfile: (profile: Profile | null) => void
  signOut: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  profile: null,
  isLoading: false,
  isAuthenticated: false,

  setUserId: (userId) =>
    set({
      userId,
      isAuthenticated: !!userId,
    }),

  setProfile: (profile) => set({ profile }),

  signOut: () =>
    set({ userId: null, profile: null, isAuthenticated: false }),
}))
