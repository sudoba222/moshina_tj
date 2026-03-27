'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CarCard from '@/components/CarCard'
import AdBannerSection from '@/components/AdBanner'
import { listingsApi, catalogApi, statsApi } from '@/lib/api'
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
  const [searchCity, setSearchCity] = useState('')
  const [searchBrand, setSearchBrand] = useState('')

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
    if (searchCity) params.set('city', searchCity)
    if (searchBrand) params.set('brand', searchBrand)
    router.push(`/catalog${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1 }} className="pb-mobile">

        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        <section className="hero-section">
          <div className="hero-overlay" aria-hidden="true" />
          <div className="max-w-7xl mx-auto px-4 md:px-6 hero-content">

            {/* Headline */}
            <h1 className="hero-title">{t('hero.title', lang)}</h1>
            <p className="hero-sub">{t('hero.sub', lang)}</p>

            {/* Quick search bar */}
            <div className="hero-search-bar">
              <select
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                aria-label={t('hero.searchCity', lang)}
                className="hero-search-select"
              >
                <option value="">{t('hero.allCities', lang)}</option>
                {CITIES_LIST.map((c) => (
                  <option key={c.value} value={c.value}>{t(c.labelKey, lang)}</option>
                ))}
              </select>

              <div className="hero-search-divider" aria-hidden="true" />

              <select
                value={searchBrand}
                onChange={(e) => setSearchBrand(e.target.value)}
                aria-label={t('hero.searchBrand', lang)}
                className="hero-search-select"
              >
                <option value="">{t('hero.allBrands', lang)}</option>
                {QUICK_BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <button
                onClick={handleHeroSearch}
                className="hero-search-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                {t('hero.searchBtn', lang)}
              </button>
            </div>

            {/* Stat chips */}
            <div className="hero-stats" role="list" aria-label="Platform statistics">
              {STATS_KEYS.map(({ field, i18nKey }) => (
                <div key={i18nKey} className="hero-stat-chip" role="listitem">
                  {statsLoading ? (
                    <span className="skeleton" style={{ display: 'inline-block', width: '48px', height: '16px', borderRadius: '4px' }} />
                  ) : (
                    <span className="hero-stat-num">
                      {stats ? `${formatStatNum(stats[field] as number)}+` : '—'}
                    </span>
                  )}
                  <span className="hero-stat-label">{t(i18nKey, lang)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Quick brand filter ───────────────────────────────────────────── */}
        <section style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 16px' }}>
          <div className="max-w-7xl mx-auto scrollbar-hide" style={{ display: 'flex', gap: '2px', overflowX: 'auto' }}>
            {QUICK_BRANDS.map((brand) => (
              <button
                key={brand}
                onClick={() => router.push(`/catalog?brand=${brand}`)}
                style={{
                  flexShrink: 0,
                  height: '48px',
                  minWidth: '44px',
                  padding: '0 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '2px solid transparent',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s, border-color 0.15s',
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
        <section style={{ padding: '24px 16px 0' }}>
          <div className="max-w-7xl mx-auto">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: 'clamp(15px, 2vw, 19px)', fontWeight: 700, color: 'var(--text)' }}>
                {t('hero.latestListings', lang)}
              </h2>
              <button
                onClick={() => router.push('/catalog')}
                style={{
                  fontSize: '13px', fontWeight: 600, color: 'var(--accent)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '6px 0',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.75' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
              >
                {t('hero.viewAll', lang)}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
        /* ── Hero section ─────────────────────────────── */
        .hero-section {
          position: relative;
          background: linear-gradient(135deg, var(--accent) 0%, #1a1a2e 100%);
          padding: clamp(40px, 8vw, 80px) 16px clamp(36px, 7vw, 72px);
          overflow: hidden;
        }
        .hero-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.25);
          pointer-events: none;
        }
        .hero-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 20px;
        }
        .hero-title {
          font-size: clamp(24px, 5vw, 46px);
          font-weight: 900;
          color: var(--color-white);
          letter-spacing: -0.03em;
          line-height: 1.15;
          max-width: 700px;
        }
        .hero-sub {
          font-size: clamp(14px, 2vw, 17px);
          color: rgba(255,255,255,0.82);
          line-height: 1.55;
          max-width: 500px;
          font-weight: 400;
        }

        /* Search bar */
        .hero-search-bar {
          display: flex;
          align-items: center;
          background: var(--color-white);
          border-radius: 14px;
          padding: 4px;
          width: 100%;
          max-width: 520px;
          gap: 0;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        }
        .hero-search-select {
          flex: 1;
          min-width: 0;
          background: none;
          border: none;
          outline: none;
          font-size: 14px;
          font-weight: 500;
          color: #111;
          padding: 10px 14px;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
        }
        .hero-search-divider {
          width: 1px;
          height: 24px;
          background: #e5e7eb;
          flex-shrink: 0;
        }
        .hero-search-btn {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--accent);
          color: var(--color-white);
          border: none;
          border-radius: 10px;
          padding: 11px 20px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          min-height: 44px;
          transition: opacity 0.15s;
        }
        .hero-search-btn:hover { opacity: 0.88; }

        /* Stat chips */
        .hero-stats {
          display: flex;
          align-items: center;
          gap: 0;
          flex-wrap: wrap;
          justify-content: center;
        }
        .hero-stat-chip {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 0 20px;
          border-right: 1px solid rgba(255,255,255,0.22);
        }
        .hero-stat-chip:last-child {
          border-right: none;
        }
        .hero-stat-num {
          font-size: clamp(18px, 3vw, 26px);
          font-weight: 900;
          color: var(--color-white);
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .hero-stat-label {
          font-size: 11px;
          color: rgba(255,255,255,0.70);
          font-weight: 500;
          letter-spacing: 0.01em;
        }

        /* Listings grid */
        .listings-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        @media (min-width: 480px) {
          .listings-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 640px) {
          .listings-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 1024px) {
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
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }} aria-hidden="true">
      {/* Image placeholder — 16:9 on mobile, 180px on desktop (matches .card-image-wrap) */}
      <div className="skeleton card-image-wrap" style={{ borderRadius: 0 }} />
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Brand name */}
        <div className="skeleton" style={{ height: '13px', width: '60%', borderRadius: '4px' }} />
        {/* Price */}
        <div className="skeleton" style={{ height: '22px', width: '50%', borderRadius: '4px' }} />
        {/* Spec chips row */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <div className="skeleton" style={{ height: '20px', width: '36px', borderRadius: '4px' }} />
          <div className="skeleton" style={{ height: '20px', width: '64px', borderRadius: '4px' }} />
          <div className="skeleton" style={{ height: '20px', width: '52px', borderRadius: '4px' }} />
        </div>
        {/* Location + date row */}
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
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ margin: '0 auto 12px' }}>
        <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h10l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2h-2" />
        <circle cx="7.5" cy="17" r="2.5" />
        <circle cx="16.5" cy="17" r="2.5" />
      </svg>
      <p style={{ fontSize: '15px' }}>{t('catalog.noResults', lang)}</p>
    </div>
  )
}
