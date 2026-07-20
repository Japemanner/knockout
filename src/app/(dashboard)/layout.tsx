import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/profile'
import { AppShell } from '@/components/layout/AppShell'
import { AuthInitializer } from '@/components/auth/AuthInitializer'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const userId = await getUserId()
  if (!userId) {
    redirect('/login')
  }

  const supabase = await createClient()
  const profile = await getProfile(supabase, userId)

  return (
    <AuthInitializer userId={userId} profile={profile}>
      <AppShell>{children}</AppShell>
    </AuthInitializer>
  )
}
