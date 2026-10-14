// Shared query-logica voor de content-kalender (feature 023). Draait op de
// server (SSR-prefetch in src/app/(dashboard)/content/page.tsx) én in de
// browser (queryFn's in src/hooks/useContent.ts) — vandaar geen 'use server'.
// Supabase-fouten worden gegooid i.p.v. stil [] teruggeven, zodat React Query
// de retry doet. Mutaties blijven server actions in src/actions/content.ts.
// Datalaag conform decisions/2026-09-22-uren-reads-browser-client.md.

import type { ContentPillar, ContentPost, ContentSlot } from '@/types/database.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = any

export interface PillarWithSlots extends ContentPillar {
  slots: ContentSlot[]
}

// ============================================================
// QUERY KEYS — matchen de SSR-prefetch in content/page.tsx
// ============================================================

export const contentKeys = {
  pillars: ['content', 'pillars'] as const,
  month: (ym: string) => ['content', 'month', ym] as const,
  ideas: ['content', 'ideas'] as const,
}

// ============================================================
// FETCHERS
// ============================================================

/**
 * Alle contentsoorten (incl. gearchiveerd) met hun weekslots. De kalender
 * filtert zelf op archief/active: gearchiveerde soorten tonen hun posts nog
 * wel (soortnaam gedimd), maar krijgen geen nieuwe lege slots.
 */
export async function fetchPillarsWithSlots(supabase: UntypedClient, userId: string): Promise<PillarWithSlots[]> {
  const { data, error } = await supabase
    .from('kk_content_pillars')
    .select('*, kk_content_slots(*)')
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...(row as unknown as ContentPillar),
    slots: ((row.kk_content_slots as ContentSlot[] | null) ?? []).slice().sort((a, b) => a.weekday - b.weekday),
  }))
}

/**
 * Posts over het volledige zichtbare raster (maandag van de eerste week t/m
 * zondag van de laatste week), niet alleen de kalendermaand — anders klopt
 * de slotmatching per ISO-week aan de randen van de maand niet.
 */
export async function fetchMonthPosts(
  supabase: UntypedClient,
  userId: string,
  gridStart: string,
  gridEnd: string,
): Promise<ContentPost[]> {
  const { data, error } = await supabase
    .from('kk_content_posts')
    .select('*')
    .eq('user_id', userId)
    .gte('planned_date', gridStart)
    .lte('planned_date', gridEnd)
    .order('planned_date', { ascending: true })
    .order('planned_time', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as ContentPost[]
}

/** Ideeënbak: alle posts zonder datum, nieuwste bovenaan */
export async function fetchIdeas(supabase: UntypedClient, userId: string): Promise<ContentPost[]> {
  const { data, error } = await supabase
    .from('kk_content_posts')
    .select('*')
    .eq('user_id', userId)
    .is('planned_date', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as ContentPost[]
}