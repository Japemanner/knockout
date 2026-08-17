# Interface Contract: `CardDetailModal` save-feedback UI-state

**Branch**: `013-save-success-checkmark` | **Date**: 2026-08-17

Dit is het gedragscontract voor de UI-state die in `src/components/kanban/CardDetailModal.tsx` wordt toegevoegd. Het contract beschrijft de nieuwe state, de interactie met de bestaande `handleSave`-flow, en de render-regels voor de knop/vinkje-swap.

---

## Nieuwe lokale state

```typescript
const [isSaved, setIsSaved] = useState(false)
const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
```

- `isSaved`: `true` gedurende 2000ms na een succesvolle opslag; anders `false`.
- `savedTimerRef`: referentie naar de actieve `setTimeout` die `isSaved` weer naar `false` zet. Wordt bewaard in een `useRef` zodat de timer kan worden geannuleerd bij nieuwe wijzigingen, bij sluiten, of bij openen van een andere kaart.

Geen van beide waarden verlaat de component (geen props, geen context, geen global store).

---

## Gedrag: `handleSave` (gewijzigd)

Bestaande flow in `CardDetailModal.tsx:79-93` wordt uitgebreid met de `isSaved`-state:

```typescript
const handleSave = async () => {
  setIsSaving(true)
  const result = await updateCard(card.id, {
    title,
    description: description || undefined,
    url: url || undefined,
    deadline: deadline || undefined,
  })
  setIsSaving(false)

  if (result.error) {
    toast({ title: 'Fout', description: result.error, variant: 'destructive' })
    return
  }

  onUpdated(result.card)

  if (!open) return

  setIsSaved(true)
  if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
  savedTimerRef.current = setTimeout(() => {
    setIsSaved(false)
    savedTimerRef.current = null
  }, 2000)
}
```

**Post-conditions**:
- Bij `result.error`: `isSaved` blijft `false`; knop blijft zichtbaar; toast foutmelding.
- Bij succes en `open === true`: `isSaved` wordt `true`; timer van 2000ms gestart; bij aflopen `isSaved` weer `false`.
- Bij succes en `open === false` (dialoog gesloten tijdens await): geen `setIsSaved(true)`, geen timer. Voorkomt vinkje bij heropenen.

---

## Gedrag: reset bij nieuwe wijziging (nieuw `useEffect`)

```typescript
useEffect(() => {
  if (isSaved) {
    setIsSaved(false)
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current)
      savedTimerRef.current = null
    }
  }
}, [title, description, url, deadline, isStarred])
```

**Doel**: FR-003 — zodra een van de bewerkte velden verandert nadat het vinkje zichtbaar is, wordt het vinkje onmiddellijk teruggezet naar de knop "Opslaan" en wordt de timer geannuleerd.

**Belangrijk**: dit effect mag `isSaved` niet initialisen op `true` bij de eerste mount. Daarom de `if (isSaved)` wacht — alleen resetten als het vinkje daadwerkelijk aan stond.

**Uitzondering**: kolom-verplaatsing (`handleMoveNext`) en sterren-toggle (`handleToggleStar`) veranderingen zitten in de dependency-array via `isStarred`. Voor `handleMoveNext` sluit de dialoog zelf al (`onOpenChange(false)` op regel 119), dus een vinkje-reset is daar niet relevant — de dialoog is al weg.

---

## Gedrag: reset bij nieuwe kaart (bestaande `useEffect` uitgebreid)

Bestaande `useEffect([card])` op regel 53-59 wordt uitgebreid:

```typescript
useEffect(() => {
  setTitle(card.title)
  setDescription(card.description ?? '')
  setUrl(card.url ?? '')
  setDeadline(card.deadline?.split('T')[0] ?? '')
  setIsStarred(card.is_starred)
  setIsSaving(false)
  setIsSaved(false)
  if (savedTimerRef.current) {
    clearTimeout(savedTimerRef.current)
    savedTimerRef.current = null
  }
}, [card])
```

**Doel**: FR-006 — bij het openen van een (andere) kaart is het vinkje altijd uit en is de knop "Opslaan" zichtbaar. Eventuele lopende timer van een vorige kaart wordt geannuleerd.

---

## Gedrag: cleanup bij unmount

```typescript
useEffect(() => {
  return () => {
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current)
      savedTimerRef.current = null
    }
  }
}, [])
```

**Doel**: voorkom memory-leak en timer-fire nadat de component is unmounted. Defensief.

---

## Render-regels: knop-positie (wijziging op regel 231-233)

Bestaande code:

```tsx
<Button size="sm" onClick={handleSave} disabled={isSaving}>
  {isSaving ? 'Opslaan...' : 'Opslaan'}
</Button>
```

Nieuwe code:

```tsx
{isSaving ? (
  <Button size="sm" disabled>Opslaan...</Button>
) : isSaved ? (
  <span className="text-green-600 dark:text-green-500 inline-flex items-center gap-1 text-sm font-medium">
    <Check className="h-4 w-4" />
    Opgeslagen
  </span>
) : (
  <Button size="sm" onClick={handleSave}>Opslaan</Button>
)}
```

**Imports**: `Check` toevoegen aan de bestaande `lucide-react`-import op regel 11:

```typescript
import { Star, Trash2, ExternalLink, ArrowUp, ArrowRight, Check } from 'lucide-react'
```

**Visueel contract**:
- Vinkje-icoon: `Check` uit `lucide-react`, `h-4 w-4` (zelfde formaat als andere iconen in de dialoog).
- Kleur: `text-green-600` in lichte modus, `dark:text-green-500` in donkere modus. Groen is de enige kleur die de spec noemt ("groen vinkje").
- Label: "Opgeslagen" naast het icoon, voor de duidelijkheid. Niet verplicht volgens de spec, maar voorkomt verwarring bij gebruikers die niet direct zien dat het vinkje "opgeslagen" betekent.
- Layout: `inline-flex items-center gap-1 text-sm font-medium` — lijnt uit met de knop-hoogte en zorgt dat het icoon en label netjes naast elkaar staan.

---

## Pre-conditions / Post-conditions

- Pre: `CardDetailModal` is gemount; `card` prop is gevuld; bestaande `updateCard` server action werkt.
- Post na succes: `isSaved === true` voor 2000ms, daarna `false`; `isSaving === false`; kaart is bijgewerkt via `onUpdated`.
- Post na fout: `isSaved === false`; `isSaving === false`; toast getoond; knop "Opslaan" zichtbaar.
- Post na unmount: alle timers geannuleerd; geen state-lekkage.

---

## Consument

Alleen `src/components/kanban/CardDetailModal.tsx`. Geen andere component, hook, of server action raakt deze state. Het patroon kan later worden hergebruikt in een bord-bewerkingsformulier (indien ooit toegevoegd) of in andere bewerkingsdialogen, maar valt buiten deze feature.