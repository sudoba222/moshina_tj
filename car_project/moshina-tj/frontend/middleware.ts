import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PATHS = [
  '/dashboard',
  '/admin',
  '/moderator',
  '/manager',
  '/support',
  '/post',
]

// Paths that require a specific staff role (beyond just being authenticated)
const STAFF_ROLE_PATHS: Record<string, string[]> = {
  '/admin':     ['admin', 'moderator', 'manager', 'support'],
  '/moderator': ['admin', 'moderator'],
  '/manager':   ['admin', 'manager'],
  '/support':   ['admin', 'support'],
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow admin login page through without auth check
  if (pathname === '/admin/login') return NextResponse.next()

  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )

  if (!isProtected) return NextResponse.next()

  // auth_session is a non-HttpOnly flag cookie set by AuthContext on login.
  // Its value is the user's role (e.g. "admin", "user").
  const role = request.cookies.get('auth_session')?.value

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
    '/dashboard/:path*',
    '/admin/:path*',
    '/moderator/:path*',
    '/manager/:path*',
    '/support/:path*',
    '/post/:path*',
    '/post',
  ],
}
