'use client'

import { usePrivacyStore } from '@/store/privacyStore'
import { formatEuroNL } from '@/lib/mileage/trips'
import { cn } from '@/lib/utils'

interface MileageAmountProps {
  value: number | null | undefined
  className?: string
}

/**
 * Bedrag met privacy-maskering (dezelfde store als /uren). Anders dan
 * EuroSymbol tonen we ook € 0,00, zodat openstaand = 0 zichtbaar blijft.
 */
export function MileageAmount({ value, className }: MileageAmountProps) {
  const hideAmounts = usePrivacyStore((s) => s.hideAmounts)
  const amount = Number(value ?? 0)

  if (hideAmounts) {
    return (
      <span
        className={cn('inline-flex items-center align-middle', className)}
        aria-label="bedrag verborgen"
        title="Bedrag verborgen"
      >
        € •••
      </span>
    )
  }

  return <span className={cn('inline-flex items-center align-middle', className)}>{formatEuroNL(amount)}</span>
}
