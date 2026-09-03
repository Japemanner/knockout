'use server'

import { getAuthenticatedClient } from '@/lib/supabase/actions'
import { revalidatePath } from 'next/cache'

export async function getCrudOverviews() {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    const { data, error } = await supabase
      .from('kk_crud_overviews')
      .select('id, name, table_name, connection_id, interaction_type, hidden_columns, column_order, position, created_at, updated_at')
      .eq('user_id', userId)
      .order('position', { ascending: true })

    if (error) return { overviews: [], error: error.message }
    return { overviews: data, error: null }
  } catch (err) {
    return { overviews: [], error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function createCrudOverview(data: {
  name: string
  connection_id: null
  table_name: string
  interaction_type: 'crud' | 'formulier'
}) {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    const { count } = await supabase
      .from('kk_crud_overviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const { data: overview, error } = await supabase
      .from('kk_crud_overviews')
      .insert({
        name: data.name,
        connection_id: null,
        table_name: data.table_name,
        interaction_type: data.interaction_type ?? 'crud',
        hidden_columns: [],
        user_id: userId,
        position: count ?? 0,
      })
      .select()
      .single()

    if (error || !overview) return { id: '', error: error?.message ?? 'Kon CRUD overzicht niet aanmaken' }

    revalidatePath('/crud')
    return { id: overview.id, table_name: data.table_name }
  } catch (err) {
    return { id: '', error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function updateCrudOverview(data: { crudId: string; name?: string; hidden_columns?: string[]; column_order?: string[] }) {
  try {
    const { supabase } = await getAuthenticatedClient()
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.hidden_columns !== undefined) updateData.hidden_columns = data.hidden_columns
    if (data.column_order !== undefined) updateData.column_order = data.column_order
    if (Object.keys(updateData).length === 0) return { success: true }
    const { error } = await supabase
      .from('kk_crud_overviews')
      .update(updateData)
      .eq('id', data.crudId)

    if (error) return { success: false, error: error.message }
    revalidatePath('/crud')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function deleteCrudOverview(data: { crudId: string }) {
  try {
    const { supabase } = await getAuthenticatedClient()
    const { error } = await supabase
      .from('kk_crud_overviews')
      .delete()
      .eq('id', data.crudId)

    if (error) return { success: false, error: error.message }
    revalidatePath('/crud')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function reorderCrudOverviews(data: { orderedIds: string[] }) {
  try {
    const { supabase } = await getAuthenticatedClient()
    await Promise.all(data.orderedIds.map((id, i) =>
      supabase.from('kk_crud_overviews').update({ position: i }).eq('id', id)
    ))
    revalidatePath('/crud')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}