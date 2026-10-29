'use server'

import { getAuthenticatedClient } from '@/lib/supabase/actions'
import { getLocalTableMeta } from '@/actions/local-db'
import { diffColumns, pruneColumnSettings } from '@/lib/crud/schema-sync'
import type { ColumnFilters } from '@/lib/column-filters'
import { revalidatePath } from 'next/cache'
import type { ColumnFilter } from '@/types/database.types'

export async function getCrudOverviews() {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    const { data, error } = await supabase
      .from('kk_crud_overviews')
      .select('id, name, table_name, connection_id, interaction_type, hidden_columns, column_order, column_filters, category_id, position, created_at, updated_at')
      .eq('user_id', userId)
      .order('position', { ascending: true })

    if (error) return { overviews: [], error: error.message }
    return { overviews: data, error: null }
  } catch (err) {
    return { overviews: [], error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveOwnedCategoryId(supabase: any, userId: string, categoryId: string) {
  const { data } = await supabase
    .from('kk_crud_categories')
    .select('id')
    .eq('id', categoryId)
    .eq('user_id', userId)
    .single()
  return { valid: !!data, error: data ? null : 'Categorie niet gevonden' }
}

export async function createCrudOverview(data: {
  name: string
  connection_id: null
  table_name: string
  interaction_type: 'crud' | 'formulier'
  category_id?: string | null
}) {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    let categoryId: string | null = null
    if (data.category_id) {
      const check = await resolveOwnedCategoryId(supabase, userId, data.category_id)
      if (!check.valid) return { id: '', error: check.error }
      categoryId = data.category_id
    }

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
        category_id: categoryId,
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

export async function updateCrudOverview(data: { crudId: string; name?: string; hidden_columns?: string[]; column_order?: string[]; column_filters?: Record<string, ColumnFilter> }) {
  try {
    const { supabase } = await getAuthenticatedClient()
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.hidden_columns !== undefined) updateData.hidden_columns = data.hidden_columns
    if (data.column_order !== undefined) updateData.column_order = data.column_order
    if (data.column_filters !== undefined) updateData.column_filters = data.column_filters
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

export async function setCrudOverviewCategory(data: { crudId: string; categoryId: string | null }) {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    if (data.categoryId) {
      const check = await resolveOwnedCategoryId(supabase, userId, data.categoryId)
      if (!check.valid) return { success: false, error: check.error }
    }

    const { error } = await supabase
      .from('kk_crud_overviews')
      .update({ category_id: data.categoryId })
      .eq('id', data.crudId)
      .eq('user_id', userId)

    if (error) return { success: false, error: error.message }
    revalidatePath('/crud')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function syncCrudOverviewSchema(data: { crudId: string; knownColumns?: string[] }) {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    const { data: overview } = await supabase
      .from('kk_crud_overviews')
      .select('id, table_name, hidden_columns, column_order, column_filters')
      .eq('id', data.crudId)
      .eq('user_id', userId)
      .single()

    if (!overview || !overview.table_name) {
      return { success: false, added: [], removed: [], error: 'Overzicht niet gevonden of geen tabel gekoppeld' }
    }

    const metaResult = await getLocalTableMeta(overview.table_name)
    if (metaResult.error || !metaResult.meta) {
      return { success: false, added: [], removed: [], error: metaResult.error ?? 'Kon tabelstructuur niet ophalen' }
    }

    const currentNames = metaResult.meta.columns.map((c: { name: string }) => c.name)
    const { added, removed } = diffColumns(data.knownColumns ?? [], currentNames)

    const pruned = pruneColumnSettings(
      {
        hiddenColumns: overview.hidden_columns ?? [],
        columnOrder: overview.column_order ?? [],
        filters: (overview.column_filters ?? {}) as ColumnFilters,
      },
      metaResult.meta.columns
    )

    const changed =
      pruned.hiddenColumns.length !== (overview.hidden_columns ?? []).length ||
      pruned.columnOrder.length !== (overview.column_order ?? []).length ||
      Object.keys(pruned.filters).length !== Object.keys(overview.column_filters ?? {}).length

    if (changed) {
      const { error } = await supabase
        .from('kk_crud_overviews')
        .update({
          hidden_columns: pruned.hiddenColumns,
          column_order: pruned.columnOrder,
          column_filters: pruned.filters,
        })
        .eq('id', data.crudId)
        .eq('user_id', userId)
      if (error) return { success: false, added: [], removed: [], error: error.message }
    }

    revalidatePath(`/crud/${data.crudId}`)
    revalidatePath('/crud')
    return { success: true, added, removed, error: null }
  } catch (err) {
    return { success: false, added: [], removed: [], error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}