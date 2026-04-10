import type { Metadata } from 'next'
import { JsonLd } from '@/components/JsonLd'
import CarDetailClient from './CarDetailClient'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tajcar.tj'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

interface ListingMeta {
  brand: string
  model: string
  year: number
  price: number
  currency: string
  mileage: number | null
  city: string
  description: string | null
  status: string
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
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const listing = await fetchListingMeta(id)

  if (!listing) {
    return {
      title: 'Объявление не найдено',
      description: 'Это объявление было удалено или не существует.',
      robots: { index: false, follow: false },
    }
  }

  if (listing.status !== 'active') {
    return {
      title: `${listing.brand} ${listing.model} ${listing.year}`,
      description: 'Это объявление на данный момент недоступно.',
      robots: { index: false, follow: false },
    }
  }

  const priceStr =
    listing.currency === 'USD'
      ? `$${Number(listing.price).toLocaleString('en-US')}`
      : `${Number(listing.price).toLocaleString('ru-RU')} сом.`

  const title = `${listing.brand} ${listing.model} ${listing.year} — ${priceStr}`
  const description = listing.description
    ? listing.description.slice(0, 155)
    : `${listing.brand} ${listing.model} ${listing.year}, ${listing.city}. ${priceStr} на TAJCAR.TJ — авторынок Таджикистана.`

  const primaryImage =
    listing.images.find((img) => img.is_primary) ?? listing.images[0]
  const ogImage = primaryImage?.url ?? `${SITE_URL}/og-image.png`

  const pageUrl = `${SITE_URL}/car/${id}`

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'website',
      locale: 'ru_TJ',
      siteName: 'TAJCAR.TJ',
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

export default async function CarDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const listing = await fetchListingMeta(id)

  const vehicleSchema = listing
    ? {
        '@context': 'https://schema.org',
        '@type': 'Car',
        name: `${listing.brand} ${listing.model} ${listing.year}`,
        brand: { '@type': 'Brand', name: listing.brand },
        modelDate: String(listing.year),
        ...(listing.mileage != null && {
          mileageFromOdometer: {
            '@type': 'QuantitativeValue',
            value: listing.mileage,
            unitCode: 'KMT',
          },
        }),
        offers: {
          '@type': 'Offer',
          price: listing.price,
          priceCurrency: listing.currency,
          availability: 'https://schema.org/InStock',
          url: `${SITE_URL}/car/${id}`,
        },
        ...(listing.images.length > 0 && {
          image: [listing.images[0].url],
        }),
        ...(listing.description && { description: listing.description }),
        vehicleIdentificationNumber: id,
      }
    : null

  return (
    <>
      {vehicleSchema && <JsonLd data={vehicleSchema} />}
      <CarDetailClient />
    </>
  )
}
