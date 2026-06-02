'use server'

import { getConnectionString } from '@/actions/db-connections'
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
    const page = data.page ?? 1
    const pageSize = data.pageSize ?? 25
    const offset = (page - 1) * pageSize

    const orderCol = data.orderBy ? `"${data.orderBy}" ${data.orderDir === 'desc' ? 'DESC' : 'ASC'}` : '1'
    const { rows } = await pool.query(
      `SELECT * FROM "${data.tableName}" ORDER BY ${orderCol} LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    )
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM "${data.tableName}"`,
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
    const keys = Object.keys(data.values)
    const placeholders = keys.map((_, i) => `$${i + 1}`)
    const { rows } = await pool.query(
      `INSERT INTO "${data.tableName}" (${keys.map((k) => `"${k}"`).join(', ')})
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
    const keys = Object.keys(data.values)
    if (keys.length === 0) return { success: true }
    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`)
    const params = [...Object.values(data.values), data.primaryKey.value]
    await pool.query(
      `UPDATE "${data.tableName}" SET ${setClauses.join(', ')}
       WHERE "${data.primaryKey.column}" = $${params.length} RETURNING *`,
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
    await pool.query(
      `DELETE FROM "${data.tableName}" WHERE "${data.primaryKey.column}" = $1`,
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
    const { rows } = await pool.query(
      `SELECT "${data.referencedColumn}" FROM "${data.referencedTable}" ORDER BY "${data.referencedColumn}" LIMIT 200`,
    )
    return { options: rows.map((r) => ({ value: r[data.referencedColumn], label: String(r[data.referencedColumn]) })) }
  } catch (err) {
    return { options: [], error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}
