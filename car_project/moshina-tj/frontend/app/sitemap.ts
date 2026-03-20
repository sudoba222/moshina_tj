import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tajcar.tj'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

interface ListingItem {
  id: string
  updated_at: string
}

interface ApiResponse {
  success: boolean
  data: {
    items: ListingItem[]
    total: number
    pages: number
  }
}

async function fetchAllListingIds(): Promise<ListingItem[]> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    const first = await fetch(`${API_URL}/listings?page=1&limit=1`, {
      next: { revalidate: 3600 },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!first.ok) return []
    const firstData: ApiResponse = await first.json()
    const pages = Math.min(firstData.data?.pages ?? 1, 10) // cap at 10 pages to prevent timeout

    const requests = Array.from({ length: pages }, (_, i) =>
      fetch(`${API_URL}/listings?page=${i + 1}&limit=100`, { next: { revalidate: 3600 } })
        .then((r) => r.json() as Promise<ApiResponse>)
        .then((d) => d.data?.items ?? [])
        .catch(() => [])
    )
    const results = await Promise.all(requests)
    return results.flat()
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/catalog`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/dealers`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/rent`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/installment`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  const listings = await fetchAllListingIds()
  const listingRoutes: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${SITE_URL}/car/${l.id}`,
    lastModified: l.updated_at ? new Date(l.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...staticRoutes, ...listingRoutes]
}
