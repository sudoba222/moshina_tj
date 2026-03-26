/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
const apiOrigin = apiUrl ? new URL(apiUrl).origin : ''
// Derive WebSocket origin from API origin (https: → wss:, http: → ws:)
const wsOrigin = apiOrigin ? apiOrigin.replace(/^http/, 'ws') : ''
const isDev = process.env.NODE_ENV !== 'production'

const nextConfig = {
  // ── Performance ───────────────────────────────────────────────────────────
  compress: true,
  poweredByHeader: false,
  // optimizeCss: true requires the 'critters' package to be installed separately.
  // Re-enable by running: npm install critters
  // experimental: {
  //   optimizeCss: true,
  // },

  // ── Images ────────────────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400, // 24 h
  },

  // ── HTTP Headers ──────────────────────────────────────────────────────────
  async headers() {
    return [
      // Static assets: immutable cache (Next.js hashes the filenames)
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Public static files (fonts, icons, og-image, etc.)
      {
        source: '/(.+\\.(?:ico|png|jpg|jpeg|webp|avif|svg|woff|woff2|ttf|otf|eot))',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
      // Security headers for every response
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com",
              `connect-src 'self'${isDev ? ' http://localhost:8000 ws://localhost:8000' : ''}${apiOrigin ? ` ${apiOrigin}` : ''}${wsOrigin ? ` ${wsOrigin}` : ''}`,
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
