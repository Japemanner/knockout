'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Settings, 
  Star, 
  Users, 
  Columns3,
  Focus,
  X,
  LogOut,
  Menu,
  Gauge,
  BarChart3,
  Bot,
  ExternalLink,
  Database
} from 'lucide-react'

const navItems = [
  { href: '/command-center', label: 'Command Center', icon: LayoutDashboard, external: false },
  { href: '/boards', label: 'Borden', icon: Columns3, external: false },
  { href: '/crud', label: 'CRUD', icon: Database, external: false },
  { href: '/starred', label: 'Gesterd', icon: Star, external: false },
  { href: '/focus', label: 'Focus', icon: Focus, external: false },
  { href: '/db', label: 'Database', icon: Database, external: false, adminOnly: true },
  { href: '/team', label: 'Team', icon: Users, external: false },
  { href: 'https://dashboards.jaaphoeve.com/', label: 'Metabase', icon: BarChart3, external: true },
  { href: 'https://jape-darwin.netlify.app/', label: 'Darwin', icon: Bot, external: true },
  { href: '/settings', label: 'Instellingen', icon: Settings, external: false },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isAdmin = profile?.role === 'admin'

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    useAuthStore.getState().signOut()
    router.push('/login')
    router.refresh()
  }

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between mb-8">
        <Link href="/boards" className="text-xl font-bold hover:text-primary">
          <Gauge className="h-8 w-8 text-primary" />
        </Link>
        <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
        {navItems
          .filter((item) => {
            if (item.adminOnly || item.href === '/team' || item.href === '/settings') return isAdmin
            return true
          })
          .map((item) => (
            item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          ))}
      </nav>
      <div className="border-t pt-4 flex items-center gap-3 mt-auto">
        <Avatar fallback={profile?.full_name ?? undefined} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{profile?.full_name ?? 'Gebruiker'}</p>
          <p className="text-xs text-muted-foreground truncate">{profile?.role ?? 'member'}</p>
        </div>
        <ThemeToggle />
        <Button variant="ghost" size="icon" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-muted/20">
      <button
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="h-6 w-6" />
      </button>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-background border-r p-4 flex flex-col">
            {sidebarContent}
          </div>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 w-64 bg-background border-r p-4 flex-col hidden lg:flex">
        {sidebarContent}
      </aside>

      <main className="lg:pl-64 min-h-screen">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}
