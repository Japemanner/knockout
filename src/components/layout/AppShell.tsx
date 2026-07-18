'use client'

import { useState, useCallback, useRef } from 'react'
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
  Users, 
  Columns3,
  X,
  LogOut,
  Menu,
  Gauge,
  BarChart3,
  Bot,
  ExternalLink,
  Database,
  GitBranch,
  LineChart,
  Shield,
  Workflow,
  Hexagon,
  Briefcase,
  TrendingUp,
  Clock,
  Mail
} from 'lucide-react'

const navItems = [
  { href: '/command-center', label: 'Command Center', icon: LayoutDashboard, external: false, prefetch: true },
  { href: '/boards', label: 'Borden', icon: Columns3, external: false, prefetch: true },
  { href: '/crud', label: 'CRUD', icon: Database, external: false, prefetch: false },
  { href: '/uren', label: 'Uren', icon: Clock, external: false, prefetch: true },
  { href: '/db', label: 'Database', icon: Database, external: false, adminOnly: true, prefetch: false },
  { href: '/team', label: 'Team', icon: Users, external: false, prefetch: false },
  { href: '/settings', label: 'Instellingen', icon: Settings, external: false, prefetch: false },
]

const externalLinks = [
  { href: 'https://mijn.amfico.nl/', label: 'Amfico', icon: Shield },
  { href: 'https://jape-darwin.netlify.app/', label: 'Darwin', icon: Bot },
  { href: 'http://5.189.133.117:3000/login', label: 'Grafana', icon: LineChart },
  { href: 'https://ui.honeycomb.io/', label: 'Honeycomb', icon: Hexagon },
  { href: 'https://app-eu1.hubspot.com/', label: 'Hubspot', icon: Briefcase },
  { href: 'https://eu.smith.langchain.com/', label: 'LangSmith', icon: GitBranch },
  { href: 'https://mail.cirrux.co/inbox', label: 'Mail', icon: Mail },
  { href: 'https://dashboards.jaaphoeve.com/', label: 'Metabase', icon: BarChart3 },
  { href: 'https://process.jaaphoeve.com/projects/', label: 'N8N', icon: Workflow },
  { href: 'https://eu.posthog.com/', label: 'PostHog', icon: TrendingUp },
  { href: 'https://supabase.com/dashboard/org/uugfxsnmwvodxsxcbqub', label: 'Supabase', icon: Database },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isAdmin = profile?.role === 'admin'

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const getSupabase = useCallback(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }, [])

  const handleSignOut = useCallback(async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    useAuthStore.getState().signOut()
    router.push('/login')
    router.refresh()
  }, [getSupabase, router])

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
            <Link
              key={item.href}
              href={item.href}
              prefetch={item.prefetch ?? null}
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
          ))}
        {externalLinks.length > 0 && (
          <>
            <div className="mt-4 mb-1 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Extern
            </div>
            {externalLinks.map((item) => (
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
            ))}
          </>
        )}
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
