import { test, expect } from '@playwright/test'

// Unit-tests op de pure ideeënlogica van feature 026. Setup conform
// tests/e2e/column-filters.spec.ts: directe imports, geen pagina-interactie.

import {
  buildPostWritePayload,
  charCount,
  countIdeasByPillar,
  formatIdeaDate,
  hookPreview,
  validateStatusChange,
  type PostWritePatch,
} from '@/lib/content/ideas'
import type { ContentPillar, ContentPost } from '@/types/database.types'

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

function makePost(overrides: Partial<ContentPost> = {}): ContentPost {
  return {
    id: 'post-1',
    user_id: 'user-1',
    pillar_id: 'pillar-1',
    title: 'Idee',
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

// ---------------------------------------------------------------- tellingen

test.describe('countIdeasByPillar', () => {
  test('telt per soort, houdt 0-soorten en de groep "Geen soort" bij', () => {
    const pillars = [
      makePillar({ id: 'a', name: 'A', position: 0 }),
      makePillar({ id: 'b', name: 'B', position: 1 }),
      makePillar({ id: 'c', name: 'C', position: 2 }),
    ]
    const posts = [
      makePost({ id: 'p1', pillar_id: 'a' }),
      makePost({ id: 'p2', pillar_id: 'a' }),
      makePost({ id: 'p3', pillar_id: 'b' }),
      makePost({ id: 'p4', pillar_id: null }),
      makePost({ id: 'p5', pillar_id: 'onbekend' }),
    ]

    const counts = countIdeasByPillar(posts, pillars)

    expect(counts.total).toBe(5)
    expect(counts.unassigned).toBe(2)
    expect(counts.rows.map((row) => [row.name, row.count])).toEqual([
      ['A', 2],
      ['B', 1],
      ['C', 0],
      ['Geen soort', 2],
    ])
  })

  test('voegt "Geen soort" niet toe als alle ideeën een soort hebben', () => {
    const counts = countIdeasByPillar(
      [makePost({ pillar_id: 'a' }), makePost({ id: 'p2', pillar_id: 'a' })],
      [makePillar({ id: 'a', name: 'A' })],
    )

    expect(counts.unassigned).toBe(0)
    expect(counts.rows).toHaveLength(1)
    expect(counts.rows[0]).toMatchObject({ name: 'A', count: 2, archived: false })
  })

  test('neemt gearchiveerde soorten mee met markering en aantal', () => {
    const counts = countIdeasByPillar(
      [makePost({ pillar_id: 'a' })],
      [makePillar({ id: 'a', name: 'A', archived: true })],
    )

    expect(counts.rows[0]).toMatchObject({ name: 'A', archived: true, count: 1 })
  })

  test('lege lijst met alleen soorten geeft 0-tellingen en totaal 0', () => {
    const counts = countIdeasByPillar([], [makePillar({ id: 'a', name: 'A' })])
    expect(counts.total).toBe(0)
    expect(counts.unassigned).toBe(0)
    expect(counts.rows).toEqual([
      { pillarId: 'a', name: 'A', color: 'blue', archived: false, count: 0 },
    ])
  })
})

// ---------------------------------------------------------------- status

test.describe('validateStatusChange', () => {
  test('Idee en Concept mogen altijd, ook met lege tekst', () => {
    expect(validateStatusChange({ body: '', status: 'idee' }, 'idee').ok).toBe(true)
    expect(validateStatusChange({ body: '   ', status: 'concept' }, 'concept').ok).toBe(true)
  })

  test('Klaar, Gepland en Live vereisen een niet-lege tekst', () => {
    for (const status of ['klaar', 'gepland', 'live'] as const) {
      expect(validateStatusChange({ body: '   ', status: 'idee' }, status).ok).toBe(false)
    }
  })

  test('Klaar, Gepland en Live weigeren meer dan 3.000 tekens', () => {
    const post = { body: 'a'.repeat(3001), status: 'idee' as const }
    expect(validateStatusChange(post, 'klaar').ok).toBe(false)
    expect(validateStatusChange(post, 'gepland').ok).toBe(false)
    expect(validateStatusChange(post, 'live').ok).toBe(false)
  })

  test('Gepland en Live zonder datum/tijd zijn toegestaan (velden bestaan niet meer)', () => {
    const post = { body: 'Tekst', status: 'concept' as const }
    expect(validateStatusChange(post, 'gepland').ok).toBe(true)
    expect(validateStatusChange(post, 'live').ok).toBe(true)
  })

  test('exact 3.000 tekens is toegestaan', () => {
    expect(validateStatusChange({ body: 'a'.repeat(3000), status: 'idee' }, 'klaar').ok).toBe(true)
  })
})

// ---------------------------------------------------------------- whitelist

test.describe('buildPostWritePayload', () => {
  test('laat alleen de toegestane velden door en trimt tekst', () => {
    const payload = buildPostWritePayload({
      title: '  Mijn idee  ',
      pillar_id: 'pillar-1',
      body: 'Tekst',
      status: 'concept',
      source_url: '  https://example.com  ',
      notes: '  Notitie  ',
    })

    expect(payload).toEqual({
      title: 'Mijn idee',
      pillar_id: 'pillar-1',
      body: 'Tekst',
      status: 'concept',
      source_url: 'https://example.com',
      notes: 'Notitie',
    })
  })

  test('lege bron-URL en notities worden NULL; lege soort wordt NULL', () => {
    const payload = buildPostWritePayload({
      pillar_id: '',
      source_url: '   ',
      notes: '   ',
    })

    expect(payload).toEqual({ pillar_id: null, source_url: null, notes: null })
  })

  test('legacy-keys worden genegeerd, ook via een cast', () => {
    const patch = {
      title: 'Alleen dit',
      format: 'video',
      planned_date: '2026-11-04',
      planned_time: '08:00',
      linkedin_url: 'https://www.linkedin.com/feed/update/1',
      scheduled_on_linkedin_at: '2026-11-01T10:00:00.000Z',
    } as unknown as PostWritePatch

    const payload = buildPostWritePayload(patch)

    expect(payload).toEqual({ title: 'Alleen dit' })
    expect(payload).not.toHaveProperty('format')
    expect(payload).not.toHaveProperty('planned_date')
    expect(payload).not.toHaveProperty('planned_time')
    expect(payload).not.toHaveProperty('linkedin_url')
    expect(payload).not.toHaveProperty('scheduled_on_linkedin_at')
  })

  test('een lege patch levert een lege payload', () => {
    expect(buildPostWritePayload({})).toEqual({})
  })
})

// ---------------------------------------------------------------- tekst

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

// ---------------------------------------------------------------- datum

test.describe('formatIdeaDate', () => {
  test('gebruikt vaste Amsterdamse tijd (wintertijd)', () => {
    // 23:30 UTC = 00:30 op 4 november in Amsterdam (UTC+1)
    expect(formatIdeaDate('2026-11-03T23:30:00.000Z')).toMatch(/4 nov/)
  })

  test('gebruikt vaste Amsterdamse tijd (zomertijd)', () => {
    // 22:30 UTC = 00:30 op 2 juli in Amsterdam (UTC+2)
    expect(formatIdeaDate('2026-07-01T22:30:00.000Z')).toMatch(/2 jul/)
  })

  test('ongeldige datum geeft een lege string', () => {
    expect(formatIdeaDate('geen-datum')).toBe('')
  })
})
