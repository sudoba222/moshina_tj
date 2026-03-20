import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tajcar.tj'
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/catalog', '/car/', '/dealers/', '/rent', '/installment'],
        disallow: ['/admin', '/moderator', '/manager', '/support', '/dashboard', '/post', '/auth/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
