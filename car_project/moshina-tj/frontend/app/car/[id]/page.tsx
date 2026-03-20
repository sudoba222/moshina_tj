import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

// Dynamically import the heavy client component so it ships as a separate chunk
const CarDetailClient = dynamic(() => import('./CarDetailClient'), {
  ssr: false,
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tajcar.tj'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

interface ListingMeta {
  brand: string
  model: string
  year: number
  price: number
  currency: string
  city: string
  description: string | null
  images: Array<{ url: string; is_primary: boolean }>
}

async function fetchListingMeta(id: string): Promise<ListingMeta | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(`${API_URL}/listings/${id}`, {
      next: { revalidate: 3600 },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) return null
    const json = await res.json()
    return json?.data ?? null
  } catch {
    return null
  }
}

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const listing = await fetchListingMeta(params.id)

  if (!listing) {
    return {
      title: 'Объявление не найдено',
      description: 'Это объявление было удалено или не существует.',
    }
  }

  const priceStr =
    listing.currency === 'USD'
      ? `$${Number(listing.price).toLocaleString('en-US')}`
      : `${Number(listing.price).toLocaleString('ru-RU')} сом.`

  const title = `${listing.brand} ${listing.model} ${listing.year} — ${priceStr}`
  const description = listing.description
    ? listing.description.slice(0, 155)
    : `${listing.brand} ${listing.model} ${listing.year}, ${listing.city}. ${priceStr} на TajCar.tj — авторынок Таджикистана.`

  const primaryImage =
    listing.images.find((img) => img.is_primary) ?? listing.images[0]
  const ogImage = primaryImage?.url ?? `${SITE_URL}/og-image.png`

  const pageUrl = `${SITE_URL}/car/${params.id}`

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'website',
      locale: 'ru_TJ',
      siteName: 'TajCar.tj',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default function CarDetailPage() {
  return <CarDetailClient />
}
