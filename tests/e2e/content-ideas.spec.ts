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
