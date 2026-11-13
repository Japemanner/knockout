'use server'

import { getConnectionString } from '@/actions/db-connections'
import { assertIdent, assertIdents } from '@/lib/db/identifiers'
import { getTables as introspectTables, getPool } from '@/lib/db'
import type { ColumnInfo, ForeignKeyInfo, TableInfo } from '@/lib/db/introspect'

export { ColumnInfo, ForeignKeyInfo, TableInfo }

export async function getTableList(data: { connectionId: string }) {
  try {
    const connStr = await getConnectionString(data.connectionId)
    const tables = await introspectTables(data.connectionId, connStr)
    return { tables }
  } catch (err) {
    return { tables: [], error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function getTableRecords(data: {
  connectionId: string; tableName: string; page?: number; pageSize?: number
  orderBy?: string; orderDir?: 'asc' | 'desc'
}) {
  try {
    const connStr = await getConnectionString(data.connectionId)
    const pool = getPool(data.connectionId, connStr)
    const tableName = assertIdent(data.tableName)
    const page = data.page ?? 1
    const pageSize = data.pageSize ?? 25
    const offset = (page - 1) * pageSize

    const orderCol = data.orderBy ? `"${assertIdent(data.orderBy)}" ${data.orderDir === 'desc' ? 'DESC' : 'ASC'}` : '1'
    const { rows } = await pool.query(
      `SELECT * FROM "${tableName}" ORDER BY ${orderCol} LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    )
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM "${tableName}"`,
    )
    return { rows, totalCount: parseInt(countRows[0]?.count as string ?? '0', 10), page, pageSize }
  } catch (err) {
    return { rows: [], totalCount: 0, page: data.page ?? 1, pageSize: data.pageSize ?? 25, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function createRecord(data: { connectionId: string; tableName: string; values: Record<string, unknown> }) {
  try {
    const connStr = await getConnectionString(data.connectionId)
    const pool = getPool(data.connectionId, connStr)
    const tableName = assertIdent(data.tableName)
    const keys = assertIdents(Object.keys(data.values))
    const placeholders = keys.map((_, i) => `$${i + 1}`)
    const { rows } = await pool.query(
      `INSERT INTO "${tableName}" (${keys.map((k) => `"${k}"`).join(', ')})
       VALUES (${placeholders.join(', ')}) RETURNING *`,
      Object.values(data.values),
    )
    return { record: rows[0] }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function updateRecord(data: {
  connectionId: string; tableName: string; primaryKey: { column: string; value: unknown }
  values: Record<string, unknown>
}) {
  try {
    const connStr = await getConnectionString(data.connectionId)
    const pool = getPool(data.connectionId, connStr)
    const tableName = assertIdent(data.tableName)
    const primaryKeyColumn = assertIdent(data.primaryKey.column)
    const keys = assertIdents(Object.keys(data.values))
    if (keys.length === 0) return { success: true }
    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`)
    const params = [...Object.values(data.values), data.primaryKey.value]
    await pool.query(
      `UPDATE "${tableName}" SET ${setClauses.join(', ')}
       WHERE "${primaryKeyColumn}" = $${params.length} RETURNING *`,
      params,
    )
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function deleteRecord(data: {
  connectionId: string; tableName: string; primaryKey: { column: string; value: unknown }
}) {
  try {
    const connStr = await getConnectionString(data.connectionId)
    const pool = getPool(data.connectionId, connStr)
    const tableName = assertIdent(data.tableName)
    const primaryKeyColumn = assertIdent(data.primaryKey.column)
    await pool.query(
      `DELETE FROM "${tableName}" WHERE "${primaryKeyColumn}" = $1`,
      [data.primaryKey.value],
    )
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function getForeignKeyOptions(data: {
  connectionId: string; referencedTable: string; referencedColumn: string
}) {
  try {
    const connStr = await getConnectionString(data.connectionId)
    const pool = getPool(data.connectionId, connStr)
    const referencedTable = assertIdent(data.referencedTable)
    const referencedColumn = assertIdent(data.referencedColumn)
    const { rows } = await pool.query(
      `SELECT "${referencedColumn}" FROM "${referencedTable}" ORDER BY "${referencedColumn}" LIMIT 200`,
    )
    return { options: rows.map((r) => ({ value: r[referencedColumn], label: String(r[referencedColumn]) })) }
  } catch (err) {
    return { options: [], error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}
