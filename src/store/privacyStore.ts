import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface PrivacyStore {
  hideAmounts: boolean
  toggle: () => void
  setHideAmounts: (value: boolean) => void
}

export const usePrivacyStore = create<PrivacyStore>()(
  persist(
    (set) => ({
      hideAmounts: false,
      toggle: () => set((state) => ({ hideAmounts: !state.hideAmounts })),
      setHideAmounts: (value) => set({ hideAmounts: value }),
    }),
    {
      name: 'privacy-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
)