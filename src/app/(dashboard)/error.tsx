'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

const RSC_CONNECTION_ERRORS = ['Connection closed.', 'Connection reset.', 'The connection to the page was unexpectedly closed']

function isRSCConnectionError(error: Error): boolean {
  return RSC_CONNECTION_ERRORS.some(msg => error.message?.includes(msg))
}

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
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
      <p className="text-destructive font-medium">Er is iets misgegaan</p>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        {error.message || 'Er is een onverwachte fout opgetreden.'}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Pagina vernieuwen
        </Button>
        <Button onClick={reset}>Opnieuw proberen</Button>
      </div>
    </div>
  )
}