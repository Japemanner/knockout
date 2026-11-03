'use server'

// Server actions voor de content-ideeënfeature (026). Mutaties conform het
// ActionResult-patroon uit src/actions/hours.ts, via getAuthenticatedClient().
// Geen revalidatePath — de client invalideert React Query-keys (contentKeys).
// createPost/updatePost schrijven uitsluitend via buildPostWritePayload, zodat
// legacy-kolommen (format, planned_*, linkedin_url, scheduled_on_linkedin_at)
// nooit worden aangeraakt. De statusregels staan in src/lib/content/ideas.ts
// en worden ook server-side toegepast, zodat een API-bypass onmogelijk is.

import { getAuthenticatedClient } from '@/lib/supabase/actions'
import { buildPostWritePayload, validateStatusChange } from '@/lib/content/ideas'
import type { ContentPillar, ContentPost, ContentStatus, PillarColor } from '@/types/database.types'

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }

const PILLAR_COLORS: PillarColor[] = ['blue', 'green', 'orange', 'purple', 'pink', 'yellow', 'teal', 'gray']

// ============================================================
// CONTENTSOORTEN
// ============================================================

export async function createPillar(input: {
  name: string
  audience?: string | null
  description?: string | null
  color: PillarColor
}): Promise<ActionResult<ContentPillar>> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()
    const name = input.name.trim()
    if (!name) return { success: false, error: 'De naam van de contentsoort is verplicht.' }
    if (!PILLAR_COLORS.includes(input.color)) return { success: false, error: 'Onbekende kleur.' }

    const { data: last } = await supabase
      .from('kk_content_pillars')
      .select('position')
      .eq('user_id', userId)
      .order('position', { ascending: false })
      .limit(1)

    const { data, error } = await supabase
      .from('kk_content_pillars')
      .insert({
        user_id: userId,
        name,
        audience: input.audience?.trim() || null,
        description: input.description?.trim() || null,
        color: input.color,
        position: (last?.[0]?.position ?? -1) + 1,
      })
      .select()
      .single()

    if (error || !data) return { success: false, error: error?.message ?? 'Kon contentsoort niet aanmaken' }
    return { success: true, data: data as ContentPillar }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function updatePillar(
  pillarId: string,
  patch: Partial<Pick<ContentPillar, 'name' | 'audience' | 'description' | 'color'>>,
): Promise<ActionResult<ContentPillar>> {
  try {
    const { supabase } = await getAuthenticatedClient()
    const updateData: Record<string, unknown> = {}
    if (patch.name !== undefined) {
      const name = patch.name.trim()
      if (!name) return { success: false, error: 'De naam van de contentsoort is verplicht.' }
      updateData.name = name
    }
    if (patch.audience !== undefined) updateData.audience = patch.audience?.trim() || null
    if (patch.description !== undefined) updateData.description = patch.description?.trim() || null
    if (patch.color !== undefined) {
      if (!PILLAR_COLORS.includes(patch.color)) return { success: false, error: 'Onbekende kleur.' }
      updateData.color = patch.color
    }
    if (Object.keys(updateData).length === 0) return { success: true, data: {} as ContentPillar }

    const { data, error } = await supabase
      .from('kk_content_pillars')
      .update(updateData)
      .eq('id', pillarId)
      .select()
      .single()

    if (error || !data) return { success: false, error: error?.message ?? 'Kon contentsoort niet bijwerken' }
    return { success: true, data: data as ContentPillar }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

/** Archiveren/heractiveren (verwijderen bestaat niet; posts blijven staan) */
export async function setPillarArchived(pillarId: string, archived: boolean): Promise<ActionResult<ContentPillar>> {
  try {
    const { supabase } = await getAuthenticatedClient()
    const { data, error } = await supabase
      .from('kk_content_pillars')
      .update({ archived })
      .eq('id', pillarId)
      .select()
      .single()

    if (error || !data) return { success: false, error: error?.message ?? 'Kon contentsoort niet archiveren' }
    return { success: true, data: data as ContentPillar }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

// ============================================================
// IDEEËN
// ============================================================

export async function createPost(input: {
  title: string
  pillar_id?: string | null
  body?: string
  source_url?: string | null
  notes?: string | null
  status?: ContentStatus
}): Promise<ActionResult<ContentPost>> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()
    const title = input.title.trim()
    if (!title) return { success: false, error: 'De titel is verplicht.' }
    const status = input.status ?? 'idee'

    const check = validateStatusChange({ body: input.body ?? '', status }, status)
    if (!check.ok) return { success: false, error: check.reason }

    if (input.pillar_id) {
      const { data: pillar, error } = await supabase
        .from('kk_content_pillars')
        .select('id, archived')
        .eq('id', input.pillar_id)
        .eq('user_id', userId)
        .maybeSingle()
      if (error) return { success: false, error: error.message }
      if (!pillar) return { success: false, error: 'Deze contentsoort bestaat niet meer.' }
      if (pillar.archived) return { success: false, error: 'Deze contentsoort is gearchiveerd.' }
    }

    const payload = buildPostWritePayload({
      title,
      pillar_id: input.pillar_id ?? null,
      body: input.body ?? '',
      status,
      source_url: input.source_url ?? null,
      notes: input.notes ?? null,
    })
    const insertData: Record<string, unknown> = { user_id: userId, ...payload }

    const { data, error } = await supabase
      .from('kk_content_posts')
      .insert(insertData)
      .select()
      .single()

    if (error || !data) return { success: false, error: error?.message ?? 'Kon het idee niet opslaan' }
    return { success: true, data: data as ContentPost }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function updatePost(
  postId: string,
  patch: Partial<Pick<ContentPost, 'title' | 'pillar_id' | 'body' | 'status' | 'source_url' | 'notes'>>,
): Promise<ActionResult<ContentPost>> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    const { data: current, error: fetchError } = await supabase
      .from('kk_content_posts')
      .select('*')
      .eq('id', postId)
      .eq('user_id', userId)
      .single()
    if (fetchError || !current) return { success: false, error: fetchError?.message ?? 'Idee niet gevonden' }
    const currentPost = current as ContentPost

    if (patch.title !== undefined && !patch.title.trim()) {
      return { success: false, error: 'De titel is verplicht.' }
    }

    if (patch.pillar_id !== undefined && patch.pillar_id !== currentPost.pillar_id && patch.pillar_id) {
      const { data: pillar, error } = await supabase
        .from('kk_content_pillars')
        .select('id, archived')
        .eq('id', patch.pillar_id)
        .eq('user_id', userId)
        .maybeSingle()
      if (error) return { success: false, error: error.message }
      if (!pillar) return { success: false, error: 'Deze contentsoort bestaat niet meer.' }
      if (pillar.archived) return { success: false, error: 'Deze contentsoort is gearchiveerd.' }
    }

    const merged = {
      body: patch.body !== undefined ? patch.body : currentPost.body,
      status: (patch.status ?? currentPost.status) as ContentStatus,
    }
    const check = validateStatusChange(merged, merged.status)
    if (!check.ok) return { success: false, error: check.reason }

    const payload = buildPostWritePayload(patch)
    if (Object.keys(payload).length === 0) return { success: true, data: currentPost }

    const { data, error } = await supabase
      .from('kk_content_posts')
      .update(payload)
      .eq('id', postId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error || !data) return { success: false, error: error?.message ?? 'Kon het idee niet opslaan' }
    return { success: true, data: data as ContentPost }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function deletePost(postId: string): Promise<ActionResult<null>> {
  try {
    const { supabase } = await getAuthenticatedClient()
    const { error } = await supabase.from('kk_content_posts').delete().eq('id', postId)
    if (error) return { success: false, error: error.message }
    return { success: true, data: null }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}
