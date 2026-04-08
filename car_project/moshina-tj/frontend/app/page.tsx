import HomeClient from './HomeClient'
import type { Listing } from '@/types'
import type { MarketplaceStats } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

async function fetchFeatured(): Promise<Listing[]> {
  if (!API_URL) return []
  try {
    const res = await fetch(`${API_URL}/listings/featured`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json?.data) ? json.data : []
  } catch {
    return []
  }
}

async function fetchStats(): Promise<MarketplaceStats | null> {
  if (!API_URL) return null
  try {
    const res = await fetch(`${API_URL}/stats`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const json = await res.json()
    return json?.data ?? null
  } catch {
    return null
  }
}

export default async function HomePage() {
  const [initialFeatured, initialStats] = await Promise.all([
    fetchFeatured(),
    fetchStats(),
  ])

  return <HomeClient initialFeatured={initialFeatured} initialStats={initialStats} />
}
