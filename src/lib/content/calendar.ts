// Pure kalender- en slotlogica voor de LinkedIn content-kalender (feature 023).
// Geen React, geen Supabase — volledig unit-testbaar (tests/e2e/content-calendar-logic.spec.ts).
// Alle datums zijn 'YYYY-MM-DD'-strings in lokale Nederlandse tijd (Europe/Amsterdam);
// lexicografische vergelijking = chronologisch. Nooit toISOString() op een lokale datum:
// de Amsterdamse dag van een timestamptz gaat via het Intl-patroon uit src/lib/hours/dates.ts.

import { addDays, endOfISOWeek, format, getISODay, getISOWeek, getISOWeekYear, startOfISOWeek } from 'date-fns'
import type { ContentPillar, ContentPost, ContentSlot, ContentStatus } from '@/types/database.types'

export const MAX_BODY_LENGTH = 3000
export const HOOK_CHAR_LIMIT = 210
export const DEFAULT_DROP_TIME = '08:00'
const TZ = 'Europe/Amsterdam'

// ============================================================
// MAANDRASTER
// ============================================================

export interface GridDay {
  date: string // 'YYYY-MM-DD'
  inMonth: boolean
}

/**
 * Weken (maandag t/m zondag) van het zichtbare raster van een kalendermaand.
 * Dagen buiten de maand zijn inbegrepen (inMonth = false) omdat slotmatching
 * per ISO-week loopt en een week over de maandgrens heen gaat.
 */
export function buildMonthGrid(year: number, month: number): GridDay[][] {
  const firstOfMonth = new Date(year, month - 1, 1)
  const gridStart = startOfISOWeek(firstOfMonth)
  const lastOfMonth = new Date(year, month, 0)
  const gridEnd = endOfISOWeek(lastOfMonth)

  const days: GridDay[] = []
  let cursor = gridStart
  while (cursor <= gridEnd) {
    days.push({
      date: format(cursor, 'yyyy-MM-dd'),
      inMonth: cursor.getMonth() === month - 1 && cursor.getFullYear() === year,
    })
    cursor = addDays(cursor, 1)
  }

  const weeks: GridDay[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return weeks
}

/** 'yyyy-MM' (bijv. Amsterdamse huidige maand) → raster */
export function buildMonthGridForYm(ym: string): GridDay[][] {
  return buildMonthGrid(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)))
}

/** Raster met gegarandeerde grenzen: maandag eerste week t/m zondag laatste week */
export function monthGridRange(ym: string): { weeks: GridDay[][]; gridStart: string; gridEnd: string } {
  const weeks = buildMonthGridForYm(ym)
  const first = weeks[0]
  const last = weeks[weeks.length - 1]
  if (!first?.[0] || !last?.[6]) throw new Error('Onverwacht leeg maandraster voor ' + ym)
  return { weeks, gridStart: first[0].date, gridEnd: last[6].date }
}

function parseDate(date: string): Date {
  const [y = 1970, m = 1, d = 1] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** ISO-week-key: weken lopen maandag t/m zondag, ook over jaar- en maandgrenzen */
function isoWeekKey(date: string): string {
  const parsed = parseDate(date)
  return `${getISOWeekYear(parsed)}-${String(getISOWeek(parsed)).padStart(2, '0')}`
}

function dateToWeekday(date: string): number {
  return getISODay(parseDate(date))
}

/** Amsterdamse kalenderdag ('YYYY-MM-DD') van een timestamptz-ISO-string */
export function amsterdamDateOf(timestamp: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp))
}

// ============================================================
// SLOTVOORKOMENS
// ============================================================

export interface SlotOccurrence {
  date: string
  pillarId: string
  time: string // 'HH:mm'
}

/**
 * Alle slotvoorkomens op de rasterdata: alleen actieve slots van niet-
 * gearchiveerde soorten, en alleen op datums vanaf de Amsterdamse
 * aanmaakdag van het slot (slots gelden pas vanaf die dag).
 */
export function computeSlotOccurrences(
  gridDates: string[],
  pillars: ContentPillar[],
  slots: ContentSlot[],
): SlotOccurrence[] {
  const activePillarIds = new Set(pillars.filter((p) => !p.archived).map((p) => p.id))
  const slotsByWeekday = new Map<number, ContentSlot[]>()
  for (const slot of slots) {
    if (!slot.active || !activePillarIds.has(slot.pillar_id)) continue
    const list = slotsByWeekday.get(slot.weekday) ?? []
    list.push(slot)
    slotsByWeekday.set(slot.weekday, list)
  }

  const occurrences: SlotOccurrence[] = []
  for (const date of gridDates) {
    const weekday = dateToWeekday(date)
    const daySlots = slotsByWeekday.get(weekday)
    if (!daySlots) continue
    for (const slot of daySlots) {
      // Slot geldt pas vanaf zijn aanmaakdag (Amsterdamse datum van created_at)
      if (date < amsterdamDateOf(slot.created_at)) continue
      occurrences.push({ date, pillarId: slot.pillar_id, time: displayTime(slot.post_time) ?? DEFAULT_DROP_TIME })
    }
  }
  occurrences.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  return occurrences
}

export interface PostLike {
  id: string
  pillar_id: string | null
  planned_date: string | null
  planned_time: string | null
}

/**
 * Koppelt posts aan slotvoorkomens per ISO-week en per contentsoort:
 * beide op volgorde (datum, tijd), de i-de post vult het i-de voorkomen.
 * Verplaats je de woensdagpost naar donderdag in dezelfde week, dan blijft
 * het woensdagslot dus gevuld. Retourneert de niet-gekoppelde voorkomens.
 */
