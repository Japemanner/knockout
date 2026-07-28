# Features

Auto-maintained by @feature-tracker. Laatste bovenaan.

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