import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Staff-only paths — protected server-side with role checks.
const PROTECTED_PATHS = [
  '/admin',
  '/moderator',
  '/manager',
  '/support',
]

const STAFF_ROLE_PATHS: Record<string, string[]> = {
  '/admin':     ['admin', 'moderator', 'manager', 'support'],
  '/moderator': ['admin', 'moderator'],
  '/manager':   ['admin', 'manager'],
  '/support':   ['admin', 'support'],
}

function decodeJwtRole(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'))
    if (payload.exp && typeof payload.exp === 'number') {
      if (Date.now() / 1000 > payload.exp) return null
    }
    return typeof payload.role === 'string' ? payload.role : null
  } catch {
    return null
  }
}

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== 'production'
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
  let apiOrigin = ''
  let wsOrigin = ''
  try {
    if (apiUrl) {
      apiOrigin = new URL(apiUrl).origin
      wsOrigin = apiOrigin.replace(/^http/, 'ws')
    }
  } catch {
    // ignore malformed URL
  }

  const connectSrc = [
    "'self'",
    'https://mc.yandex.ru',
    ...(isDev ? ['http://localhost:8000', 'ws://localhost:8000'] : []),
    ...(apiOrigin ? [apiOrigin] : []),
    ...(wsOrigin ? [wsOrigin] : []),
  ].join(' ')

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://cdn.jsdelivr.net https://raw.githubusercontent.com https://mc.yandex.ru",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Generate per-request nonce for CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  // Inject nonce into request headers so server components can read it
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  // Allow admin login page through without auth check
  if (pathname === '/admin/login') {
    const res = NextResponse.next({ request: { headers: requestHeaders } })
    res.headers.set('Content-Security-Policy', buildCsp(nonce))
    return res
  }

  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )

  if (!isProtected) {
    const res = NextResponse.next({ request: { headers: requestHeaders } })
    res.headers.set('Content-Security-Policy', buildCsp(nonce))
    return res
  }

  // Read role from the HttpOnly JWT cookie
  const jwtToken = request.cookies.get('token')?.value
  const role = jwtToken ? decodeJwtRole(jwtToken) : null

  if (!role) {
    const isAdminRoute = pathname.startsWith('/admin/') || pathname === '/admin'
    const loginPath = isAdminRoute ? '/admin/login' : '/auth/login'
    const loginUrl = new URL(loginPath, request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  for (const [prefix, allowedRoles] of Object.entries(STAFF_ROLE_PATHS)) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      if (!allowedRoles.includes(role)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      break
    }
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } })
  res.headers.set('Content-Security-Policy', buildCsp(nonce))
  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot|avif)).*)',
  ],
}
