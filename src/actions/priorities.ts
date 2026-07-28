'use server'

import { getAuthenticatedClient } from '@/lib/supabase/actions'
import { revalidatePath } from 'next/cache'
import type { Priority } from '@/types/database.types'

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface PrioritiesData {
  item_1: string
  item_2: string
  item_3: string
}

const EMPTY_PRIORITIES: PrioritiesData = { item_1: '', item_2: '', item_3: '' }

export async function getPriorities(): Promise<PrioritiesData> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()
    const { data, error } = await supabase
      .from('kk_priorities')
      .select('item_1, item_2, item_3')
      .eq('user_id', userId)
      .maybeSingle()

    if (error || !data) return EMPTY_PRIORITIES
    return {
      item_1: (data.item_1 as string) ?? '',
      item_2: (data.item_2 as string) ?? '',
      item_3: (data.item_3 as string) ?? '',
    }
  } catch (err) {
    console.error('getPriorities:', err)
    return EMPTY_PRIORITIES
  }
}

export async function savePriorities(input: PrioritiesData): Promise<ActionResult<PrioritiesData>> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    const { data: existing } = await supabase
      .from('kk_priorities')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    const payload = {
      user_id: userId,
      item_1: input.item_1.trim(),
      item_2: input.item_2.trim(),
      item_3: input.item_3.trim(),
    }

    if (existing?.id) {
      const { error } = await supabase
        .from('kk_priorities')
        .update(payload)
        .eq('id', existing.id)
      if (error) return { success: false, error: error.message }
    } else {
      const { error } = await supabase
        .from('kk_priorities')
        .insert(payload)
      if (error) return { success: false, error: error.message }
    }

    revalidatePath('/command-center')
    return { success: true, data: { item_1: payload.item_1, item_2: payload.item_2, item_3: payload.item_3 } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}