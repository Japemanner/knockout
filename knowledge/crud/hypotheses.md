# CRUD-domein — hypotheses (onvoldoende data om te bevestigen)

- De sync-knop haalt de RLS-fout "relation kk_crud_categories does not exist" pas weg zodra de migratie draait; vermoedelijk blijft de /crud-pagina voor externe gebruikers (andere RLS-scope) ook netjes leeg — nog niet live geverifieerd.
- Hypothese: categorie-tabs worden bij >~12 categorie's visueel onrustig ondanks horizontale scroll; pas een samenvouw/tab-manager toe als de gebruiker dat signaleert (nog geen data).
- Hypothese: de E2E-categorie-tests zijn stabiel zodra ze met een login-sessie in CI draaien; de hover-menu-selectors (`div.group` + title-attributen) kunnen breken bij herstyling van de tabrij (1 run zonder sessie = alleen skip-gezien).
- "knownColumns" als diff-input van de client is bewust alleen feedback; het zou ook een server-side "last-known-columns" snapshot in kk_crud_overviews kunnen worden als gebruikers de telling belangrijk vinden — geen signaal.