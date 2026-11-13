import { test, expect, type Page } from '@playwright/test'

// E2E voor de content-ideeënfeature (026).
// Verifieert: twee views, titel-only vastleggen + persistentie, verboden velden,
// tellingen per soort, soortenbeheer zonder slots, status zonder datum/tijd,
// bevestigingen en de deterministische legacy-preservatie.
// Vereist een geauthenticeerde sessie + de toegepaste migratie 025 en
// tests/fixtures/legacy-content.sql; zonder login slaan tests over.

async function openContent(page: Page): Promise<boolean> {
  await page.goto('/content')
  if (page.url().includes('/login')) {
    test.skip(true, 'Niet ingelogd — login vereist voor content-ideeën')
    return false
  }
  return true
}

const FORBIDDEN_LABELS = ['Format', 'Datum', 'Tijd', 'LinkedIn-URL']

async function expectNoForbiddenLabels(page: Page) {
  for (const label of FORBIDDEN_LABELS) {
    await expect(page.getByText(label, { exact: true })).toHaveCount(0)
  }
}

async function createPillar(page: Page, name: string) {
  await page.getByRole('button', { name: 'Soorten' }).click()
  await expect(page.getByTestId('pillars-dialog')).toBeVisible()
  await page.getByTestId('pillar-new-name').fill(name)
  await page.getByTestId('pillar-add').click()
  await expect(page.getByTestId('pillar-row').last().getByLabel('Naam')).toHaveValue(name)
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('pillars-dialog')).toHaveCount(0)
  await expect(page.getByTestId('idea-pillar-select').locator('option', { hasText: name })).toHaveCount(1)
}

async function createPillarAndGetId(page: Page, name: string): Promise<string> {
  await page.getByRole('button', { name: 'Soorten' }).click()
  await expect(page.getByTestId('pillars-dialog')).toBeVisible()
  await page.getByTestId('pillar-new-name').fill(name)
  await page.getByTestId('pillar-add').click()
  const row = page.getByTestId('pillar-row').last()
  await expect(row.getByLabel('Naam')).toHaveValue(name)
  const id = await row.getAttribute('data-pillar-id')
  expect(id).not.toBeNull()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('pillars-dialog')).toHaveCount(0)
  await expect(page.getByTestId('idea-pillar-select').locator('option', { hasText: name })).toHaveCount(1)
  return id!
}

