import Link from 'next/link'

interface CategoryTabsProps {
  categories: { id: string; name: string }[]
  activeCategoryId: string | null
}

export function CategoryTabs({ categories, activeCategoryId }: CategoryTabsProps) {
  const tabClass = (active: boolean) =>
    `shrink-0 px-3 py-1.5 rounded-full border text-sm font-medium whitespace-nowrap transition-colors ${
      active ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background hover:bg-accent'
    }`

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      <Link href="/crud" className={tabClass(activeCategoryId === null)}>
        Alle
      </Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/crud?category=${category.id}`}
          className={tabClass(activeCategoryId === category.id)}
        >
          {category.name}
        </Link>
      ))}
    </div>
  )
}
