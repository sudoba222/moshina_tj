'use client'
import Link from 'next/link'
import Image from 'next/image'
import { t } from '@/lib/i18n'
import type { Listing, Lang } from '@/types'

interface CarCardProps {
  listing: Listing
  lang: Lang
  className?: string
}

function formatMileage(km: number): string {
  if (km >= 10000) return Math.round(km / 1000) + ',' + String(km % 1000).padStart(3, '0') + ' км'
  return km.toLocaleString('ru-RU') + ' км'
}

function formatPrice(price: number, currency: string): string {
  if (currency === 'USD') {
    return '$' + price.toLocaleString('en-US')
  }
  return price.toLocaleString('ru-RU') + ' сом.'
}

// Credit card SVG icon
function CreditCardIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="1" y="1" width="14" height="10" rx="2" />
      <line x1="1" y1="5" x2="15" y2="5" />
      <line x1="4" y1="8.5" x2="7" y2="8.5" />
    </svg>
  )
}

// Star SVG icon
function StarIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M8 1l2 5h5l-4 3 1.5 5L8 11l-4.5 3L5 9 1 6h5z" />
    </svg>
  )
}

export default function CarCard({ listing, lang, className }: CarCardProps) {
  const primaryImage = listing.images.find((img) => img.is_primary) ?? listing.images[0]

  return (
    <Link href={`/car/${listing.id}`} style={{ display: 'block', textDecoration: 'none' }} className={className}>
      <article
        className="animate-fade-in-up"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.18s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)'
          e.currentTarget.style.boxShadow = 'var(--shadow-md)'
          e.currentTarget.style.borderColor = 'var(--border-strong)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.borderColor = 'var(--border)'
        }}
      >
        {/* Image */}
        <div style={{ position: 'relative', height: '180px', background: 'var(--bg)', overflow: 'hidden' }}>
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={`${listing.brand} ${listing.model}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="1.2">
                <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h10l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2h-2" />
                <circle cx="7.5" cy="17" r="2.5" />
                <circle cx="16.5" cy="17" r="2.5" />
              </svg>
            </div>
          )}

          {/* Badges */}
          <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', gap: '4px' }}>
            {listing.type === 'rent' && (
              <span style={{
                background: '#2563eb',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '3px',
                letterSpacing: '0.04em',
              }}>
                {t('badges.rent', lang)}
              </span>
            )}
            {listing.installment_available && (
              <span style={{
                background: 'var(--accent)',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '3px',
                letterSpacing: '0.04em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}>
                <CreditCardIcon />
                {t('badges.installment', lang)}
              </span>
            )}
          </div>

          {listing.is_dealer_listing && (
            <div style={{ position: 'absolute', bottom: '8px', left: '8px' }}>
              <span style={{
                background: 'rgba(0,0,0,0.72)',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '3px',
                letterSpacing: '0.04em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}>
                <StarIcon />
                {t('badges.dealer', lang)}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '12px 14px' }}>
          {/* Price — prominent, dark */}
          <p style={{
            fontSize: '18px',
            fontWeight: 800,
            color: 'var(--text)',
            marginBottom: '4px',
            letterSpacing: '-0.02em',
          }}>
            {formatPrice(Number(listing.price), listing.currency)}
          </p>

          {/* Brand + Model */}
          <p style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: '6px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {listing.brand} {listing.model}
          </p>

          {/* Specs row */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px 0',
            fontSize: '12px',
            color: 'var(--text-muted)',
          }}>
            <span>{listing.year}</span>
            {listing.mileage != null && (
              <>
                <span style={{ margin: '0 5px', opacity: 0.5 }}>·</span>
                <span>{formatMileage(listing.mileage)}</span>
              </>
            )}
            {listing.transmission && (
              <>
                <span style={{ margin: '0 5px', opacity: 0.5 }}>·</span>
                <span>{listing.transmission}</span>
              </>
            )}
          </div>

          {/* Location */}
          {listing.city && (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <path d="M6 1C4.07 1 2.5 2.57 2.5 4.5c0 2.6 3.5 6.5 3.5 6.5s3.5-3.9 3.5-6.5C9.5 2.57 7.93 1 6 1z" />
                <circle cx="6" cy="4.5" r="1" />
              </svg>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{listing.city}</span>
            </div>
          )}
        </div>
      </article>
    </Link>
  )
}
