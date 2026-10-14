'use server'

// Server actions voor de LinkedIn content-kalender (feature 023).
// Mutaties conform contracts/server-actions.md: ActionResult-patroon uit
// src/actions/hours.ts, via getAuthenticatedClient(). Geen revalidatePath —
// de client invalideert React Query-keys (contentKeys). Elke action die
// status of tekst wijzigt roept validateStatusChange aan en weigert
// ongeldige combinaties server-side, zodat API-bypass onmogelijk is.

import { getAuthenticatedClient } from '@/lib/supabase/actions'
import {
  isLowerStatus,
  isValidLinkedInUrl,
  validateStatusChange,
  type StatusCheckPost,
} from '@/lib/content/calendar'
import type { ContentPillar, ContentPost, ContentSlot, ContentStatus, PillarColor } from '@/types/database.types'

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
// WEEKSLOTS
// ============================================================

/**
 * Upsert van één weekdag-slot (unique pillar_id + weekday). Een nieuwe rij
 * krijgt created_at = now(), waardoor het slot pas vanaf vandaag geldt.
 */
export async function upsertSlot(input: {
  pillarId: string
  weekday: number
  time: string
  active?: boolean
}): Promise<ActionResult<ContentSlot>> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()
    if (input.weekday < 1 || input.weekday > 7) return { success: false, error: 'Ongeldige weekdag.' }

    const { data, error } = await supabase
      .from('kk_content_slots')
      .upsert(
        {
          user_id: userId,
          pillar_id: input.pillarId,
          weekday: input.weekday,
          post_time: input.time || '08:00',
          active: input.active ?? true,
        },
        { onConflict: 'pillar_id,weekday' },
      )
      .select()
      .single()

    if (error || !data) return { success: false, error: error?.message ?? 'Kon weekslot niet opslaan' }
    return { success: true, data: data as ContentSlot }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

