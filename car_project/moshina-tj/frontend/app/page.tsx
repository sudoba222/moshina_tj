'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CarCard from '@/components/CarCard'
import AdBannerSection from '@/components/AdBanner'
import { listingsApi, statsApi } from '@/lib/api'
import type { MarketplaceStats } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { Listing, Lang } from '@/types'

const STATS_KEYS: { field: keyof MarketplaceStats; i18nKey: string }[] = [
  { field: 'listings_count', i18nKey: 'stats.listings' },
  { field: 'dealers_count',  i18nKey: 'stats.dealers'  },
  { field: 'cities_count',   i18nKey: 'stats.cities'   },
]

const CITIES_LIST = [
  { value: 'Душанбе',    labelKey: 'options.cityDushanbe' },
  { value: 'Хуҷанд',     labelKey: 'options.cityKhujand' },
  { value: 'Бохтар',     labelKey: 'options.cityBokhtar' },
  { value: 'Кӯлоб',      labelKey: 'options.cityCulob' },
  { value: 'Истаравшан', labelKey: 'options.cityIstaravshan' },
  { value: 'Пенджикент', labelKey: 'options.cityPenjikent' },
  { value: 'Хорог',      labelKey: 'options.cityKhorog' },
  { value: 'Турсунзода', labelKey: 'options.cityTursunzoda' },
]

const QUICK_BRANDS = [
  'Toyota', 'Chevrolet', 'BMW', 'Mercedes', 'Hyundai',
  'Kia', 'Honda', 'Daewoo', 'Audi', 'Lexus', 'Nissan',
]

const BODY_TYPES: { labelKey: string; value: string }[] = [
  { labelKey: 'filters.bodyTypeAll', value: '' },
  { labelKey: 'options.bodySedan',      value: 'sedan' },
  { labelKey: 'options.bodySuv',        value: 'suv' },
  { labelKey: 'options.bodyHatchback',  value: 'hatchback' },
  { labelKey: 'options.bodyMinivan',    value: 'minivan' },
  { labelKey: 'options.bodyPickup',     value: 'pickup' },
  { labelKey: 'options.bodyWagon',      value: 'wagon' },
  { labelKey: 'options.bodyCoupe',      value: 'coupe' },
]

function formatStatNum(n: number): string {
  return n.toLocaleString('ru-RU')
}