export function matchSlots(occurrences: SlotOccurrence[], posts: PostLike[]): SlotOccurrence[] {
  const occByGroup = new Map<string, SlotOccurrence[]>()
  for (const occ of occurrences) {
    const key = `${isoWeekKey(occ.date)}|${occ.pillarId}`
    const list = occByGroup.get(key) ?? []
    list.push(occ)
    occByGroup.set(key, list)
  }

  const postsByGroup = new Map<string, PostLike[]>()
  for (const post of posts) {
    if (!post.pillar_id || !post.planned_date) continue
    const key = `${isoWeekKey(post.planned_date)}|${post.pillar_id}`
    const list = postsByGroup.get(key) ?? []
    list.push(post)
    postsByGroup.set(key, list)
  }

  const unfilled: SlotOccurrence[] = []
  for (const [key, groupOccurrences] of occByGroup) {
    const groupPosts = postsByGroup.get(key) ?? []
    const sortedPosts = [...groupPosts].sort((a, b) =>
      (a.planned_date ?? '').localeCompare(b.planned_date ?? '') ||
      postSortTime(a).localeCompare(postSortTime(b)),
    )
    if (groupOccurrences.length <= sortedPosts.length) continue
    unfilled.push(...groupOccurrences.slice(sortedPosts.length))
  }
  return unfilled
}

function postSortTime(post: PostLike): string {
  return displayTime(post.planned_time) ?? '00:00'
}

export type SlotState = 'open' | 'gemist'

/** Open (datum ≥ vandaag) of gemist (datum < vandaag, grijs en niet klikbaar) */
export function slotState(date: string, today: string): SlotState {
  return date >= today ? 'open' : 'gemist'
}

/** Rode verlopen-markering: datum vóór vandaag en status idee, concept of klaar */
export function isOverdue(post: Pick<ContentPost, 'planned_date' | 'status'>, today: string): boolean {
  if (!post.planned_date || post.planned_date >= today) return false
  return post.status === 'idee' || post.status === 'concept' || post.status === 'klaar'
}

// ============================================================
// POSTTEKST
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

const STATUS_ORDER: ContentStatus[] = ['idee', 'concept', 'klaar', 'gepland', 'live']

export interface StatusCheckPost {
  body: string
  planned_date: string | null
  planned_time: string | null
  linkedin_url: string | null
  status: ContentStatus
}

export type StatusChangeResult = { ok: true } | { ok: false; reason: string }

export function isLowerStatus(status: ContentStatus, reference: ContentStatus): boolean {
  return STATUS_ORDER.indexOf(status) < STATUS_ORDER.indexOf(reference)
}

/**
 * Statusovergangen (Idee, Concept, Klaar, Gepland, Live — vrij te wisselen):
 * - Klaar, Gepland en Live vereisen een niet-lege posttekst van maximaal 3.000 tekens.
 * - Gepland en Live vereisen een datum en tijd.
 * - Een ingevulde LinkedIn-URL moet beginnen met https://www.linkedin.com/.
 *   Live zonder URL is toegestaan (de kaart toont dan "URL ontbreekt").
 * Dezelfde functie draait in de editor (vóór opslaan) én server-side in
 * src/actions/content.ts, zodat API-bypass onmogelijk is.
 */
export function validateStatusChange(post: StatusCheckPost, nextStatus: ContentStatus): StatusChangeResult {
  if (nextStatus === 'klaar' || nextStatus === 'gepland' || nextStatus === 'live') {
    if (!post.body.trim()) {
      return { ok: false, reason: 'Vul eerst posttekst in voordat je deze status kiest.' }
    }
    if (charCount(post.body) > MAX_BODY_LENGTH) {
      return { ok: false, reason: 'De posttekst is te lang (maximaal 3.000 tekens).' }
    }
  }

  if (nextStatus === 'gepland' || nextStatus === 'live') {
    if (!post.planned_date || !post.planned_time) {
      return { ok: false, reason: 'Vul datum en tijd in voor status ' + statusLabel(nextStatus) + '.' }
    }
  }

  if (nextStatus === 'live' && post.linkedin_url && !isValidLinkedInUrl(post.linkedin_url)) {
    return { ok: false, reason: 'De LinkedIn-URL moet beginnen met https://www.linkedin.com/' }
  }

  return { ok: true }
}

export function isValidLinkedInUrl(url: string): boolean {
  return url.startsWith('https://www.linkedin.com/')
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

export function formatLabel(format: ContentPost['format']): string {
  switch (format) {
    case 'tekst': return 'Tekst'
    case 'afbeelding': return 'Afbeelding'
    case 'carrousel': return 'Carrousel'
    case 'video': return 'Video'
    case 'poll': return 'Poll'
  }
}

// ============================================================
// SLEPEN
// ============================================================

/**
 * Tijdregel bij slepen naar een dagcel: de tijd van het lege slot van de
 * soort van de post op die dag, anders de bestaande tijd van de post,
 * anders 08:00. De status blijft gelijk.
 */
export function resolveDropTime(
  post: Pick<ContentPost, 'pillar_id' | 'planned_time'>,
  targetDate: string,
  openSlotsOnDate: SlotOccurrence[],
): string {
  if (post.pillar_id) {
    const slot = openSlotsOnDate.find((s) => s.date === targetDate && s.pillarId === post.pillar_id)
    if (slot) return slot.time
  }
  return displayTime(post.planned_time) ?? DEFAULT_DROP_TIME
}

// ============================================================
// HULPFUNCTIES
// ============================================================

/** PostgreSQL time ('HH:mm:ss' of 'HH:mm') → 'HH:mm' voor weergave */
export function displayTime(time: string | null | undefined): string | null {
  if (!time) return null
  return time.slice(0, 5)
}