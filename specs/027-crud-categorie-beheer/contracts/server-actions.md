# Contract: server actions — categoriebeheer

**Feature**: 027-crud-categorie-beheer | **Bestand**: `src/actions/crud-categories.ts`

Deze feature **hergebruikt** de bestaande acties zonder wijziging. Het contract staat hier zodat de UI-component en de tests erop kunnen bouwen.

## Algemene afspraken

- Alle acties draaien server-side met `getAuthenticatedClient()`; de gebruiker komt uit de sessie, nooit uit de client-input.
- Input wordt getrimd waar het om tekst gaat.
- Elke geslaagde mutatie roept `revalidatePath('/crud')` aan.
- Fouten worden als data geretourneerd, niet gegooid: `{ error: string }` of `{ success: false, error: string }`.
- Geen service-role, geen Edge Function, geen nieuwe Supabase-client.
- RLS op `kk_crud_categories` is het vangnet; de acties filteren daarnaast op `user_id`.

## `createCrudCategory`

```ts
createCrudCategory(data: { name: string }): Promise<{ id: string; error: string | null }>
```

| Aspect | Contract |
|---|---|
| Input | `name` (verplicht, wordt getrimd) |
| Succes | `{ id: <uuid>, error: null }`; rij ingevoegd met `user_id` en `position = COUNT(*)` van de gebruiker |
| Lege naam | `{ id: '', error: 'Vul een naam in' }`; geen insert |
| DB-fout | `{ id: '', error: <message> }`; geen revalidatie |
| Neveneffect | `revalidatePath('/crud')` bij succes |

De UI toont het resultaat in het paneel via `router.refresh()` en een succes-toast; bij een fout blijft de invoer staan en verschijnt een destructieve toast.

## `renameCrudCategory`

```ts
renameCrudCategory(data: { categoryId: string; name: string }): Promise<{ success: boolean; error?: string }>
```

| Aspect | Contract |
|---|---|
| Input | `categoryId` + `name` (getrimd) |
| Succes | `{ success: true }`; alleen de rij van de ingelogde gebruiker wordt bijgewerkt |
| Lege naam | `{ success: false, error: 'Vul een naam in' }`; geen update |
| DB-fout / geen rij | `{ success: false, error: <message> }` |
| Neveneffect | `revalidatePath('/crud')` bij succes |

De categorie-id komt uit de lijst die de server al aan het paneel gaf; de actie controleert eigendom via `user_id` + RLS.

## `deleteCrudCategory`

```ts
deleteCrudCategory(data: { categoryId: string }): Promise<{ success: boolean; error?: string }>
```

| Aspect | Contract |
|---|---|
| Input | `categoryId` |
| Succes | `{ success: true }`; categorie verwijderd, overzichten blijven bestaan met `category_id = NULL` dankzij `ON DELETE SET NULL` |
| DB-fout | `{ success: false, error: <message> }` |
| Neveneffect | `revalidatePath('/crud')` bij succes |

De bevestiging (inclusief de uitleg dat overzichten blijven bestaan) is een UI-verantwoordelijkheid vóórdat deze actie wordt aangeroepen.

## Niet toegevoegd in deze feature

- Geen `reorderCrudCategories`, geen bulk-delete, geen `setCategoryColor`.
- Geen wijziging aan `setCrudOverviewCategory` (blijft het bestaande kaartmenu bedienen).
- Geen telling-actie: `overviewCount` wordt server-side in de pagina afgeleid.
