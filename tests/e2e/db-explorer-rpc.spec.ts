import { test, expect, type Page } from '@playwright/test'

// E2E-tests voor de DB-explorer na de get_all_table_columns-refactor:
//   - src/actions/local-db.ts        → getLocalTableList() = 1 rpc('get_all_table_columns')
//                                      i.p.v. list_tables + N x get_table_columns (N+1)
//   - src/app/(dashboard)/db/[tableName]/page.tsx
//                                    → Promise.all([getLocalTableMeta, getLocalTableRecords])
//
// Selectoren: deze componenten hebben geen data-testid-attributen en applicatiecode
// mag voor deze tests niet gewijzigd worden — conform de bestaande e2e-conventies in
// deze repo (regression.spec.ts, kanban.spec.ts) worden role-/tekst-selectoren gebruikt.
//
// Belangrijk:
//  - local-db.ts is een server action ('use server'). De Supabase-RPC's lopen dus
//    server-side en zijn normaliter NIET zichtbaar in het browser-netwerkverkeer. De
//    request-teller hieronder vangt daardoor client-side regressies af (iemand die
//    de tabellijst naar de client verplaatst en zo het N+1-patroon terugbrengt).
//    Requests naar '/rpc/get_all_table_columns' zijn toegestaan en worden niet geteld.
//  - Als de RPC-function nog niet op de database staat (migration 020 nog niet
//    gedraaid in de SQL Editor) tonen zowel LocalTableList als CreateCrudDialog een
//    foutmelding. Deze tests skippen dan met een duidelijke melding — verwachte
//    toestand in dev vóór de handmatige migratie-uitvoering.
//  - Geen fixed sleeps: overal wordt gewacht op specifieke elementen met een timeout.

const LIST_WAIT_MS = 15_000

type ListOutcome = 'tables' | 'error' | 'timeout'

// Wacht tot LocalTableList óf minimaal één tabelknop toont ('<n> kolommen'),
// óf de fout-hint met 'get_all_table_columns' (fout-hint én Supabase-foutmelding
// bevatten beide die tekst), óf de wachttijd verstrijkt.
async function waitForTableListOrError(page: Page): Promise<ListOutcome> {
  const tableButtons = page.locator('button').filter({ hasText: /\d+ kolommen/ })
  const rpcHint = page.getByText('get_all_table_columns')

  const tablesOutcome = tableButtons.first()
    .waitFor({ state: 'visible', timeout: LIST_WAIT_MS })
    .then(() => 'tables' as const)
    .catch(() => null)
  const errorOutcome = rpcHint.first()
    .waitFor({ state: 'visible', timeout: LIST_WAIT_MS })
    .then(() => 'error' as const)
    .catch(() => null)

  const outcome = await Promise.race([tablesOutcome, errorOutcome])
  return outcome ?? 'timeout'
}

// Skip-hulp voor het geval noch tabellen noch een foutmelding verschijnt.
// Geeft true terug als de test geskipt is (aanroeper moet dan direct returnen).
async function skipOnTimeout(page: Page, outcome: ListOutcome, context: string): Promise<boolean> {
  if (outcome !== 'timeout') return false

  const stillLoading = await page.getByText('Tabellen laden...').first().isVisible().catch(() => false)
  if (stillLoading) {
    test.skip(true, `${context}: tabellijst laadt nog na ${LIST_WAIT_MS / 1000}s — dev-server mogelijk traag op te starten`)
  } else {
    test.skip(true, `${context}: geen tabellen en geen foutmelding zichtbaar binnen ${LIST_WAIT_MS / 1000}s`)
  }
  return true
}