async function setPillarDescription(page: Page, pillarId: string, description: string) {
  await page.getByRole('button', { name: 'Soorten' }).click()
  await expect(page.getByTestId('pillars-dialog')).toBeVisible()
  const row = page.locator(`[data-testid="pillar-row"][data-pillar-id="${pillarId}"]`)
  await expect(row).toBeVisible()
  await row.getByLabel('Korte beschrijving').fill(description)
  await row.getByRole('button', { name: 'Opslaan' }).click()
  await expect(page.getByText('Opgeslagen', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('pillars-dialog')).toHaveCount(0)
}

async function archivePillar(page: Page, pillarId: string) {
  await page.getByRole('button', { name: 'Soorten' }).click()
  await expect(page.getByTestId('pillars-dialog')).toBeVisible()
  const row = page.locator(`[data-testid="pillar-row"][data-pillar-id="${pillarId}"]`)
  await expect(row).toBeVisible()
  await row.getByTestId('pillar-archive-toggle').click()
  await expect(row.getByRole('button', { name: 'Heractiveren' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('pillars-dialog')).toHaveCount(0)
}

function filterOption(page: Page, label: string) {
  return page.getByTestId('idea-filter-option').filter({ hasText: label })
}

async function expectFilterOptionCount(page: Page, label: string, count: number) {
  await expect(filterOption(page, label).getByTestId('idea-filter-count')).toHaveText(String(count))
}

async function createIdea(page: Page, title: string, pillarName?: string) {
  await page.getByTestId('idea-title-input').fill(title)
  await page.getByTestId('idea-pillar-select').selectOption({ label: pillarName ?? 'Geen soort' })
  await page.getByTestId('idea-save-button').click()
  await expect(page.getByTestId('idea-title-input')).toHaveValue('')
}

async function deleteIdea(page: Page, title: string) {
  const row = page.getByTestId('idea-row').filter({ hasText: title }).first()
  await expect(row).toBeVisible()
  await row.click()
  await expect(page.getByTestId('idea-editor')).toBeVisible()
  await page.getByTestId('idea-editor-delete').click()
  const dialog = page.getByRole('dialog').filter({ hasText: 'Idee verwijderen?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Verwijderen' }).click()
  await expect(page.getByTestId('idea-row').filter({ hasText: title })).toHaveCount(0)
}

test.describe('content-ideeën', () => {
  test('twee views, standaard Ideeën en geen kalender', async ({ page }) => {
    if (!(await openContent(page))) return

    await expect(page.getByTestId('content-tab-ideeen')).toBeVisible()
    await expect(page.getByTestId('content-tab-overzicht')).toBeVisible()
    await expect(page.getByTestId('idea-composer')).toBeVisible()
    await expect(page.getByTestId('content-tab-ideeen')).toHaveAttribute('aria-selected', 'true')

    // Geen kalenderresten
    await expect(page.getByText('Vandaag', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Soorten & slots', { exact: true })).toHaveCount(0)
    await expect(page.locator('[data-date]')).toHaveCount(0)

    // Nav-volgorde: Uren direct gevolgd door Content
    const navLinks = page.locator('nav a')
    const labels = (await navLinks.allTextContents()).map((label) => label.trim())
    const urenIndex = labels.indexOf('Uren')
    expect(urenIndex).toBeGreaterThanOrEqual(0)
    expect(labels[urenIndex + 1]).toBe('Content')
  })

  test('titel-only idee opslaan via Enter, persistent na reload en geen dubbel idee', async ({ page }) => {
    if (!(await openContent(page))) return

    const title = `Idee ${Date.now()}`
    const input = page.getByTestId('idea-title-input')

    await input.fill(title)
    await input.press('Enter')
    await input.press('Enter')

    await expect(page.getByTestId('idea-row').filter({ hasText: title })).toHaveCount(1)
    await expect(input).toHaveValue('')
    await expect(input).toBeFocused()

    await page.reload()
    await expect(page.getByTestId('idea-row').filter({ hasText: title }).first()).toBeVisible()
  })

  test('lege titel wordt inline geblokkeerd', async ({ page }) => {
    if (!(await openContent(page))) return

    const before = await page.getByTestId('idea-row').count()
    await page.getByTestId('idea-title-input').fill('   ')
    await page.getByTestId('idea-save-button').click()

    await expect(page.getByText('De titel is verplicht.', { exact: true })).toBeVisible()
    await expect(page.getByTestId('idea-row')).toHaveCount(before)
  })

  test('geen Format/Datum/Tijd/LinkedIn-URL in composer en editor', async ({ page }) => {
    if (!(await openContent(page))) return

    await expectNoForbiddenLabels(page)

    const existing = page.getByTestId('idea-row').first()
    if ((await existing.count()) === 0) {
      const title = `Editor ${Date.now()}`
      await page.getByTestId('idea-title-input').fill(title)
      await page.getByTestId('idea-title-input').press('Enter')
      await expect(page.getByTestId('idea-row').filter({ hasText: title }).first()).toBeVisible()
    }

    await page.getByTestId('idea-row').first().click()
    await expect(page.getByTestId('idea-editor')).toBeVisible()
    await expectNoForbiddenLabels(page)
    await page.keyboard.press('Escape')
  })

  test('overzicht telt per unieke soort, toont 0-soorten en "Geen soort"', async ({ page }) => {
    if (!(await openContent(page))) return

    const stamp = Date.now()
    const typeName = `Type ${stamp}`

    await createPillar(page, typeName)

    for (const suffix of ['A', 'B']) {
      const title = `${typeName} ${suffix}`
      await page.getByTestId('idea-title-input').fill(title)
      await page.getByTestId('idea-pillar-select').selectOption({ label: typeName })
      await page.getByTestId('idea-save-button').click()
      await expect(page.getByTestId('idea-row').filter({ hasText: title }).first()).toBeVisible()
    }

    const unassignedTitle = `Los idee ${stamp}`
    await page.getByTestId('idea-title-input').fill(unassignedTitle)
    await page.getByTestId('idea-pillar-select').selectOption({ label: 'Geen soort' })
    await page.getByTestId('idea-save-button').click()
    await expect(page.getByTestId('idea-row').filter({ hasText: unassignedTitle }).first()).toBeVisible()

    await page.getByTestId('content-tab-overzicht').click()
    await expect(page.getByTestId('content-overview')).toBeVisible()

    const typeRow = page.getByTestId('overview-row').filter({ hasText: typeName })
    await expect(typeRow.getByTestId('overview-count')).toHaveText('2')

    const unassignedRow = page.getByTestId('overview-row').filter({ hasText: 'Geen soort' })
    await expect(unassignedRow.getByTestId('overview-count')).toHaveText(/[1-9]/)
    await expect(page.getByTestId('overview-total')).toHaveText(/[1-9]/)
  })

  test('soort hernoemen en archiveren werkt door in lijst, composer en overzicht', async ({ page }) => {
    if (!(await openContent(page))) return

    const stamp = Date.now()
    const typeName = `Type ${stamp}`
    const renamed = `${typeName} gewijzigd`

    await createPillar(page, typeName)

    const ideaTitle = `Idee ${stamp}`
    await page.getByTestId('idea-title-input').fill(ideaTitle)
    await page.getByTestId('idea-pillar-select').selectOption({ label: typeName })
    await page.getByTestId('idea-save-button').click()
    await expect(page.getByTestId('idea-row').filter({ hasText: ideaTitle }).first()).toBeVisible()

    // Hernoemen
    await page.getByRole('button', { name: 'Soorten' }).click()
    const row = page.getByTestId('pillar-row').last()
    await expect(row.getByLabel('Naam')).toHaveValue(typeName)
    await row.getByLabel('Naam').fill(renamed)
    await row.getByRole('button', { name: 'Opslaan' }).click()
    await expect(row.getByLabel('Naam')).toHaveValue(renamed)
    await page.keyboard.press('Escape')

    await expect(page.getByTestId('idea-row').filter({ hasText: renamed }).first()).toBeVisible()

    // Archiveren
    await page.getByRole('button', { name: 'Soorten' }).click()
    const renamedRow = page.getByTestId('pillar-row').last()
    await expect(renamedRow.getByLabel('Naam')).toHaveValue(renamed)
    await renamedRow.getByTestId('pillar-archive-toggle').click()
    await expect(renamedRow.getByRole('button', { name: 'Heractiveren' })).toBeVisible()
    await page.keyboard.press('Escape')

    const optionTexts = await page.getByTestId('idea-pillar-select').locator('option').allTextContents()
    expect(optionTexts).not.toContain(renamed)

    await page.getByTestId('content-tab-overzicht').click()
    const overviewRow = page.getByTestId('overview-row').filter({ hasText: renamed })
    await expect(overviewRow).toContainText('(gearchiveerd)')
    await expect(overviewRow.getByTestId('overview-count')).toHaveText('1')
  })

  test('status Gepland zonder datum en tijd kan worden opgeslagen', async ({ page }) => {
    if (!(await openContent(page))) return

    const title = `Gepland ${Date.now()}`
    await page.getByTestId('idea-title-input').fill(title)
    await page.getByTestId('idea-save-button').click()
    await expect(page.getByTestId('idea-row').filter({ hasText: title }).first()).toBeVisible()

    await page.getByTestId('idea-row').filter({ hasText: title }).first().click()
    await expect(page.getByTestId('idea-editor')).toBeVisible()
    await page.getByTestId('idea-editor-body').fill('Tekst voor een gepland idee.')
    await page.getByTestId('idea-editor-status').selectOption('gepland')
    await page.getByTestId('idea-editor-save').click()

    await expect(page.getByText('Opgeslagen', { exact: true })).toBeVisible()
    await expect(page.getByTestId('idea-editor-status')).toHaveValue('gepland')
  })

  test('bevestiging bij sluiten met wijzigingen en bij verwijderen', async ({ page }) => {
    if (!(await openContent(page))) return

    const title = `Verwijder ${Date.now()}`
    await page.getByTestId('idea-title-input').fill(title)
    await page.getByTestId('idea-save-button').click()
    const row = page.getByTestId('idea-row').filter({ hasText: title }).first()
    await expect(row).toBeVisible()

    await row.click()
    await expect(page.getByTestId('idea-editor')).toBeVisible()
    await page.getByTestId('idea-editor-title').fill(`${title} gewijzigd`)
    await page.getByRole('button', { name: 'Sluiten', exact: true }).click()
    await expect(page.getByText('Niet-opgeslagen wijzigingen')).toBeVisible()
    await page.getByRole('button', { name: 'Sluiten zonder opslaan' }).click()
    await expect(page.getByTestId('idea-editor')).toHaveCount(0)

    await row.click()
    await page.getByTestId('idea-editor-delete').click()
    const deleteDialog = page.getByRole('dialog').filter({ hasText: 'Idee verwijderen?' })
    await expect(deleteDialog).toBeVisible()
    await deleteDialog.getByRole('button', { name: 'Verwijderen' }).click()
    await expect(page.getByTestId('idea-row').filter({ hasText: title })).toHaveCount(0)
  })

  test('mislukte opslag behoudt de invoer en een retry slaagt', async ({ page }) => {
    if (!(await openContent(page))) return

    await page.route('**/*', async (route) => {
      const request = route.request()
      if (request.method() === 'POST' && request.headers()['next-action']) {
        await route.abort()
      } else {
        await route.continue()
      }
    })

    const title = `Retry ${Date.now()}`
    const input = page.getByTestId('idea-title-input')
    await input.fill(title)
    await page.getByTestId('idea-save-button').click()

    await expect(page.getByText('Opslaan mislukt', { exact: true })).toBeVisible()
    await expect(input).toHaveValue(title)

    await page.unroute('**/*')
    await page.getByTestId('idea-save-button').click()
    await expect(page.getByTestId('idea-row').filter({ hasText: title }).first()).toBeVisible()
  })

  test('mobiel 375px: beide views zonder horizontaal scrollen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    if (!(await openContent(page))) return

    await expect(page.getByTestId('content-tab-ideeen')).toBeVisible()
    await expect(page.getByTestId('idea-composer')).toBeVisible()
    const composerOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(composerOverflow).toBeLessThanOrEqual(1)

    await page.getByTestId('content-tab-overzicht').click()
    const overviewOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overviewOverflow).toBeLessThanOrEqual(1)
  })

  test('legacy-fixture blijft zichtbaar en telt mee', async ({ page }) => {
    if (!(await openContent(page))) return

    const fixture = page.getByTestId('idea-row').filter({ hasText: 'LEGACY-FIXTURE-026' })
    await expect(
      fixture.first(),
      'Pas tests/fixtures/legacy-content.sql toe met het juiste e-mailadres voordat je deze test draait.',
    ).toBeVisible()

    await expectNoForbiddenLabels(page)

    await fixture.first().click()
    await expect(page.getByTestId('idea-editor')).toBeVisible()
    await expectNoForbiddenLabels(page)
    await page.keyboard.press('Escape')

    await page.getByTestId('content-tab-overzicht').click()
    await expect(page.getByTestId('overview-total')).toHaveText(/[1-9]/)
  })
})

test.describe('content-ideeën filter', () => {
  test('geen pijplijn, filterbalk zichtbaar en alle statussen in één lijst', async ({ page }) => {
    if (!(await openContent(page))) return

    await expect(page.getByTestId('content-pipeline')).toHaveCount(0)
    await expect(page.getByText('Pijplijn', { exact: true })).toHaveCount(0)
    await expect(page.getByTestId('idea-filter')).toBeVisible()
    await expect(filterOption(page, 'Alle soorten')).toHaveAttribute('aria-pressed', 'true')

    const visibleRows = await page.getByTestId('idea-row').count()
    await expect(page.getByTestId('idea-list-count')).toHaveText(String(visibleRows))

    const title = `Live filter ${Date.now()}`
    await createIdea(page, title)
    await expect(page.getByTestId('idea-row').filter({ hasText: title })).toBeVisible()

    await page.getByTestId('idea-row').filter({ hasText: title }).first().click()
    await page.getByTestId('idea-editor-body').fill('Live tekst')
    await page.getByTestId('idea-editor-status').selectOption('live')
    await page.getByTestId('idea-editor-save').click()
    await expect(page.getByText('Opgeslagen', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')

    await expect(page.getByTestId('idea-row').filter({ hasText: title })).toBeVisible()
    await deleteIdea(page, title)
  })

  test('filtert op soort en op "Geen soort" met kloppende tellingen', async ({ page }) => {
    if (!(await openContent(page))) return

    const stamp = Date.now()
    const typeA = `Filter A ${stamp}`
    const typeB = `Filter B ${stamp}`
    await createPillar(page, typeA)
    await createPillar(page, typeB)

    const titleA1 = `${typeA} 1`
    const titleA2 = `${typeA} 2`
    const titleB = `${typeB} 1`
    const titleNone = `Los filter ${stamp}`

    const noneBefore =
      (await filterOption(page, 'Geen soort').count()) > 0
        ? Number(await filterOption(page, 'Geen soort').getByTestId('idea-filter-count').textContent())
        : 0

    await createIdea(page, titleA1, typeA)
    await createIdea(page, titleA2, typeA)
    await createIdea(page, titleB, typeB)
    await createIdea(page, titleNone)

    await expectFilterOptionCount(page, typeA, 2)
    await expectFilterOptionCount(page, typeB, 1)
    await expectFilterOptionCount(page, 'Geen soort', noneBefore + 1)

    const total = await page.getByTestId('idea-row').count()

    await filterOption(page, typeA).click()
    await expect(filterOption(page, typeA)).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('idea-row').filter({ hasText: titleA1 })).toBeVisible()
    await expect(page.getByTestId('idea-row').filter({ hasText: titleA2 })).toBeVisible()
    await expect(page.getByTestId('idea-row').filter({ hasText: titleB })).toHaveCount(0)
    await expect(page.getByTestId('idea-row').filter({ hasText: titleNone })).toHaveCount(0)
    await expect(page.getByTestId('idea-list-count')).toHaveText(`2 van ${total}`)

    await filterOption(page, 'Geen soort').click()
    await expect(page.getByTestId('idea-row').filter({ hasText: titleNone })).toBeVisible()
    await expect(page.getByTestId('idea-row').filter({ hasText: titleA1 })).toHaveCount(0)

    await filterOption(page, 'Alle soorten').click()
    await expect(page.getByTestId('idea-row').filter({ hasText: titleA1 })).toBeVisible()
    await expect(page.getByTestId('idea-row').filter({ hasText: titleB })).toBeVisible()
    await expect(page.getByTestId('idea-row').filter({ hasText: titleNone })).toBeVisible()

    await deleteIdea(page, titleA1)
    await deleteIdea(page, titleA2)
    await deleteIdea(page, titleB)
    await deleteIdea(page, titleNone)
  })

  test('toont de korte beschrijving van de gekozen soort en werkt direct bij', async ({ page }) => {
    if (!(await openContent(page))) return

    const stamp = Date.now()
    const typeName = `Beschrijving ${stamp}`
    const pillarId = await createPillarAndGetId(page, typeName)
    const description = 'Praktische tips voor ondernemers'
    await setPillarDescription(page, pillarId, description)

    const title = `Beschrijving idee ${stamp}`
    await createIdea(page, title, typeName)

    await filterOption(page, typeName).click()
    await expect(page.getByTestId('idea-filter-description')).toBeVisible()
    await expect(page.getByTestId('idea-filter-description')).toContainText(typeName)
    await expect(page.getByTestId('idea-filter-description-text')).toHaveText(description)

    const emptyType = `Leeg ${stamp}`
    await createPillar(page, emptyType)
    await filterOption(page, emptyType).click()
    await expect(page.getByTestId('idea-filter-description-text')).toHaveText('Geen korte beschrijving.')

    await filterOption(page, 'Alle soorten').click()
    await expect(page.getByTestId('idea-filter-description')).toHaveCount(0)

    const longDescription = 'a'.repeat(220)
    await setPillarDescription(page, pillarId, longDescription)
    await filterOption(page, typeName).click()
    const toggle = page.getByTestId('idea-filter-description-toggle')
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(toggle).toHaveText('Toon minder')

    const updated = 'Bijgewerkte korte beschrijving'
    await setPillarDescription(page, pillarId, updated)
    await expect(page.getByTestId('idea-filter-description-text')).toHaveText(updated)

    await archivePillar(page, pillarId)
    await expect(filterOption(page, typeName)).toContainText('(gearchiveerd)')
    await expect(page.getByTestId('idea-filter-description')).toContainText('(gearchiveerd)')
    await expect(page.getByTestId('idea-filter-description-text')).toHaveText(updated)

    await deleteIdea(page, title)
  })

  test('toont een gefilterde lege staat met "Toon alle ideeën"', async ({ page }) => {
    if (!(await openContent(page))) return

    const stamp = Date.now()
    const typeWithIdea = `Gevuld ${stamp}`
    const emptyType = `Leeg filter ${stamp}`
    await createPillar(page, typeWithIdea)
    await createPillar(page, emptyType)

    const title = `Gevuld idee ${stamp}`
    await createIdea(page, title, typeWithIdea)

    await filterOption(page, emptyType).click()
    await expect(page.getByTestId('idea-list-empty-filtered')).toBeVisible()
    await expect(page.getByTestId('idea-list-empty-filtered')).toContainText(`Geen ideeën voor ${emptyType}.`)
    await expect(page.getByTestId('idea-list-empty')).toHaveCount(0)
    await expect(page.getByTestId('idea-list-clear-filter')).toBeVisible()

    await page.getByTestId('idea-list-clear-filter').click()
    await expect(filterOption(page, 'Alle soorten')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('idea-row').filter({ hasText: title })).toBeVisible()

    await deleteIdea(page, title)
  })

  test('werkt tellingen en gefilterde lijst direct bij na toevoegen, wisselen en verwijderen', async ({ page }) => {
    if (!(await openContent(page))) return

    const stamp = Date.now()
    const typeA = `Actualiteit A ${stamp}`
    const typeB = `Actualiteit B ${stamp}`
    await createPillarAndGetId(page, typeA)
    const idB = await createPillarAndGetId(page, typeB)

    await filterOption(page, typeA).click()

    const titleA = `Actualiteit A idee ${stamp}`
    await createIdea(page, titleA, typeA)
    await expect(page.getByTestId('idea-row').filter({ hasText: titleA })).toBeVisible()

    const titleB = `Actualiteit B idee ${stamp}`
    await createIdea(page, titleB, typeB)
    await expect(page.getByTestId('idea-row').filter({ hasText: titleB })).toHaveCount(0)
    await expectFilterOptionCount(page, typeB, 1)

    await page.getByTestId('idea-row').filter({ hasText: titleA }).first().click()
    await page.getByTestId('idea-editor-pillar').selectOption({ label: typeB })
    await page.getByTestId('idea-editor-save').click()
    await expect(page.getByText('Opgeslagen', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')

    await expect(page.getByTestId('idea-row').filter({ hasText: titleA })).toHaveCount(0)
    await expectFilterOptionCount(page, typeB, 2)

    await filterOption(page, typeB).click()
    await expect(page.getByTestId('idea-row').filter({ hasText: titleA })).toBeVisible()
    await expect(page.getByTestId('idea-row').filter({ hasText: titleB })).toBeVisible()

    const renamedB = `${typeB} gewijzigd`
    await page.getByRole('button', { name: 'Soorten' }).click()
    const rowB = page.locator(`[data-testid="pillar-row"][data-pillar-id="${idB}"]`)
    await expect(rowB.getByLabel('Naam')).toHaveValue(typeB)
    await rowB.getByLabel('Naam').fill(renamedB)
    await rowB.getByRole('button', { name: 'Opslaan' }).click()
    await expect(page.getByText('Opgeslagen', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(filterOption(page, renamedB)).toBeVisible()
    await expect(filterOption(page, renamedB)).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Soorten' }).click()
    await rowB.getByRole('button', { name: 'Kleur green' }).click()
    await rowB.getByRole('button', { name: 'Opslaan' }).click()
    await expect(page.getByText('Opgeslagen', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(filterOption(page, renamedB).locator('[aria-hidden]').first()).toHaveClass(/bg-green-500/)

    await archivePillar(page, idB)
    await expect(filterOption(page, renamedB)).toContainText('(gearchiveerd)')
    await expect(page.getByTestId('idea-row').filter({ hasText: titleB })).toBeVisible()

    await deleteIdea(page, titleA)
    await deleteIdea(page, titleB)
  })

  test('laat "Geen soort" verdwijnen en valt terug op "Alle soorten"', async ({ page }) => {
    if (!(await openContent(page))) return

    const stamp = Date.now()
    const typeName = `Fallback ${stamp}`
    await createPillar(page, typeName)

    const title = `Fallback los ${stamp}`
    await createIdea(page, title)

    const noneOption = filterOption(page, 'Geen soort')
    await noneOption.click()
    const before = Number(await noneOption.getByTestId('idea-filter-count').textContent())
    await expect(page.getByTestId('idea-row').filter({ hasText: title })).toBeVisible()

    await page.getByTestId('idea-row').filter({ hasText: title }).first().click()
    await page.getByTestId('idea-editor-pillar').selectOption({ label: typeName })
    await page.getByTestId('idea-editor-save').click()
    await expect(page.getByText('Opgeslagen', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')

    if (before === 1) {
      await expect(filterOption(page, 'Geen soort')).toHaveCount(0)
      await expect(filterOption(page, 'Alle soorten')).toHaveAttribute('aria-pressed', 'true')
    } else {
      await expectFilterOptionCount(page, 'Geen soort', before - 1)
      await filterOption(page, 'Alle soorten').click()
    }

    await expect(page.getByTestId('idea-row').filter({ hasText: title })).toBeVisible()
    await deleteIdea(page, title)
  })

  test('blijft bruikbaar op 375 px en met het toetsenbord', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    if (!(await openContent(page))) return

    await expect(page.getByTestId('idea-filter')).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)

    const allOption = filterOption(page, 'Alle soorten')
    await allOption.focus()
    await page.keyboard.press('Enter')
    await expect(allOption).toHaveAttribute('aria-pressed', 'true')

    const optionCount = await page.getByTestId('idea-filter-option').count()
    if (optionCount > 1) {
      const second = page.getByTestId('idea-filter-option').nth(1)
      await second.focus()
      await page.keyboard.press(' ')
      await expect(second).toHaveAttribute('aria-pressed', 'true')
    }
  })

  test('toont een eerlijke posts-fout met retry', async ({ page }) => {
    if (!(await openContent(page))) return

    await page.route('**/rest/v1/kk_content_posts*', (route) => route.abort())
    const title = `Fout ${Date.now()}`
    await page.getByTestId('idea-title-input').fill(title)
    await page.getByTestId('idea-save-button').click()

    await expect(page.getByTestId('idea-list-error')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('idea-list-retry')).toBeVisible()
    await expect(page.getByTestId('idea-list-empty')).toHaveCount(0)

    await page.unroute('**/rest/v1/kk_content_posts*')
    await page.getByTestId('idea-list-retry').click()
    await expect(page.getByTestId('idea-list-error')).toHaveCount(0, { timeout: 20_000 })
    await expect(page.getByTestId('idea-row').filter({ hasText: title })).toBeVisible()

    await deleteIdea(page, title)
  })

  test('houdt de lijst zichtbaar als de soorten niet laden', async ({ page }) => {
    if (!(await openContent(page))) return

    const stamp = Date.now()
    const typeName = `Soortfout ${stamp}`
    const pillarId = await createPillarAndGetId(page, typeName)
    const title = `Soortfout idee ${stamp}`
    await createIdea(page, title, typeName)

    await page.route('**/rest/v1/kk_content_pillars*', (route) => route.abort())
    await setPillarDescription(page, pillarId, 'Tijdelijke beschrijving')

    await expect(page.getByTestId('idea-filter-error')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('idea-filter-retry')).toBeVisible()
    await expect(page.getByTestId('idea-row').filter({ hasText: title })).toBeVisible()

    await page.unroute('**/rest/v1/kk_content_pillars*')
    await page.getByTestId('idea-filter-retry').click()
    await expect(page.getByTestId('idea-filter-error')).toHaveCount(0, { timeout: 20_000 })
    await expect(filterOption(page, typeName)).toBeVisible()

    await deleteIdea(page, title)
  })
})
