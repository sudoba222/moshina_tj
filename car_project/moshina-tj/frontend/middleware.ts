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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow admin login page through without auth check
  if (pathname === '/admin/login') return NextResponse.next()

  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )

  if (!isProtected) return NextResponse.next()

  // auth_session is a non-HttpOnly flag cookie set by AuthContext on login.
  // The actual JWT lives in an HttpOnly cookie on the API domain — middleware
  // cannot read it directly, so we use this presence flag instead.
  const authSession = request.cookies.get('auth_session')?.value

  if (!authSession) {
    // Admin/staff routes redirect to the admin login page, not the public login
    const isAdminRoute = pathname.startsWith('/admin/')
    const loginPath = isAdminRoute ? '/admin/login' : '/auth/login'
    const loginUrl = new URL(loginPath, request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
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
