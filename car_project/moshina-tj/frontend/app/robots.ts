import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tajcar.tj'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/catalog',
          '/car/',
          '/dealers',
          '/dealers/',
          '/rent',
          '/installment',
          '/electric',
          '/dushanbe',
          '/khujand',
          '/bokhtar',
          '/kulob',
          '/istaravshan',
          '/tursunzoda',
          '/about',
          '/terms',
          '/privacy',
        ],
        disallow: [
          '/admin',
          '/admin/',
          '/moderator',
          '/moderator/',
          '/manager',
          '/manager/',
          '/support',
          '/support/',
          '/dashboard',
          '/dashboard/',
          '/auth',
          '/auth/',
          '/api',
          '/api/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    // Note: do NOT add host: — Next.js renders it as "Host: https://..." which is invalid
  }
}
