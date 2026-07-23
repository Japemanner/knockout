'use server'

import { getAuthenticatedClient, getServiceClient } from '@/lib/supabase/actions'
import type { ColumnInfo, ForeignKeyInfo, TableInfo, TableMeta } from '@/lib/db/introspect'

export { ColumnInfo, ForeignKeyInfo, TableInfo, TableMeta }

// PostgREST (Supabase client) i.p.v. directe pg.Pool. Werkt over HTTPS (poort 443),
// compatibel met Netlify serverless. Data-operaties gebruiken de service-role client
// (omzeilt RLS) zodat de CRUD DB-explorer alle rijen toont, conform de oorspronkelijke
// pg.Pool behavior. Metadata-RPC's (SECURITY DEFINER) gebruiken de authenticated client.
// Zie /decisions/2026-07-23-crud-postgrest-migration.md.
//
// Dynamische tabelnamen (willekeurige kk_* tabellen) zijn niet statisch getypeerd in
// database.types.ts; we casten daarom naar een untyped client, conform het patroon
// in src/lib/supabase/actions.ts (UntypedClient).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = any

interface RpcColumnRow {
  column_name: string
  data_type: string
  is_nullable: boolean
  column_default: string | null
  character_maximum_length: number | null
  is_primary_key: boolean
  is_identity: string
  is_generated: string
}

interface RpcFkRow {
  column_name: string
  referenced_table_name: string
  referenced_column_name: string
}

interface RpcTableRow {
  table_name: string
  table_schema: string
}

function mapColumn(r: RpcColumnRow): ColumnInfo {
  return {
    name: r.column_name,
    dataType: r.data_type,
    isNullable: r.is_nullable,
    isPrimaryKey: r.is_primary_key,
    isIdentity: r.is_identity === 'YES',
    isGenerated: (r.is_generated === 'ALWAYS' || r.is_generated === 'BY DEFAULT') ? r.is_generated as 'ALWAYS' | 'BY DEFAULT' : 'NEVER',
    defaultValue: r.column_default,
    maxLength: r.character_maximum_length,
  }
}

function mapFk(r: RpcFkRow): ForeignKeyInfo {
  return {
    columnName: r.column_name,
    referencedTable: r.referenced_table_name,
    referencedColumn: r.referenced_column_name,
  }
}

export async function getLocalTableMeta(tableName: string): Promise<{ meta: TableMeta | null; error: string | null }> {
  try {
    const { supabase } = await getAuthenticatedClient()

    const [colsRes, fksRes] = await Promise.all([
      supabase.rpc('get_table_columns', { p_schema: 'public', p_table: tableName }),
      supabase.rpc('get_table_foreign_keys', { p_schema: 'public', p_table: tableName }),
    ])

    if (colsRes.error) throw new Error(colsRes.error.message)
    if (fksRes.error) throw new Error(fksRes.error.message)

    const columns = (colsRes.data as RpcColumnRow[] ?? []).map(mapColumn)
    if (columns.length === 0) {
      return { meta: null, error: `Tabel "${tableName}" niet gevonden. Controleer of de tabel bestaat in je database.` }
    }
    const foreignKeys = (fksRes.data as RpcFkRow[] ?? []).map(mapFk)
    return { meta: { columns, foreignKeys }, error: null }
  } catch (err) {
    return { meta: null, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function getLocalTableList(): Promise<{ tables: TableInfo[]; error?: string }> {
  try {
    const { supabase } = await getAuthenticatedClient()
    const { data, error } = await supabase.rpc('list_tables')
    if (error) throw new Error(error.message)

    const rows = (data as RpcTableRow[] ?? []).map((t) => ({ name: t.table_name, schema: t.table_schema }))

    // Haal per tabel kolommen op (voor kolom-count in de UI). FK's niet nodig in de lijst.
    const tables: TableInfo[] = []
    for (const t of rows) {
      const { data: colsData, error: colsErr } = await supabase.rpc('get_table_columns', { p_schema: t.schema, p_table: t.name })
      if (colsErr) throw new Error(colsErr.message)
      const columns = (colsData as RpcColumnRow[] ?? []).map(mapColumn)
      tables.push({ name: t.name, schema: t.schema, columns, foreignKeys: [] })
    }
    return { tables }
  } catch (err) {
    return { tables: [], error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function getLocalTableRecords(data: {
  tableName: string; page?: number; pageSize?: number
  orderBy?: string; orderDir?: 'asc' | 'desc'
}): Promise<{ rows: Record<string, unknown>[]; totalCount: number; page: number; pageSize: number; error?: string }> {
  const page = data.page ?? 1
  const pageSize = data.pageSize ?? 25
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  try {
    const { supabase } = await getServiceClient() as { supabase: UntypedClient }
    let query = supabase.from(data.tableName).select('*', { count: 'exact' })
    if (data.orderBy) {
      query = query.order(data.orderBy, { ascending: data.orderDir !== 'desc' })
    }
    const { data: rows, count, error } = await query.range(from, to)
    if (error) throw new Error(error.message)
    return {
      rows: (rows ?? []) as Record<string, unknown>[],
      totalCount: count ?? 0,
      page,
      pageSize,
    }
  } catch (err) {
    return { rows: [], totalCount: 0, page, pageSize, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function createLocalRecord(data: { tableName: string; values: Record<string, unknown> }): Promise<{ record?: Record<string, unknown>; error?: string }> {
  try {
    const { supabase } = await getServiceClient() as { supabase: UntypedClient }
    const { data: record, error } = await supabase
      .from(data.tableName)
      .insert(data.values)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return { record: record as Record<string, unknown> }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function updateLocalRecord(data: {
  tableName: string; primaryKey: { column: string; value: unknown }
  values: Record<string, unknown>
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await getServiceClient() as { supabase: UntypedClient }
    if (Object.keys(data.values).length === 0) return { success: true }
    const { error } = await supabase
      .from(data.tableName)
      .update(data.values)
      .eq(data.primaryKey.column, data.primaryKey.value)
      .select()
    if (error) throw new Error(error.message)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function deleteLocalRecord(data: {
  tableName: string; primaryKey: { column: string; value: unknown }
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await getServiceClient() as { supabase: UntypedClient }
    const { error } = await supabase
      .from(data.tableName)
      .delete()
      .eq(data.primaryKey.column, data.primaryKey.value)
    if (error) throw new Error(error.message)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function getLocalForeignKeyOptions(data: {
  referencedTable: string; referencedColumn: string
}): Promise<{ options: { value: unknown; label: string }[]; error?: string }> {
  try {
    const { supabase } = await getServiceClient() as { supabase: UntypedClient }
    const { data: rows, error } = await supabase
      .from(data.referencedTable)
      .select(data.referencedColumn)
      .order(data.referencedColumn, { ascending: true })
      .limit(200)
    if (error) throw new Error(error.message)
    const options = (rows ?? []).map((r: Record<string, unknown>) => ({
      value: r[data.referencedColumn],
      label: String(r[data.referencedColumn]),
    }))
    return { options }
  } catch (err) {
    return { options: [], error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}