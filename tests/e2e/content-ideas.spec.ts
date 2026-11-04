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

async function expectPipelineCountMatchesRows(page: Page) {
  const raw = await page.getByTestId('pipeline-count').textContent()
  const count = Number(raw?.trim() ?? '0')
  await expect(page.getByTestId('pipeline-row')).toHaveCount(count)
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

test.describe('content-pijplijn', () => {
  test('blok staat tussen composer en lijst, toont niet-live ideeën en opent de editor', async ({ page }) => {
    if (!(await openContent(page))) return

    const pipeline = page.getByTestId('content-pipeline')
    const composer = page.getByTestId('idea-composer')
    const list = page.getByTestId('idea-list')

    await expect(pipeline).toBeVisible()
    await expect(page.getByTestId('pipeline-heading')).toHaveText('Pijplijn')
    await expect(composer).toBeVisible()
    await expect(list).toBeVisible()

    const pipelineBox = await pipeline.boundingBox()
    const composerBox = await composer.boundingBox()
    const listBox = await list.boundingBox()
    expect(pipelineBox).not.toBeNull()
    expect(composerBox).not.toBeNull()
    expect(listBox).not.toBeNull()
    expect(pipelineBox!.y).toBeGreaterThan(composerBox!.y)
    expect(pipelineBox!.y).toBeLessThan(listBox!.y)

    const statuses = await page.getByTestId('pipeline-row-status').allTextContents()
    expect(statuses.every((status) => status.trim() !== 'Live')).toBe(true)
    await expectPipelineCountMatchesRows(page)

    const title = `Pijplijn ${Date.now()}`
    await page.getByTestId('idea-title-input').fill(title)
    await page.getByTestId('idea-save-button').click()

    const pipelineRow = page.getByTestId('pipeline-row').filter({ hasText: title })
    await expect(pipelineRow).toBeVisible()
    await expect(page.getByTestId('idea-row').filter({ hasText: title })).toBeVisible()
    await expectPipelineCountMatchesRows(page)

    await pipelineRow.click()
    await expect(page.getByTestId('idea-editor')).toBeVisible()
    await expect(page.getByTestId('idea-editor-title')).toHaveValue(title)
    await page.keyboard.press('Escape')
  })
})

test.describe('content-pijplijn actualiteit', () => {
  test('Live haalt uit de pijplijn, Gepland brengt terug en verwijderen haalt uit beide', async ({ page }) => {
    if (!(await openContent(page))) return

    const title = `Pijplijn live ${Date.now()}`
    await page.getByTestId('idea-title-input').fill(title)
    await page.getByTestId('idea-save-button').click()

    const pipelineRow = page.getByTestId('pipeline-row').filter({ hasText: title })
    const ideaRow = page.getByTestId('idea-row').filter({ hasText: title })
    await expect(pipelineRow).toBeVisible()
    await expect(ideaRow).toBeVisible()
    await expectPipelineCountMatchesRows(page)

    // Live: uit de pijplijn, maar niet uit de volledige lijst.
    await pipelineRow.click()
    await expect(page.getByTestId('idea-editor')).toBeVisible()
    await page.getByTestId('idea-editor-body').fill('Klaar om te publiceren.')
    await page.getByTestId('idea-editor-status').selectOption('live')
    await page.getByTestId('idea-editor-save').click()
    await expect(page.getByText('Opgeslagen', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')

    await expect(pipelineRow).toHaveCount(0)
    await expect(ideaRow).toBeVisible()
    await expectPipelineCountMatchesRows(page)

    // Terug naar Gepland: weer in de pijplijn.
    await ideaRow.click()
    await expect(page.getByTestId('idea-editor')).toBeVisible()
    await page.getByTestId('idea-editor-status').selectOption('gepland')
    await page.getByTestId('idea-editor-save').click()
    await expect(page.getByText('Opgeslagen', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')

    await expect(pipelineRow).toBeVisible()
    await expect(ideaRow).toBeVisible()
    await expectPipelineCountMatchesRows(page)

    // Verwijderen: uit beide lijsten.
    await pipelineRow.click()
    await page.getByTestId('idea-editor-delete').click()
    const deleteDialog = page.getByRole('dialog').filter({ hasText: 'Idee verwijderen?' })
    await deleteDialog.getByRole('button', { name: 'Verwijderen' }).click()
    await expect(pipelineRow).toHaveCount(0)
    await expect(ideaRow).toHaveCount(0)
    await expectPipelineCountMatchesRows(page)
  })

  test('soort hernoemen, kleur wijzigen en archiveren werkt direct door in de pijplijn', async ({ page }) => {
    if (!(await openContent(page))) return

    const stamp = Date.now()
    const typeName = `Pijplijnsoort ${stamp}`
    const renamed = `${typeName} gewijzigd`

    await createPillar(page, typeName)

    const title = `Pijplijn soort ${stamp}`
    await page.getByTestId('idea-title-input').fill(title)
    await page.getByTestId('idea-pillar-select').selectOption({ label: typeName })
    await page.getByTestId('idea-save-button').click()

    const pipelineRow = page.getByTestId('pipeline-row').filter({ hasText: title })
    await expect(pipelineRow).toBeVisible()
    await expect(pipelineRow.getByTestId('pipeline-row-pillar')).toHaveText(typeName)

    // Hernoemen: open het beheer en maak een stabiele rij-locator op basis van het pillar-id.
    await page.getByRole('button', { name: 'Soorten' }).click()
    const createdRow = page.getByTestId('pillar-row').last()
    await expect(createdRow.getByLabel('Naam')).toHaveValue(typeName)
    const pillarId = await createdRow.getAttribute('data-pillar-id')
    expect(pillarId).not.toBeNull()
    const row = page.locator(`[data-testid="pillar-row"][data-pillar-id="${pillarId}"]`)

    await expect(row.getByLabel('Naam')).toHaveValue(typeName)
    await row.getByLabel('Naam').fill(renamed)
    await row.getByRole('button', { name: 'Opslaan' }).click()
    await expect(row.getByLabel('Naam')).toHaveValue(renamed)
    await page.keyboard.press('Escape')
    await expect(pipelineRow.getByTestId('pipeline-row-pillar')).toHaveText(renamed)

    // Kleur wijzigen
    await page.getByRole('button', { name: 'Soorten' }).click()
    await row.getByRole('button', { name: 'Kleur green' }).click()
    await row.getByRole('button', { name: 'Opslaan' }).click()
    await page.keyboard.press('Escape')
    await expect(pipelineRow.locator('[aria-hidden]').first()).toHaveClass(/bg-green-500/)

    // Archiveren
    await page.getByRole('button', { name: 'Soorten' }).click()
    await row.getByTestId('pillar-archive-toggle').click()
    await expect(row.getByRole('button', { name: 'Heractiveren' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(pipelineRow.getByTestId('pipeline-row-pillar')).toContainText('(gearchiveerd)')

    // Opruimen: het testidee verwijderen; de soort blijft gearchiveerd bestaan.
    await pipelineRow.click()
    await page.getByTestId('idea-editor-delete').click()
    const deleteDialog = page.getByRole('dialog').filter({ hasText: 'Idee verwijderen?' })
    await deleteDialog.getByRole('button', { name: 'Verwijderen' }).click()
    await expect(pipelineRow).toHaveCount(0)
    await expectPipelineCountMatchesRows(page)
  })
})

test.describe('content-pijplijn staten', () => {
  test('toont een eerlijke lege staat en een foutbanner met retry', async ({ page }) => {
    if (!(await openContent(page))) return

    await expect(page.getByTestId('pipeline-loading')).toHaveCount(0)
    const rows = await page.getByTestId('pipeline-row').count()
    await expectPipelineCountMatchesRows(page)

    if (rows === 0) {
      await expect(page.getByTestId('pipeline-empty')).toBeVisible()
      await expect(page.getByTestId('pipeline-error')).toHaveCount(0)
    } else {
      await expect(page.getByTestId('pipeline-empty')).toHaveCount(0)
      await expect(page.getByTestId('pipeline-error')).toHaveCount(0)
    }

    // Mislukte refetch met bestaande data: foutbanner + bestaande rijen.
    const title = `Pijplijn fout ${Date.now()}`
    await page.route('**/rest/v1/kk_content_posts*', (route) => route.abort())
    await page.getByTestId('idea-title-input').fill(title)
    await page.getByTestId('idea-save-button').click()

    const error = page.getByTestId('pipeline-error')
    await expect(error).toBeVisible({ timeout: 20_000 })
    await expect(error).toContainText('Kon de pijplijn niet verversen.')
    await expect(page.getByTestId('pipeline-row').filter({ hasText: title })).toBeVisible()
    await expect(page.getByTestId('pipeline-retry')).toBeVisible()

    await page.unroute('**/rest/v1/kk_content_posts*')
    await page.getByTestId('pipeline-retry').click()
    await expect(error).toHaveCount(0, { timeout: 20_000 })

    // Opruimen
    const row = page.getByTestId('pipeline-row').filter({ hasText: title })
    await row.click()
    await page.getByTestId('idea-editor-delete').click()
    const deleteDialog = page.getByRole('dialog').filter({ hasText: 'Idee verwijderen?' })
    await deleteDialog.getByRole('button', { name: 'Verwijderen' }).click()
    await expect(row).toHaveCount(0)
  })

  test('blijft bruikbaar op 375 px en met het toetsenbord', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    if (!(await openContent(page))) return

    await expect(page.getByTestId('content-pipeline')).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)

    const firstRow = page.getByTestId('pipeline-row').first()
    if ((await firstRow.count()) > 0) {
      await firstRow.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByTestId('idea-editor')).toBeVisible()
      await page.keyboard.press('Escape')
    }
  })

  test('kapt een lange titel af en toont de volledige titel in de editor', async ({ page }) => {
    if (!(await openContent(page))) return

    const longTitle = `Lange pijplijntitel ${Date.now()} ${'x'.repeat(180)}`
    await page.getByTestId('idea-title-input').fill(longTitle)
    await page.getByTestId('idea-save-button').click()

    const row = page.getByTestId('pipeline-row').filter({ hasText: longTitle })
    await expect(row).toBeVisible()
    await expect(row.getByTestId('pipeline-row-title')).toHaveClass(/truncate/)

    await row.click()
    await expect(page.getByTestId('idea-editor-title')).toHaveValue(longTitle)
    await page.keyboard.press('Escape')

    await row.click()
    await page.getByTestId('idea-editor-delete').click()
    const deleteDialog = page.getByRole('dialog').filter({ hasText: 'Idee verwijderen?' })
    await deleteDialog.getByRole('button', { name: 'Verwijderen' }).click()
    await expect(row).toHaveCount(0)
  })
})
