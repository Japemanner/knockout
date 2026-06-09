'use client'

import { Button } from '@/components/ui/button'

export default function CrudError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <p className="text-destructive font-medium">CRUD overzicht kon niet laden</p>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        {error.message || 'Er is een fout opgetreden bij het laden van de gegevens. Controleer je verbinding en probeer het opnieuw.'}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => window.location.href = '/crud'}>
          Terug naar CRUD
        </Button>
        <Button onClick={reset}>Opnieuw proberen</Button>
      </div>
    </div>
  )
}