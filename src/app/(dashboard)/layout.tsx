import { redirect } from 'next/navigation'
import { createClient, getUserId } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { AuthInitializer } from '@/components/auth/AuthInitializer'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const userId = await getUserId()
  if (!userId) {
    redirect('/login')
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('kk_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return (
    <AuthInitializer userId={userId} profile={profile}>
      <AppShell>{children}</AppShell>
    </AuthInitializer>
  )
}
