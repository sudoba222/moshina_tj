import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tajcar.tj'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

interface ListingImage {
  url: string
  is_primary: boolean
}

interface Listing {
  id: string
  brand: string
  model: string
  year: number
  price: number
  currency: string
  city: string
  mileage: number
  fuel: string
  transmission: string
  description: string
  images: ListingImage[]
  updated_at: string
  status: string
}

interface ApiResponse {
  success: boolean
  data: Listing
}

async function getListing(id: string): Promise<Listing | null> {
  try {
    const res = await fetch(`${API_URL}/listings/${id}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const json: ApiResponse = await res.json()
    return json.data ?? null
  } catch {
    return null
  }
}

function buildJsonLd(listing: Listing): object {
  const primaryImage = listing.images?.find((i) => i.is_primary)?.url ?? listing.images?.[0]?.url
  const currencyCode = listing.currency === 'TJS' ? 'TJS' : 'USD'
  const availability =
    listing.status === 'active'
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock'

  return {
    '@context': 'https://schema.org',
    '@type': 'Vehicle',
    name: `${listing.brand} ${listing.model} ${listing.year}`,
    description: listing.description,
    brand: { '@type': 'Brand', name: listing.brand },
    model: listing.model,
    vehicleModelDate: String(listing.year),
    mileageFromOdometer: {
      '@type': 'QuantitativeValue',
      value: listing.mileage,
      unitCode: 'KMT',
    },
    fuelType: listing.fuel,
    vehicleTransmission: listing.transmission,
    url: `${SITE_URL}/car/${listing.id}`,
    ...(primaryImage && { image: primaryImage }),
    offers: {
      '@type': 'Offer',
      price: listing.price,
      priceCurrency: currencyCode,
      availability,
      url: `${SITE_URL}/car/${listing.id}`,
      seller: {
        '@type': 'Organization',
        name: 'TAJCAR.TJ',
        url: SITE_URL,
      },
    },
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const listing = await getListing(id)

  if (!listing) {
    return {
      title: 'Объявление не найдено',
      description: 'Это объявление было удалено или не существует.',
      robots: { index: false, follow: false },
    }
  }

  const title = `${listing.brand} ${listing.model} ${listing.year} — ${listing.city}`
  const priceStr =
    listing.currency === 'TJS'
      ? `${listing.price.toLocaleString('ru')} сомони`
      : `$${listing.price.toLocaleString('ru')}`
  const description = `${listing.brand} ${listing.model} ${listing.year} г., ${listing.mileage.toLocaleString('ru')} км, ${listing.fuel}, ${listing.transmission}. Цена: ${priceStr}. ${listing.city}, Таджикистан.`
  const primaryImage = listing.images?.find((i) => i.is_primary)?.url ?? listing.images?.[0]?.url

  return {
    title,
    description,
    openGraph: {
      title: `${title} | TAJCAR.TJ`,
      description,
      type: 'website',
      url: `${SITE_URL}/car/${id}`,
      ...(primaryImage && {
        images: [{ url: primaryImage, width: 800, height: 600, alt: title }],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | TAJCAR.TJ`,
      description,
      ...(primaryImage && { images: [primaryImage] }),
    },
    alternates: {
      canonical: `${SITE_URL}/car/${id}`,
    },
  }
}

export default async function CarLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const listing = await getListing(id)
  const jsonLd = listing ? buildJsonLd(listing) : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  )
}
