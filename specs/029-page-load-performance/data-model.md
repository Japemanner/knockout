# Data Model: Kortere laadtijd van pagina's

**Feature**: 029-page-load-performance | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

Deze feature voegt **geen nieuwe tabellen, kolommen of entiteiten** toe. Het "datamodel" bestaat uit vier bestaande, maar nu expliciet gemaakte modellen: de querycache, de route-/chunkindeling, de RLS-policy-expressies en de foreign-key-indexen.

## 1. Entiteiten en relaties

| Entiteit | Bestaat al? | Velden die relevant zijn | Relatie |
|----------|-------------|--------------------------|---------|
| Profiel | Ja — `kk_profiles` | `id`, `organization_id`, `full_name`, `role`, `avatar_url` | Eén per gebruiker; hoort bij één organisatie. Wordt één keer per request gelezen. |
| Pagina-chunk | Nee — buildartifact | route, bestandsnaam, grootte | Eén per route; hoort bij precies één route. |
| Querycache-entry | Nee — clientstate | query key, data, `dataUpdatedAt`, `staleTime` | Eén per query key; hoort bij één pagina of domein. |
| RLS-policy | Ja — `pg_policy` | tabel, policy naam, `USING`-expressie, `WITH CHECK`-expressie | 90 policies over 26 tabellen. |
| Foreign key | Ja — `pg_constraint` | tabel, kolom, referentie | 20 foreign keys missen een index. |
| Laadgrens | Ja/Nee — `loading.tsx` | route, skeleton | Eén per route-segment; hoort bij één of meer child-routes. |

Geen van deze entiteiten krijgt een nieuwe kolom of een nieuwe waardenlijst. De bestaande datacontracten in `src/types/database.types.ts` blijven ongewijzigd.

## 2. Querycache-model

### 2.1 Server-side (React `cache` + RSC)

| Query | Bron | Huidige houdbaarheid | Doel | Invalidatie |
|-------|------|----------------------|------|-------------|
| Profiel | `getProfile()` in dashboardlayout | Per request gededupliceerd | Zelfde: precies één keer per request | Nieuwe request na login/logout |
| Bordenlijst | `boards/page.tsx` | Geen clientcache (routercache 0 s) | 30 s routercache | `revalidatePath('/boards')` |
| Borddetail | `boards/[boardId]/page.tsx` | Geen clientcache | 30 s routercache | `revalidatePath('/boards/[id]')` |
| Command center | `command-center/page.tsx` | Geen clientcache | 30 s routercache | `revalidatePath('/command-center')` |
| CRUD-lijst | `crud/page.tsx` | Geen clientcache | 30 s routercache | `revalidatePath('/crud')` |
| CRUD-detail | `crud/[crudId]/page.tsx` | `revalidate = 60` (dynamisch door cookies) | 30 s routercache | `revalidatePath('/crud/[id]')` |
| Database-tabellijst | `db/page.tsx` (nieuw server-side) | Extra serveractie na hydratie | Tijdens RSC-render | Nieuwe request |
| Database-records | `db/[tableName]/page.tsx` | Server-side parallel | Zelfde | Nieuwe request |
| Instellingen | `settings/**` | Geen clientcache | 30 s routercache | `revalidatePath('/settings/...')` |
| Starred | `starred/page.tsx` | Geen clientcache | 30 s routercache | `revalidatePath('/starred')` |

### 2.2 Client-side (TanStack Query)

