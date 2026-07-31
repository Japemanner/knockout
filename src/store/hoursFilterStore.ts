import { create } from 'zustand'

interface HoursFilterStore {
  selectedClientId: string
  setSelectedClientId: (value: string) => void
}

export const useHoursFilterStore = create<HoursFilterStore>()((set) => ({
  selectedClientId: 'all',
  setSelectedClientId: (value) => set({ selectedClientId: value }),
}))