import { createClient, getUserId } from '@/lib/supabase/server'
import { HoursView } from '@/components/hours/HoursView'
import type { Client } from '@/types/database.types'

export const revalidate = 60

export default async function UrenPage() {
  const userId = await getUserId()
  if (!userId) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('kk_clients')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true })

  const clients: Client[] = (data ?? []) as Client[]

  return <HoursView initialClients={clients} />
}