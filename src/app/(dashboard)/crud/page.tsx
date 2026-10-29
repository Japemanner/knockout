import { createClient, getUserId } from '@/lib/supabase/server'
import { CreateCrudButton } from '@/components/crud/CreateCrudButton'
import { CrudOverviewCard } from '@/components/crud/CrudOverviewCard'
import { CategoryTabs } from '@/components/crud/CategoryTabs'
import type { CRUDOverview } from '@/types/database.types'

export default async function CrudPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams
  const userId = await getUserId()
  if (!userId) return null

  const supabase = await createClient()
  const [categoriesResult, overviewsResult] = await Promise.all([
    supabase
      .from('kk_crud_categories')
      .select('id, name')
      .eq('user_id', userId)
      .order('position', { ascending: true }),
    supabase
      .from('kk_crud_overviews')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true }),
  ])

  const categories = (categoriesResult.data ?? []) as { id: string; name: string }[]
  const allOverviews: CRUDOverview[] = (overviewsResult.data ?? [])
  const activeCategory =
    category && categories.some((c) => c.id === category) ? category : null
  const overviews = activeCategory
    ? allOverviews.filter((o) => o.category_id === activeCategory)
    : allOverviews

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">CRUD</h1>
          <p className="text-muted-foreground">Je database overzichten</p>
        </div>
        <CreateCrudButton categories={categories} defaultCategoryId={activeCategory} />
      </div>

      <div className="mb-8">
        <CategoryTabs categories={categories} activeCategoryId={activeCategory} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {overviews.length > 0 ? (
          overviews.map((overview: CRUDOverview) => (
            <CrudOverviewCard
              key={overview.id}
              id={overview.id}
              name={overview.name}
              table_name={overview.table_name}
              interaction_type={overview.interaction_type}
              categories={categories}
              category_id={overview.category_id}
            />
          ))
        ) : (
          <p className="text-muted-foreground col-span-full text-center py-12">
            {activeCategory
              ? 'Geen CRUD overzichten in deze categorie. Maak er een aan met de knop hierboven.'
              : 'Nog geen CRUD overzichten. Maak je eerste overzicht aan met de knop hierboven.'}
          </p>
        )}
      </div>
    </div>
  )
}