/** @type {import('next').NextConfig} */

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
      { protocol: 'https', hostname: 'cdn.jsdelivr.net' },         // car brand logos CDN (fallback)
      { protocol: 'https', hostname: 'raw.githubusercontent.com' }, // car brand logos CDN
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400, // 24 h
  },

  // ── HTTP Headers ──────────────────────────────────────────────────────────
  // NOTE: Content-Security-Policy is intentionally omitted here.
  // It is set per-request in middleware.ts using a per-request nonce so that
  // 'unsafe-inline' is no longer needed on script-src.
  async headers() {
    return [
      // /_next/static — Vercel handles immutable caching automatically; no override needed.
      // Public static files (fonts, icons, og-image, etc.)
      {
        source: '/(.+\\.(?:ico|png|jpg|jpeg|webp|avif|svg|woff|woff2|ttf|otf|eot))',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
      // Security headers for every response (CSP handled by middleware.ts)
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
