import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

const publicPaths = ['/login', '/auth/callback', '/forgot-password', '/reset-password']

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const path = request.nextUrl.pathname

  if (!user && !publicPaths.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return Response.redirect(url)
  }

  if (user && path === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/boards'
    return Response.redirect(url)
  }

  return supabaseResponse
}

// Edge runtime verlaagt cold-start + TTFB op elke request aanzienlijk op
// Netlify serverless. getClaims() is edge-compatible (WebCrypto API).
export const runtime = 'edge'

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
