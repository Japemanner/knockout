'use client'

import { ErrorBoundaryPage } from '@/components/ui/error-boundary-page'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorBoundaryPage error={error} reset={reset} />
}