import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'
import type { Database } from '@/types/database.types'

export async function getUserId(): Promise<string | null> {
  const headerStore = await headers()
  return headerStore.get('x-user-id')
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — ignore if read-only context
          }
        },
      },
    },
  )
}

// Service-role client via supabase-js (niet @supabase/ssr). De SSR client
// leest de user-session uit cookies en overschrijft de service role key met
// de user-JWT in de Authorization header — waardoor RLS toch geldt.
// supabase-js createClient zonder cookie-handling omzeilt RLS correct.
// Zie https://supabase.com/docs/guides/local-development/troubleshooting#ssr-client-initialized-with-service-role
export async function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )
}
