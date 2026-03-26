'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CarCard from '@/components/CarCard'
import HeroBannerSlider from '@/components/HeroBannerSlider'
import { listingsApi, catalogApi, statsApi } from '@/lib/api'
import type { AdBanner, MarketplaceStats } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { Listing, Lang } from '@/types'

const QUICK_BRANDS = [
  'Toyota', 'Chevrolet', 'BMW', 'Mercedes', 'Hyundai',
  'Kia', 'Honda', 'Daewoo', 'Audi', 'Lexus', 'Nissan',
]

const STATS_KEYS: { field: keyof MarketplaceStats; i18nKey: string }[] = [
  { field: 'listings_count', i18nKey: 'stats.listings' },
  { field: 'dealers_count',  i18nKey: 'stats.dealers'  },
  { field: 'cities_count',   i18nKey: 'stats.cities'   },
]

function formatStatNum(n: number): string {
  // e.g. 2431 → "2 431"
  return n.toLocaleString('ru-RU')
}

export default function HomePage() {
  const { lang } = useLang()
  const router = useRouter()
  const [featured, setFeatured] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [banners, setBanners] = useState<AdBanner[]>([])
  const [stats, setStats] = useState<MarketplaceStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Fetch stats and set up a 60-second refresh interval
  useEffect(() => {
    function fetchStats() {
      statsApi
        .get()
        .then((res) => {
          if (res.data.success && res.data.data) {
            setStats(res.data.data)
          }
        })
        .catch(() => {
          // Keep last known value on failure — do not clear stats
        })
        .finally(() => setStatsLoading(false))
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30 * 60 * 1000)  // 30 minutes
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    listingsApi
      .featured()
      .then((res) => setFeatured(res.data.data))
      .catch(() => setFeatured([]))
      .finally(() => setLoading(false))

    catalogApi
      .getBanners()
      .then((res) => setBanners(res.data.data ?? []))
      .catch(() => {})
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1 }} className="pb-mobile">

        {/* ── Hero banner slider ────────────────────────────────────────────── */}
        {banners.length > 0 && (
          <section style={{ padding: '12px 16px 0' }}>
            <div className="max-w-7xl mx-auto">
              <HeroBannerSlider banners={banners} lang={lang} />
            </div>
          </section>
        )}

        {/* ── Hero (text + stats) ─────────────────────────────────────────── */}
        <section className="desktop-hero">
          <div className="max-w-7xl mx-auto px-4 md:px-6 desktop-hero-inner">
            <div className="hero-text-block">
              <h1 className="hero-title">{t('hero.title', lang)}</h1>
              <p className="hero-sub">{t('hero.sub', lang)}</p>
            </div>
            <div className="hero-stats" role="list" aria-label="Platform statistics">
              {STATS_KEYS.map(({ field, i18nKey }, idx) => (
                <div
                  key={i18nKey}
                  className={`hero-stat slide-up delay-${(idx + 1) as 1 | 2 | 3}`}
                  role="listitem"
                >
                  {statsLoading ? (
                    <span className="skeleton hero-stat-skeleton" />
                  ) : (
                    <span className="hero-stat-num">
                      {stats ? formatStatNum(stats[field] as number) : '—'}
                    </span>
                  )}
                  <span className="hero-stat-label">{t(i18nKey, lang)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Static promo banner ─────────────────────────────────────────── */}
        <section style={{ padding: '12px 16px 0' }}>
          <div className="max-w-7xl mx-auto">
            <div className="promo-banner">
              <div className="promo-banner-text">
                <h2 className="promo-banner-title">{t('banner.sell.title', lang)}</h2>
                <p className="promo-banner-sub">{t('banner.sell.sub', lang)}</p>
                <Link href="/post" className="promo-banner-cta">
                  {t('banner.sell.cta', lang)}
                </Link>
              </div>
              <div className="promo-banner-visual" aria-hidden="true" />
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

        {/* ── Listings grid ─────────────────────────────────────────────────── */}
        <section style={{ padding: '24px 16px 60px' }}>
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
      </main>

      <Footer />

      <style>{`
        /* ── Hero section ─────────────────────────────── */
        .desktop-hero {
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          padding: 16px 16px 14px;
        }
        .desktop-hero-inner {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .hero-text-block {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .hero-title {
          font-size: 22px;
          font-weight: 800;
          color: var(--text);
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .hero-sub {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.5;
        }
        .hero-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 0;
          border-top: 1px solid var(--border);
          padding-top: 12px;
        }
        .hero-stat {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 1px;
          padding-right: 20px;
          margin-right: 20px;
          border-right: 1px solid var(--border);
        }
        .hero-stat:last-child {
          border-right: none;
          padding-right: 0;
          margin-right: 0;
        }
        .hero-stat-num {
          font-size: 20px;
          font-weight: 900;
          color: var(--accent);
          letter-spacing: -0.03em;
          line-height: 1;
        }
        .hero-stat-skeleton {
          display: inline-block;
          width: 52px;
          height: 20px;
          border-radius: 4px;
        }
        .hero-stat-label {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 500;
          letter-spacing: 0.01em;
        }
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
          .desktop-hero {
            padding: 28px 16px 22px;
          }
          .desktop-hero-inner {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 40px;
          }
          .hero-text-block { gap: 6px; }
          .hero-title { font-size: 34px; letter-spacing: -0.03em; }
          .hero-sub { font-size: 15px; max-width: 440px; }
          .hero-stats {
            border-top: none;
            padding-top: 0;
            gap: 0;
            flex-shrink: 0;
          }
          .hero-stat { padding-right: 28px; margin-right: 28px; }
          .hero-stat-num { font-size: 26px; }
          .hero-stat-skeleton { width: 72px; height: 26px; }
          .hero-stat-label { font-size: 12px; }
          .listings-grid { grid-template-columns: repeat(4, 1fr); gap: 14px; }
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
