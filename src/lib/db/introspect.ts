import { getPool } from '@/lib/db/pool'

export interface ColumnInfo {
  name: string
  dataType: string
  isNullable: boolean
  isPrimaryKey: boolean
  defaultValue: string | null
  maxLength: number | null
}

export interface ForeignKeyInfo {
  columnName: string
  referencedTable: string
  referencedColumn: string
}

export interface TableInfo {
  name: string
  schema: string
  columns: ColumnInfo[]
  foreignKeys: ForeignKeyInfo[]
}

export async function getTables(connectionId: string, connectionString: string): Promise<TableInfo[]> {
  const pool = getPool(connectionId, connectionString)

  const { rows: tables } = await pool.query<{ table_name: string; table_schema: string }>(`
    SELECT table_name, table_schema
    FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      AND table_type = 'BASE TABLE'
    ORDER BY table_schema, table_name
  `)

  const results: TableInfo[] = []

  for (const t of tables) {
    const columns = await getColumns(pool, t.table_schema, t.table_name)
    const foreignKeys = await getForeignKeys(pool, t.table_schema, t.table_name)
    results.push({
      name: t.table_name,
      schema: t.table_schema,
      columns,
      foreignKeys,
    })
  }

  return results
}

async function getColumns(pool: ReturnType<typeof getPool>, schema: string, table: string): Promise<ColumnInfo[]> {
  const { rows } = await pool.query<{
    column_name: string; data_type: string; is_nullable: string
    column_default: string | null; character_maximum_length: number | null
    is_primary_key: boolean
  }>(`
    SELECT
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      c.character_maximum_length,
      COALESCE(tc.constraint_type = 'PRIMARY KEY', false) AS is_primary_key
    FROM information_schema.columns c
    LEFT JOIN information_schema.key_column_usage kcu
      ON c.table_schema = kcu.table_schema
      AND c.table_name = kcu.table_name
      AND c.column_name = kcu.column_name
    LEFT JOIN information_schema.table_constraints tc
      ON kcu.constraint_name = tc.constraint_name
      AND tc.constraint_type = 'PRIMARY KEY'
    WHERE c.table_schema = $1 AND c.table_name = $2
    ORDER BY c.ordinal_position
  `, [schema, table])

  return rows.map((r) => ({
    name: r.column_name,
    dataType: r.data_type,
    isNullable: r.is_nullable === 'YES',
    isPrimaryKey: r.is_primary_key,
    defaultValue: r.column_default,
    maxLength: r.character_maximum_length,
  }))
}

async function getForeignKeys(pool: ReturnType<typeof getPool>, schema: string, table: string): Promise<ForeignKeyInfo[]> {
  const { rows } = await pool.query<{
    column_name: string; referenced_table_name: string; referenced_column_name: string
  }>(`
    SELECT
      kcu.column_name,
      ccu.table_name AS referenced_table_name,
      ccu.column_name AS referenced_column_name
    FROM information_schema.key_column_usage kcu
    JOIN information_schema.referential_constraints rc
      ON kcu.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name
    WHERE kcu.table_schema = $1 AND kcu.table_name = $2
  `, [schema, table])

  return rows.map((r) => ({
    columnName: r.column_name,
    referencedTable: r.referenced_table_name,
    referencedColumn: r.referenced_column_name,
  }))
}
