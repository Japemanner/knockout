'use server'

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

async function getSupabase(): Promise<{ supabase: SupabaseClient<DB, 'public', DB>; user: { id: string } | null }> {
  const supabase = (await createClient()) as unknown as SupabaseClient<DB, 'public', DB>
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user: user as { id: string } | null }
}

export async function getCrudOverviews() {
  const { supabase, user } = await getSupabase()
  if (!user) return { overviews: [], error: 'Niet ingelogd' }

  const { data, error } = await supabase
    .from('kk_crud_overviews')
    .select('id, name, connection_id, position, created_at, updated_at')
    .eq('user_id', user.id)
    .order('position', { ascending: true })

  if (error) return { overviews: [], error: error.message }
  return { overviews: data, error: null }
}

export async function createCrudOverview(data: { name: string; connection_id: string | null }) {
  try {
    const { supabase, user } = await getSupabase()
    if (!user) return { id: '', error: 'Niet ingelogd' }

    const { count } = await supabase
      .from('kk_crud_overviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const { data: overview, error } = await supabase
      .from('kk_crud_overviews')
      .insert({ name: data.name, connection_id: data.connection_id, user_id: user.id, position: count ?? 0 })
      .select()
      .single()

    if (error || !overview) return { id: '', error: error?.message ?? 'Kon CRUD overzicht niet aanmaken' }

    revalidatePath('/crud')
    return { id: overview.id }
  } catch (err) {
    return { id: '', error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function updateCrudOverview(data: { crudId: string; name: string }) {
  try {
    const { supabase } = await getSupabase()
    const { error } = await supabase
      .from('kk_crud_overviews')
      .update({ name: data.name })
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
    const { supabase } = await getSupabase()
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
    const { supabase } = await getSupabase()
    await Promise.all(data.orderedIds.map((id, i) =>
      supabase.from('kk_crud_overviews').update({ position: i }).eq('id', id)
    ))
    revalidatePath('/crud')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function getConnectionsForUser() {
  const { supabase, user } = await getSupabase()
  if (!user) return { connections: [], error: 'Niet ingelogd' }

  const { data, error } = await supabase
    .from('kk_db_connections')
    .select('id, name')
    .eq('user_id', user.id)
    .order('name')

  if (error) return { connections: [], error: error.message }
  return { connections: data, error: null }
}