/** Weekdag volledig uitzetten door de slot-rij te verwijderen */
export async function deleteSlot(slotId: string): Promise<ActionResult<null>> {
  try {
    const { supabase } = await getAuthenticatedClient()
    const { error } = await supabase.from('kk_content_slots').delete().eq('id', slotId)
    if (error) return { success: false, error: error.message }
    return { success: true, data: null }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

// ============================================================
// POSTS
// ============================================================

export async function createPost(input: {
  title: string
  pillar_id?: string | null
  planned_date?: string | null
  planned_time?: string | null
  status?: ContentStatus
  body?: string
}): Promise<ActionResult<ContentPost>> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()
    const title = input.title.trim()
    if (!title) return { success: false, error: 'De titel is verplicht.' }
    const status = input.status ?? 'idee'

    const checkPost: StatusCheckPost = {
      body: input.body ?? '',
      planned_date: input.planned_date ?? null,
      planned_time: input.planned_time ?? null,
      linkedin_url: null,
      status,
    }
    const check = validateStatusChange(checkPost, status)
    if (!check.ok) return { success: false, error: check.reason }

    const insertData: Record<string, unknown> = {
      user_id: userId,
      title,
      status,
      body: input.body ?? '',
    }
    if (input.pillar_id) insertData.pillar_id = input.pillar_id
    if (input.planned_date) insertData.planned_date = input.planned_date
    if (input.planned_time) insertData.planned_time = input.planned_time

    const { data, error } = await supabase
      .from('kk_content_posts')
      .insert(insertData)
      .select()
      .single()

    if (error || !data) return { success: false, error: error?.message ?? 'Kon post niet aanmaken' }
    return { success: true, data: data as ContentPost }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function updatePost(
  postId: string,
  patch: Partial<Pick<ContentPost, 'title' | 'pillar_id' | 'body' | 'format' | 'status' | 'planned_date' | 'planned_time' | 'source_url' | 'linkedin_url' | 'notes'>>,
): Promise<ActionResult<ContentPost>> {
  try {
    const { supabase } = await getAuthenticatedClient()

    // Huidige post ophalen: validatie gebeurt op de samengevoegde staat
    const { data: current, error: fetchError } = await supabase
      .from('kk_content_posts')
      .select('*')
      .eq('id', postId)
      .single()
    if (fetchError || !current) return { success: false, error: fetchError?.message ?? 'Post niet gevonden' }
    const currentPost = current as ContentPost

    if (patch.title !== undefined && !patch.title.trim()) {
      return { success: false, error: 'De titel is verplicht.' }
    }
    if (patch.linkedin_url !== undefined && patch.linkedin_url && !isValidLinkedInUrl(patch.linkedin_url)) {
      return { success: false, error: 'De LinkedIn-URL moet beginnen met https://www.linkedin.com/' }
    }

    const merged: StatusCheckPost = {
      body: patch.body !== undefined ? patch.body : currentPost.body,
      planned_date: patch.planned_date !== undefined ? patch.planned_date : currentPost.planned_date,
      planned_time: patch.planned_time !== undefined ? patch.planned_time : currentPost.planned_time,
      linkedin_url: patch.linkedin_url !== undefined ? patch.linkedin_url : currentPost.linkedin_url,
      status: (patch.status ?? currentPost.status) as ContentStatus,
    }
    const check = validateStatusChange(merged, merged.status)
    if (!check.ok) return { success: false, error: check.reason }

    const updateData: Record<string, unknown> = {}
    if (patch.title !== undefined) updateData.title = patch.title.trim()
    if (patch.pillar_id !== undefined) updateData.pillar_id = patch.pillar_id || null
    if (patch.body !== undefined) updateData.body = patch.body
    if (patch.format !== undefined) updateData.format = patch.format
    if (patch.status !== undefined) updateData.status = patch.status
    if (patch.planned_date !== undefined) updateData.planned_date = patch.planned_date || null
    if (patch.planned_time !== undefined) updateData.planned_time = patch.planned_time || null
    if (patch.source_url !== undefined) updateData.source_url = patch.source_url?.trim() || null
    if (patch.linkedin_url !== undefined) updateData.linkedin_url = patch.linkedin_url?.trim() || null
    if (patch.notes !== undefined) updateData.notes = patch.notes

    // Inplan-moment: bij overgang naar gepland vastleggen (als leeg); bij
    // terugkeer naar een lagere status wissen. Binnen gepland blijft het staan.
    if (patch.status !== undefined && patch.status !== currentPost.status) {
      if (patch.status === 'gepland') {
        updateData.scheduled_on_linkedin_at = currentPost.scheduled_on_linkedin_at ?? new Date().toISOString()
      } else if (isLowerStatus(patch.status, 'gepland')) {
        updateData.scheduled_on_linkedin_at = null
      }
    }

    if (Object.keys(updateData).length === 0) return { success: true, data: currentPost }

    const { data, error } = await supabase
      .from('kk_content_posts')
      .update(updateData)
      .eq('id', postId)
      .select()
      .single()

    if (error || !data) return { success: false, error: error?.message ?? 'Kon post niet opslaan' }
    return { success: true, data: data as ContentPost }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

/**
 * Verplaatsen naar een andere dag (date + tijd) of naar de ideeënbak
 * (date = null, wist ook de tijd). Alleen voor status idee, concept en
 * klaar — gepland en live worden vóór de DB-call geweigerd met een NL-melding.
 */
export async function movePost(
  postId: string,
  date: string | null,
  time: string | null,
): Promise<ActionResult<ContentPost>> {
  try {
    const { supabase } = await getAuthenticatedClient()

    const { data: current, error: fetchError } = await supabase
      .from('kk_content_posts')
      .select('*')
      .eq('id', postId)
      .single()
    if (fetchError || !current) return { success: false, error: fetchError?.message ?? 'Post niet gevonden' }
    const currentPost = current as ContentPost

    if (date === null && (currentPost.status === 'gepland' || currentPost.status === 'live')) {
      return {
        success: false,
        error:
          currentPost.status === 'gepland'
            ? 'Een geplande post kan niet naar de ideeënbak. Pas de status eerst aan of geef de post een andere datum.'
            : 'Een live post kan niet naar de ideeënbak.',
      }
    }

    const newDate = date ?? null
    const newTime = date !== null ? (time ?? currentPost.planned_time ?? '08:00') : null

    const { data, error } = await supabase
      .from('kk_content_posts')
      .update({ planned_date: newDate, planned_time: newTime })
      .eq('id', postId)
      .select()
      .single()

    if (error || !data) return { success: false, error: error?.message ?? 'Kon post niet verplaatsen' }
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