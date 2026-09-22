# Features

Auto-maintained by @feature-tracker. Laatste bovenaan.

## crud-column-filters (2026-09-22)

**Spec**: `specs/018-crud-column-filters/spec.md`
**Branch**: `018-crud-column-filters`

Filterbare kolommen in CRUD-overzichten met stateful (persistente) filters. Per kolom een filterpopover in de kolomkop met kolomtype-bewuste operatoren: tekst (bevat/gelijk, case-insensitive), getal (vergelijkingen + tussen), datum (vergelijkingen + tussen), boolean (ja/nee). Meerdere filters combineren met EN. Filters worden per gebruiker per CRUD-overzicht opgeslagen in `kk_crud_overviews.column_filters` (JSONB) en server-side toegepast via PostgREST, zodat paginatie en totaaltelling correct blijven. Verwijderde kolommen worden automatisch uit opgeslagen filters gepruned; filters op verborgen kolommen blijven actief met zichtbare indicatie. "Wis alle filters"-knop + leegstaat met wis-actie bij nul resultaten.

**Nieuwe bestanden**:
- `src/lib/column-filters.ts` — pure filter-engine: `filterKindForColumn`, `availableOps`, `isFilterComplete`, `matchesFilter`, `filterRows`, `pruneStaleFilters`, `countActiveFilters`, `isActiveFilterOnHiddenColumns`
- `src/components/crud/ColumnFilterPopover.tsx` — per-kolom filterbesturing (op-selectie, waarde-input, tussen tweede waarde, wissen/klaar)
- `supabase/migrations/018_crud_overviews_column_filters.sql` — `column_filters JSONB NOT NULL DEFAULT '{}'` op `kk_crud_overviews`
- `tests/e2e/column-filters.spec.ts` — 30 unit-tests voor de filter-engine

**Aangepaste bestanden**:
- `src/types/database.types.ts` — `CRUDOverview.column_filters` + `ColumnFilter`/`ColumnFilterOp` types
- `src/actions/crud-overviews.ts` — `column_filters` in select + `updateCrudOverview`
- `src/actions/local-db.ts` — `getLocalTableRecords` accepteert `filters` + `columns`, past PostgREST-operators server-side toe (`ilike`, `eq`, `gt/gte/lt/lte`, between via gte+lte)
- `src/components/db-explorer/GenericTable.tsx` — `filters`/`onFiltersChange` props, filterknoppen in kolomkoppen, herlaad bij filterwijziging, reset naar pagina 1, "Wis filters (n)"-knop, verborgen-filter-indicatie, gefilterde leegstaat
- `src/components/db-explorer/DraggableTableHeader.tsx` — optionele `renderFilter` per kolomkop (naast drag-handle)
- `src/components/db-explorer/LocalDynamicTable.tsx` — `filters`/`onFiltersChange` doorgeven, `columns` aan `getLocalTableRecords`
- `src/components/crud/CrudTableWrapper.tsx` — `handleFiltersChange` persisteert via `updateCrudOverview`
- `src/app/(dashboard)/crud/[crudId]/page.tsx` — leest `column_filters`, prune't stale filters, laadt initiële pagina gefilterd bij opgeslagen filters

**Test**: `tests/e2e/column-filters.spec.ts` — 30 tests (filter-kind detectie, operatoren per type, completeness, matching incl. between/case-insensitiviteit, EN-combinatie, pruning, hidden-kolom-detectie). Volledige suite: 94 passed.

## fix-dark-dropdown-text (2026-09-22)

**Spec**: `specs/017-fix-dark-dropdown-text/spec.md`
**Branch**: `017-fix-dark-dropdown-text`

In dark mode werden `<option>` elementen in alle dropdowns onleesbaar: witte tekst (geërfd van `--foreground`) op een browser-native uitklaplijst-achtergrond. Fix: expliciete `color: black` + `backgroundColor: white` op elk `<option>` element in de herbruikbare `Select`-component. Het gesloten `<select>` veld behoudt thema-styling (donkere bg + lichte tekst in dark mode). Geldt voor alle 6+ locaties waar `Select` wordt gebruikt: thema-selector, uren-invoer, uren-geschiedenis, client-beheer, db-explorer, current section.

**Nieuwe bestanden**: geen

**Aangepaste bestanden**:
- `src/components/ui/select.tsx` — inline `style` op `<option>` elementen (color + backgroundColor)

**Test**: `tests/e2e/dark-dropdown.spec.ts` — 4 tests (dark mode optie-leesbaarheid, gesloten veld thema-styling, light mode geen regressie, uren-formulier dropdown)

## crud-date-defaults (2026-08-29)

**Spec**: `specs/014-crud-date-defaults/spec.md`
**Branch**: `014-crud-date-defaults`

Bij het openen van een "Nieuw record"-formulier in de CRUD-interface worden datum-, timestamp- en time-velden automatisch gevuld met de huidige datum/tijd, tenzij de kolom al een expliciete database-`DEFAULT` heeft. Bij bewerken van bestaande records blijven de oorspronkelijke waarden staan. Time-velden krijgen nu ook een `<input type="time">` in plaats van een plain text-input.

**Nieuwe bestanden**:
- `src/lib/date-defaults.ts` — pure helpers: `isDateColumn`, `isTimestampColumn`, `isTimeColumn`, `todayISO`, `nowLocalDateTime`, `nowLocalTime`, `buildDateDefaults`
- `tests/e2e/date-defaults.spec.ts` — 18 unit-tests voor de helper-module

