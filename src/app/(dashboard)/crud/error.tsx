'use client'

import { ErrorBoundaryPage } from '@/components/ui/error-boundary-page'

export default function CrudError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorBoundaryPage
      error={error}
      reset={reset}
      title="CRUD overzicht kon niet laden"
      backHref="/crud"
      backLabel="Terug naar CRUD"
    />
  )
}