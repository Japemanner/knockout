'use client'

import { usePrivacyStore } from '@/store/privacyStore'
import { cn } from '@/lib/utils'

interface EuroSymbolProps {
  value: number | null | undefined
  className?: string
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function StruckEuro({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center align-middle', className)}
      aria-label="bedrag verborgen"
      title="Bedrag verborgen"
    >
      <svg
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        className="inline-block"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18.5 6.5C17 4.8 14.9 4 12.5 4 8 4 5 7.6 5 12s3 8 7.5 8c2.4 0 4.5-.8 6-2.5" />
        <path d="M8 10.5h6M8 13.5h6" />
        <line x1="4" y1="20" x2="20" y2="4" />
      </svg>
    </span>
  )
}

export function EuroSymbol({ value, className }: EuroSymbolProps) {
  const hideAmounts = usePrivacyStore((s) => s.hideAmounts)

  if (value === null || value === undefined || Number(value) === 0) {
    return null
  }

  if (hideAmounts) {
    return <StruckEuro className={className} />
  }

  return <span className={cn('inline-flex items-center align-middle', className)}>{formatEuro(Number(value))}</span>
}