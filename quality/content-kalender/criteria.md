# Quality criteria — Speckit full-stack feature (023-content-kalender als referentie)

Criteria voor "goed" bij een speckit-feature (spec → plan → tasks → implement → merge → deploy):

1. **Specificatie compleet**: alle user stories met acceptatiescenario's, randgevallen, FR's testbaar, succescriteria meetbaar, geen [NEEDS CLARIFICATION].
2. **Plan geverifieerd tegen de codebase**: elk gerefereerd patroon bestaat; geen nieuwe dependencies; constitution gates PASS.
3. **Implementatie volgt het plan**: bestandsnamen en -locaties conform plan/contracts; geen afwijkingen zonder genoteerde reden.
4. **TypeScript strict + lint schoon**: `tsc --noEmit` 0 errors; `eslint --max-warnings 0` schoon.
5. **Testdekking conform AGENTS.md**: unit-dekking op pure logica; e2e happy paths met login-skip-guards; volledige regressiesuite groen; mutaties UI-verifieerbaar en persistent.
6. **Datalaag conform besluiten**: reads via SSR-prefetch + browser-client, geen revalidatePath, server actions valideren businessregels server-side (geen API-bypass).
7. **Veiligheid**: RLS op elke nieuwe tabel (migratie + post-check), geen secrets in clientcode, geen browserdialogen.
8. **Migratie-pad gedocumenteerd**: idempotent script + wie/wanneer het draait + post-checks.
9. **Documentatie actueel**: FEATURES.md, FITNESS.md, knowledge-extractie, AGENTS.md-speckit-marker.
10. **Werk verzoend bij parallel-werk-conflicten**: shared state hersteld of gedocumenteerd; selectief gestaged.