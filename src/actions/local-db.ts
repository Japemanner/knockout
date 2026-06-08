'use server'

import { getTables as introspectTables, getPool } from '@/lib/db'
import type { ColumnInfo, ForeignKeyInfo, TableInfo } from '@/lib/db/introspect'

const LOCAL_CONNECTION_ID = '__local__'

function getLocalConnectionString(): string {
  const url = process.env.DIRECT_DATABASE_URL
  if (!url) throw new Error('DIRECT_DATABASE_URL is niet geconfigureerd')
  return url
}

export { ColumnInfo, ForeignKeyInfo, TableInfo }

export async function getLocalTableList() {
  try {
    const connStr = getLocalConnectionString()
    const tables = await introspectTables(LOCAL_CONNECTION_ID, connStr)
    return { tables }
  } catch (err) {
    return { tables: [], error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function getLocalTableRecords(data: {
  tableName: string; page?: number; pageSize?: number
  orderBy?: string; orderDir?: 'asc' | 'desc'
}) {
  try {
    const connStr = getLocalConnectionString()
    const pool = getPool(LOCAL_CONNECTION_ID, connStr)
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

export async function createLocalRecord(data: { tableName: string; values: Record<string, unknown> }) {
  try {
    const connStr = getLocalConnectionString()
    const pool = getPool(LOCAL_CONNECTION_ID, connStr)
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

export async function updateLocalRecord(data: {
  tableName: string; primaryKey: { column: string; value: unknown }
  values: Record<string, unknown>
}) {
  try {
    const connStr = getLocalConnectionString()
    const pool = getPool(LOCAL_CONNECTION_ID, connStr)
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

export async function deleteLocalRecord(data: {
  tableName: string; primaryKey: { column: string; value: unknown }
}) {
  try {
    const connStr = getLocalConnectionString()
    const pool = getPool(LOCAL_CONNECTION_ID, connStr)
    await pool.query(
      `DELETE FROM "${data.tableName}" WHERE "${data.primaryKey.column}" = $1`,
      [data.primaryKey.value],
    )
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function getLocalForeignKeyOptions(data: {
  referencedTable: string; referencedColumn: string
}) {
  try {
    const connStr = getLocalConnectionString()
    const pool = getPool(LOCAL_CONNECTION_ID, connStr)
    const { rows } = await pool.query(
      `SELECT "${data.referencedColumn}" FROM "${data.referencedTable}" ORDER BY "${data.referencedColumn}" LIMIT 200`,
    )
    return { options: rows.map((r) => ({ value: r[data.referencedColumn], label: String(r[data.referencedColumn]) })) }
  } catch (err) {
    return { options: [], error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}