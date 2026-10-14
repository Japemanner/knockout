import { test, expect } from '@playwright/test'

// Unit-tests op de pure kalenderlogica van de content-kalender (feature 023).
// Setup conform tests/e2e/column-filters.spec.ts: directe imports, geen
// pagina-interactie. De twaalf gevallen uit specs/023-content-kalender/quickstart.md.

import {
  buildMonthGrid,
  charCount,
  computeSlotOccurrences,
  hookPreview,
  isOverdue,
  matchSlots,
  monthGridRange,
  resolveDropTime,
  slotState,
  validateStatusChange,
  type SlotOccurrence,
} from '@/lib/content/calendar'
import type { ContentPillar, ContentPost, ContentSlot } from '@/types/database.types'

// ---------------------------------------------------------------- fixtures

function makePillar(overrides: Partial<ContentPillar> = {}): ContentPillar {
  return {
    id: 'pillar-1',
    user_id: 'user-1',
    name: 'Praktijk financieel adviseurs',
    audience: null,
    description: null,
    color: 'blue',
    archived: false,
    position: 0,
    created_at: '2026-10-01T12:00:00.000Z',
    updated_at: '2026-10-01T12:00:00.000Z',
    ...overrides,
  }
}

function makeSlot(overrides: Partial<ContentSlot> = {}): ContentSlot {
  return {
    id: 'slot-1',
    user_id: 'user-1',
    pillar_id: 'pillar-1',
    weekday: 3, // woensdag
    post_time: '08:00:00',
    active: true,
    // Amsterdamse datum 2026-10-01: slot geldt vanaf die dag
    created_at: '2026-10-01T12:00:00.000Z',
    updated_at: '2026-10-01T12:00:00.000Z',
    ...overrides,
  }
}

function makePost(overrides: Partial<ContentPost> = {}): ContentPost {
  return {
    id: 'post-1',
    user_id: 'user-1',
    pillar_id: 'pillar-1',
    title: 'Post',
    body: '',
    format: 'tekst',
    status: 'idee',
    planned_date: null,
    planned_time: null,
    source_url: null,
    linkedin_url: null,
    notes: null,
    scheduled_on_linkedin_at: null,
    created_at: '2026-10-10T12:00:00.000Z',
    updated_at: '2026-10-10T12:00:00.000Z',
    ...overrides,
  }
}

/** Alle rasterdata van oktober 2026 (Sep 28 t/m Nov 1) */
function octoberGridDates(): string[] {
  const { weeks } = monthGridRange('2026-10')
  return weeks.flat().map((d) => d.date)
}

const OCTOBER_OCCURRENCES = ['2026-10-07', '2026-10-14', '2026-10-21', '2026-10-28'] // woensdagen

// ---------------------------------------------------------------- 1. maandraster

test.describe('buildMonthGrid', () => {
  test('oktober 2026: hele weken maandag t/m zondag, dagen buiten de maand gemarkeerd', () => {
    const weeks = buildMonthGrid(2026, 10)
    expect((weeks[0] ?? []).map((d) => d.date)).toEqual([
      '2026-09-28', '2026-09-29', '2026-09-30',
      '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
    ])
    expect((weeks[weeks.length - 1] ?? []).map((d) => d.date)).toEqual([
      '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01',
    ])
    expect(weeks.flat().filter((d) => d.inMonth)).toHaveLength(31)
    expect(weeks.flat().filter((d) => !d.inMonth).map((d) => d.date)).toContain('2026-09-28')
  })
})

// ---------------------------------------------------------------- 2. slotvoorkomens

test.describe('computeSlotOccurrences', () => {
  test('woensdagslot: elke woensdag vanaf aanmaakdatum; vóór vandaag gemist, vanaf vandaag open', () => {
    const occ = computeSlotOccurrences(octoberGridDates(), [makePillar()], [makeSlot()])
    expect(occ.map((o) => o.date)).toEqual(OCTOBER_OCCURRENCES)
    expect(occ).toContainEqual({ date: '2026-10-07', pillarId: 'pillar-1', time: '08:00' })

    // slotState: vóór vandaag gemist, vandaag en later open
    expect(slotState('2026-10-07', '2026-10-14')).toBe('gemist')
    expect(slotState('2026-10-14', '2026-10-14')).toBe('open')
    expect(slotState('2026-10-21', '2026-10-14')).toBe('open')
  })

  test('gearchiveerde soort geeft geen voorkomens', () => {
    const occ = computeSlotOccurrences(octoberGridDates(), [makePillar({ archived: true })], [makeSlot()])
    expect(occ).toEqual([])
  })

  test('inactief slot geeft geen voorkomens', () => {
    const occ = computeSlotOccurrences(octoberGridDates(), [makePillar()], [makeSlot({ active: false })])
    expect(occ).toEqual([])
  })

  test('slot aangemaakt op 2026-10-10 geeft geen voorkomens vóór die datum', () => {
    // Amsterdamse datum van 2026-10-10T01:00:00Z is 2026-10-10 (03:00 CEST)
    const slot = makeSlot({ created_at: '2026-10-10T01:00:00.000Z' })
    const occ = computeSlotOccurrences(octoberGridDates(), [makePillar()], [slot])
    expect(occ.map((o) => o.date)).toEqual(['2026-10-14', '2026-10-21', '2026-10-28'])
  })
})