| Query key | Gebruik | Huidige `staleTime` | Doel | Invalidatie na mutatie |
|-----------|---------|---------------------|------|------------------------|
| `content.pillars` | `/content` | 30 s | 30 s | `invalidateQueries` na soort-mutatie |
| `content.posts` | `/content` | 30 s | 30 s | `setQueryData` + `invalidateQueries` |
| `hours.clients` | `/uren` | 30 s | 30 s | `invalidateQueries` |
| `hours.entries` | `/uren` | 30 s | 30 s | `invalidateQueries` |
| `hours.openEntries` | `/uren` | 30 s | 30 s | `invalidateQueries` |
| `hours.dashboard` | `/uren` | 30 s | 30 s | `invalidateQueries` |
| `hours.revenue` | `/uren` | 15 s | **30 s** | `invalidateQueries` |
| `priorities` | `/command-center` | 60 s | 60 s | `invalidateQueries` |
| `time-tracking.active` | widget | 10 s + 15 s interval | **30 s** + 15 s interval | `invalidateQueries` |
| `time-tracking.entries` | widget | 30 s | 30 s | `invalidateQueries` |
| `table-records` | `/db/[tableName]` | 15 s | **30 s** | `invalidateQueries` |
| `local-table-records` | CRUD-detail | 15 s | **30 s** | `invalidateQueries` |
| `fk-options` / `local-fk-options` | formulieren | 60 s | 60 s | Geen (referentie-data) |

**Globale regel**: `refetchOnWindowFocus: false`. `refetchOnMount` blijft de standaard: een query met verouderde data haalt bij mount opnieuw op; een query binnen 30 seconden niet. `refetchInterval` van de actieve tijdklok blijft 15 seconden en is de enige uitzondering op "geen poll".

### 2.3 Versheidsregels

- **Vers** = `now - dataUpdatedAt < 30 s`. Een paginawissel of tabwissel mag geen request doen voor een verse query.
- **Verouderd** = `>= 30 s`. Een mount of expliciete `refetch()` mag opnieuw ophalen.
- **Na mutatie** = altijd direct bijwerken, ongeacht de leeftijd. Serveracties gebruiken `revalidatePath`; React Query-mutaties gebruiken `invalidateQueries`/`setQueryData`.
- **Profiel** = nooit client-side opnieuw ophalen; het blijft server-side per request.

## 3. Route-, chunk- en laadgrensmodel

Baseline uit `npm run build` (First Load JS). "Erft" betekent dat een `loading.tsx` in een parent-segment de child afdekt.

| Route | Type | `loading.tsx` | Baseline | Actie |
|-------|------|---------------|----------|-------|
| `/` | statisch, redirect | n.v.t. | 103 kB | Geen |
| `/login` | statisch | n.v.t. | 180 kB | Buiten acceptatie (inlogscherm) |
| `/forgot-password` | statisch | n.v.t. | 180 kB | Geen |
| `/reset-password` | statisch | n.v.t. | 177 kB | Geen |
| `/boards` | dynamisch | Ja | 117 kB | Kolommen trimmen |
| `/boards/[boardId]` | dynamisch | Ja | 138 kB | Geen |
| `/command-center` | dynamisch | Ja | 141 kB | Geen |
| `/content` | dynamisch | **Nee → toevoegen** | 200 kB | Laadgrens; eventueel dialogs lazy |
| `/crud` | dynamisch | Ja | 120 kB | Kolommen trimmen |
| `/crud/[crudId]` | dynamisch | Erft van `/crud` | 147 kB | Kolommen expliciet |
| `/db` | dynamisch | Ja | 104 kB | Server-side tabellijst |
| `/db/[tableName]` | dynamisch | Erft van `/db` | 145 kB | Geen |
| `/settings` | dynamisch | Ja | 116 kB | Geen |
| `/settings/db` | dynamisch | Erft van `/settings` | 117 kB | Geen |
| `/settings/db/[connectionId]` | dynamisch | Erft van `/settings` | 107 kB | Geen (legacy external DB) |
| `/settings/db/[connectionId]/[tableName]` | dynamisch | Erft van `/settings` | 145 kB | Geen |
| `/starred` | dynamisch | Ja | 106 kB | Geen |
| `/team` | dynamisch | **Nee → toevoegen** | 103 kB | Laadgrens |
| `/theme-demo` | dynamisch | **Nee → toevoegen** | 114 kB | Laadgrens |
| `/uren` | dynamisch | **Nee → toevoegen** | 211 kB | Laadgrens; eventueel dialogs lazy |

### 3.1 Chunkmodel

