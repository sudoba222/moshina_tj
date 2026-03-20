'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CarCard from '@/components/CarCard'
import HeroBannerSlider from '@/components/HeroBannerSlider'
import { listingsApi, catalogApi } from '@/lib/api'
import type { AdBanner } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { Listing, Lang } from '@/types'

const QUICK_BRANDS = [
  'Toyota', 'Chevrolet', 'BMW', 'Mercedes', 'Hyundai',
  'Kia', 'Honda', 'Daewoo', 'Audi', 'Lexus', 'Nissan',
]

const STATS = [
  { num: '2 400+', key: 'stats.listings' },
  { num: '48',     key: 'stats.dealers' },
  { num: '12',     key: 'stats.cities' },
] as const

export default function HomePage() {
  const { lang } = useLang()
  const router = useRouter()
  const [featured, setFeatured] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [banners, setBanners] = useState<AdBanner[]>([])

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

        {/* ── Desktop Hero (text + stats) ───────────────────────────────────── */}
        <section className="desktop-hero">
          <div className="max-w-7xl mx-auto px-4 md:px-6 desktop-hero-inner">
            <h1 className="hero-title">
              {t('hero.title', lang)}
            </h1>
            <p className="hero-sub">
              {t('hero.sub', lang)}
            </p>
            <div className="hero-stats">
              {STATS.map((stat, idx) => (
                <div
                  key={stat.key}
                  className={`hero-stat slide-up delay-${(idx + 1) as 1 | 2 | 3}`}
                >
                  <span className="hero-stat-num">{stat.num}</span>
                  <span className="hero-stat-label">{t(stat.key, lang)}</span>
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
                  height: '42px',
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
                }}
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
        /* ── Desktop hero ─────────────────────────────── */
        .desktop-hero {
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          padding: 16px 16px 12px;
        }
        .desktop-hero-inner {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .hero-title {
          font-size: 20px;
          font-weight: 800;
          color: var(--text);
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .hero-sub {
          font-size: 13px;
          color: var(--text-muted);
        }
        .hero-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 4px;
        }
        .hero-stat {
          display: flex;
          align-items: baseline;
          gap: 5px;
        }
        .hero-stat-num {
          font-size: 17px;
          font-weight: 800;
          color: var(--accent);
        }
        .hero-stat-label {
          font-size: 12px;
          color: var(--text-muted);
        }
        .listings-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        @media (min-width: 640px) {
          .listings-grid { grid-template-columns: repeat(3, 1fr); }
        }

        @media (min-width: 1024px) {
          .desktop-hero {
            padding: 28px 16px 20px;
            background: var(--surface);
          }
          .desktop-hero-inner {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 32px;
          }
          .hero-title { font-size: 32px; letter-spacing: -0.03em; }
          .hero-sub { font-size: 15px; max-width: 400px; }
          .hero-stats { gap: 24px; margin-top: 0; }
          .hero-stat-num { font-size: 22px; }
          .hero-stat-label { font-size: 13px; }
          .listings-grid { grid-template-columns: repeat(4, 1fr); gap: 14px; }
        }
      `}</style>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
      <div className="skeleton" style={{ height: '160px' }} />
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
        <div className="skeleton" style={{ height: '18px', width: '55%' }} />
        <div className="skeleton" style={{ height: '13px', width: '80%' }} />
        <div className="skeleton" style={{ height: '11px', width: '65%' }} />
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
