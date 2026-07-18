import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/supabase/server'
import { getCachedProfile } from '@/lib/supabase/profile'
import { AppShell } from '@/components/layout/AppShell'
import { AuthInitializer } from '@/components/auth/AuthInitializer'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const userId = await getUserId()
  if (!userId) {
    redirect('/login')
  }

  const profile = await getCachedProfile(undefined, userId)

  return (
    <AuthInitializer userId={userId} profile={profile}>
      <AppShell>{children}</AppShell>
    </AuthInitializer>
  )
}
