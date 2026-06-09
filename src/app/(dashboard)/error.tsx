'use client'

import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
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