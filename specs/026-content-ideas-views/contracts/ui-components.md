# Contract: UI-componenten — Content-ideeën

**Feature**: 026-content-ideas-views | **Date**: 2026-11-03

## Componentstructuur

```text
src/app/(dashboard)/content/page.tsx      Server component: SSR-prefetch pillars + posts
└── ContentView.tsx                       Client shell: tabbladen, data, dialogs
    ├── IdeaComposer.tsx                  Formulier "snel een idee vastleggen"
    ├── IdeaList.tsx                      Lijst van alle ideeën, nieuwste bovenaan
    ├── ContentOverview.tsx               Aantallen per contentsoort + totaal
    ├── IdeaEditorDialog.tsx              Detail bewerken/verwijderen
    └── PillarsDialog.tsx                 Contentsoorten beheren (zonder slots)
```

Verwijderd: `MonthGrid.tsx`, `DayCell.tsx`, `SlotPlaceholder.tsx`, `PostChip.tsx`, `IdeasPanel.tsx`.

## ContentView

**Props**: geen (de pagina levert geen `initialYm` meer).

**State**:

- `view: 'ideeen' | 'overzicht'` — default `'ideeen'`.
- `pillarsOpen: boolean`.
- `editorPostId: string | null`.

**Data**:

- `usePillars()` → `ContentPillar[]`.
- `usePosts()` → `ContentPost[]`.
- `pillarById` → `Map<string, ContentPillar>`.
- `counts` → `countIdeasByPillar(posts, pillars)` (useMemo).

**Header**:

- Titel "Content".
- Tablist met twee tabs: "Ideeën" en "Overzicht".
- Knop "Soorten" (opent `PillarsDialog`).
- Geen maandnavigatie, "Vandaag", "Nieuwe post" of "Soorten & slots".

**Toegankelijkheid**:

- `role="tablist"`, elke tab `role="tab"` met `aria-selected`, `aria-controls` en een `id`.
- Tabpanels `role="tabpanel"` met `aria-labelledby`.
- Pijl-links/rechts wisselt tussen de tabs; Home/End naar eerste/laatste.
- De actieve tab heeft een duidelijke focus- en selectiestijl.

**Layout**:

- Desktop: gecentreerde container, maximaal leesbare breedte; composer bovenaan, lijst eronder; overzicht als lijst/kaart.
- Mobiel (<768 px): één kolom, composer bovenaan, tabs en knoppen wrapen; geen horizontaal scrollen (FR-026/SC-007).

## IdeaComposer

**Props**:

```ts
interface IdeaComposerProps {
  pillars: ContentPillar[]              // alleen niet-gearchiveerd
  onCreate: (input: CreateIdeaInput) => Promise<ActionResult<ContentPost>>
  isPending: boolean
}
```

**Velden**:

| Veld | Verplicht | UI |
|------|-----------|----|
| Titel | Ja | `Input`, autofocus bij mount, `aria-invalid` + inline fout bij leeg |
| Contentsoort | Nee | `Select` met "Geen soort" + actieve soorten |
| Idee-tekst | Nee | `Textarea`, 2–3 regels |
| Bron-URL | Nee | `Input type="url"` achter "Meer details" |
| Notities | Nee | `Textarea` achter "Meer details" |

**Verboden velden**: Format, Datum, Tijd, LinkedIn-URL. Deze mogen in de composer niet in de DOM voorkomen (FR-005/SC-004).

**Opslaan**:

- Knop "Opslaan" (primary) en Ctrl/Cmd+Enter vanuit het formulier.
- Enter in het **titelveld** submit; Enter in de tekstarea voegt een regel toe.
- Tijdens `isPending` is de knop disabled en wordt een tweede submit genegeerd (FR-007/edge case dubbel opslaan).
- Lege titel: geen servercall; inline melding "De titel is verplicht." en focus terug naar het titelveld.

**Na succes**:

- Formulier leegt: titel, soort, tekst, bron-URL en notities terug naar beginwaarden.
- "Meer details" klapt dicht.
- Focus gaat terug naar het titelveld.
- Toast "Idee opgeslagen".
- Het nieuwe idee staat direct bovenaan de lijst (cache-update + invalidatie).

**Na fout**:

- Inhoud blijft staan; destructieve toast met de servermelding; opnieuw opslaan mogelijk (FR-009).

**Data-testids**:

- `data-testid="idea-composer"`
- `data-testid="idea-title-input"`
- `data-testid="idea-pillar-select"`
- `data-testid="idea-body-input"`
- `data-testid="idea-save-button"`

## IdeaList

**Props**:

```ts
interface IdeaListProps {
  posts: ContentPost[]
  pillarById: Map<string, ContentPillar>
  onOpen: (post: ContentPost) => void
}
```

**Rij-contract**:

- Titel (afgekapt met ellipsis; volledige titel in de editor).
- Kleurstip + naam van de contentsoort, of "Geen soort" in gedimde stijl.
- Statusbadge via `statusLabel`.
- Aanmaakdatum via `formatIdeaDate(created_at)` (NL, vaste `Europe/Amsterdam`).
- Gearchiveerde soort: naam + "(gearchiveerd)", gedimd.
- De rij is een `button` of heeft `role="button"` + `tabIndex=0`; Enter/Space opent de editor.
- Sortering: `created_at` aflopend (nieuwste bovenaan); tiebreaker `id`.

**Statussen**:

- Leeg: "Nog geen ideeën. Typ hierboven een titel en druk op Enter."
- Laden: skeleton/lege staat zonder layout-sprong.
- Fout: foutmelding met de mogelijkheid om te herladen (React Query-retry).

**Data-testids**:

