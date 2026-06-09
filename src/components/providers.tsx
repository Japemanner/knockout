'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { ToastProvider } from '@/components/ui/toast'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { RSC_CONNECTION_PATTERNS } from '@/components/ui/error-boundary-page'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
      },
    },
  }))

  useEffect(() => {
    const isRSCError = (msg: string | undefined) => msg && RSC_CONNECTION_PATTERNS.some(p => msg.includes(p))

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isRSCError(event.reason?.message)) {
        event.preventDefault()
      }
    }
    const handleError = (event: ErrorEvent) => {
      if (isRSCError(event.message)) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}