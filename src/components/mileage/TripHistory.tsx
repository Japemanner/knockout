'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import {
  useDeleteTrip,
  useMarkTripsReimbursed,
  useUnmarkTripsReimbursed,
} from '@/hooks/useMileage'
import { TripEditDialog } from '@/components/mileage/TripEditDialog'
import { MileageAmount } from '@/components/mileage/MileageAmount'
import { amsterdamFirstOfMonthISO, amsterdamTodayISO } from '@/lib/hours/dates'
import type { TripFilters, TripStatusFilter, MileageTripWithClient } from '@/lib/mileage/queries'
import {
  buildMileageCsv,
  formatKmNL,
  formatRateNL,
  formatTripDateNL,
  mileageCsvFilename,
} from '@/lib/mileage/trips'
import type { Client } from '@/types/database.types'
import { ArrowRight, Download, Pencil, RotateCcw, Trash2, Wallet } from 'lucide-react'

type PeriodPreset = 'month' | 'year' | 'custom'

const STATUS_OPTIONS: { value: TripStatusFilter; label: string }[] = [
  { value: 'all', label: 'Alle statussen' },
  { value: 'open', label: 'Openstaand' },
  { value: 'reimbursed', label: 'Uitbetaald' },
]

export function TripHistory({
  trips,
  isLoading,
  isError,
  onRetry,
  filters,
  onFiltersChange,
  clients,
}: {
  trips: MileageTripWithClient[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  filters: TripFilters
  onFiltersChange: (filters: TripFilters) => void
  clients: Client[]
}) {
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('month')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [reimbursedAt, setReimbursedAt] = useState(amsterdamTodayISO())
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editingTrip, setEditingTrip] = useState<MileageTripWithClient | null>(null)
  const exportLinkRef = useRef<HTMLAnchorElement>(null)

  const markMutation = useMarkTripsReimbursed()
  const unmarkMutation = useUnmarkTripsReimbursed()
  const deleteMutation = useDeleteTrip()
  const { toast } = useToast()

  useEffect(() => {
    setSelectedIds(new Set())
  }, [filters])

  const applyPreset = (preset: PeriodPreset) => {
    setPeriodPreset(preset)
    const today = amsterdamTodayISO()
    if (preset === 'month') {
      onFiltersChange({ ...filters, fromDate: amsterdamFirstOfMonthISO(), toDate: today })
    } else if (preset === 'year') {
      onFiltersChange({ ...filters, fromDate: `${today.slice(0, 4)}-01-01`, toDate: today })
    }
  }

  const handleDateChange = (kind: 'from' | 'to', value: string) => {
    setPeriodPreset('custom')
    onFiltersChange({ ...filters, [kind === 'from' ? 'fromDate' : 'toDate']: value })
  }

  const openTrips = useMemo(() => trips.filter((trip) => !trip.reimbursed_at), [trips])
  const allOpenSelected =
    openTrips.length > 0 && openTrips.every((trip) => selectedIds.has(trip.id))

  const toggleSelectAllOpen = (checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      for (const trip of openTrips) {
        if (checked) next.add(trip.id)
        else next.delete(trip.id)
      }
      return next
    })
  }

  const toggleRow = (tripId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (checked) next.add(tripId)
      else next.delete(tripId)
      return next
    })
  }

  const handleMarkReimbursed = () => {
    const tripIds = [...selectedIds]
    markMutation.mutate(
      { tripIds, reimbursedAt },
      {
        onSuccess: (result) => {
          if (result.success) {
            setSelectedIds(new Set())
            toast({ title: 'Uitbetaald', description: `${result.data} ${result.data === 1 ? 'rit' : 'ritten'} gemarkeerd` })
          } else {
            toast({ title: 'Fout', description: result.error, variant: 'destructive' })
          }
        },
      },
    )
  }

  const handleUnmark = (tripId: string) => {
    unmarkMutation.mutate([tripId], {
      onSuccess: (result) => {
        if (result.success) {
          toast({ title: 'Terug naar openstaand' })
        } else {
          toast({ title: 'Fout', description: result.error, variant: 'destructive' })
        }
      },
    })
  }

  const handleDelete = (tripId: string) => {
    deleteMutation.mutate(tripId, {
      onSuccess: (result) => {
        if (result.success) {
          setConfirmDeleteId(null)
          toast({ title: 'Verwijderd' })
        } else {
          toast({ title: 'Fout', description: result.error, variant: 'destructive' })
        }
      },
    })
  }

  const handleExport = () => {
    const link = exportLinkRef.current
    if (!link) return
    const csv = buildMileageCsv(trips)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = mileageCsvFilename(filters.fromDate ?? 'alles', filters.toDate ?? 'alles')
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const totals = useMemo(() => {
    let km = 0
    let amount = 0
    for (const trip of trips) {
      km += Number(trip.distance_km)
      amount += Number(trip.amount)
    }
    return { km: Math.round(km * 10) / 10, amount: Math.round(amount * 100) / 100 }
  }, [trips])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historie</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Periode</label>
            <Select
              id="trip-filter-period"
              value={periodPreset}
              onValueChange={(value) => applyPreset(value as PeriodPreset)}
              options={[
                { value: 'month', label: 'Deze maand' },
                { value: 'year', label: 'Dit jaar' },
                { value: 'custom', label: 'Aangepast' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Van</label>
              <Input
                type="date"
                value={filters.fromDate ?? ''}
                onChange={(e) => handleDateChange('from', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tot</label>
              <Input
                type="date"
                value={filters.toDate ?? ''}
                onChange={(e) => handleDateChange('to', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Opdrachtgever</label>
            <Select
              id="trip-filter-client"
              value={filters.clientId ?? ''}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, clientId: value || undefined })
              }
              options={[
                { value: '', label: 'Alle opdrachtgevers' },
                ...clients.map((client) => ({ value: client.id, label: client.name })),
              ]}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select
              id="trip-filter-status"
              value={filters.status ?? 'all'}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, status: value as TripStatusFilter })
              }
              options={STATUS_OPTIONS}
            />
          </div>
        </div>

        {/* Uitbetalen en export */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-y py-3">
          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <div className="space-y-1">
              <label htmlFor="reimbursed-date" className="text-xs font-medium text-muted-foreground">
                Uitbetaaldatum
              </label>
              <Input
                id="reimbursed-date"
                type="date"
                value={reimbursedAt}
                onChange={(e) => setReimbursedAt(e.target.value)}
                className="w-full sm:w-auto"
              />
            </div>
            <Button
              type="button"
              onClick={handleMarkReimbursed}
              disabled={selectedIds.size === 0 || markMutation.isPending}
            >
              <Wallet className="h-4 w-4 mr-2" />
              Markeer als uitbetaald
              {selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </Button>
            <Checkbox
              checked={allOpenSelected}
              onCheckedChange={toggleSelectAllOpen}
              disabled={openTrips.length === 0}
              label="Selecteer alle open"
              className="sm:mb-2"
            />
          </div>
          <div>
            <Button type="button" variant="outline" onClick={handleExport} disabled={trips.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exporteer CSV
            </Button>
            <a ref={exportLinkRef} className="hidden" aria-hidden="true" tabIndex={-1}>
              CSV
            </a>
          </div>
        </div>

        {/* Tabel */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Kon de ritten niet laden.</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Opnieuw proberen
            </Button>
          </div>
        ) : trips.length === 0 ? (
          <EmptyState
            icon={<RotateCcw className="h-8 w-8" />}
            title="Nog geen ritten in deze periode"
            description="Pas de filters aan of leg hierboven je eerste zakelijke rit vast."
          />
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <Table className="min-w-[680px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Datum</TableHead>
                    <TableHead className="hidden md:table-cell">Opdrachtgever</TableHead>
                    <TableHead>Van → naar</TableHead>
                    <TableHead className="hidden lg:table-cell">Doel</TableHead>
                    <TableHead className="text-right">Km</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Tarief</TableHead>
                    <TableHead className="text-right">Bedrag</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((trip) => {
                    const isReimbursed = !!trip.reimbursed_at
                    return (
                      <TableRow key={trip.id}>
                        <TableCell>
                          {!isReimbursed && (
                            <Checkbox
                              checked={selectedIds.has(trip.id)}
                              onCheckedChange={(checked) => toggleRow(trip.id, checked)}
                            />
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatTripDateNL(trip.trip_date)}</TableCell>
                        <TableCell className="hidden md:table-cell">{trip.client_name ?? '—'}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 flex-wrap">
                            <span>{trip.from_location}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{trip.to_location}</span>
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell max-w-[200px] truncate" title={trip.purpose}>
                          {trip.purpose}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">{formatKmNL(trip.distance_km)}</TableCell>
                        <TableCell className="hidden sm:table-cell text-right whitespace-nowrap">
                          € {formatRateNL(trip.rate_per_km)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <MileageAmount value={trip.amount} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {isReimbursed ? (
                            <span className="inline-flex items-center gap-2">
                              <Badge variant="secondary">Uitbetaald {formatTripDateNL(trip.reimbursed_at)}</Badge>
                              <button
                                type="button"
                                className="text-xs text-muted-foreground underline hover:text-foreground"
                                onClick={() => handleUnmark(trip.id)}
                                disabled={unmarkMutation.isPending}
                              >
                                Open
                              </button>
                            </span>
                          ) : (
                            <Badge variant="outline">Openstaand</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {confirmDeleteId === trip.id ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-xs text-destructive">Zeker?</span>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(trip.id)}
                                disabled={deleteMutation.isPending}
                              >
                                Ja
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                                Nee
                              </Button>
                            </span>
                          ) : (
                            <span className="inline-flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingTrip(trip)}
                                aria-label="Bewerken"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setConfirmDeleteId(trip.id)}
                                aria-label="Verwijderen"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
              <span className="text-muted-foreground">
                Totaal {trips.length} {trips.length === 1 ? 'rit' : 'ritten'}
              </span>
              <span className="font-medium">
                {formatKmNL(totals.km)} km · <MileageAmount value={totals.amount} />
              </span>
            </div>
          </div>
        )}
      </CardContent>

      <TripEditDialog
        trip={editingTrip}
        open={!!editingTrip}
        onOpenChange={(open) => {
          if (!open) setEditingTrip(null)
        }}
        clients={clients}
      />
    </Card>
  )
}
