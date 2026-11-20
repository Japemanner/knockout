# Spec 031 — Kilometerregistratie (/km)

## Doel

Jaap (DGA) rijdt zakelijke kilometers met zijn privéauto en moet per rit kunnen
vastleggen wat hij zijn BV mag declareren tegen de onbelaste
kilometervergoeding. De registratie dient als onderbouwing richting de
Belastingdienst (datum, van, naar, zakelijk doel, kilometers) en moet laten zien
wat al door de BV is uitbetaald en wat nog openstaat.

## User stories

1. **Rit vastleggen** — Als DGA wil ik datum, opdrachtgever (optioneel), van,
   naar, zakelijk doel, afstand, tarief en notities invoeren, zodat elke zakelijke
   rit onderbouwd vastligt.
2. **Retour** — Als ik heen en terug rijd, wil ik met één checkbox "Retour" de
   enkele afstand verdubbelen, zodat ik niet twee keer hoef te rekenen.
3. **Tarief per jaar** — Als het onbelaste tarief wijzigt, wil ik dat nieuwe
   ritten automatisch het juiste jaartarief krijgen en dat oude ritten hun
   snapshot-tarief houden.
4. **Inzicht** — Als DGA wil ik per maand en jaar de gereden kilometers en
   vergoeding zien, plus het openstaande (nog niet uitbetaalde) bedrag.
5. **Uitbetalen** — Als de BV ritten heeft vergoed, wil ik ze (per stuk of in
   bulk) als uitbetaald markeren met een datum, en die status weer ongedaan
   kunnen maken.
6. **Hergebruik** — Als ik een vaste route rijd, wil ik die met één klik opnieuw
   in het formulier zetten.
7. **Export** — Als ik administratie of belastingaangifte doe, wil ik de
   gefilterde ritten als Excel-vriendelijke CSV exporteren.

## Acceptatiecriteria

- `/km` toont kop, dashboard (4 kaarten), invoerformulier, recente routes,
  historie met filters, uitbetaalacties en CSV-export.
- `kk_mileage_trips` heeft RLS aan met vier policies op `user_id = (select auth.uid())`.
- `distance_km` is altijd het totaal; `is_return` is alleen informatief en wordt
  nooit in SQL of aggregaties nog eens verdubbeld.
- `rate_per_km` is een snapshot per rit; `amount` is een generated column en
  wordt nooit in insert/update-payloads meegestuurd.
- Het formulier vult het jaartarief voor op basis van de ritdatum en past het aan
  bij datumwijziging, tenzij de gebruiker het tarief handmatig wijzigde.
- Bij een tarief boven het onbelaste maximum verschijnt een subtiele waarschuwing,
  geen blokkade.
- Bedragen als `€ 1.234,56`, kilometers als `1.234,5`; alle teksten Nederlands.
- CSV: `;`-gescheiden, komma-decimalen, UTF-8 BOM, bestandsnaam
  `kilometers-<van>-<tot>.csv`.
- Werkt op 375 px breed; lege, laad- en foutstaat met retry.
- Pure unit-tests dekken tarief, retour, afronding, payload-whitelist,
  stats-aggregatie, CSV en recente-routes-deduplicatie.
- E2E dekt aanmaken, retour, bewerken, verwijderen, uitbetaalstatus, filter,
  CSV-download en navigatie.

## Out of scope

- Routeplanning of automatische afstandsberekening via een maps-API.
- Koppeling met uren-regels.
- Begin-/eindstand van de kilometerteller.
- Meerdere voertuigen.
- PDF-export.
- Exact-koppeling.
