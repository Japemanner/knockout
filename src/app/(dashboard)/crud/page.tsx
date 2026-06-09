import { createClient } from '@/lib/supabase/server'
import { CreateCrudButton } from '@/components/crud/CreateCrudButton'
import { CrudOverviewCard } from '@/components/crud/CrudOverviewCard'
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
          overviews.map((overview: CRUDOverview) => (
            <CrudOverviewCard
              key={overview.id}
              id={overview.id}
              name={overview.name}
              connection_id={overview.connection_id}
              table_name={overview.table_name}
              interaction_type={overview.interaction_type}
            />
          ))
        ) : (
          <p className="text-muted-foreground col-span-full text-center py-12">
            Nog geen CRUD overzichten. Maak je eerste overzicht aan met de knop hierboven.
          </p>
        )}
      </div>
    </div>
  )
}