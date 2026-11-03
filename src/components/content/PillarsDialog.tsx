'use client'

import { useEffect, useState } from 'react'
import { Archive, RotateCcw } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { PILLAR_COLOR_KEYS, pillarColors } from '@/components/content/colors'
import { useToast } from '@/components/ui/toast'
import { useCreatePillar, useSetPillarArchived, useUpdatePillar } from '@/hooks/useContent'
import type { ContentPillar, PillarColor } from '@/types/database.types'

interface PillarsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pillars: ContentPillar[]
}

/**
 * Beheer van contentsoorten (US3): naam/doelgroep/beschrijving, kleurkeuze uit
 * 8 vaste kleuren, archiveren (niet verwijderen) en heractiveren. Weekslots,
 * weekdagen en tijden horen niet meer bij een soort (FR-018 t/m FR-022).
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
            toast({ title: 'Contentsoort aangemaakt' })
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
          <DialogTitle>Contentsoorten</DialogTitle>
          <DialogDescription>
            Contentsoorten groeperen je ideeën en bepalen de kleur in de lijst en het overzicht.
          </DialogDescription>
        </DialogHeader>
        <DialogContent className="space-y-4" data-testid="pillars-dialog">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[12rem] flex-1">
              <label htmlFor="pillar-new-name" className="mb-1 block text-xs font-medium text-muted-foreground">
                Nieuwe contentsoort
              </label>
              <Input
                id="pillar-new-name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleAdd()
                  }
                }}
                placeholder="Bijv. Praktijk financieel adviseurs"
                data-testid="pillar-new-name"
              />
            </div>
            <ColorSwatches selected={newColor} onSelect={setNewColor} />
            <Button type="button" onClick={handleAdd} disabled={createPillar.isPending} data-testid="pillar-add">
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

function PillarRow({ pillar }: { pillar: ContentPillar }) {
  const [name, setName] = useState(pillar.name)
  const [audience, setAudience] = useState(pillar.audience ?? '')
  const [description, setDescription] = useState(pillar.description ?? '')
  const [color, setColor] = useState<PillarColor>(pillar.color)
  const updatePillar = useUpdatePillar()
  const setArchived = useSetPillarArchived()
  const { toast } = useToast()

  // Resync na serverwijziging (updated_at verandert bij elke opslag)
  useEffect(() => {
    setName(pillar.name)
    setAudience(pillar.audience ?? '')
    setDescription(pillar.description ?? '')
    setColor(pillar.color)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resync alleen bij serverwijziging, niet bij elke render
  }, [pillar.updated_at, pillar.id])

  const dirty =
    name !== pillar.name ||
    audience !== (pillar.audience ?? '') ||
    description !== (pillar.description ?? '') ||
    color !== pillar.color

  const handleSaveDetails = () => {
    updatePillar.mutate(
      {
        pillarId: pillar.id,
        patch: { name, audience: audience || null, description: description || null, color },
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            toast({ title: 'Opgeslagen' })
          } else {
            toast({ title: 'Fout', description: result.error, variant: 'destructive' })
          }
        },
      },
    )
  }

  const handleArchiveToggle = () => {
    setArchived.mutate(
      { pillarId: pillar.id, archived: !pillar.archived },
      {
        onSuccess: (result) => {
          if (result.success) {
            toast({ title: result.data.archived ? 'Gearchiveerd' : 'Heractiveerd' })
          } else {
            toast({ title: 'Fout', description: result.error, variant: 'destructive' })
          }
        },
      },
    )
  }

  return (
    <div
      className={cn('rounded-lg border p-3', pillar.archived && 'opacity-60')}
      data-testid="pillar-row"
      data-pillar-id={pillar.id}
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1 space-y-2">
          <label className="sr-only" htmlFor={`pillar-name-${pillar.id}`}>Naam</label>
          <Input
            id={`pillar-name-${pillar.id}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Naam"
          />
          <div className="flex flex-wrap gap-2">
            <Input
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              placeholder="Doelgroep"
              aria-label="Doelgroep"
              className="h-8 flex-1 text-xs"
            />
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Korte beschrijving"
              aria-label="Korte beschrijving"
              className="h-8 flex-1 text-xs"
            />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 pb-1">
          <Button type="button" variant="outline" size="sm" onClick={handleSaveDetails} disabled={!dirty || updatePillar.isPending}>
            Opslaan
          </Button>
          <button
            type="button"
            onClick={handleArchiveToggle}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            data-testid="pillar-archive-toggle"
          >
            {pillar.archived ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
            {pillar.archived ? 'Heractiveren' : 'Archiveren'}
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] text-muted-foreground">Kleur</span>
        <ColorSwatches selected={color} onSelect={setColor} />
        {pillar.archived && <span className="ml-2 text-[11px] text-muted-foreground">(gearchiveerd)</span>}
      </div>
    </div>
  )
}
