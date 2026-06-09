import { createClient } from '@/lib/supabase/server'

// Use untyped client to avoid strict generic issues with Supabase query builder
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = any

export async function getAuthenticatedClient(): Promise<{ supabase: UntypedClient; userId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  return { supabase: supabase as unknown as UntypedClient, userId: user.id }
}