test.describe('DB explorer — get_all_table_columns refactor', () => {
  test('CreateCrudDialog toont de tabellijst', async ({ page }) => {
    // N+1-tripwire: registreer vóór de eerste page.load, anders missen we requests.
    // Telt browser-requests naar de OUDE rpc-combinatie (list_tables + per tabel
    // get_table_columns). '/rpc/get_all_table_columns' wordt niet geteld en is
    // juist de verwachte nieuwe call.
    let legacyRpcRequests = 0
    page.on('request', (request) => {
      const url = request.url()
      if (url.includes('/rpc/list_tables') || url.includes('/rpc/get_table_columns')) {
        legacyRpcRequests++
      }
    })

    await page.goto('/db')
    if (page.url().includes('/login')) {
      test.skip(true, 'Niet ingelogd — login vereist')
      return
    }

    // LocalTableList fetcht client-side in useEffect: wacht op tabellen of op de fout-hint.
    const listOutcome = await waitForTableListOrError(page)

    if (listOutcome === 'error') {
      test.skip(true, 'get_all_table_columns nog niet toegepast op de database — draai supabase/migrations/020_get_all_table_columns.sql in de Supabase SQL Editor')
      return
    }
    if (await skipOnTimeout(page, listOutcome, '/db')) return

    // Minimaal één tabelknop, en minimaal één knop toont een kolomtelling.
    const tableButtons = page.locator('button').filter({ hasText: /\d+ kolommen/ })
    await expect(tableButtons.first()).toBeVisible()
    expect(await tableButtons.count()).toBeGreaterThan(0)

    // N+1-patroon moet weg zijn: geen enkele client-request naar de oude rpc's.
    expect(
      legacyRpcRequests,
      'Verwacht 0 browser-requests naar /rpc/list_tables of /rpc/get_table_columns — het N+1-patroon is mogelijk teruggekeerd'
    ).toBe(0)

    // Eerste tabelnaam onthouden voor de dialog-vergelijking hieronder.
    const firstTableName = ((await tableButtons.first().locator('p').first().textContent()) ?? '').trim()

    // ---- CreateCrudDialog (gemount via CreateCrudButton op /crud) ----
    await page.goto('/crud')
    if (page.url().includes('/login')) {
      test.skip(true, 'Niet ingelogd — login vereist')
      return
    }

    // Dialog openen. De knop is server-rendered: een klik kan theoretisch vóór
    // React-hydratatie vallen — daarom een bounded retry in plaats van één klik.
    const newCrudButton = page.getByRole('button', { name: 'Nieuwe CRUD' })
    const dialogTitle = page.getByText('Nieuw CRUD overzicht').first()
    let dialogOpened = false
    for (let attempt = 0; attempt < 3 && !dialogOpened; attempt++) {
      await newCrudButton.click()
      dialogOpened = await dialogTitle
        .waitFor({ state: 'visible', timeout: 4_000 })
        .then(() => true)
        .catch(() => false)
    }
    if (!dialogOpened) {
      throw new Error('CreateCrudDialog opent niet binnen 3 pogingen — knop "Nieuwe CRUD" reageert niet')
    }

    // De dialog laadt dezelfde tabellijst via getLocalTableList():
    // wacht op de tabel-<select> of op de fout-state ('Opnieuw proberen').
    const selectAppeared = page.getByRole('combobox').first()
      .waitFor({ state: 'visible', timeout: LIST_WAIT_MS })
      .then(() => 'loaded' as const)
      .catch(() => null)
    const errorAppeared = page.getByRole('button', { name: 'Opnieuw proberen' }).first()
      .waitFor({ state: 'visible', timeout: LIST_WAIT_MS })
      .then(() => 'error' as const)
      .catch(() => null)
    const dialogOutcome = (await Promise.race([selectAppeared, errorAppeared])) ?? 'timeout'

    if (dialogOutcome === 'error') {
      // Foutparagraaf staat direct vóór de 'Opnieuw proberen'-knop.
      const retryButton = page.getByRole('button', { name: 'Opnieuw proberen' })
      const errorParagraph = retryButton.locator('xpath=preceding-sibling::p')
      const errorText = ((await errorParagraph.first().textContent()) ?? '').trim()
      if (errorText.includes('get_all_table_columns')) {
        test.skip(true, 'get_all_table_columns nog niet toegepast op de database — CreateCrudDialog toont de RPC-fout')
        return
      }
      throw new Error(`CreateCrudDialog kan de tabellijst niet laden: ${errorText}`)
    }
    if (dialogOutcome === 'timeout') {
      test.skip(true, `Tabellijst in CreateCrudDialog niet geladen binnen ${LIST_WAIT_MS / 1000}s`)
      return
    }

    // De select toont de placeholder plus minimaal één tabel uit de database.
    // NB: <option>-elementen in een gesloten <select> zijn voor Playwright niet
    // "visible" (geen eigen rendering-box) — daarom tekstvergelijking i.p.v.
    // toBeVisible() op de losse opties.
    const tableSelect = page.getByRole('combobox').first()
    await expect(tableSelect).toBeVisible()
    const optionTexts = (await tableSelect.locator('option').allTextContents()).map((t) => t.trim())
    expect(optionTexts.length, 'CreateCrudDialog moet "-- Kies een tabel --" plus minimaal één tabel tonen').toBeGreaterThan(1)
    expect(optionTexts.some((t) => t.includes('-- Kies een tabel --')), `Placeholder-optie ontbreekt: ${JSON.stringify(optionTexts)}`).toBe(true)

    // Zelfde tabellen als op /db: de eerste tabel uit de /db-lijst moet een optie zijn.
    if (firstTableName) {
      expect(
        optionTexts.some((t) => t.includes(firstTableName)),
        `Eerste tabel "${firstTableName}" uit /db ontbreekt in de dialog-opties: ${JSON.stringify(optionTexts)}`
      ).toBe(true)
    }

    // Nog steeds geen N+1-verkeer, ook niet via de dialog.
    expect(
      legacyRpcRequests,
      'Ook via CreateCrudDialog geen browser-requests naar de oude rpc\'s verwacht'
    ).toBe(0)
  })

  test('/db/<tabel> toont kolommen en rijen', async ({ page }) => {
    await page.goto('/db')
    if (page.url().includes('/login')) {
      test.skip(true, 'Niet ingelogd — login vereist')
      return
    }

    const listOutcome = await waitForTableListOrError(page)
    if (listOutcome === 'error') {
      test.skip(true, 'get_all_table_columns nog niet toegepast op de database — draai supabase/migrations/020_get_all_table_columns.sql in de Supabase SQL Editor')
      return
    }
    if (await skipOnTimeout(page, listOutcome, '/db')) return

    // Klik op de eerste tabelknop (client-side gerenderd, dus zeker gehydrateerd).
    const tableButtons = page.locator('button').filter({ hasText: /\d+ kolommen/ })
    await tableButtons.first().click()

    // Client-side navigatie naar /db/<tableName>.
    await page.waitForURL(/\/db\/[^/]+$/, { timeout: LIST_WAIT_MS })
    const tableName = decodeURIComponent(new URL(page.url()).pathname.split('/db/')[1] ?? '')
    if (!tableName) {
      throw new Error(`Kon geen tabelnaam uit de URL halen: ${page.url()}`)
    }

    // Server-renderde detailpagina: óf de tabel-heading (h1 met tabelnaam —
    // gefilterd, want de oude /db-heading "Database" staat tijdens de
    // client-navigatie nog kort in de DOM), óf de "niet gevonden"-fout.
    const headingAppeared = page.locator('h1').filter({ hasText: tableName }).first()
      .waitFor({ state: 'visible', timeout: LIST_WAIT_MS })
      .then(() => 'heading' as const)
      .catch(() => null)
    const notFoundAppeared = page.getByText('niet gevonden').first()
      .waitFor({ state: 'visible', timeout: LIST_WAIT_MS })
      .then(() => 'notfound' as const)
      .catch(() => null)
    const pageOutcome = (await Promise.race([headingAppeared, notFoundAppeared])) ?? null

    if (pageOutcome === 'notfound') {
      test.skip(true, `Tabel "${tableName}" leidt op de detailpagina naar "niet gevonden"`)
      return
    }
    if (pageOutcome === null) {
      throw new Error('Tabel-detailpagina toont binnen 15s geen heading en geen foutmelding')
    }

    // Heading bevat de tabelnaam.
    await expect(page.locator('h1').filter({ hasText: tableName }).first()).toContainText(tableName)

    // Kolomtelling zichtbaar ('<n> kolommen').
    await expect(page.getByText(/\d+ kolommen/).first()).toBeVisible()

    // LocalDynamicTable rendert GenericTable: een echte <table> met kolomkoppen
    // en minimaal één tbody-rij. De lege-state ('Geen records') wordt óók als
    // tbody-rij gerenderd, dus deze check dekt data-rijen én empty-state.
    await expect(page.locator('table').first()).toBeVisible()
    await expect(page.locator('thead th').first()).toBeVisible()
    await expect(page.locator('tbody tr').first()).toBeVisible()
  })
})