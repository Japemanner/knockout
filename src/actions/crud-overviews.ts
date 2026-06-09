'use server'

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getTables as introspectTables } from '@/lib/db'
import { getConnectionString } from '@/actions/db-connections'

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

export async function createCrudOverview(data: {
  name: string
  connection_id: string | null
  table_name?: string | null
  interaction_type?: 'crud' | 'formulier'
}) {
  try {
    const { supabase, user } = await getSupabase()
    if (!user) return { id: '', error: 'Niet ingelogd' }

    const { count } = await supabase
      .from('kk_crud_overviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const { data: overview, error } = await supabase
      .from('kk_crud_overviews')
      .insert({
        name: data.name,
        connection_id: data.connection_id,
        table_name: data.table_name ?? null,
        interaction_type: data.interaction_type ?? 'crud',
        user_id: user.id,
        position: count ?? 0,
      })
      .select()
      .single()

    if (error || !overview) return { id: '', error: error?.message ?? 'Kon CRUD overzicht niet aanmaken' }

    revalidatePath('/crud')
    return { id: overview.id, table_name: data.table_name ?? null, connection_id: data.connection_id }
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

export async function getTablesForConnection(data: { connection_id: string | null }) {
  try {
    if (!data.connection_id) {
      const { supabase } = await getSupabase()
      const { data: rpcTables, error: rpcError } = await supabase
        .rpc('list_tables')

      if (rpcError) {
        const url = process.env.DIRECT_DATABASE_URL
        if (!url) return { tables: [], error: rpcError.message }
        const tables = await introspectTables('__local__', url)
        return { tables, error: null }
      }

      const tables = (rpcTables as { table_name: string; table_schema: string }[]).map((t) => ({
        name: t.table_name,
        schema: t.table_schema,
        columns: [],
        foreignKeys: [],
      }))
      return { tables, error: null }
    }

    const connStr = await getConnectionString(data.connection_id)
    const tables = await introspectTables(data.connection_id, connStr)
    return { tables, error: null }
  } catch (err) {
    return { tables: [], error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}