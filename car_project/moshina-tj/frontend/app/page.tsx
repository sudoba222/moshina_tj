'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CarCard from '@/components/CarCard'
import { listingsApi } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { Listing, Lang } from '@/types'

const QUICK_BRANDS = ['Toyota', 'Chevrolet', 'BMW', 'Mercedes', 'Hyundai', 'Kia', 'Honda', 'Daewoo', 'Audi']

export default function HomePage() {
  const { lang } = useLang()
  const router = useRouter()
  const [featured, setFeatured] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listingsApi
      .featured()
      .then((res) => setFeatured(res.data.data))
      .catch(() => setFeatured([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1 }}>

        {/* Page header */}
        <section style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '28px 16px' }}>
          <div className="max-w-7xl mx-auto">
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px', letterSpacing: '-0.02em' }}>
              {t('hero.title', lang)}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              {t('hero.sub', lang)}
            </p>

            {/* Stats */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '16px' }}>
              {[
                { num: '2 400+', key: 'stats.listings' },
                { num: '48',     key: 'stats.dealers' },
                { num: '12',     key: 'stats.cities' },
              ].map((stat) => (
                <div key={stat.key} style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent)' }}>{stat.num}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t(stat.key, lang)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick brand filter */}
        <section style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 16px' }}>
          <div className="max-w-7xl mx-auto" style={{ display: 'flex', gap: '2px', overflowX: 'auto', paddingBottom: '0' }}>
            {QUICK_BRANDS.map((brand) => (
              <button
                key={brand}
                onClick={() => router.push(`/catalog?brand=${brand}`)}
                style={{
                  flexShrink: 0,
                  height: '38px',
                  padding: '0 14px',
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

        {/* Listings */}
        <section style={{ padding: '24px 16px 60px' }}>
          <div className="max-w-7xl mx-auto">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                {lang === 'ru' ? 'Свежие объявления' : 'Эълонҳои нав'}
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
                }}
              >
                {lang === 'ru' ? 'Смотреть все' : 'Ҳамаашро бинед'}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M2 7h10M8 3l4 4-4 4" />
                </svg>
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : featured.length === 0 ? (
              <EmptyState lang={lang} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {featured.map((listing) => (
                  <CarCard key={listing.id} listing={listing} lang={lang} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ height: '180px', background: 'var(--bg)' }} className="animate-pulse" />
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ height: '20px', borderRadius: '4px', background: 'var(--bg)', width: '55%' }} className="animate-pulse" />
        <div style={{ height: '14px', borderRadius: '4px', background: 'var(--bg)', width: '80%' }} className="animate-pulse" />
        <div style={{ height: '12px', borderRadius: '4px', background: 'var(--bg)', width: '65%' }} className="animate-pulse" />
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
