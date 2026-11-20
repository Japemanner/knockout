import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

// E2E voor /km. Zonder geauthenticeerde sessie herleidt de middleware naar
// /login; de tests slaan dan over (zelfde patroon als hours.spec.ts).
// Serial: de tests delen dezelfde database en verifiëren dashboardtotalen.

test.describe.configure({ mode: 'serial' })

function uniquePurpose(label: string): string {
  return `E2E ${label} ${Date.now()}-${Math.floor(Math.random() * 10_000)}`
}

function parseEuro(text: string): number {
  const normalized = text.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  return Number(normalized)
}

async function openKm(page: Page): Promise<boolean> {
  // Privacy is persistent; reset vóór elke navigatie zodat bedragen leesbaar zijn.
  await page.addInitScript(() => {
    try {
      localStorage.removeItem('privacy-store')
    } catch {
      // localStorage kan in een niet-browsercontext ontbreken
    }
  })
  await page.goto('/km')
  if (page.url().includes('/login')) {
    test.skip(true, 'Niet ingelogd — login vereist voor /km')
    return false
  }

  await expect(page.getByRole('heading', { name: 'Kilometerregistratie' })).toBeVisible()
  await expect(page.getByTestId('stat-openstaand')).toBeVisible()
  return true
}

async function createTrip(
  page: Page,
  options: {
    purpose: string
    from?: string
    to?: string
    distance?: string
    retour?: boolean
    clientValue?: string
  },
): Promise<void> {
  await page.locator('#trip-from').fill(options.from ?? 'Amsterdam E2E')
  await page.locator('#trip-to').fill(options.to ?? 'Utrecht E2E')
  await page.locator('#trip-purpose').fill(options.purpose)
  await page.locator('#trip-distance').fill(options.distance ?? '10,5')
  await page.locator('#trip-client').selectOption(options.clientValue ?? '')

  const retour = page.getByRole('checkbox', { name: /Retour/ })
  if (options.retour) await retour.check()
  else await retour.uncheck()

  await page.getByRole('button', { name: /Toevoegen/ }).click()
  await expect(page.getByText('Opgeslagen', { exact: true })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: options.purpose })).toBeVisible()
}

async function deleteTrip(page: Page, purpose: string): Promise<void> {
  const row = page.getByRole('row').filter({ hasText: purpose })
  if ((await row.count()) === 0) return
  await row.getByRole('button', { name: 'Verwijderen' }).click()
  await row.getByRole('button', { name: 'Ja' }).click()
  await expect(row).toHaveCount(0)
}

async function readOpenAmount(page: Page): Promise<number> {
  const text = await page.getByTestId('stat-openstaand').innerText()
  return Math.round(parseEuro(text) * 100) / 100
}

