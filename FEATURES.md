# Features

Auto-maintained by @feature-tracker. Laatste bovenaan.

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