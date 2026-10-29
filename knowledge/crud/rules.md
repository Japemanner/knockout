# CRUD-domein — rules (bevestigd, standaard toepassen)

*(Promotie naar rule bij 3+ bevestigingen; zie knowledge.md voor bewijslast per regel.)*

- Nog geen regels gepromoveerd: het crud-domein bestaat sinds 2026-10-29; de feiten in knowledge.md zijn op 1 feature gebaseerd. Kandidaat-regels zodra bevestigd:
  1. CRUD-module-wijzigingen blijven op server-render + `revalidatePath` (niet het uren-patroon) — bevestigingen: 1.
  2. Nieuwe tabellen volgen het 003-RLS-migratiepatroon en draaien handmatig via SQL Editor — bevestigingen: 3+ (007/013/018/022/024; geldt als rule maar is domein-overstijgend → zie tooling).
  3. Kolomnaam-referenties in overzichts-instellingen altijd prunen tegen actuele metadata na sync/drift — bevestigingen: 2 (018 filters, 025 hidden/order).