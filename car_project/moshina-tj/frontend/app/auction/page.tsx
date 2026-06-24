'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CarCard from '@/components/CarCard'
import { listingsApi } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { Listing } from '@/types'

// ─── Filter pills ─────────────────────────────────────────────────────────────

type BodyFilter = 'all' | 'sedan' | 'suv' | 'truck' | 'electric'

interface FilterOption {
  value: BodyFilter
  labelKey: string
}

const FILTERS: FilterOption[] = [
  { value: 'all',      labelKey: 'auction.filterAll' },
  { value: 'sedan',    labelKey: 'auction.filterSedan' },
  { value: 'suv',      labelKey: 'auction.filterSuv' },
  { value: 'truck',    labelKey: 'auction.filterTruck' },
  { value: 'electric', labelKey: 'auction.filterElectric' },
]

function matchesFilter(listing: Listing, filter: BodyFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'electric') {
    return listing.fuel === 'Электро' || listing.category_slug === 'electric'
  }
  if (filter === 'truck') {
    return listing.category_slug === 'truck' || listing.body_type === 'pickup'
  }
  if (filter === 'suv') {
    return (
      listing.body_type === 'suv' ||
      listing.body_type === 'crossover' ||
      listing.category_slug === 'suv'
    )
  }
  if (filter === 'sedan') {
    return listing.body_type === 'sedan'
  }
  return true
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg, 12px)',
        overflow: 'hidden',
      }}
    >
      <div className="skeleton" style={{ height: '180px' }} />
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton" style={{ height: '20px', borderRadius: '4px', width: '55%' }} />
        <div className="skeleton" style={{ height: '14px', borderRadius: '4px', width: '80%' }} />
        <div className="skeleton" style={{ height: '12px', borderRadius: '4px', width: '60%' }} />
      </div>
    </div>
  )
}

// ─── Star icon ───────────────────────────────────────────────────────────────

function StarIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FeaturedPage() {
  const { lang } = useLang()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeFilter, setActiveFilter] = useState<BodyFilter>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    listingsApi
      .featured()
      .then((res) => {
        if (cancelled) return
        const data = res.data.data
        setListings(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  const filtered = listings.filter((l) => matchesFilter(l, activeFilter))

  // Derive stats from actual data
  const totalViews = listings.reduce((sum, l) => sum + (l.views ?? 0), 0)
  const dealerCount = listings.filter((l) => l.is_dealer_listing).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <main style={{ flex: 1 }} className="pb-mobile">

        {/* ── Hero section ─────────────────────────────────────────────────── */}
        <section
          style={{
            background: 'linear-gradient(135deg, var(--card) 0%, var(--surface) 100%)',
            borderBottom: '1px solid var(--border)',
            padding: 'clamp(32px, 6vw, 64px) 24px clamp(28px, 5vw, 48px)',
          }}
        >
          <div
            style={{
              maxWidth: '760px',
              margin: '0 auto',
              textAlign: 'center',
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '18px',
                background: 'var(--accent-dim)',
                border: '2px solid var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <span style={{ color: 'var(--accent)' }}>
                <StarIcon size={32} />
              </span>
            </div>

            {/* Premium badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(90deg, rgba(245,158,11,0.12), rgba(239,68,68,0.10))',
                border: '1px solid rgba(245,158,11,0.35)',
                borderRadius: '100px',
                padding: '4px 16px',
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--color-warning, #ca8a04)',
                marginBottom: '16px',
                letterSpacing: '0.08em',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--color-warning, #ca8a04)',
                  display: 'inline-block',
                }}
              />
              {t('auction.premiumBadge', lang)}
            </div>

            <h1
              style={{
                fontSize: 'clamp(26px, 5vw, 44px)',
                fontWeight: 900,
                color: 'var(--text)',
                marginBottom: '12px',
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
              }}
            >
              {t('auction.featuredTitle', lang)}
            </h1>

            <p
              style={{
                fontSize: 'clamp(14px, 2vw, 17px)',
                color: 'var(--text-muted)',
                lineHeight: 1.65,
                maxWidth: '520px',
                margin: '0 auto',
              }}
            >
              {t('auction.featuredSub', lang)}
            </p>
          </div>
        </section>

        {/* ── Stats strip ──────────────────────────────────────────────────── */}
        {!loading && listings.length > 0 && (
          <section
            style={{
              background: 'var(--accent)',
              padding: '18px 24px',
            }}
          >
            <div
              style={{
                maxWidth: '900px',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'clamp(24px, 6vw, 80px)',
                flexWrap: 'wrap',
              }}
            >
              {[
                { value: listings.length, labelKey: 'auction.statsFeatured' },
                { value: totalViews.toLocaleString('ru-RU'), labelKey: 'auction.statsViews' },
                { value: dealerCount, labelKey: 'auction.statsDealers' },
              ].map(({ value, labelKey }) => (
                <div
                  key={labelKey}
                  style={{ textAlign: 'center' }}
                >
                  <div
                    style={{
                      fontSize: 'clamp(22px, 4vw, 32px)',
                      fontWeight: 900,
                      color: 'var(--color-white)',
                      lineHeight: 1.1,
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {value}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.75)',
                      marginTop: '3px',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {t(labelKey, lang)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Filter row + grid ─────────────────────────────────────────────── */}
        <div
          className="max-w-7xl mx-auto px-4 md:px-6"
          style={{ paddingTop: 'clamp(20px, 4vw, 40px)', paddingBottom: '60px' }}
        >
          {/* Filter pills */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              marginBottom: 'clamp(20px, 3vw, 32px)',
            }}
            role="group"
            aria-label="Filter by body type"
          >
            {FILTERS.map(({ value, labelKey }) => {
              const isActive = activeFilter === value
              return (
                <button
                  key={value}
                  onClick={() => setActiveFilter(value)}
                  aria-pressed={isActive}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '100px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: isActive ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                    background: isActive ? 'var(--accent)' : 'var(--card)',
                    color: isActive ? 'var(--color-white)' : 'var(--text)',
                    transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                    fontFamily: 'var(--font)',
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t(labelKey, lang)}
                </button>
              )
            })}
          </div>

          {/* Loading skeletons */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 24px',
                color: 'var(--text-muted)',
              }}
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                style={{ margin: '0 auto 16px', display: 'block', opacity: 0.4 }}
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p style={{ fontSize: '15px', fontWeight: 600 }}>
                {t('common.error', lang)}
              </p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filtered.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: 'clamp(60px, 10vw, 100px) 24px',
                color: 'var(--text-muted)',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '20px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  opacity: 0.7,
                }}
              >
                <StarIcon size={36} />
              </div>
              <p
                style={{
                  fontSize: 'clamp(16px, 2.5vw, 20px)',
                  fontWeight: 700,
                  color: 'var(--text)',
                  marginBottom: '8px',
                }}
              >
                {t('auction.empty', lang)}
              </p>
              <p style={{ fontSize: '14px', maxWidth: '360px', margin: '0 auto' }}>
                {t('auction.emptySub', lang)}
              </p>
              <Link
                href="/catalog"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '24px',
                  background: 'var(--accent)',
                  color: 'var(--color-white)',
                  fontWeight: 700,
                  fontSize: '14px',
                  padding: '10px 24px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  transition: 'opacity 0.15s ease',
                }}
              >
                {t('hero.viewAll', lang)}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          )}

          {/* Cars grid */}
          {!loading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((listing, i) => (
                <CarCard
                  key={listing.id}
                  listing={listing}
                  lang={lang}
                  priority={i < 3}
                />
              ))}
            </div>
          )}

          {/* ── CTA banner ─────────────────────────────────────────────────── */}
          {!loading && (
            <div
              style={{
                marginTop: 'clamp(40px, 6vw, 72px)',
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover, #b83208) 100%)',
                borderRadius: 'clamp(12px, 2vw, 20px)',
                padding: 'clamp(28px, 5vw, 48px) clamp(24px, 4vw, 48px)',
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                textAlign: 'center',
                gap: '12px',
                position: 'relative' as const,
                overflow: 'hidden' as const,
              }}
            >
              {/* Decorative circles */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '-40px',
                  right: '-40px',
                  width: '180px',
                  height: '180px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)',
                  pointerEvents: 'none',
                }}
              />
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  bottom: '-30px',
                  left: '-30px',
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  pointerEvents: 'none',
                }}
              />

              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'rgba(255,255,255,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-white)',
                  marginBottom: '4px',
                }}
              >
                <StarIcon size={26} />
              </div>

              <h2
                style={{
                  fontSize: 'clamp(18px, 3vw, 26px)',
                  fontWeight: 900,
                  color: 'var(--color-white)',
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                {t('auction.ctaTitle', lang)}
              </h2>

              <p
                style={{
                  fontSize: 'clamp(13px, 1.8vw, 15px)',
                  color: 'rgba(255,255,255,0.82)',
                  lineHeight: 1.6,
                  maxWidth: '440px',
                  margin: 0,
                }}
              >
                {t('auction.ctaSub', lang)}
              </p>

              <Link
                href="/post"
                style={{
                  marginTop: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--color-white)',
                  color: 'var(--accent)',
                  fontWeight: 800,
                  fontSize: '14px',
                  padding: '12px 28px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  letterSpacing: '0.01em',
                  transition: 'opacity 0.15s ease, transform 0.15s ease',
                  position: 'relative',
                  zIndex: 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.92'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {t('auction.ctaBtn', lang)}
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