export default function HomePage() {
  const { lang } = useLang()
  const router = useRouter()
  const [featured, setFeatured] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<MarketplaceStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Hero search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchCity, setSearchCity] = useState('')
  const [searchBrand, setSearchBrand] = useState('')

  // Active body type filter
  const [activeBodyType, setActiveBodyType] = useState('')

  useEffect(() => {
    function fetchStats() {
      statsApi
        .get()
        .then((res) => { if (res.data.success && res.data.data) setStats(res.data.data) })
        .catch(() => {})
        .finally(() => setStatsLoading(false))
    }
    fetchStats()
    const interval = setInterval(fetchStats, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    listingsApi
      .featured()
      .then((res) => setFeatured(res.data.data))
      .catch(() => setFeatured([]))
      .finally(() => setLoading(false))
  }, [])

  function handleHeroSearch() {
    const params = new URLSearchParams()
    if (searchQuery.trim()) params.set('q', searchQuery.trim())
    if (searchCity) params.set('city', searchCity)
    if (searchBrand) params.set('brand', searchBrand)
    router.push(`/catalog${params.toString() ? `?${params.toString()}` : ''}`)
  }

  function handleBodyTypeClick(value: string) {
    setActiveBodyType(value)
    const params = new URLSearchParams()
    if (value) params.set('body_type', value)
    router.push(`/catalog${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1, paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }} className="pb-mobile">

        {/* ── Hero (clean, app-like) ────────────────────────────────────────── */}
        <section style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', padding: 'clamp(20px, 4vw, 40px) 16px 20px' }}>
          <div className="max-w-7xl mx-auto" style={{ maxWidth: '640px' }}>

            {/* Title */}
            <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '6px' }}>
              {t('hero.title', lang)}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              {t('hero.sub', lang)}
            </p>

            {/* Main search input */}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                height: '54px',
                background: 'var(--bg)',
                border: '1.5px solid var(--border)',
                borderRadius: '27px',
                paddingLeft: '16px',
                paddingRight: '4px',
                gap: '8px',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleHeroSearch() }}
                  placeholder={t('hero.searchPlaceholder', lang)}
                  autoComplete="off"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '15px',
                    color: 'var(--text)',
                    height: '100%',
                    minWidth: 0,
                  }}
                />
                <button
                  onClick={handleHeroSearch}
                  style={{
                    height: '46px',
                    padding: '0 20px',
                    background: 'var(--accent)',
                    color: 'var(--color-white)',
                    border: 'none',
                    borderRadius: '23px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    transition: 'opacity 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                >
                  {t('hero.searchBtn', lang)}
                </button>
              </div>
            </div>

            {/* City + Brand row — stacked on mobile, side-by-side on sm+ */}
            <div className="flex flex-col sm:flex-row" style={{ gap: '8px', marginBottom: '16px' }}>
              <select
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                aria-label={t('hero.searchCity', lang)}
                style={{
                  flex: 1,
                  height: '44px',
                  background: 'var(--bg)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '10px',
                  padding: '0 12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: searchCity ? 'var(--text)' : 'var(--text-muted)',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  minWidth: 0,
                }}
              >
                <option value="">{t('hero.allCities', lang)}</option>
                {CITIES_LIST.map((c) => (
                  <option key={c.value} value={c.value}>{t(c.labelKey, lang)}</option>
                ))}
              </select>

              <select
                value={searchBrand}
                onChange={(e) => setSearchBrand(e.target.value)}
                aria-label={t('hero.searchBrand', lang)}
                style={{
                  flex: 1,
                  height: '44px',
                  background: 'var(--bg)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '10px',
                  padding: '0 12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: searchBrand ? 'var(--text)' : 'var(--text-muted)',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  minWidth: 0,
                }}
              >
                <option value="">{t('hero.allBrands', lang)}</option>
                {QUICK_BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Stats bar — 3 equal columns, centered */}
            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0' }}
              role="list"
              aria-label="Platform statistics"
            >
              {STATS_KEYS.map(({ field, i18nKey }, idx) => (
                <div key={i18nKey} role="listitem" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  textAlign: 'center',
                  paddingRight: idx < STATS_KEYS.length - 1 ? '12px' : '0',
                  marginRight: idx < STATS_KEYS.length - 1 ? '12px' : '0',
                  borderRight: idx < STATS_KEYS.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  {statsLoading ? (
                    <span className="skeleton" style={{ display: 'inline-block', width: '40px', height: '16px', borderRadius: '4px' }} aria-hidden="true" />
                  ) : (
                    <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>
                      {stats ? `${formatStatNum(stats[field] as number)}+` : '—'}
                    </span>
                  )}
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {t(i18nKey, lang)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Body type horizontal scroll ──────────────────────────────────── */}
        <section style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
          <div style={{ position: 'relative' }}>
            {/* Left fade — indicates more content to the left */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '32px',
                background: 'linear-gradient(to right, var(--bg), transparent)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
            {/* Right fade — indicates more content to the right */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '32px',
                background: 'linear-gradient(to left, var(--bg), transparent)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
          <div
            className="scrollbar-hide"
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              padding: '0 16px',
              WebkitOverflowScrolling: 'touch',
            }}
            role="list"
            aria-label={t('filters.bodyType', lang)}
          >
            {BODY_TYPES.map(({ labelKey, value }) => {
              const isActive = activeBodyType === value
              return (
                <button
                  key={value || 'all'}
                  onClick={() => handleBodyTypeClick(value)}
                  aria-pressed={isActive}
                  style={{
                    flexShrink: 0,
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                    background: isActive ? 'var(--accent-dim)' : 'var(--card)',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                    minHeight: '44px',
                  }}
                >
                  {t(labelKey, lang)}
                </button>
              )
            })}
          </div>
          </div>
        </section>

        {/* ── Quick brand scroll ──────────────────────────────────────────── */}
        <section style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0' }}>
          <div
            className="scrollbar-hide"
            style={{
              display: 'flex',
              gap: '2px',
              overflowX: 'auto',
              padding: '0 8px',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {QUICK_BRANDS.map((brand) => (
              <button
                key={brand}
                onClick={() => router.push(`/catalog?brand=${brand}`)}
                className="active:scale-95 transition-transform"
                style={{
                  flexShrink: 0,
                  height: '48px',
                  minWidth: '44px',
                  padding: '0 14px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '2px solid transparent',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s, border-color 0.15s, transform 0.1s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--accent)'
                  e.currentTarget.style.borderBottomColor = 'var(--accent)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)'
                  e.currentTarget.style.borderBottomColor = 'transparent'
                }}
              >
                {brand}
              </button>
            ))}
          </div>
        </section>

        {/* ── Featured listings grid ────────────────────────────────────────── */}
        <section style={{ padding: '20px 16px 0' }}>
          <div className="max-w-7xl mx-auto">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 style={{ fontSize: 'clamp(15px, 2vw, 19px)', fontWeight: 700, color: 'var(--text)' }}>
                {t('hero.latestListings', lang)}
              </h2>
              <button
                onClick={() => router.push('/catalog')}
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 0',
                  transition: 'opacity 0.15s ease',
                  minHeight: '44px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.75' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
              >
                {t('hero.viewAll', lang)}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M2 7h10M8 3l4 4-4 4" />
                </svg>
              </button>
            </div>

            {loading ? (
              <div className="listings-grid">
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : featured.length === 0 ? (
              <EmptyState lang={lang} />
            ) : (
              <div className="listings-grid">
                {featured.map((listing, i) => (
                  <CarCard
                    key={listing.id}
                    listing={listing}
                    lang={lang}
                    priority={i < 2}
                    className={`fade-in delay-${Math.min(i + 1, 8) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Ad Banner ─────────────────────────────────────────────────────── */}
        <section style={{ padding: '24px 16px 0' }}>
          <div className="max-w-7xl mx-auto">
            <AdBannerSection />
          </div>
        </section>

        {/* ── Trust section ─────────────────────────────────────────────────── */}
        <section style={{ padding: '32px 16px 48px' }}>
          <div className="max-w-7xl mx-auto">
            <h2 style={{ fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 800, color: 'var(--text)', marginBottom: '20px', textAlign: 'center' }}>
              {t('trust.title', lang)}
            </h2>
            <div className="trust-grid">
              {([
                {
                  titleKey: 'trust.safeTitle',
                  descKey: 'trust.safeDesc',
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <polyline points="9 12 11 14 15 10" />
                    </svg>
                  ),
                },
                {
                  titleKey: 'trust.verifiedTitle',
                  descKey: 'trust.verifiedDesc',
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  ),
                },
                {
                  titleKey: 'trust.supportTitle',
                  descKey: 'trust.supportDesc',
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  ),
                },
              ] as const).map(({ titleKey, descKey, icon }) => (
                <div key={titleKey} className="trust-card">
                  <div className="trust-icon">{icon}</div>
                  <h3 className="trust-card-title">{t(titleKey, lang)}</h3>
                  <p className="trust-card-desc">{t(descKey, lang)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      <Footer />

      <style>{`
        /* Listings grid */
        .listings-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        @media (min-width: 480px) {
          .listings-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 768px) {
          .listings-grid { grid-template-columns: repeat(3, 1fr); gap: 12px; }
        }
        @media (min-width: 1200px) {
          .listings-grid { grid-template-columns: repeat(4, 1fr); gap: 14px; }
        }

        /* Trust section */
        .trust-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 640px) {
          .trust-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; }
        }
        .trust-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: clamp(16px, 3vw, 24px);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .trust-icon {
          width: 48px;
          height: 48px;
          background: var(--accent-dim);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .trust-card-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
        }
        .trust-card-desc {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.55;
        }
      `}</style>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      <div className="skeleton card-image-wrap" style={{ borderRadius: 0 }} />
      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton" style={{ height: '13px', width: '65%', borderRadius: '4px' }} />
        <div className="skeleton" style={{ height: '24px', width: '50%', borderRadius: '4px' }} />
        <div style={{ display: 'flex', gap: '4px' }}>
          <div className="skeleton" style={{ height: '22px', width: '60px', borderRadius: '10px' }} />
          <div className="skeleton" style={{ height: '22px', width: '72px', borderRadius: '10px' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div className="skeleton" style={{ height: '11px', width: '40%', borderRadius: '4px' }} />
          <div className="skeleton" style={{ height: '11px', width: '25%', borderRadius: '4px' }} />
        </div>
      </div>
    </div>
  )
}

function EmptyState({ lang }: { lang: Lang }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ margin: '0 auto 12px', display: 'block' }} aria-hidden="true">
        <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h10l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2h-2" />
        <circle cx="7.5" cy="17" r="2.5" />
        <circle cx="16.5" cy="17" r="2.5" />
      </svg>
      <p style={{ fontSize: '15px' }}>{t('catalog.noResults', lang)}</p>
    </div>
  )
}
