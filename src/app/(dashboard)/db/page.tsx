import { LocalTableList } from '@/components/db-explorer/LocalTableList'

export default function DatabasePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Database</h1>
      <p className="text-muted-foreground mb-8">Alle tabellen in je Supabase-database</p>
      <LocalTableList />
    </div>
  )
}