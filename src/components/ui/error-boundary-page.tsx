'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export const RSC_CONNECTION_PATTERNS = ['Connection closed.', 'Connection reset.', 'The connection to the page was unexpectedly closed']

export function isRSCConnectionError(error: Error): boolean {
  return RSC_CONNECTION_PATTERNS.some(msg => error.message?.includes(msg))
}

interface ErrorBoundaryPageProps {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  backHref?: string
  backLabel?: string
}

export function ErrorBoundaryPage({ error, reset, title, backHref, backLabel }: ErrorBoundaryPageProps) {
  useEffect(() => {
    if (isRSCConnectionError(error)) {
      reset()
    }
  }, [error, reset])

  if (isRSCConnectionError(error)) {
    return null
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <p className="text-destructive font-medium">{title ?? 'Er is iets misgegaan'}</p>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        {error.message || 'Er is een onverwachte fout opgetreden.'}
      </p>
      <div className="flex gap-2">
        {backHref && (
          <Button variant="outline" onClick={() => { window.location.href = backHref }}>
            {backLabel ?? 'Terug'}
          </Button>
        )}
        <Button onClick={reset}>Opnieuw proberen</Button>
      </div>
    </div>
  )
}