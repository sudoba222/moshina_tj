import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tajcar.tj'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

interface ListingItem {
  id: string
  updated_at: string
}

interface DealerItem {
  id: string
  updated_at?: string
}

interface ListingsApiResponse {
  success: boolean
  data: {
    items: ListingItem[]
    total: number
    pages: number
  }
}

interface DealersApiResponse {
  success: boolean
  data: DealerItem[]
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
    const firstData: ListingsApiResponse = await first.json()
    const pages = Math.min(firstData.data?.pages ?? 1, 10) // cap at 10 pages to prevent timeout

    const requests = Array.from({ length: pages }, (_, i) =>
      fetch(`${API_URL}/listings?page=${i + 1}&limit=100`, {
        next: { revalidate: 3600 },
      })
        .then((r) => r.json() as Promise<ListingsApiResponse>)
        .then((d) => d.data?.items ?? [])
        .catch((): ListingItem[] => [])
    )
    const results = await Promise.all(requests)
    return results.flat()
  } catch {
    return []
  }
}

async function fetchAllDealerIds(): Promise<DealerItem[]> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(`${API_URL}/dealers`, {
      next: { revalidate: 3600 },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) return []
    const data: DealersApiResponse = await res.json()
    return data.data ?? []
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/catalog`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/rent`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/dealers`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/installment`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ]

  const [listings, dealers] = await Promise.all([
    fetchAllListingIds(),
    fetchAllDealerIds(),
  ])

  const listingRoutes: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${SITE_URL}/car/${l.id}`,
    lastModified: l.updated_at ? new Date(l.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const dealerRoutes: MetadataRoute.Sitemap = dealers.map((d) => ({
    url: `${SITE_URL}/dealers/${d.id}`,
    lastModified: d.updated_at ? new Date(d.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [...staticRoutes, ...listingRoutes, ...dealerRoutes]
}
