import { createClient, getUserId } from '@/lib/supabase/server'

// Use untyped client to avoid strict generic issues with Supabase query builder
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = any

export async function getAuthenticatedClient(): Promise<{ supabase: UntypedClient; userId: string }> {
  const userId = await getUserId()
  if (!userId) throw new Error('Niet ingelogd')
  const supabase = await createClient()
  return { supabase: supabase as unknown as UntypedClient, userId }
}