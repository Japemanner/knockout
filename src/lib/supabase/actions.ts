import { createClient, createServiceClient, getUserId } from '@/lib/supabase/server'

// Use untyped client to avoid strict generic issues with Supabase query builder
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = any

export async function getAuthenticatedClient(): Promise<{ supabase: UntypedClient; userId: string }> {
  const userId = await getUserId()
  if (!userId) throw new Error('Niet ingelogd')
  const supabase = await createClient()
  return { supabase: supabase as unknown as UntypedClient, userId }
}

// Geverifieerde admin-sessie: rol komt uit kk_profiles, niet uit de x-user-id
// header. Gebruikt door alle acties die de service-role client inzetten.
export async function requireAdmin(): Promise<{ userId: string }> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) throw new Error('Niet ingelogd')
  const { data: profile } = await supabase
    .from('kk_profiles')
    .select('role')
    .eq('id', userId)
    .single()
  if ((profile as { role?: string } | null)?.role !== 'admin') throw new Error('Geen toegang')
  return { userId }
}

// Service-role client (omzeilt RLS) met login-verificatie. Voor server-side
// admin-operaties zoals de CRUD DB-explorer die alle rijen moet tonen.
// De service role key zit alleen in server code, nooit in de client bundle.
export async function getServiceClient(): Promise<{ supabase: UntypedClient; userId: string }> {
  const { userId } = await requireAdmin()
  const supabase = await createServiceClient()
  return { supabase: supabase as unknown as UntypedClient, userId }
}