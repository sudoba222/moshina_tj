import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

interface ListingData {
  brand: string
  model: string
  year: number
  price: number
  currency: string
  city: string
  images: Array<{ url: string; is_primary: boolean }>
}

async function fetchListing(id: string): Promise<ListingData | null> {
  try {
    const res = await fetch(`${API_URL}/listings/${id}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const json = await res.json()
    return json?.data ?? null
  } catch {
    return null
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const listing = await fetchListing(id)

  const title = listing
    ? `${listing.brand} ${listing.model} ${listing.year}`
    : 'TAJCAR.TJ'

  const price = listing
    ? listing.currency === 'USD'
      ? `$${Number(listing.price).toLocaleString('en-US')}`
      : `${Number(listing.price).toLocaleString('ru-RU')} сом.`
    : null

  const city = listing?.city ?? null

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0f172a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: '6px', background: '#3b82f6', width: '100%', display: 'flex' }} />

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 80px',
            gap: '16px',
          }}
        >
          {/* Site name */}
          <div style={{ fontSize: 22, color: '#3b82f6', fontWeight: 600, letterSpacing: '0.08em' }}>
            TAJCAR.TJ
          </div>

          {/* Car name */}
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>

          {/* Price + city row */}
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center', marginTop: '8px' }}>
            {price && (
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 700,
                  color: '#3b82f6',
                }}
              >
                {price}
              </div>
            )}
            {city && (
              <div
                style={{
                  fontSize: 28,
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {city}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '20px 80px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 20, color: '#475569' }}>Авто рынок Таджикистана</div>
          <div style={{ fontSize: 20, color: '#475569' }}>tajcar.tj</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