// ---------------------------------------------------------------- 3. slotmatching

test.describe('matchSlots', () => {
  const occurrences = () => computeSlotOccurrences(octoberGridDates(), [makePillar()], [makeSlot()])

  test('post van de soort op woensdag vult het woensdagslot', () => {
    const unfilled = matchSlots(occurrences(), [makePost({ planned_date: '2026-10-14', planned_time: '08:00:00' })])
    expect(unfilled.map((o) => o.date)).not.toContain('2026-10-14')
    expect(unfilled.map((o) => o.date)).toEqual(['2026-10-07', '2026-10-21', '2026-10-28'])
  })

  test('post verplaatst naar donderdag in dezelfde week houdt het woensdagslot gevuld', () => {
    const unfilled = matchSlots(occurrences(), [makePost({ planned_date: '2026-10-08', planned_time: '09:00:00' })])
    expect(unfilled.map((o) => o.date)).not.toContain('2026-10-07')
  })

  test('post in de volgende week laat het woensdagslot deze week open', () => {
    const unfilled = matchSlots(occurrences(), [makePost({ planned_date: '2026-10-14', planned_time: '08:00:00' })])
    expect(unfilled.map((o) => o.date)).toContain('2026-10-07')
    expect(unfilled.map((o) => o.date)).not.toContain('2026-10-14')
  })

  test('slots di en do met één post op di: do blijft open', () => {
    const slots = [makeSlot({ weekday: 2, id: 'slot-di' }), makeSlot({ weekday: 4, id: 'slot-do' })]
    const occ = computeSlotOccurrences(octoberGridDates(), [makePillar()], slots)
    const unfilled = matchSlots(occ, [makePost({ planned_date: '2026-10-06', planned_time: '08:00:00' })])
    const unfilledDates = unfilled.map((o) => o.date)
    expect(unfilledDates).not.toContain('2026-10-06')
    expect(unfilledDates).toContain('2026-10-08')
  })

  test('post zonder soort vult geen slot; extra posts boven het aantal slots geven geen fout', () => {
    const noPillar = makePost({ pillar_id: null, planned_date: '2026-10-14', planned_time: '08:00:00' })
    const unfilled = matchSlots(occurrences(), [noPillar])
    expect(unfilled.map((o) => o.date)).toEqual(OCTOBER_OCCURRENCES)

    const twoInOneWeek = [
      makePost({ id: 'p-a', planned_date: '2026-10-07', planned_time: '08:00:00' }),
      makePost({ id: 'p-b', planned_date: '2026-10-08', planned_time: '09:00:00' }),
    ]
    const unfilled2 = matchSlots(occurrences(), twoInOneWeek)
    expect(unfilled2.map((o) => o.date)).not.toContain('2026-10-07')
    expect(unfilled2).toHaveLength(3)
  })

  test('week over de maandgrens (di 29 sep + do 1 okt 2026) matcht als één week', () => {
    // Dinsdagslot vanaf september; post op donderdag 1 oktober vult het
    // slot van dinsdag 29 september — zelfde ISO-week 40.
    const slot = makeSlot({ weekday: 2, created_at: '2026-09-01T12:00:00.000Z' })
    const occ = computeSlotOccurrences(octoberGridDates(), [makePillar()], [slot])
    expect(occ.map((o) => o.date)).toContain('2026-09-29')

    const unfilled = matchSlots(occ, [makePost({ planned_date: '2026-10-01', planned_time: '08:00:00' })])
    expect(unfilled.map((o) => o.date)).not.toContain('2026-09-29')
    expect(unfilled.map((o) => o.date)).toContain('2026-10-06')
  })
})

// ---------------------------------------------------------------- 4. verlopen

test.describe('isOverdue', () => {
  test('datum vóór vandaag met status idee/concept/klaar is verlopen; gepland/live niet', () => {
    const today = '2026-10-14'
    expect(isOverdue({ planned_date: '2026-10-13', status: 'idee' }, today)).toBe(true)
    expect(isOverdue({ planned_date: '2026-10-13', status: 'concept' }, today)).toBe(true)
    expect(isOverdue({ planned_date: '2026-10-13', status: 'klaar' }, today)).toBe(true)
    expect(isOverdue({ planned_date: '2026-10-13', status: 'gepland' }, today)).toBe(false)
    expect(isOverdue({ planned_date: '2026-10-13', status: 'live' }, today)).toBe(false)
    expect(isOverdue({ planned_date: '2026-10-14', status: 'idee' }, today)).toBe(false)
    expect(isOverdue({ planned_date: null, status: 'idee' }, today)).toBe(false)
  })
})

