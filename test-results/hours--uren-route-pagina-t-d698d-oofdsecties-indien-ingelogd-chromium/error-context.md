# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hours.spec.ts >> /uren route >> pagina toont de drie hoofdsecties indien ingelogd
- Location: tests\e2e\hours.spec.ts:9:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/uren
Call log:
  - navigating to "http://localhost:3000/uren", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | // Smoke test voor de /uren route — verifieert page-structuur en hoofdsecties.
  4  | // Vereist een geauthenticeerde sessie (dev server + handmatige login, of storageState setup).
  5  | // Zonder login herleidt de middleware naar /login; de test gaat er dan van uit dat de
  6  | // redirect zichtbaar is en slaat de structuurcontroles over.
  7  | 
  8  | test.describe('/uren route', () => {
  9  |   test('pagina toont de drie hoofdsecties indien ingelogd', async ({ page }) => {
> 10 |     await page.goto('/uren')
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/uren
  11 | 
  12 |     // Als we naar /login zijn herleid, skip de structuurcontroles
  13 |     const url = page.url()
  14 |     if (url.includes('/login')) {
  15 |       test.skip(true, 'Niet ingelogd — login vereist voor /uren structuurcontrole')
  16 |       return
  17 |     }
  18 | 
  19 |     // Sectie 1: Dashboard met voortgang per opdrachtgever
  20 |     await expect(page.getByText('Urenregistratie')).toBeVisible()
  21 | 
  22 |     // Sectie 2: Tijdschrijf-formulier
  23 |     await expect(page.getByText('Uren schrijven')).toBeVisible()
  24 | 
  25 |     // Sectie 3: Historie met filters
  26 |     await expect(page.getByText('Historie')).toBeVisible()
  27 | 
  28 |     // Navigatie-item 'Uren' in sidebar
  29 |     const navLink = page.getByRole('link', { name: 'Uren' })
  30 |     await expect(navLink).toBeVisible()
  31 |   })
  32 | 
  33 |   test('opdrachtgever-beheer dialog opent en sluit', async ({ page }) => {
  34 |     await page.goto('/uren')
  35 | 
  36 |     if (page.url().includes('/login')) {
  37 |       test.skip(true, 'Niet ingelogd — login vereist')
  38 |       return
  39 |     }
  40 | 
  41 |     const manageButton = page.getByRole('button', { name: /Beheer opdrachtgevers/ })
  42 |     await expect(manageButton).toBeVisible()
  43 |     await manageButton.click()
  44 | 
  45 |     // Dialog titel zichtbaar
  46 |     await expect(page.getByText('Opdrachtgevers beheren')).toBeVisible()
  47 |     await expect(page.getByText('Nieuwe opdrachtgever')).toBeVisible()
  48 | 
  49 |     // Sluit via de Sluiten-knop in de footer
  50 |     const closeButton = page.getByRole('button', { name: 'Sluiten' })
  51 |     await closeButton.click()
  52 |   })
  53 | 
  54 |   test('formulier toont foutmelding bij uren <= 0 of ongeldig', async ({ page }) => {
  55 |     await page.goto('/uren')
  56 | 
  57 |     if (page.url().includes('/login')) {
  58 |       test.skip(true, 'Niet ingelogd — login vereist')
  59 |       return
  60 |     }
  61 | 
  62 |     // Vul uren met ongeldige waarde en probeer toe te voegen
  63 |     const hoursInput = page.locator('#hours-amount')
  64 |     if (await hoursInput.count() === 0) {
  65 |       // Geen actieve opdrachtgevers — formulier toont placeholder-kaart
  66 |       test.skip(true, 'Geen actieve opdrachtgevers — formulier niet beschikbaar')
  67 |       return
  68 |     }
  69 | 
  70 |     await hoursInput.fill('abc')
  71 |     const submitButton = page.getByRole('button', { name: /Toevoegen/ })
  72 |     await submitButton.click()
  73 | 
  74 |     // Verwacht een foutmelding of toast
  75 |     await expect(page.locator('text=/Ongeldige decimale waarde|groter dan 0/')).toBeVisible({ timeout: 3000 })
  76 |   })
  77 | 
  78 |   test('decimal-invoer accepteert komma in uren-veld', async ({ page }) => {
  79 |     await page.goto('/uren')
  80 | 
  81 |     if (page.url().includes('/login')) {
  82 |       test.skip(true, 'Niet ingelogd — login vereist')
  83 |       return
  84 |     }
  85 | 
  86 |     const hoursInput = page.locator('#hours-amount')
  87 |     if (await hoursInput.count() === 0) {
  88 |       test.skip(true, 'Geen actieve opdrachtgevers — formulier niet beschikbaar')
  89 |       return
  90 |     }
  91 | 
  92 |     // Komma-invoer mag niet direct een native browser-validatie fout geven
  93 |     await hoursInput.fill('1,5')
  94 |     await expect(hoursInput).toHaveValue('1,5')
  95 |   })
  96 | })
```