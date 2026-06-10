import type { Metadata } from 'next'
import { Providers } from '@/components/providers'
import '@/app/globals.css'

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}