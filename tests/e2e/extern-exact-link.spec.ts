import { test, expect } from '@playwright/test'

// E2E voor spec 020-extern-exact-link: Exact-link onder Extern-header in sidebar.
// Test skipt automatisch als er geen login-sessie is (sidebar is alleen zichtbaar ingelogd).

function skipIfNotLoggedIn(page: import('@playwright/test').Page) {
  if (page.url().includes('/login')) {
    test.skip(true, 'Niet ingelogd — login vereist')
    return true
  }
  return false
}

test.describe('Extern — Exact link', () => {
  test('Exact-link is zichtbaar onder de Extern-header in de sidebar', async ({ page }) => {
    await page.goto('/boards')
    if (skipIfNotLoggedIn(page)) return

    // Extern-header bestaat
    await expect(page.getByText('Extern', { exact: true })).toBeVisible()

    // Exact-link bestaat binnen de sidebar
    const exactLink = page.locator('aside a[href="https://portaal.hrsg.nl/"]')
    await expect(exactLink).toBeVisible()
    await expect(exactLink).toContainText('Exact')
  })

  test('Exact-link opent in een nieuw tabblad met de juiste URL', async ({ page }) => {
    await page.goto('/boards')
    if (skipIfNotLoggedIn(page)) return

    const exactLink = page.locator('aside a[href="https://portaal.hrsg.nl/"]')
    await expect(exactLink).toBeVisible()

    // target="_blank" en rel="noopener noreferrer" conform bestaande externe links
    expect(await exactLink.getAttribute('target')).toBe('_blank')
    expect(await exactLink.getAttribute('rel')).toContain('noopener')

    // Klik opent nieuw tabblad
    const popupPromise = page.waitForEvent('popup')
    await exactLink.click()
    const popup = await popupPromise
    expect(popup.url()).toBe('https://portaal.hrsg.nl/')
  })

  test('Exact-link is ook zichtbaar in de mobiele sidebar-drawer', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/boards')
    if (skipIfNotLoggedIn(page)) return

    // Mobiel: aside is verborgen, open de drawer via menu-knop
    await page.getByRole('button').first().click()
    const exactLink = page.locator('a[href="https://portaal.hrsg.nl/"]')
    await expect(exactLink).toBeVisible()
    await expect(exactLink).toContainText('Exact')
  })
})