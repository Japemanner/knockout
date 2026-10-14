'use client'

import { useEffect, useState } from 'react'
import { Archive, RotateCcw } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { PILLAR_COLOR_KEYS, pillarColors } from '@/components/content/colors'
import { useToast } from '@/components/ui/toast'
import { useCreatePillar, useDeleteSlot, useSetPillarArchived, useUpdatePillar, useUpsertSlot } from '@/hooks/useContent'
import type { PillarWithSlots } from '@/lib/content/queries'
import type { ContentSlot, PillarColor } from '@/types/database.types'

const WEEKDAYS: { weekday: number; label: string }[] = [
  { weekday: 1, label: 'Ma' },
  { weekday: 2, label: 'Di' },
  { weekday: 3, label: 'Wo' },
  { weekday: 4, label: 'Do' },
  { weekday: 5, label: 'Vr' },
  { weekday: 6, label: 'Za' },
  { weekday: 7, label: 'Zo' },
]

interface PillarsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pillars: PillarWithSlots[]
}

/**
 * Beheer van contentsoorten en weekslots (US1): naam/doelgroep/beschrijving,
 * kleurkeuze uit 8 vaste kleuren, archiveren (niet verwijderen) en per soort
 * zeven dag-chips (ma t/m zo) met een eigen tijd (standaard 08:00).
 */
export function PillarsDialog({ open, onOpenChange, pillars }: PillarsDialogProps) {
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<PillarColor>('blue')
  const createPillar = useCreatePillar()
  const { toast } = useToast()

  const handleAdd = () => {
    const name = newName.trim()
    if (!name) {
      toast({ title: 'De naam van de contentsoort is verplicht.' })
      return
    }
    createPillar.mutate(
      { name, color: newColor },
      {
        onSuccess: (result) => {
          if (result.success) {
            setNewName('')
          } else {
            toast({ title: 'Fout', description: result.error, variant: 'destructive' })
          }
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle>Soorten &amp; slots</DialogTitle>
          <DialogDescription>
            Contentsoorten bepalen welke lege slots de kalender toont. Per soort kies je weekdagen met een vast tijdslot.
          </DialogDescription>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nieuwe contentsoort</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAdd()
                  }
                }}
                placeholder="Bijv. Praktijk financieel adviseurs"
              />
            </div>
            <ColorSwatches selected={newColor} onSelect={setNewColor} />
            <Button type="button" onClick={handleAdd} disabled={createPillar.isPending}>
              Toevoegen
            </Button>
          </div>

          <div className="space-y-3">
            {pillars.map((pillar) => (
              <PillarRow key={pillar.id} pillar={pillar} />
            ))}
            {pillars.length === 0 && (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Nog geen contentsoorten. Maak je eerste soort hierboven aan.
              </p>
            )}
          </div>
        </DialogContent>
      </div>
    </Dialog>
  )
}

