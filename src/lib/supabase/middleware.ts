import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  )

  // Local JWT verification via getClaims() — avoids a network round-trip to
  // Supabase Auth on every request. Requires asymmetric JWT signing keys
  // (RS256/ES256) enabled in the Supabase Dashboard → Project Settings →
  // JWT Keys. Falls back to a server call for HS256 (symmetric) keys.
  let user: { id: string } | null = null
  try {
    const { data } = await supabase.auth.getClaims()
    if (data?.claims?.sub) {
      user = { id: data.claims.sub }
    }
  } catch {
    user = null
  }

  if (user) {
    request.headers.set('x-user-id', user.id)
    supabaseResponse = NextResponse.next({ request })
  }

  return { supabaseResponse, user }
}