| Chunk | Inhoud | Baseline | Doel |
|-------|--------|----------|------|
| `1255` + `4bd1b696` + overig | React/Next-runtime | 103 kB gedeeld | Niet groeien |
| `5402` | Supabase-browserclient (`createBrowserClient`) | 179,6 kB raw; op dashboardlayout, login, content, uren, db | Niet meer in de eerste load van routes zonder browser-Supabase |
| `9841` | `date-fns` | 33,8 kB raw; alleen `/uren` | Blijft route-specifiek |
| `83.9` | `react-markdown` + `remark-gfm` | 142 kB raw; al lazy via `CardDetailModal` | Blijft lazy |
| `page-*` | Route-specifieke componenten | 0,8–47,8 kB raw | Niet groeien |

**Validatieregel**: de gedeelde basis blijft 103 kB; geen enkele route wordt zwaarder dan de baseline. Routes die de browser-Supabaseclient niet nodig hebben, dalen met minimaal 30 kB gzip.

## 4. RLS-policy-model

Alle 26 `kk_*`-tabellen hebben RLS. Alle 90 policies gebruiken een ongewrapte `auth.uid()` of `get_user_org_id()`. De migratie vervangt de expressie één-op-één; de policy naam, de rollen en het commando (`SELECT`/`INSERT`/`UPDATE`/`DELETE`) blijven gelijk.

| Tabel | Policies | Patroon | Aanpassing |
|-------|----------|---------|------------|
| `kk_ai_assistants` | 4 | `organization_id = get_user_org_id()` | `(select get_user_org_id())` |
| `kk_assistant_knowledge_bases` | 3 | `EXISTS (... organization_id = get_user_org_id())` | `(select get_user_org_id())` |
| `kk_boards` | 4 | `user_id = auth.uid()` | `(select auth.uid())` |
| `kk_cards` | 4 | `EXISTS (... user_id = auth.uid())` | `(select auth.uid())` |
| `kk_clients` | 4 | `user_id = auth.uid()` | `(select auth.uid())` |
| `kk_columns` | 4 | `EXISTS (... user_id = auth.uid())` | `(select auth.uid())` |
| `kk_content_pillars` | 3 | `user_id = auth.uid()` | `(select auth.uid())` |
| `kk_content_posts` | 4 | `user_id = auth.uid()` | `(select auth.uid())` |
| `kk_content_slots` | 4 | `user_id = auth.uid()` | `(select auth.uid())` |
| `kk_conversations` | 3 | `user_id = auth.uid()` | `(select auth.uid())` |
| `kk_crud_categories` | 4 | `user_id = auth.uid()` | `(select auth.uid())` |
| `kk_crud_overviews` | 4 | `user_id = auth.uid()` | `(select auth.uid())` |
| `kk_db_connections` | 4 | `user_id = auth.uid()` | `(select auth.uid())` |
| `kk_flow_configs` | 4 | `organization_id = get_user_org_id()` + admin-`EXISTS` | Beide wrappen |
| `kk_focus_notes` | 3 | `user_id = auth.uid()` | `(select auth.uid())` |
| `kk_hour_entries` | 4 | `user_id = auth.uid()` | `(select auth.uid())` |
| `kk_invitations` | 3 | `organization_id = get_user_org_id()` + admin-`EXISTS` | Beide wrappen |
| `kk_knowledge_base_documents` | 3 | `EXISTS (... get_user_org_id())` | `(select get_user_org_id())` |
| `kk_knowledge_bases` | 4 | `organization_id = get_user_org_id()` | `(select get_user_org_id())` |
| `kk_knowledge_items` | 3 | `EXISTS (... get_user_org_id())` | `(select get_user_org_id())` |
| `kk_messages` | 2 | `EXISTS (... user_id = auth.uid())` | `(select auth.uid())` |
| `kk_organizations` | 1 | `id = get_user_org_id()` | `(select get_user_org_id())` |
| `kk_priorities` | 4 | `user_id = auth.uid()` | `(select auth.uid())` |
| `kk_profiles` | 2 | `id = auth.uid()` / `organization_id = get_user_org_id()` | Beide wrappen |
| `kk_rss_feeds` | 4 | `user_id = auth.uid()` | `(select auth.uid())` |
| `kk_time_entries` | 4 | `user_id = auth.uid()` | `(select auth.uid())` |

