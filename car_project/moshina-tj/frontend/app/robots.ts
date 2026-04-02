import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tajcar.tj'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/moderator',
        '/manager',
        '/support',
        '/dashboard',
        '/auth',
        '/api',
        '/post',
        '/users',
        '/auction',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
