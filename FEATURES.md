# Features

Auto-maintained by @feature-tracker. Laatste bovenaan.

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