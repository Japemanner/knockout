'use client'

import { useThemeStore } from '@/store/themeStore'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Moon, Sun, Monitor } from 'lucide-react'

export function ThemeToggleSelect() {
  const { theme, setTheme } = useThemeStore()
  
  const options = [
    { value: 'light', label: 'Licht' },
    { value: 'dark', label: 'Donker' },
    { value: 'system', label: 'Systeem' },
  ]

  return (
    <div className="space-y-2">
      <Label>Thema</Label>
      <Select 
        value={theme} 
        onValueChange={(value: string) => setTheme(value as 'light' | 'dark' | 'system')}
        options={options}
        placeholder="Selecteer thema"
      />
    </div>
  )
}