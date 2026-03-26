import type { MetadataRoute } from 'next'

const PRIVATE_PATHS = [
  '/admin',
  '/moderator',
  '/manager',
  '/support',
  '/dashboard',
  '/auth/',
  '/api/',
]

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tajcar.tj'
  return {
    rules: [
      {
        // Global rule — applies to all crawlers including Googlebot and YandexBot
        // Specific bot rules below must repeat the disallow list to avoid overriding
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        // Googlebot: same disallows — no override that would expose staff pages
        userAgent: 'Googlebot',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: 'YandexBot',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