- `data-testid="idea-list"`
- `data-testid="idea-row"` per rij, met `data-post-id`
- `data-testid="idea-row-title"` en `data-testid="idea-row-pillar"` binnen de rij

## IdeaEditorDialog

**Props**:

```ts
interface IdeaEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  post: ContentPost
  pillarOptions: { value: string; label: string }[] // actieve soorten + huidige (mogelijk gearchiveerde) soort
}
```

**Velden**:

| Veld | Verplicht | Opmerking |
|------|-----------|-----------|
| Titel | Ja | `Input` |
| Contentsoort | Nee | `Select` met "Geen soort"; gearchiveerde huidige soort toegestaan |
| Status | Nee | `Select` met de vijf bestaande labels; default Idee |
| Idee-tekst | Nee | `Textarea` met tekenteller "n / 3.000", hook-preview en "Kopieer tekst" |
| Bron-URL | Nee | `Input type="url"` |
| Notities | Nee | `Textarea` |

**Verboden velden**: Format, Datum, Tijd, LinkedIn-URL (FR-005). Ook geen "URL ontbreekt"-badge of verlopen-markering meer.

**Opslaan**:

- Knop "Opslaan" en Ctrl/Cmd+S.
- Titel leeg → toast "De titel is verplicht." en niet opslaan.
- Statusvalidatie via dezelfde pure functie als de serveractie (body-regel; geen datum/tijd/URL).
- Bij succes: formulier resyncen op het serverresultaat, toast "Opgeslagen"; de lijst en het overzicht zijn bijgewerkt.
- Bij fout: toast met de servermelding; formulier blijft staan.

**Sluiten en verwijderen**:

- Sluiten met niet-opgeslagen wijzigingen → in-app bevestigingsdialoog (FR-027).
- Verwijderen → in-app bevestigingsdialoog; na succes sluit de dialoog en daalt het aantal direct.
- Geen browserdialogen.

**Data-testids**:

- `data-testid="idea-editor"`
- `data-testid="idea-editor-title"`
- `data-testid="idea-editor-status"`
- `data-testid="idea-editor-save"`
- `data-testid="idea-editor-delete"`

## ContentOverview

**Props**:

```ts
interface ContentOverviewProps {
  counts: IdeaCounts
  hasPillars: boolean
}
```

**Weergave**:

- Per rij: kleurstip, naam, optioneel "(gearchiveerd)", aantal.
- Alle soorten, ook met 0 (FR-013/SC-006).
- Rij "Geen soort" alleen als `unassigned > 0` (FR-014).
- Totaalrij met `total` (FR-014).
- Een eenvoudige horizontale balk per rij (breedte relatief aan de hoogste count) is toegestaan als die tekstueel wordt ondersteund; het aantal blijft de primaire informatie.
- Lege staat zonder soorten en zonder ideeën: "Maak eerst een contentsoort aan om je ideeën per soort te zien." met een knop naar het soortenbeheer.
- Geen bewerkbare velden in deze view; het is een leesoverzicht.

**Data-testids**:

- `data-testid="content-overview"`
- `data-testid="overview-row"` per rij, met `data-pillar-id` (of `data-pillar-id="none"`)
- `data-testid="overview-count"` met het aantal als tekst
- `data-testid="overview-total"`

## PillarsDialog

**Props**:

```ts
interface PillarsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pillars: ContentPillar[]
}
```

**Gedrag**:

- Titel "Contentsoorten"; beschrijving zonder woorden als "slots", "weekdagen" of "tijden".
- Nieuwe soort: naam + kleur + "Toevoegen".
- Per soort: naam, doelgroep, korte beschrijving, kleurkeuze (8 swatches), "Opslaan", "Archiveren"/"Heractiveren".
- Gearchiveerde soort: gedimd + markering.
- Geen weekdag-chips, tijdsvelden, `upsertSlot`, `deleteSlot` of `ContentSlot`-imports.
- Verwijderen is niet mogelijk (FR-019).

**Data-testids**:

- `data-testid="pillars-dialog"`
- `data-testid="pillar-new-name"`
- `data-testid="pillar-add"`
- `data-testid="pillar-row"` per soort, met `data-pillar-id`
- `data-testid="pillar-archive-toggle"`

## Gedeelde helpers — src/lib/content/ideas.ts

| Export | Doel |
|--------|------|
| `MAX_BODY_LENGTH = 3000` | Bestaande tekstgrens |
| `HOOK_CHAR_LIMIT = 210` | Bestaande hook-previewgrens |
| `charCount(text)` | Emoji-veilige tekentelling |
| `hookPreview(text)` | Preview tot 3e regeleinde of 210 tekens |
| `statusLabel(status)` | NL-label voor de statusbadge |
| `validateStatusChange(post, next)` | Body-regel voor Klaar/Gepland/Live; geen datum/tijd/URL |
| `buildPostWritePayload(patch)` | Whitelist voor insert/update: alleen titel, soort, body, status, bron-URL en notities |
| `countIdeasByPillar(posts, pillars)` | Telmodel uit [data-model.md](../data-model.md) |
| `formatIdeaDate(iso)` | NL-datum met vaste `Europe/Amsterdam` |

Verwijderd: alle raster-, slot-, match-, overdue- en drop-tijd-exports uit `calendar.ts`.

## Kleuren

`src/components/content/colors.ts` blijft ongewijzigd: `PILLAR_COLOR_KEYS`, `pillarColors` (8 kleuren met dark-varianten) en `statusBadgeClasses`. De kleurstip in lijst en overzicht gebruikt `pillarColors[color].dot`; onbekende/geen soort gebruikt de bestaande grijze fallback.
