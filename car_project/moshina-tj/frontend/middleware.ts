import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Staff-only paths — protected server-side with role checks.
// /dashboard and /post are NOT here: the cookie lives on api.tajcar.tj and
// may not be readable by the Vercel middleware on tajcar.tj before the
// backend domain fix propagates. Those routes handle auth client-side via
// AuthContext (which calls /auth/me with credentials on every page load).
const PROTECTED_PATHS = [
  '/admin',
  '/moderator',
  '/manager',
  '/support',
]

// Paths that require a specific staff role (beyond just being authenticated)
const STAFF_ROLE_PATHS: Record<string, string[]> = {
  '/admin':     ['admin', 'moderator', 'manager', 'support'],
  '/moderator': ['admin', 'moderator'],
  '/manager':   ['admin', 'manager'],
  '/support':   ['admin', 'support'],
}

/**
 * Decode JWT payload without verifying the signature.
 * Safe for routing only — the backend verifies the signature on every API call.
 * Returns null if the token is malformed or expired.
 */
function decodeJwtRole(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    // URL-safe base64 → standard base64
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'))
    // Check expiry
    if (payload.exp && typeof payload.exp === 'number') {
      if (Date.now() / 1000 > payload.exp) return null
    }
    return typeof payload.role === 'string' ? payload.role : null
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow admin login page through without auth check
  if (pathname === '/admin/login') return NextResponse.next()

  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )

  if (!isProtected) return NextResponse.next()

  // Read role from the HttpOnly JWT cookie (cannot be forged by client-side JS)
  const jwtToken = request.cookies.get('token')?.value
  const role = jwtToken ? decodeJwtRole(jwtToken) : null

  if (!role) {
    // Admin/staff routes redirect to the admin login page, not the public login
    const isAdminRoute = pathname.startsWith('/admin/') || pathname === '/admin'
    const loginPath = isAdminRoute ? '/admin/login' : '/auth/login'
    const loginUrl = new URL(loginPath, request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Enforce role requirements for staff-only paths
  for (const [prefix, allowedRoles] of Object.entries(STAFF_ROLE_PATHS)) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      if (!allowedRoles.includes(role)) {
        // Authenticated but wrong role — send to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      break
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/moderator/:path*',
    '/manager/:path*',
    '/support/:path*',
  ],
}