test.describe('/km route', () => {
  test('navigatie-item en alle secties zijn zichtbaar', async ({ page }) => {
    await page.goto('/km')
    if (page.url().includes('/login')) {
      test.skip(true, 'Niet ingelogd — login vereist')
      return
    }

    await expect(page.getByRole('link', { name: 'Kilometers' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Kilometerregistratie' })).toBeVisible()
    await expect(page.getByText('Rit vastleggen')).toBeVisible()
    await expect(page.getByText('Recente routes')).toBeVisible()
    await expect(page.getByText('Historie')).toBeVisible()
    await expect(page.getByTestId('stat-month-km')).toBeVisible()
    await expect(page.getByTestId('stat-openstaand')).toBeVisible()
  })

  test('rit aanmaken is na reload zichtbaar en retour verdubbelt de km', async ({ page }) => {
    if (!(await openKm(page))) return
    const purpose = uniquePurpose('retour')

    try {
      await createTrip(page, { purpose, distance: '10,5', retour: true })

      // 10,5 enkele afstand × 2 = 21,0 km; tarief 0,25 → € 5,25.
      const row = page.getByRole('row').filter({ hasText: purpose })
      await expect(row).toContainText('21,0')
      await expect(row).toContainText(/€\s*5,25/)

      await page.reload()
      await expect(page.getByRole('row').filter({ hasText: purpose })).toBeVisible()
      await expect(page.getByRole('row').filter({ hasText: purpose })).toContainText('21,0')
    } finally {
      await deleteTrip(page, purpose)
    }
  })

  test('bewerken persisteert na reload', async ({ page }) => {
    if (!(await openKm(page))) return
    const purpose = uniquePurpose('edit')
    const updatedPurpose = `${purpose} gewijzigd`

    try {
      await createTrip(page, { purpose })

      const row = page.getByRole('row').filter({ hasText: purpose })
      await row.getByRole('button', { name: 'Bewerken' }).click()
      await expect(page.getByText('Rit bewerken')).toBeVisible()

      await page.locator('#edit-trip-purpose').fill(updatedPurpose)
      await page.locator('#edit-trip-distance').fill('12,5')
      await page.getByRole('button', { name: 'Opslaan' }).click()
      await expect(page.getByText('Rit bewerken')).toBeHidden()

      await page.reload()
      const updatedRow = page.getByRole('row').filter({ hasText: updatedPurpose })
      await expect(updatedRow).toBeVisible()
      await expect(updatedRow).toContainText('12,5')
    } finally {
      await deleteTrip(page, purpose)
      await deleteTrip(page, updatedPurpose)
    }
  })

  test('markeer als uitbetaald laat het openstaande bedrag dalen', async ({ page }) => {
    if (!(await openKm(page))) return
    const purpose = uniquePurpose('uitbetalen')
    const before = await readOpenAmount(page)

    try {
      await createTrip(page, { purpose, distance: '10' })

      // 10 km × € 0,25 = € 2,50 openstaand erbij.
      await expect.poll(() => readOpenAmount(page), { timeout: 10_000 }).toBeCloseTo(before + 2.5, 1)

      const row = page.getByRole('row').filter({ hasText: purpose })
      await row.getByRole('checkbox').check()
      await page.getByRole('button', { name: /Markeer als uitbetaald/ }).click()

      await expect(row.getByText(/Uitbetaald/)).toBeVisible()
      await expect.poll(() => readOpenAmount(page), { timeout: 10_000 }).toBeCloseTo(before, 1)
    } finally {
      await deleteTrip(page, purpose)
    }
  })

  test('filter op opdrachtgever toont alleen de ritten van die opdrachtgever', async ({ page }) => {
    if (!(await openKm(page))) return

    const clientOptions = page.locator('#trip-client option')
    if ((await clientOptions.count()) < 2) {
      test.skip(true, 'Geen opdrachtgevers — filter niet testbaar')
      return
    }

    const clientValue = (await clientOptions.nth(1).getAttribute('value')) ?? ''
    const withClientPurpose = uniquePurpose('filter-client')
    const withoutClientPurpose = uniquePurpose('filter-geen')

    try {
      await createTrip(page, { purpose: withClientPurpose, clientValue })
      await createTrip(page, { purpose: withoutClientPurpose, clientValue: '' })

      await page.locator('#trip-filter-client').selectOption(clientValue)
      await expect(page.getByRole('row').filter({ hasText: withClientPurpose })).toBeVisible()
      await expect(page.getByRole('row').filter({ hasText: withoutClientPurpose })).toHaveCount(0)

      await page.locator('#trip-filter-client').selectOption('')
      await expect(page.getByRole('row').filter({ hasText: withoutClientPurpose })).toBeVisible()
    } finally {
      await page.locator('#trip-filter-client').selectOption('')
      await deleteTrip(page, withClientPurpose)
      await deleteTrip(page, withoutClientPurpose)
    }
  })

  test('CSV-download bevat de gefilterde rit met BOM en puntkomma-scheiding', async ({ page }) => {
    if (!(await openKm(page))) return
    const purpose = uniquePurpose('csv; met puntkomma')

    try {
      await createTrip(page, { purpose, from: 'Den Haag', to: 'Rotterdam', distance: '8,4' })

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: /Exporteer CSV/ }).click(),
      ])

      expect(download.suggestedFilename()).toMatch(/^kilometers-.*\.csv$/)
      const downloadPath = await download.path()
      expect(downloadPath).not.toBeNull()
      const content = await readFile(downloadPath as string, 'utf8')

      expect(content.startsWith('\uFEFF')).toBe(true)
      expect(content).toContain(
        'Datum;Opdrachtgever;Van;Naar;Zakelijk doel;Kilometers;Retour;Tarief;Bedrag;Uitbetaald op',
      )
      expect(content).toContain(`"${purpose}"`)
      expect(content).toContain('Den Haag;Rotterdam')
      expect(content).toContain(';8,4;Nee;0,25;2,10;')
    } finally {
      await deleteTrip(page, purpose)
    }
  })
})
