'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { encrypt } from '@/lib/db/encrypt'
import { destroyPool, testConnection } from '@/lib/db/pool'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

async function getSupabase(): Promise<SupabaseClient<DB, 'public', DB>> {
  return createClient()
}

async function getServiceDb(): Promise<SupabaseClient<DB, 'public', DB>> {
  return createServiceClient()
}

export async function createConnection(data: { name: string; connectionString: string }) {
  try {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { id: '', error: 'Niet ingelogd' }

    const encrypted = await encrypt(data.connectionString)

    const { data: conn, error } = await supabase
      .from('kk_db_connections')
      .insert({ name: data.name, encrypted_conn_str: encrypted, user_id: user.id })
      .select()
      .single()

    if (error || !conn) return { id: '', error: error?.message ?? 'Kon connectie niet opslaan' }
    revalidatePath('/settings/db')
    return { id: conn.id }
  } catch (err) {
    return { id: '', error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function updateConnection(data: { connectionId: string; name?: string; connectionString?: string }) {
  try {
    const supabase = await getSupabase()
    const update: Record<string, unknown> = {}
    if (data.name !== undefined) update.name = data.name
    if (data.connectionString !== undefined) update.encrypted_conn_str = await encrypt(data.connectionString)
    const { error } = await supabase.from('kk_db_connections').update(update).eq('id', data.connectionId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/settings/db')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function deleteConnection(data: { connectionId: string }) {
  try {
    const supabase = await getSupabase()
    const { error } = await supabase.from('kk_db_connections').delete().eq('id', data.connectionId)
    if (error) return { success: false, error: error.message }
    destroyPool(data.connectionId)
    revalidatePath('/settings/db')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function testConnectionAction(data: { connectionId: string }) {
  try {
    const supabase = await getServiceDb()
    const { data: conn } = await supabase.from('kk_db_connections').select('encrypted_conn_str').eq('id', data.connectionId).single()
    if (!conn) return { success: false, error: 'Connectie niet gevonden' }

    const { decrypt } = await import('@/lib/db/encrypt')
    const connStr = await decrypt(conn.encrypted_conn_str)
    const ok = await testConnection(connStr)
    return { success: ok, error: ok ? undefined : 'Kan geen verbinding maken' }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function getConnectionString(connectionId: string): Promise<string> {
  const supabase = await getServiceDb()
  const { data: conn } = await supabase.from('kk_db_connections').select('encrypted_conn_str').eq('id', connectionId).single()
  if (!conn) throw new Error('Connectie niet gevonden')

  const { decrypt } = await import('@/lib/db/encrypt')
  return decrypt(conn.encrypted_conn_str)
}
