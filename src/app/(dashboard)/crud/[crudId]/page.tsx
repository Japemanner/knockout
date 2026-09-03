import { createClient, getUserId } from '@/lib/supabase/server'
import { CrudTableWrapper } from '@/components/crud/CrudTableWrapper'
import { CrudDetailActions } from '@/components/crud/CrudDetailActions'
import { ColumnVisibilityDialog } from '@/components/crud/ColumnVisibilityDialog'
import { getLocalTableMeta, getLocalTableRecords } from '@/actions/local-db'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface CrudOverviewData {
  id: string
  name: string
  table_name: string | null
  connection_id: string | null
  interaction_type: string
  hidden_columns: string[]
  column_order: string[]
}

export const revalidate = 60

export default async function CrudDetailPage({ params }: { params: Promise<{ crudId: string }> }) {
  const { crudId } = await params
  const userId = await getUserId()
  if (!userId) notFound()

  const supabase = await createClient()
  const { data: overview } = await supabase
    .from('kk_crud_overviews')
    .select('*')
    .eq('id', crudId)
    .eq('user_id', userId)
    .single()

  const crud = overview as CrudOverviewData | null
  if (!crud) notFound()

  if (crud.connection_id) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-8">
          <Link href="/crud" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{crud.name}</h1>
            <p className="text-sm text-muted-foreground">Externe database</p>
          </div>
        </div>
        <div className="text-center py-12">
          <p className="text-destructive font-medium mb-2">Niet meer beschikbaar</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Externe databaseverbindingen worden niet meer ondersteund. Verwijder deze CRUD view en maak een nieuwe aan met &quot;Eigen project&quot;.
          </p>
        </div>
      </div>
    )
  }

  if (!crud.table_name) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-8">
          <Link href="/crud" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{crud.name}</h1>
            <p className="text-sm text-muted-foreground">Geen tabel gekoppeld</p>
          </div>
          <div className="ml-auto">
            <CrudDetailActions crudId={crudId} name={crud.name} />
          </div>
        </div>
        <div className="text-center py-12">
          <p className="text-destructive font-medium mb-2">Geen tabel gekoppeld</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Deze CRUD view heeft geen tabel. Verwijder hem en maak een nieuwe aan.
          </p>
        </div>
      </div>
    )
  }

  const [metaResult, recordsResult] = await Promise.all([
    getLocalTableMeta(crud.table_name),
    getLocalTableRecords({ tableName: crud.table_name, page: 1, pageSize: 25 }),
  ])

  if (metaResult.error || !metaResult.meta) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-8">
          <Link href="/crud" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{crud.name}</h1>
            <p className="text-sm text-muted-foreground">Eigen project · {crud.table_name}</p>
          </div>
          <div className="ml-auto">
            <CrudDetailActions crudId={crudId} name={crud.name} />
          </div>
        </div>
        <div className="text-center py-12">
          <p className="text-destructive font-medium mb-2">Fout bij laden van tabel</p>
          <p className="text-sm text-muted-foreground">{metaResult.error}</p>
        </div>
      </div>
    )
  }

  if (recordsResult.error) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-8">
          <Link href="/crud" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{crud.name}</h1>
            <p className="text-sm text-muted-foreground">
              Eigen project · {crud.table_name} · {metaResult.meta.columns.length} kolommen
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ColumnVisibilityDialog
              crudId={crudId}
              columns={metaResult.meta.columns}
              hiddenColumns={crud.hidden_columns ?? []}
              columnOrder={crud.column_order ?? []}
            />
            <CrudDetailActions crudId={crudId} name={crud.name} />
          </div>
        </div>
        <div className="text-center py-12">
          <p className="text-destructive font-medium mb-2">Fout bij laden van records</p>
          <p className="text-sm text-muted-foreground">{recordsResult.error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/crud" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{crud.name}</h1>
          <p className="text-sm text-muted-foreground">
            Eigen project · {crud.table_name} · {metaResult.meta.columns.length} kolommen
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ColumnVisibilityDialog
            crudId={crudId}
            columns={metaResult.meta.columns}
            hiddenColumns={crud.hidden_columns ?? []}
            columnOrder={crud.column_order ?? []}
          />
          <CrudDetailActions crudId={crudId} name={crud.name} />
        </div>
      </div>
      <CrudTableWrapper
        crudId={crudId}
        tableName={crud.table_name}
        columns={metaResult.meta.columns}
        foreignKeys={metaResult.meta.foreignKeys}
        hiddenColumns={crud.hidden_columns ?? []}
        columnOrder={crud.column_order ?? []}
        initialRows={recordsResult.rows as Record<string, unknown>[]}
        initialTotal={recordsResult.totalCount}
      />
    </div>
  )
}