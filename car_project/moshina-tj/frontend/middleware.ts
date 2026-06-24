import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Generate a cryptographically random nonce for this request
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const isDev = process.env.NODE_ENV !== 'production'

  // Derive connect-src origins from env
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
  let apiOrigin = ''
  let wsOrigin = ''
  try {
    if (apiUrl) {
      apiOrigin = new URL(apiUrl).origin
      wsOrigin = apiOrigin.replace(/^http/, 'ws')
    }
  } catch {
    // ignore malformed URL in env
  }

  const connectSrcParts = [
    "'self'",
    'https://mc.yandex.ru',
    ...(isDev ? ['http://localhost:8000', 'ws://localhost:8000'] : []),
    ...(apiOrigin ? [apiOrigin] : []),
    ...(wsOrigin ? [wsOrigin] : []),
  ]

  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://cdn.jsdelivr.net https://raw.githubusercontent.com https://mc.yandex.ru",
    `connect-src ${connectSrcParts.join(' ')}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  // Clone the request headers and attach the nonce so server components can read it
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // Set the CSP on the response
  response.headers.set('Content-Security-Policy', cspHeader)

  return response
}

// Apply to all routes except Next.js internals and static files
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot|avif)).*)',
  ],
}
