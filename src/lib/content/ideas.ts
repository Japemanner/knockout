// Pure logica voor de content-ideeënfeature (026). Geen React, geen Supabase;
// volledig unit-testbaar in tests/e2e/content-ideas-logic.spec.ts.
// De kalender-, slot- en sleepfuncties uit feature 023 zijn hier bewust niet
// overgenomen: de content-UI werkt alleen nog met ideeën en tellingen.

import type { ContentPillar, ContentPost, ContentStatus, PillarColor } from '@/types/database.types'

export const MAX_BODY_LENGTH = 3000
export const HOOK_CHAR_LIMIT = 210

// ============================================================
// TEKST
// ============================================================

/** Tekentelling die emoji en andere surrogate pairs als één teken telt */
export function charCount(text: string): number {
  return Array.from(text).length
}

export interface HookPreview {
  preview: string
  truncated: boolean
}

/**
 * Hook-preview: de tekst tot de eerste van (a) het derde regeleinde of
 * (b) 210 tekens (Array.from, dus emoji telt als één). De UI toont "…meer".
 */
export function hookPreview(text: string): HookPreview {
  const chars = Array.from(text)
  let thirdNewline = -1
  let newlines = 0
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === '\n' && ++newlines === 3) {
      thirdNewline = i
      break
    }
  }

  let end = chars.length
  if (thirdNewline !== -1) end = Math.min(end, thirdNewline)
  if (chars.length > HOOK_CHAR_LIMIT) end = Math.min(end, HOOK_CHAR_LIMIT)

  return {
    preview: chars.slice(0, end).join(''),
    truncated: end < chars.length,
  }
}

// ============================================================
// STATUSREGELS
// ============================================================

export interface StatusCheckPost {
  body: string
  status: ContentStatus
}

export type StatusChangeResult = { ok: true } | { ok: false; reason: string }

/**
 * Statusregels voor de ideeënbank:
 * - Klaar, Gepland en Live vereisen een niet-lege tekst van maximaal 3.000 tekens.
 * - Datum, tijd en LinkedIn-URL zijn geen voorwaarden meer; die velden bestaan
 *   niet meer in de content-UI.
 * Dezelfde functie draait in de editor en server-side in src/actions/content.ts.
 */
export function validateStatusChange(post: StatusCheckPost, nextStatus: ContentStatus): StatusChangeResult {
  if (nextStatus === 'klaar' || nextStatus === 'gepland' || nextStatus === 'live') {
    if (!post.body.trim()) {
      return { ok: false, reason: 'Vul eerst een idee-tekst in voordat je deze status kiest.' }
    }
    if (charCount(post.body) > MAX_BODY_LENGTH) {
      return { ok: false, reason: 'De tekst is te lang (maximaal 3.000 tekens).' }
    }
  }

  return { ok: true }
}

export function statusLabel(status: ContentStatus): string {
  switch (status) {
    case 'idee': return 'Idee'
    case 'concept': return 'Concept'
    case 'klaar': return 'Klaar'
    case 'gepland': return 'Gepland'
    case 'live': return 'Live'
  }
}

// ============================================================
// SCHRIJF-WHITELIST
// ============================================================

export type PostWritePatch = Partial<
  Pick<ContentPost, 'title' | 'pillar_id' | 'body' | 'status' | 'source_url' | 'notes'>
>

/**
 * De enige plek die bepaalt welke keys naar kk_content_posts mogen. Legacy-
 * kolommen (format, planned_date, planned_time, linkedin_url,
 * scheduled_on_linkedin_at) kunnen hier nooit in terechtkomen, ook niet als
 * een aanroeper ze via een cast meestuurt.
 */
export function buildPostWritePayload(patch: PostWritePatch): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  if (patch.title !== undefined) payload.title = patch.title.trim()
  if (patch.pillar_id !== undefined) payload.pillar_id = patch.pillar_id || null
  if (patch.body !== undefined) payload.body = patch.body
  if (patch.status !== undefined) payload.status = patch.status
  if (patch.source_url !== undefined) payload.source_url = patch.source_url?.trim() || null
  if (patch.notes !== undefined) payload.notes = patch.notes?.trim() || null
  return payload
}

// ============================================================
// TELMODEL
// ============================================================

export interface IdeaCountRow {
  pillarId: string | null
  name: string
  color: PillarColor | null
  archived: boolean
  count: number
}

export interface IdeaCounts {
  rows: IdeaCountRow[]
  total: number
  unassigned: number
}

/**
 * Telt ideeën per contentsoort. Alle soorten komen mee, ook met 0. De groep
 * "Geen soort" verschijnt alleen als er daadwerkelijk ideeën zonder soort
 * zijn. Een post met een onbekende pillar_id telt als "Geen soort".
 */
export function countIdeasByPillar(
  posts: Pick<ContentPost, 'pillar_id'>[],
  pillars: ContentPillar[],
): IdeaCounts {
  const knownPillarIds = new Set(pillars.map((pillar) => pillar.id))
  const counts = new Map<string, number>()
  let unassigned = 0

  for (const post of posts) {
    if (post.pillar_id && knownPillarIds.has(post.pillar_id)) {
      counts.set(post.pillar_id, (counts.get(post.pillar_id) ?? 0) + 1)
    } else {
      unassigned += 1
    }
  }

  const rows: IdeaCountRow[] = pillars.map((pillar) => ({
    pillarId: pillar.id,
    name: pillar.name,
    color: pillar.color,
    archived: pillar.archived,
    count: counts.get(pillar.id) ?? 0,
  }))

  if (unassigned > 0) {
    rows.push({
      pillarId: null,
      name: 'Geen soort',
      color: null,
      archived: false,
      count: unassigned,
    })
  }

  return { rows, total: posts.length, unassigned }
}

// ============================================================
// DATUM
// ============================================================

const ideaDateFormatter = new Intl.DateTimeFormat('nl-NL', {
  timeZone: 'Europe/Amsterdam',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** Aanmaakdatum in Nederlandse notatie met vaste Amsterdamse tijdzone. */
export function formatIdeaDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return ideaDateFormatter.format(date)
}