function ColorSwatches({ selected, onSelect }: { selected: PillarColor; onSelect: (color: PillarColor) => void }) {
  return (
    <div className="flex items-center gap-1.5 pb-1">
      {PILLAR_COLOR_KEYS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Kleur ${color}`}
          onClick={() => onSelect(color)}
          className={cn('h-5 w-5 rounded-full', pillarColors[color].swatch, selected === color && pillarColors[color].swatchActive)}
        />
      ))}
    </div>
  )
}

function PillarRow({ pillar }: { pillar: PillarWithSlots }) {
  const [name, setName] = useState(pillar.name)
  const [audience, setAudience] = useState(pillar.audience ?? '')
  const [description, setDescription] = useState(pillar.description ?? '')
  const updatePillar = useUpdatePillar()
  const setArchived = useSetPillarArchived()
  const upsertSlot = useUpsertSlot()
  const deleteSlot = useDeleteSlot()
  const { toast } = useToast()

  // Resync na serverwijziging (updated_at verandert bij elke opslag)
  useEffect(() => {
    setName(pillar.name)
    setAudience(pillar.audience ?? '')
    setDescription(pillar.description ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resync alleen bij serverwijziging, niet bij elke render
  }, [pillar.updated_at, pillar.id])

  const dirty = name !== pillar.name || audience !== (pillar.audience ?? '') || description !== (pillar.description ?? '')
  const slotByWeekday = new Map<number, ContentSlot>(pillar.slots.map((s) => [s.weekday, s]))

  const handleSaveDetails = () => {
    updatePillar.mutate(
      { pillarId: pillar.id, patch: { name, audience: audience || null, description: description || null } },
      {
        onSuccess: (result) => {
          if (!result.success) toast({ title: 'Fout', description: result.error, variant: 'destructive' })
        },
      },
    )
  }

  const handleDayToggle = (weekday: number) => {
    const slot = slotByWeekday.get(weekday)
    upsertSlot.mutate(
      { pillarId: pillar.id, weekday, time: displaySlotTime(slot?.post_time) ?? '08:00', active: !(slot?.active ?? false) },
      {
        onSuccess: (result) => {
          if (!result.success) toast({ title: 'Fout', description: result.error, variant: 'destructive' })
        },
      },
    )
  }

  const handleTimeChange = (weekday: number, time: string) => {
    if (!time) return
    upsertSlot.mutate(
      { pillarId: pillar.id, weekday, time, active: true },
      {
        onSuccess: (result) => {
          if (!result.success) toast({ title: 'Fout', description: result.error, variant: 'destructive' })
        },
      },
    )
  }

  const handleRemoveDay = (weekday: number) => {
    const slot = slotByWeekday.get(weekday)
    if (!slot) return
    deleteSlot.mutate(slot.id, {
      onSuccess: (result) => {
        if (!result.success) toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      },
    })
  }

  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        pillar.archived && 'opacity-60',
      )}
    >
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Naam" />
          <div className="flex gap-2">
            <Input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Doelgroep"
              className="h-8 text-xs"
            />
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Korte beschrijving"
              className="h-8 text-xs"
            />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 pb-1">
          <Button type="button" variant="outline" size="sm" onClick={handleSaveDetails} disabled={!dirty || updatePillar.isPending}>
            Opslaan
          </Button>
          <button
            type="button"
            onClick={() =>
              setArchived.mutate(
                { pillarId: pillar.id, archived: !pillar.archived },
                {
                  onSuccess: (result) => {
                    if (!result.success) toast({ title: 'Fout', description: result.error, variant: 'destructive' })
                  },
                },
              )
            }
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {pillar.archived ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
            {pillar.archived ? 'Heractiveren' : 'Archiveren'}
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {WEEKDAYS.map(({ weekday, label }) => {
          const slot = slotByWeekday.get(weekday)
          const active = slot?.active ?? false
          return (
            <div key={weekday} className="flex items-center">
              <button
                type="button"
                onClick={() => handleDayToggle(weekday)}
                className={cn(
                  'h-7 min-w-8 rounded-md border px-1.5 text-xs',
                  active
                    ? cn('border-transparent font-medium', pillarColors[pillar.color].dot, 'text-white')
                    : 'text-muted-foreground hover:bg-accent',
                )}
                title={active ? `${label} uitzetten` : `${label} aanzetten`}
              >
                {label}
              </button>
              {active && slot && (
                <>
                  <input
                    type="time"
                    value={displaySlotTime(slot.post_time) ?? '08:00'}
                    onChange={(e) => handleTimeChange(weekday, e.target.value)}
                    onBlur={(e) => handleTimeChange(weekday, e.target.value)}
                    className="h-7 w-[5.5rem] rounded-md border border-input bg-transparent px-1 text-xs"
                    aria-label={`Tijd ${label}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveDay(weekday)}
                    className="ml-0.5 text-xs text-muted-foreground hover:text-destructive"
                    title="Dag verwijderen"
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function displaySlotTime(time: string | null | undefined): string | null {
  return time ? time.slice(0, 5) : null
}