// ---------------------------------------------------------------- 5. posttekst

test.describe('charCount en hookPreview', () => {
  test('emoji telt als één teken', () => {
    expect(charCount('👍')).toBe(1)
    expect(charCount('a👍b')).toBe(3)
    expect(charCount('')).toBe(0)
  })

  test('hookPreview met 2 regeleindes: niet afgekapt', () => {
    const text = 'Regel een\nRegel twee\nRegel drie'
    expect(hookPreview(text)).toEqual({ preview: text, truncated: false })
  })

  test('hookPreview met derde regeleinde: afgekapt vóór die regeleinde', () => {
    expect(hookPreview('r1\nr2\nr3\nr4')).toEqual({ preview: 'r1\nr2\nr3', truncated: true })
  })

  test('hookPreview met lange eerste regel: afgekapt op 210 tekens', () => {
    const result = hookPreview('a'.repeat(250))
    expect(result.preview).toHaveLength(210)
    expect(result.truncated).toBe(true)
  })

  test('hookPreview van exact 210 tekens: niet afgekapt', () => {
    const result = hookPreview('a'.repeat(210))
    expect(result.truncated).toBe(false)
  })
})

// ---------------------------------------------------------------- 6. statusregels

test.describe('validateStatusChange', () => {
  test('3.001 tekens: klaar geweigerd', () => {
    const post = { body: 'a'.repeat(3001), planned_date: null, planned_time: null, linkedin_url: null, status: 'idee' as const }
    expect(validateStatusChange(post, 'concept').ok).toBe(true)
    expect(validateStatusChange(post, 'klaar').ok).toBe(false)
  })

  test('lege tekst: klaar, gepland en live geweigerd', () => {
    const post = { body: '   ', planned_date: '2026-10-14', planned_time: '08:00', linkedin_url: null, status: 'idee' as const }
    expect(validateStatusChange(post, 'klaar').ok).toBe(false)
    expect(validateStatusChange(post, 'gepland').ok).toBe(false)
    expect(validateStatusChange(post, 'live').ok).toBe(false)
  })

  test('gepland zonder datum en tijd geweigerd; met datum en tijd toegestaan', () => {
    const base = { body: 'Tekst', linkedin_url: null, status: 'concept' as const }
    expect(validateStatusChange({ ...base, planned_date: null, planned_time: null }, 'gepland').ok).toBe(false)
    expect(validateStatusChange({ ...base, planned_date: '2026-10-14', planned_time: null }, 'gepland').ok).toBe(false)
    expect(validateStatusChange({ ...base, planned_date: null, planned_time: '08:00' }, 'gepland').ok).toBe(false)
    expect(validateStatusChange({ ...base, planned_date: '2026-10-14', planned_time: '08:00' }, 'gepland').ok).toBe(true)
  })

  test('live zonder URL is toegestaan', () => {
    const post = { body: 'Tekst', planned_date: '2026-10-14', planned_time: '08:00', linkedin_url: null, status: 'klaar' as const }
    expect(validateStatusChange(post, 'live').ok).toBe(true)
  })

  test('ongeldige LinkedIn-URL geweigerd; geldige toegestaan', () => {
    const base = { body: 'Tekst', planned_date: '2026-10-14', planned_time: '08:00', status: 'klaar' as const }
    expect(validateStatusChange({ ...base, linkedin_url: 'https://linkedin.com/feed/update/123' }, 'live').ok).toBe(false)
    expect(validateStatusChange({ ...base, linkedin_url: 'http://www.linkedin.com/feed' }, 'live').ok).toBe(false)
    expect(validateStatusChange({ ...base, linkedin_url: 'https://www.linkedin.com/feed/update/123' }, 'live').ok).toBe(true)
  })
})

// ---------------------------------------------------------------- 7. slepen

test.describe('resolveDropTime', () => {
  const openSlots: SlotOccurrence[] = [{ date: '2026-10-08', pillarId: 'pillar-1', time: '09:30' }]

  test('leeg slot van de soort op de doeldag levert de slottijd', () => {
    expect(resolveDropTime({ pillar_id: 'pillar-1', planned_time: null }, '2026-10-08', openSlots)).toBe('09:30')
  })

  test('geen passend slot: bestaande tijd van de post blijft', () => {
    expect(resolveDropTime({ pillar_id: 'pillar-1', planned_time: '14:15:00' }, '2026-10-09', openSlots)).toBe('14:15')
  })

  test('geen passend slot en geen bestaande tijd: 08:00', () => {
    expect(resolveDropTime({ pillar_id: 'pillar-1', planned_time: null }, '2026-10-09', openSlots)).toBe('08:00')
    expect(resolveDropTime({ pillar_id: null, planned_time: null }, '2026-10-08', openSlots)).toBe('08:00')
  })
})