**Aangepaste bestanden**:
- `src/components/db-explorer/DynamicForm.tsx` — merge `buildDateDefaults(columns)` in initial `values` bij create-mode (lege `initialValues`)
- `src/components/db-explorer/FormFieldMapper.tsx` — nieuwe `isTime`-branch met `<Input type="time">` voor `time`/`timetz`-kolommen

**Test**: `tests/e2e/date-defaults.spec.ts` — 18 tests (alle groen)

## save-success-checkmark (2026-08-17)

**Spec**: `specs/013-save-success-checkmark/spec.md`
**Branch**: `013-save-success-checkmark`

Groen vinkje na opslaan in de kaartdetail-dialoog (`CardDetailModal`). Zodra de gebruiker op "Opslaan" klikt en de `updateCard`-call slaagt, verandert de knop direct in een groen vinkje met label "Opgeslagen" op dezelfde positie. Na 2000ms verandert het vinkje automatisch terug naar de knop. Bij een nieuwe veldwijziging verdwijnt het vinkje direct. Bij een mislukte opslag blijft de knop zichtbaar en verschijnt een foutmelding. Bij sluiten van de dialoog vóór voltooiing van de opslag verschijnt er geen vinkje bij heropenen.

**Nieuwe bestanden**: geen

**Aangepaste bestanden**:
- `src/components/kanban/CardDetailModal.tsx` — `isSaved`-state + `savedTimerRef`, `Check`-icoon, `handleSave`-succes-branch met `if (!open) return`, knop/vinkje-swap, reset-`useEffect` bij veldwijziging, cleanup-`useEffect` bij unmount, reset bij nieuwe kaart
- `tests/e2e/regression.spec.ts` — 3 nieuwe regressietests: "kaart opslaan toont groen vinkje", "vinkje verdwijnt bij nieuwe wijziging", "mislukte opslag toont geen vinkje"

**Test**: `tests/e2e/regression.spec.ts` — 3 nieuwe tests binnen `test.describe('kaart bewerken', ...)`

## command-center-priorities (2026-07-28)

**Spec**: `specs/011-command-center-priorities/spec.md`
**Branch**: `011-command-center-priorities`

Top 3 bewerkbare prioriteiten op het command center. Drie vrije-tekst velden, per gebruiker opgeslagen in Supabase. Sectie staat boven de gesterde items met een "Opslaan"-knop die alleen actief is bij wijzigingen.

**Nieuwe bestanden**:
- `supabase/migrations/013_command_center_priorities.sql` — kk_priorities tabel + RLS
- `src/actions/priorities.ts` — getPriorities + savePriorities server actions
- `src/hooks/usePriorities.ts` — TanStack Query hooks
- `src/components/command-center/PrioritiesSection.tsx` — 3 velden + opslaan

**Aangepaste bestanden**:
- `src/types/database.types.ts` — Priority interface + kk_priorities tabel
- `src/components/command-center/CommandCenterClient.tsx` — PrioritiesSection boven StarredSection

## uren-deferred-endtime (2026-07-28)

**Spec**: `specs/010-uren-deferred-endtime/spec.md`
**Branch**: `011-uren-deferred-endtime`

Voorwaardelijke eindtijd bij uren-invoer: sla een urenregel op met alleen starttijd (geen eindtijd) en vul de eindtijd later aan via de bewerkmodus. Lopende regels zijn herkenbaar aan een gele "Eindtijd open" badge en tellen niet mee in dashboard/omzet totdat ze zijn afgerond.

**Nieuwe bestanden**:
- `supabase/migrations/012_hours_allow_zero.sql` — laat `hours = 0` toe (CHECK >= 0 i.p.v. > 0)

**Aangepaste bestanden**:
- `src/actions/hours.ts` — `createEntry` en `updateEntry` ondersteunen `end_time = null` + `hours = 0`; dashboard/omzet tellen alleen `hours > 0` mee
- `src/components/hours/HoursEntryForm.tsx` — eindtijd optioneel, label "Eindtijd (optioneel)", placeholder "Eindtijd ontbreekt"
- `src/components/hours/HoursHistory.tsx` — "Eindtijd open" badge + gele accent voor lopende regels, bewerkmodus eindtijd-aanvullen
- `tests/e2e/hours.spec.ts` — regressietest "eindtijd-label toont optioneel"

## uren-privacy-toggle (2026-07-28)

**Spec**: `specs/009-uren-privacy-toggle/spec.md`
**Branch**: `011-uren-privacy-toggle`

Privacy-toggle in de uren-tab waarmee alle euro-bedragen (omzet, uurtarieven, regeltotalen) met één klik verborgen worden. In plaats van elk bedrag toont het systeem een doorgestreept €-symbool. Voorkeur wordt per browser bewaard (localStorage via Zustand persist).

**Nieuwe bestanden**:
- `src/store/privacyStore.ts` — Zustand store met persist
- `src/components/hours/EuroSymbol.tsx` — helper: toont €-bedrag of doorgestreept €
- `src/components/hours/PrivacyToggle.tsx` — toggle-knop voor in uren-tab header

**Aangepaste bestanden**:
- `src/components/hours/HoursView.tsx` — toggle in header
- `src/components/hours/HoursDashboard.tsx` — RevenueCard via EuroSymbol
- `src/components/hours/HoursHistory.tsx` — dagtotalen + regeltotalen via EuroSymbol
- `src/components/hours/ClientManageDialog.tsx` — uurtarief-weergave via EuroSymbol

**Test**: `tests/e2e/hours.spec.ts` — regressietest "privacy-toggle verbergt en toont euro-bedragen"