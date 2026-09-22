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
  // Supabase Auth on every request. Asymmetric JWT signing keys (ES256) have
  // been enabled in the Supabase Dashboard → Project Settings → JWT Keys
  // since 2026-09-22 (verified by tests/e2e/auth-jwks.spec.ts), so getClaims()
  // verifies new tokens locally. HS256 tokens issued before the rotation
  // (valid for max ~1 hour) still fall back to a server call via
  // /auth/v1/user until they expire. auth-js 2.110.2 caches the JWKS for
  // 10 minutes per instance (GLOBAL_JWKS).
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
