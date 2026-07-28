# Implementation Plan: Voorwaardelijke eindtijd bij uren-invoer

**Branch**: `011-uren-deferred-endtime` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

## Summary

De uren-tab krijgt voorwaardelijke eindtijd-invoer: een urenregel kan opgeslagen worden met alleen een starttijd. Lopende regels (zonder eindtijd) zijn herkenbaar aan een gele "Eindtijd open" badge in de historie en tellen niet mee in dashboard-voortgang of omzet totdat de eindtijd wordt aangevuld via de bewerkmodus.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 18, Next.js App Router
**Primary Dependencies**: Supabase (PostgreSQL), TanStack Query, Tailwind, shadcn/ui
**Storage**: Supabase PostgreSQL — bestaande `kk_hour_entries` tabel, `start_time`/`end_time` al nullable (migratie 008)
**Testing**: Playwright E2E

## Implementation

### Migration 012 — hours CHECK >= 0
De originele `CHECK (hours > 0)` uit migratie 007 blokkeert `hours = 0` voor lopende regels. Vervangen door `CHECK (hours >= 0)`.

### Server actions (`src/actions/hours.ts`)
- `createEntry`: bij `end_time = null` → `hours = 0` opslaan
- `updateEntry`: al generiek — ondersteunt `end_time: null` en `hours: 0`
- `getDashboardStats`: filter `e.hours > 0` in aggregatie
- `getRevenueStats`: `continue` bij `hours <= 0`

### UI — HoursEntryForm
- Eindtijd-label: "Eindtijd (optioneel)"
- Validatie: starttijd verplicht, eindtijd optioneel
- Bij geen eindtijd: `hours = 0`, `end_time = null`, toast "Lopende urenregel gestart"
- Placeholder uren-veld: "Eindtijd ontbreekt" i.p.v. "Vul start- en eindtijd in"

### UI — HoursHistory
- Lopende regels (`!entry.end_time`): gele border + "Eindtijd open" badge
- uren-veld alleen tonen als `entry.end_time` aanwezig
- Tijdweergave: `09:00–?` bij open regel
- Bewerkmodus: eindtijd kan leeg blijven of worden aangevuld; `saveEdit` herberekent uren bij eindtijd

### Edge cases
- Alleen eindtijd (geen starttijd) → geweigerd
- Eindtijd vóór starttijd → geweigerd
- Verwijderen van open regel → toegestaan
- Bestaande regels → ongegewijzigd