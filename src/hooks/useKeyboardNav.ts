'use client'

import { useEffect, useCallback } from 'react'

interface UseKeyboardNavProps {
  onNavigateUp?: () => void
  onNavigateDown?: () => void
  onToggleStar?: () => void
  onNewCard?: () => void
  onSearch?: () => void
  enabled?: boolean
}

export function useKeyboardNav({
  onNavigateUp,
  onNavigateDown,
  onToggleStar,
  onNewCard,
  onSearch,
  enabled = true,
}: UseKeyboardNavProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        if (e.key === 'Escape') (target as HTMLElement).blur()
        return
      }

      switch (e.key.toLowerCase()) {
        case 'j':
          e.preventDefault()
          onNavigateDown?.()
          break
        case 'k':
          e.preventDefault()
          onNavigateUp?.()
          break
        case 's':
          e.preventDefault()
          onToggleStar?.()
          break
        case 'n':
          e.preventDefault()
          onNewCard?.()
          break
        case '/':
          e.preventDefault()
          onSearch?.()
          break
      }
    },
    [enabled, onNavigateUp, onNavigateDown, onToggleStar, onNewCard, onSearch],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
