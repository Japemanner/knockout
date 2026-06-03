import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { AuthInitializer } from '@/components/auth/AuthInitializer'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('kk_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <AuthInitializer user={user} profile={profile}>
      <AppShell>{children}</AppShell>
    </AuthInitializer>
  )
}