### 4.1 Helperfunctie

De technische route van stap 9 verbiedt functiewijzigingen. `get_user_org_id()` blijft daarom **exact ongewijzigd**:

```sql
CREATE OR REPLACE FUNCTION get_user_org_id()  -- niet uitgevoerd; alleen ter referentie
RETURNS UUID AS $$
  SELECT organization_id FROM kk_profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

De functie blijft `STABLE SECURITY DEFINER` met dezelfde returnwaarde. Alleen de aanroep in de policy wordt `(select get_user_org_id())`, waardoor de functie één keer per statement wordt uitgevoerd in plaats van per rij.

### 4.2 Invarianten

1. Elke policy houdt dezelfde naam, hetzelfde commando en dezelfde rollen.
2. De logische expressie is identiek; alleen `auth.uid()` en `get_user_org_id()` krijgen `(select ...)`.
3. Geen policy wordt verwijderd of samengevoegd.
4. Een gebruiker ziet exact dezelfde rijen als voor de migratie.
5. Een gebruiker mag exact dezelfde acties uitvoeren als voor de migratie.

## 5. Foreign-key-indexmodel

20 foreign keys in `public` missen een index. Voor elke key komt een idempotente index met de naam `idx_<table>_<column>`.

| Tabel | Kolom | Indexnaam |
|-------|-------|-----------|
| `kk_ai_assistants` | `created_by` | `idx_kk_ai_assistants_created_by` |
| `kk_ai_assistants` | `organization_id` | `idx_kk_ai_assistants_organization_id` |
| `kk_assistant_knowledge_bases` | `knowledge_base_id` | `idx_kk_assistant_knowledge_bases_knowledge_base_id` |
| `kk_content_posts` | `pillar_id` | `idx_kk_content_posts_pillar_id` |
| `kk_conversations` | `assistant_id` | `idx_kk_conversations_assistant_id` |
| `kk_conversations` | `user_id` | `idx_kk_conversations_user_id` |
| `kk_crud_overviews` | `category_id` | `idx_kk_crud_overviews_category_id` |
| `kk_crud_overviews` | `connection_id` | `idx_kk_crud_overviews_connection_id` |
| `kk_flow_configs` | `organization_id` | `idx_kk_flow_configs_organization_id` |
| `kk_hour_entries` | `client_id` | `idx_kk_hour_entries_client_id` |
| `kk_invitations` | `invited_by` | `idx_kk_invitations_invited_by` |
| `kk_invitations` | `organization_id` | `idx_kk_invitations_organization_id` |
| `kk_knowledge_base_documents` | `created_by` | `idx_kk_kb_documents_created_by` |
| `kk_knowledge_base_documents` | `knowledge_base_id` | `idx_kk_kb_documents_knowledge_base_id` |
| `kk_knowledge_bases` | `created_by` | `idx_kk_knowledge_bases_created_by` |
| `kk_knowledge_bases` | `organization_id` | `idx_kk_knowledge_bases_organization_id` |
| `kk_knowledge_items` | `created_by` | `idx_kk_knowledge_items_created_by` |
| `kk_knowledge_items` | `knowledge_base_id` | `idx_kk_knowledge_items_knowledge_base_id` |
| `kk_messages` | `conversation_id` | `idx_kk_messages_conversation_id` |
| `kk_profiles` | `organization_id` | `idx_kk_profiles_organization_id` |

**Validatieregel**: de Supabase performance-adviseur meldt na de migratie nul `unindexed_foreign_keys` in `public`. De indexen zijn additief; bestaande indexen en constraints blijven ongewijzigd.

## 6. Geen wijzigingen aan bestaande datacontracten

- `src/types/database.types.ts` blijft ongewijzigd.
- Geen nieuwe RPC, view, trigger of kolom.
- Geen wijziging aan `get_user_org_id()`-signatuur of rechten.
- Geen wijziging aan storage-buckets of -policies.
- Geen wijziging aan de Supabase-clientconfiguratie of auth-flow.
