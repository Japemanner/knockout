'use server'

import { getAuthenticatedClient } from '@/lib/supabase/actions'
import { revalidatePath } from 'next/cache'

export async function createCrudCategory(data: { name: string }) {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    const name = data.name.trim()
    if (!name) return { id: '', error: 'Vul een naam in' }

    const { count } = await supabase
      .from('kk_crud_categories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const { data: category, error } = await supabase
      .from('kk_crud_categories')
      .insert({ name, user_id: userId, position: count ?? 0 })
      .select()
      .single()

    if (error || !category) return { id: '', error: error?.message ?? 'Kon categorie niet aanmaken' }

    revalidatePath('/crud')
    return { id: category.id, error: null }
  } catch (err) {
    return { id: '', error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function renameCrudCategory(data: { categoryId: string; name: string }) {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    const name = data.name.trim()
    if (!name) return { success: false, error: 'Vul een naam in' }

    const { error } = await supabase
      .from('kk_crud_categories')
      .update({ name })
      .eq('id', data.categoryId)
      .eq('user_id', userId)

    if (error) return { success: false, error: error.message }
    revalidatePath('/crud')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function deleteCrudCategory(data: { categoryId: string }) {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    const { error } = await supabase
      .from('kk_crud_categories')
      .delete()
      .eq('id', data.categoryId)
      .eq('user_id', userId)

    if (error) return { success: false, error: error.message }
    revalidatePath('/crud')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}