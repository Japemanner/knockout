'use client'

import { useEffect, useRef, useState, FormEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/toast'
import { useClients } from '@/hooks/useHours'
import { useCreateTrip } from '@/hooks/useMileage'
import { parseDecimalInput } from '@/lib/decimal'
import { amsterdamTodayISO } from '@/lib/hours/dates'
import { defaultRateForDate } from '@/lib/mileage/rates'
import {
  formatEuroNL,
  formatKmNL,
  formatRateNL,
  tripAmount,
  tripDistanceKm,
  type RecentRoute,
} from '@/lib/mileage/trips'
import { Car, Check, Plus } from 'lucide-react'

function formatKmInput(value: number): string {
  return String(Math.round(value * 10) / 10).replace('.', ',')
}

export interface ReuseRouteRequest {
  route: RecentRoute
  nonce: number
}

export function TripEntryForm({ reuseRoute }: { reuseRoute?: ReuseRouteRequest | null }) {
  const { data: clients } = useClients()
  const activeClients = (clients ?? []).filter((c) => !c.archived)
  const createMutation = useCreateTrip()
  const { toast } = useToast()

  const [tripDate, setTripDate] = useState(amsterdamTodayISO())
  const [clientId, setClientId] = useState('')
  const [fromLocation, setFromLocation] = useState('')
  const [toLocation, setToLocation] = useState('')
  const [purpose, setPurpose] = useState('')
  const [distanceRaw, setDistanceRaw] = useState('')
  const [isReturn, setIsReturn] = useState(false)
  const [rateRaw, setRateRaw] = useState(formatRateNL(defaultRateForDate(amsterdamTodayISO())))
  const [rateManual, setRateManual] = useState(false)
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!reuseRoute) return
    const route = reuseRoute.route
    setFromLocation(route.from_location)
    setToLocation(route.to_location)
    setPurpose(route.purpose)
    setIsReturn(route.is_return)
    const singleKm = route.is_return ? route.distance_km / 2 : route.distance_km
    setDistanceRaw(formatKmInput(singleKm))
    if (route.client_id) setClientId(route.client_id)
    setFormError(null)
    markChanged()
  }, [reuseRoute])

  function markChanged() {
    setSaved(false)
    if (savedTimer.current) {
      clearTimeout(savedTimer.current)
      savedTimer.current = null
    }
  }

  function flashSaved() {
    setSaved(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaved(false), 2000)
  }

  const distanceParsed = parseDecimalInput(distanceRaw, false)
  const singleKm = distanceParsed.ok ? distanceParsed.value : null
  const totalKm = singleKm !== null ? tripDistanceKm(singleKm, isReturn) : null
  const rateParsed = parseDecimalInput(rateRaw, false)
  const rate = rateParsed.ok ? rateParsed.value : null
  const previewAmount = totalKm !== null && rate !== null ? tripAmount(totalKm, rate) : null
  const maxRate = defaultRateForDate(tripDate)
  const aboveMax = rate !== null && rate > maxRate

  const handleDateChange = (value: string) => {
    setTripDate(value)
    markChanged()
    if (!rateManual) setRateRaw(formatRateNL(defaultRateForDate(value)))
  }

  const handleRateChange = (value: string) => {
    setRateRaw(value)
    setRateManual(true)
    markChanged()
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
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

    const distanceKm = tripDistanceKm(distanceParsed.value, isReturn)
    createMutation.mutate(
      {
        trip_date: tripDate,
        client_id: clientId || null,
        from_location: fromLocation.trim(),
        to_location: toLocation.trim(),
        purpose: purpose.trim(),
        distance_km: distanceKm,
        is_return: isReturn,
        rate_per_km: rateParsed.value,
        notes: notes.trim() || null,
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            flashSaved()
            // Datum, van-locatie en opdrachtgever blijven staan.
            setToLocation('')
            setPurpose('')
            setDistanceRaw('')
            setIsReturn(false)
            setNotes('')
            setRateRaw(formatRateNL(defaultRateForDate(tripDate)))
            setRateManual(false)
            setFormError(null)
          } else {
            toast({ title: 'Fout bij opslaan', description: result.error, variant: 'destructive' })
          }
        },
        onError: (err) => {
          toast({ title: 'Fout bij opslaan', description: err.message, variant: 'destructive' })
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          Rit vastleggen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label htmlFor="trip-date" className="text-xs font-medium text-muted-foreground">
              Datum
            </label>
            <Input
              id="trip-date"
              type="date"
              value={tripDate}
              onChange={(e) => handleDateChange(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="trip-client" className="text-xs font-medium text-muted-foreground">
              Opdrachtgever (optioneel)
            </label>
            <Select
              id="trip-client"
              value={clientId}
              onValueChange={(value) => {
                setClientId(value)
                markChanged()
              }}
              options={[
                { value: '', label: 'Geen opdrachtgever' },
                ...activeClients.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="trip-from" className="text-xs font-medium text-muted-foreground">
              Van
            </label>
            <Input
              id="trip-from"
              value={fromLocation}
              onChange={(e) => {
                setFromLocation(e.target.value)
                markChanged()
              }}
              placeholder="bijv. Amsterdam"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="trip-to" className="text-xs font-medium text-muted-foreground">
              Naar
            </label>
            <Input
              id="trip-to"
              value={toLocation}
              onChange={(e) => {
                setToLocation(e.target.value)
                markChanged()
              }}
              placeholder="bijv. Utrecht"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label htmlFor="trip-purpose" className="text-xs font-medium text-muted-foreground">
              Zakelijk doel
            </label>
            <Input
              id="trip-purpose"
              value={purpose}
              onChange={(e) => {
                setPurpose(e.target.value)
                markChanged()
              }}
              placeholder="bijv. Klantbezoek Acme BV"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="trip-distance" className="text-xs font-medium text-muted-foreground">
              Enkele afstand (km)
            </label>
            <Input
              id="trip-distance"
              inputMode="decimal"
              value={distanceRaw}
              onChange={(e) => {
                setDistanceRaw(e.target.value)
                markChanged()
              }}
              placeholder="bijv. 31,2"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="trip-rate" className="text-xs font-medium text-muted-foreground">
              Tarief per km (€)
            </label>
            <Input
              id="trip-rate"
              inputMode="decimal"
              value={rateRaw}
              onChange={(e) => handleRateChange(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <Checkbox
              checked={isReturn}
              onCheckedChange={(checked) => {
                setIsReturn(checked)
                markChanged()
              }}
              label="Retour (verdubbelt de afstand)"
            />
          </div>

          <div className="space-y-1 sm:col-span-2 lg:col-span-4">
            <label htmlFor="trip-notes" className="text-xs font-medium text-muted-foreground">
              Notities (optioneel)
            </label>
            <Textarea
              id="trip-notes"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
                markChanged()
              }}
              rows={2}
              placeholder="Bijv. parkeerkosten of bijzonderheden"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4 space-y-1">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {totalKm !== null && rate !== null && previewAmount !== null
                ? `${formatKmNL(totalKm)} km × € ${formatRateNL(rate)} = ${formatEuroNL(previewAmount)}`
                : 'Vul een afstand en tarief in voor de berekening.'}
            </p>
            {aboveMax && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Boven het onbelaste maximum van € {formatRateNL(maxRate)} — het meerdere is belast loon.
              </p>
            )}
          </div>

          {formError && (
            <p className="text-xs text-destructive sm:col-span-2 lg:col-span-4">{formError}</p>
          )}

          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            {createMutation.isPending ? (
              <Button type="submit" disabled>
                Opslaan...
              </Button>
            ) : saved ? (
              <span className="text-green-600 dark:text-green-500 inline-flex items-center gap-1 text-sm font-medium">
                <Check className="h-4 w-4" />
                Opgeslagen
              </span>
            ) : (
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Toevoegen
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
