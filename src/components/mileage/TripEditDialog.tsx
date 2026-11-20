'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/toast'
import { useUpdateTrip } from '@/hooks/useMileage'
import { parseDecimalInput } from '@/lib/decimal'
import { defaultRateForDate } from '@/lib/mileage/rates'
import {
  formatEuroNL,
  formatKmNL,
  formatRateNL,
  tripAmount,
  tripDistanceKm,
} from '@/lib/mileage/trips'
import type { Client } from '@/types/database.types'
import type { MileageTripWithClient } from '@/lib/mileage/queries'
import { Save, X } from 'lucide-react'

function formatKmInput(value: number): string {
  return String(Math.round(value * 10) / 10).replace('.', ',')
}

export function TripEditDialog({
  trip,
  open,
  onOpenChange,
  clients,
}: {
  trip: MileageTripWithClient | null
  open: boolean
  onOpenChange: (open: boolean) => void
  clients: Client[]
}) {
  const updateMutation = useUpdateTrip()
  const { toast } = useToast()

  const [tripDate, setTripDate] = useState('')
  const [clientId, setClientId] = useState('')
  const [fromLocation, setFromLocation] = useState('')
  const [toLocation, setToLocation] = useState('')
  const [purpose, setPurpose] = useState('')
  const [distanceRaw, setDistanceRaw] = useState('')
  const [isReturn, setIsReturn] = useState(false)
  const [rateRaw, setRateRaw] = useState('')
  const [rateManual, setRateManual] = useState(false)
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!trip) return
    setTripDate(trip.trip_date)
    setClientId(trip.client_id ?? '')
    setFromLocation(trip.from_location)
    setToLocation(trip.to_location)
    setPurpose(trip.purpose)
    setIsReturn(trip.is_return)
    setDistanceRaw(formatKmInput(trip.is_return ? trip.distance_km / 2 : trip.distance_km))
    setRateRaw(formatRateNL(trip.rate_per_km))
    setRateManual(true)
    setNotes(trip.notes ?? '')
    setFormError(null)
  }, [trip])

  const handleDateChange = (value: string) => {
    setTripDate(value)
    if (!rateManual) setRateRaw(formatRateNL(defaultRateForDate(value)))
  }

  const distanceParsed = parseDecimalInput(distanceRaw, false)
  const singleKm = distanceParsed.ok ? distanceParsed.value : null
  const totalKm = singleKm !== null ? tripDistanceKm(singleKm, isReturn) : null
  const rateParsed = parseDecimalInput(rateRaw, false)
  const rate = rateParsed.ok ? rateParsed.value : null
  const previewAmount = totalKm !== null && rate !== null ? tripAmount(totalKm, rate) : null
  const maxRate = defaultRateForDate(tripDate)

  const save = () => {
    if (!trip) return
    setFormError(null)

    if (!tripDate) {
      setFormError('Datum is verplicht')
      return
    }
    if (!fromLocation.trim() || !toLocation.trim() || !purpose.trim()) {
      setFormError('Van, naar en zakelijk doel zijn verplicht')
      return
    }
    if (!distanceParsed.ok || distanceParsed.value === null || distanceParsed.value <= 0) {
      setFormError(distanceParsed.ok ? 'Afstand moet groter zijn dan 0' : distanceParsed.error)
      return
    }
    if (!rateParsed.ok || rateParsed.value === null || rateParsed.value < 0) {
      setFormError(rateParsed.ok ? 'Tarief moet 0 of hoger zijn' : rateParsed.error)
      return
    }

    updateMutation.mutate(
      {
        tripId: trip.id,
        patch: {
          trip_date: tripDate,
          client_id: clientId || null,
          from_location: fromLocation.trim(),
          to_location: toLocation.trim(),
          purpose: purpose.trim(),
          distance_km: tripDistanceKm(distanceParsed.value, isReturn),
          is_return: isReturn,
          rate_per_km: rateParsed.value,
          notes: notes.trim() || null,
        },
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            toast({ title: 'Opgeslagen' })
            onOpenChange(false)
          } else {
            toast({ title: 'Fout', description: result.error, variant: 'destructive' })
          }
        },
        onError: (err) => {
          toast({ title: 'Fout', description: err.message, variant: 'destructive' })
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Rit bewerken</DialogTitle>
        <DialogDescription>Wijzig de ritgegevens. Het tarief blijft een snapshot van deze rit.</DialogDescription>
      </DialogHeader>
      <DialogContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="edit-trip-date" className="text-xs font-medium text-muted-foreground">
              Datum
            </label>
            <Input
              id="edit-trip-date"
              type="date"
              value={tripDate}
              onChange={(e) => handleDateChange(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="edit-trip-client" className="text-xs font-medium text-muted-foreground">
              Opdrachtgever (optioneel)
            </label>
            <Select
              id="edit-trip-client"
              value={clientId}
              onValueChange={setClientId}
              options={[
                { value: '', label: 'Geen opdrachtgever' },
                ...clients.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="edit-trip-from" className="text-xs font-medium text-muted-foreground">
              Van
            </label>
            <Input id="edit-trip-from" value={fromLocation} onChange={(e) => setFromLocation(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label htmlFor="edit-trip-to" className="text-xs font-medium text-muted-foreground">
              Naar
            </label>
            <Input id="edit-trip-to" value={toLocation} onChange={(e) => setToLocation(e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label htmlFor="edit-trip-purpose" className="text-xs font-medium text-muted-foreground">
              Zakelijk doel
            </label>
            <Input id="edit-trip-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label htmlFor="edit-trip-distance" className="text-xs font-medium text-muted-foreground">
              Enkele afstand (km)
            </label>
            <Input
              id="edit-trip-distance"
              inputMode="decimal"
              value={distanceRaw}
              onChange={(e) => setDistanceRaw(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="edit-trip-rate" className="text-xs font-medium text-muted-foreground">
              Tarief per km (€)
            </label>
            <Input
              id="edit-trip-rate"
              inputMode="decimal"
              value={rateRaw}
              onChange={(e) => {
                setRateRaw(e.target.value)
                setRateManual(true)
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <Checkbox
              checked={isReturn}
              onCheckedChange={setIsReturn}
              label="Retour (verdubbelt de afstand)"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label htmlFor="edit-trip-notes" className="text-xs font-medium text-muted-foreground">
              Notities (optioneel)
            </label>
            <Textarea
              id="edit-trip-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground" aria-live="polite">
          {totalKm !== null && rate !== null && previewAmount !== null
            ? `${formatKmNL(totalKm)} km × € ${formatRateNL(rate)} = ${formatEuroNL(previewAmount)}`
            : 'Vul een afstand en tarief in voor de berekening.'}
        </p>
        {rate !== null && rate > maxRate && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Boven het onbelaste maximum van € {formatRateNL(maxRate)} — het meerdere is belast loon.
          </p>
        )}
        {formError && <p className="text-xs text-destructive">{formError}</p>}
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          <X className="h-4 w-4 mr-2" />
          Annuleren
        </Button>
        <Button onClick={save} disabled={updateMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Opslaan
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
