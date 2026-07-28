'use client'

import { Button } from '@/components/ui/button'
import { usePrivacyStore } from '@/store/privacyStore'
import { EyeOff, Eye } from 'lucide-react'

export function PrivacyToggle() {
  const hideAmounts = usePrivacyStore((s) => s.hideAmounts)
  const toggle = usePrivacyStore((s) => s.toggle)

  return (
    <Button
      variant={hideAmounts ? 'default' : 'outline'}
      size="sm"
      onClick={toggle}
      aria-pressed={hideAmounts}
      title={hideAmounts ? 'Euro-bedragen worden verborgen' : 'Euro-bedragen zijn zichtbaar'}
    >
      {hideAmounts ? (
        <EyeOff className="h-4 w-4 mr-2" />
      ) : (
        <Eye className="h-4 w-4 mr-2" />
      )}
      Privacy
    </Button>
  )
}