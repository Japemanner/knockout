# Quality criteria — CRUD-module feature (025-crud-categorie-sync als referentie)

Criteria voor "goed" bij een CRUD-module-feature (categorieën, sync, kolommen, filters):

1. **Specificatie compleet**: user stories met acceptatiescenario's, randgevallen, FR's testbaar, succescriteria meetbaar; clarify-sessie vastgelegd.
2. **Plan geverifieerd tegen de codebase**: elk gerefereerd patroon bestaat (003-migratie-patroon, getAuthenticatedClient, pruneStaleFilters, dialog-patronen); geen nieuwe dependencies; constitution gates PASS.
3. **Implementatie volgt het plan**: bestandsnamen conform plan/contracts; afwijkingen genoteerd met reden (contracts + FITNESS bijgewerkt).
4. **TypeScript strict + lint schoon**: `tsc --noEmit` 0 errors; `npx eslint src/ --max-warnings 0` schoon; F-08 zonder nieuwe unjustified `any`.
5. **Testdekking conform AGENTS.md**: unit-dekking op pure logica (schema-sync); e2e happy paths met login-skip-guards; volledige regressiesuite groen; mutaties UI-verifieerbaar en persistent; nieuw `revalidatePath` gedekt door een verse-data-check.
6. **Datalaag conform de module-besluiten**: CRUD-module = server components + server actions + `revalidatePath` (NIET het uren browser-client-patroon); metadata via SECURITY DEFINER-RPC's met authenticated client (besluit 2026-07-23); geen tweede Supabase-client.
7. **Veiligheid**: RLS + vier policies op elke nieuwe tabel (003-patroon, idempotent); ownership-checks in de action-laag vóór koppelingen tussen eigen tabellen; geen secrets in clientcode; in-app dialogen.
8. **Migratie-pad gedocumenteerd**: idempotent script + wie/wanneer het draait (SQL Editor/MCP) + post-checks (F-01-query) + degradatiegedrag vóór toepassing beschreven.
9. **Documentatie actueel**: FEATURES.md, FITNESS.md, tasks.md afvinkingen, AGENTS.md-speckit-marker, knowledge-extractie.
10. **Schema-wijzigingen zijn niet-destructief**: overzichten/instellingen overleven categorieverwijdering (`ON DELETE SET NULL`); sync wist bij fouten niets; pruning is server-autoritair.