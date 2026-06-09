'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect, type ReactNode } from 'react'
import { ToastProvider } from '@/components/ui/toast'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import '@/app/globals.css'

function suppressRSCConnectionErrors() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message === 'Connection closed.') {
        event.preventDefault()
        console.debug('[app] Suppressed RSC connection error (unhandledrejection)')
      }
    }
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('Connection closed')) {
        event.preventDefault()
        event.stopImmediatePropagation()
        console.debug('[app] Suppressed RSC connection error (error)')
      }
    }
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  suppressRSCConnectionErrors()

  return (
    <html lang="nl">
      <body>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}
