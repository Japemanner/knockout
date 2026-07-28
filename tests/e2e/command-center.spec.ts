import { test, expect } from '@playwright/test'

// Smoke + regression test voor het command center — top 3 prioriteiten.
// Vereist een geauthenticeerde sessie (dev server + handmatige login, of storageState setup).
// Zonder login herleidt de middleware naar /login; de test skip dan.

test.describe('/command-center route', () => {
  test('top 3 prioriteiten sectie is zichtbaar met drie velden', async ({ page }) => {
    await page.goto('/command-center')

    if (page.url().includes('/login')) {
      test.skip(true, 'Niet ingelogd — login vereist')
      return
    }

    // Welkomstbericht
    await expect(page.getByText(/Welkom terug/)).toBeVisible()

    // Top 3 prioriteiten sectie
    await expect(page.getByText('Top 3 prioriteiten')).toBeVisible()

    // Drie invoervelden (genummerd 1, 2, 3)
    await expect(page.getByLabel('1')).toBeVisible()
    await expect(page.getByLabel('2')).toBeVisible()
    await expect(page.getByLabel('3')).toBeVisible()

    // Opslaan-knop bestaat
    await expect(page.getByRole('button', { name: /Opslaan/ })).toBeVisible()
  })

  test('prioriteiten invullen en opslaan persisteert na herladen', async ({ page }) => {
    await page.goto('/command-center')

    if (page.url().includes('/login')) {
      test.skip(true, 'Niet ingelogd — login vereist')
      return
    }

    const testText = `Test-prioriteit ${Date.now()}`

    // Vul eerste veld in
    const input1 = page.locator('input').first()
    await input1.fill(testText)

    // Sla op
    const saveButton = page.getByRole('button', { name: /Opslaan/ })
    await saveButton.click()

    // Wacht op bevestiging
    await expect(page.getByText('Prioriteiten opgeslagen')).toBeVisible({ timeout: 5000 })

    // Herlaad en controleer dat de tekst behouden is
    await page.reload()
    await expect(page.getByText('Top 3 prioriteiten')).toBeVisible()
    const input1After = page.locator('input').first()
    await expect(input1After).toHaveValue(testText)
  })
})