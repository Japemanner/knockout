// Shared query-logica voor de content-ideeënfeature (026). Draait op de
// server (SSR-prefetch in src/app/(dashboard)/content/page.tsx) én in de
// browser (queryFn's in src/hooks/useContent.ts) — vandaar geen 'use server'.
// Supabase-fouten worden gegooid i.p.v. stil [] teruggeven, zodat React Query
// de retry doet. Mutaties blijven server actions in src/actions/content.ts.
// Datalaag conform decisions/2026-09-22-uren-reads-browser-client.md.

import type { ContentPillar, ContentPost } from '@/types/database.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = any

// ============================================================
// QUERY KEYS — matchen de SSR-prefetch in content/page.tsx
// ============================================================

export const contentKeys = {
  pillars: ['content', 'pillars'] as const,
  posts: ['content', 'posts'] as const,
}

// ============================================================
// FETCHERS
// ============================================================

/**
 * Alle contentsoorten (incl. gearchiveerd) op position/naam. De UI filtert
 * zelf op archiefstatus voor de keuzelijst; het overzicht toont alle soorten.
 */
export async function fetchPillars(supabase: UntypedClient, userId: string): Promise<ContentPillar[]> {
  const { data, error } = await supabase
    .from('kk_content_pillars')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as ContentPillar[]
}

const POSTS_PAGE_SIZE = 1000

/**
 * Alle posts van de gebruiker, nieuwste eerst. Geen datumfilter: ook posts
 * met een (legacy) planned_date horen bij de ideeënbank. Supabase/PostgREST
 * geeft standaard max. 1.000 rijen terug, dus we pagineren in batches tot de
 * laatste batch kleiner is dan de paginagrootte.
 */
export async function fetchPosts(supabase: UntypedClient, userId: string): Promise<ContentPost[]> {
  const all: ContentPost[] = []
  let offset = 0

  for (;;) {
    const { data, error } = await supabase
      .from('kk_content_posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(offset, offset + POSTS_PAGE_SIZE - 1)

    if (error) throw new Error(error.message)

    const page = (data ?? []) as ContentPost[]
    all.push(...page)
    if (page.length < POSTS_PAGE_SIZE) break
    offset += POSTS_PAGE_SIZE
  }

  return all
}
