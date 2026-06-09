import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateCrudButton } from '@/components/crud/CreateCrudButton'
import { Table2, FormInput } from 'lucide-react'
import type { CRUDOverview } from '@/types/database.types'

export const revalidate = 60

export default async function CrudPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('kk_crud_overviews')
    .select('*')
    .eq('user_id', user!.id)
    .order('position', { ascending: true })

  const overviews: CRUDOverview[] = data ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">CRUD</h1>
          <p className="text-muted-foreground">Je database overzichten</p>
        </div>
        <CreateCrudButton overviews={overviews.map((o) => ({ id: o.id, name: o.name }))} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {overviews.length > 0 ? (
          overviews.map((overview: CRUDOverview) => {
            const href = overview.table_name
              ? (overview.connection_id
                ? `/settings/db/${overview.connection_id}/${overview.table_name}`
                : `/db/${overview.table_name}`)
              : `/crud/${overview.id}`

            return (
              <Link key={overview.id} href={href}>
                <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {overview.interaction_type === 'formulier' ? (
                        <FormInput className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Table2 className="h-5 w-5 text-muted-foreground" />
                      )}
                      {overview.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {overview.connection_id ? 'Externe database' : 'Eigen project'}
                      {overview.table_name && ` · ${overview.table_name}`}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )
          })
        ) : (
          <p className="text-muted-foreground col-span-full text-center py-12">
            Nog geen CRUD overzichten. Maak je eerste overzicht aan met de knop hierboven.
          </p>
        )}
      </div>
    </div>
  )
}