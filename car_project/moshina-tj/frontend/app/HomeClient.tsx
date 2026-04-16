'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CarCard from '@/components/CarCard'
import AdBannerSection from '@/components/AdBanner'
import CarBrandLogo from '@/components/CarBrandLogo'
import { listingsApi, statsApi } from '@/lib/api'
import type { MarketplaceStats } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { Listing, Lang } from '@/types'

interface HomeClientProps {
  initialFeatured: Listing[]
  initialStats: MarketplaceStats | null
}

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
  'Toyota', 'Chevrolet', 'Hyundai', 'Kia', 'Honda',
  'BMW', 'Mercedes', 'Audi', 'Volkswagen', 'Skoda',
  'Lada', 'Daewoo', 'Nissan', 'Lexus', 'Haval',
  'Chery', 'Geely', 'BYD', 'Mitsubishi', 'Mazda',
]


function formatStatNum(n: number): string {
  return n.toLocaleString('ru-RU')
}

interface StoredPrefs {
  city?: string
  lang?: string
  brands?: string[]
}

export default function HomeClient({ initialFeatured, initialStats }: HomeClientProps) {
  const { lang } = useLang()
  const router = useRouter()
  const [featured, setFeatured] = useState<Listing[]>(initialFeatured)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<MarketplaceStats | null>(initialStats)
  const [statsLoading, setStatsLoading] = useState(false)
  const [userPrefs, setUserPrefs] = useState<StoredPrefs | null>(null)

  // Hero search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchCity, setSearchCity] = useState('')
  const [searchBrand, setSearchBrand] = useState('')

  // Load user prefs and pre-fill city
  useEffect(() => {
    const stored = localStorage.getItem('user_prefs')
    if (stored) {
      try {
        const prefs = JSON.parse(stored) as StoredPrefs
        setUserPrefs(prefs)
        if (prefs.city && !searchCity) setSearchCity(prefs.city)
      } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Refresh stats periodically; initial value already server-rendered
    const interval = setInterval(() => {
      statsApi
        .get()
        .then((res) => { if (res.data.success && res.data.data) setStats(res.data.data) })
        .catch(() => {})
    }, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Refresh listings in background if none were server-rendered
    if (initialFeatured.length === 0) {
      setLoading(true)
      listingsApi
        .featured()
        .then((res) => setFeatured(res.data.data))
        .catch(() => setFeatured([]))
        .finally(() => setLoading(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleHeroSearch() {
    const params = new URLSearchParams()
    if (searchQuery.trim()) params.set('q', searchQuery.trim())
    if (searchCity) params.set('city', searchCity)
    if (searchBrand) params.set('brand', searchBrand)
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

        {/* ── Category type strip ─────────────────────────────────────────── */}
        <section style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '14px 0 12px' }}>
          <div style={{ position: 'relative' }}>
            <div aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '28px', background: 'linear-gradient(to right, var(--bg), transparent)', pointerEvents: 'none', zIndex: 1 }} />
            <div aria-hidden="true" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '28px', background: 'linear-gradient(to left, var(--bg), transparent)', pointerEvents: 'none', zIndex: 1 }} />
            <div className="scrollbar-hide" style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '0 16px', WebkitOverflowScrolling: 'touch' }}>

              {/* "Все типы" → opens /categories */}
              <button
                onClick={() => router.push('/categories')}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  border: '1.5px solid var(--accent)',
                  background: 'var(--accent-dim)',
                  cursor: 'pointer',
                  minWidth: '64px',
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-white)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                  </svg>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                  {lang === 'ru' ? 'Все типы' : 'Ҳама навъ'}
                </span>
              </button>

              {[
                { slug: 'car',        ru: 'Легковые',    tj: 'Сабук',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 17h-2v-6l2 -5h9l4 4h1a2 2 0 0 1 2 2v5h-2m-4 0h-6m-6 -6h15m-6 0v-5"/></svg> },
                { slug: 'suv',        ru: 'Внедорожники', tj: 'SUV',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 17h-2v-7a1 1 0 0 1 1 -1h12l3 4h1a1 1 0 0 1 1 1v3h-2m-4 0h-6"/><path d="M6 9l2 -4h7l2 4"/></svg> },
                { slug: 'minivan',    ru: 'Минивэны',    tj: 'Минивэн',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M3 17h-2v-11a2 2 0 0 1 2 -2h13v11"/><path d="M16 4l4 4h-4v-4z"/><path d="M16 8h4v9h-2"/><path d="M5 6h4v5h-4z"/><path d="M10 6h3v5h-3z"/></svg> },
                { slug: 'pickup',     ru: 'Пикапы',      tj: 'Пикап',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M3 17h-2v-6l3 -5h6v11"/><path d="M10 6h2l4 5h5v6h-2"/><path d="M10 11h9"/></svg> },
                { slug: 'truck',      ru: 'Грузовики',   tj: 'Боркаш',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 17h-2v-11a1 1 0 0 1 1 -1h9v12m-4 0h6m4 0h2v-6a1 1 0 0 0 -1 -1h-2l-3 -4h-1"/></svg> },
                { slug: 'motorcycle', ru: 'Мото',        tj: 'Мото',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 16m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M19 16m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M7.5 14l2.5 -4h5l2 -3"/><path d="M6 5l3 1l1 3h2"/><path d="M12 9h4"/><path d="M17 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/></svg> },
                { slug: 'bus',        ru: 'Автобусы',    tj: 'Автобус',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M18 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M4 17h-2v-11a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v11h-2m-10 0h8"/><path d="M4 9l16 0"/><path d="M9 9l0 6"/><path d="M15 9l0 6"/></svg> },
                { slug: 'special',    ru: 'Спецтехника', tj: 'Техника',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M13 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M2 17h-1v-4l2 -5h7l1 9h-2"/><path d="M6 8v-5l6 3v2"/><path d="M15 17h-2"/><path d="M15 13h4l2 4h-6v-4z"/></svg> },
                { slug: 'electric',   ru: 'Электро',     tj: 'Барқӣ',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 17h-2v-6l2 -5h9l4 4h1a2 2 0 0 1 2 2v5h-2m-4 0h-6"/><path d="M13 4l-3 4h4l-3 4" strokeWidth="1.8"/></svg> },
                { slug: 'parts',      ru: 'Запчасти',    tj: 'Эҳтиёт',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5"/></svg> },
                { slug: 'commercial', ru: 'Коммерческий', tj: 'Тиҷоратӣ',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 17h-2v-4m-1 -8h11v12m-4 0h6m4 0h2v-6a1 1 0 0 0 -1 -1h-2l-3 -4h-1"/><path d="M3 9l11 0"/><path d="M3 13l11 0"/></svg> },
              ].map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => router.push(`/catalog?category=${cat.slug}`)}
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 14px',
                    borderRadius: '14px',
                    border: '1.5px solid var(--border)',
                    background: 'var(--card)',
                    cursor: 'pointer',
                    minWidth: '64px',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.background = 'var(--accent-dim)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.background = 'var(--card)'
                  }}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    {cat.icon}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {lang === 'ru' ? cat.ru : cat.tj}
                  </span>
                </button>
              ))}

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
                  height: '68px',
                  minWidth: '64px',
                  padding: '8px 10px 6px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '2px solid transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, transform 0.1s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderBottomColor = 'var(--accent)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderBottomColor = 'transparent'
                }}
              >
                <CarBrandLogo brand={brand} size={30} />
                <span style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                }}>
                  {brand}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Personalized brand pills (shown when user has preferred brands) ─── */}
        {userPrefs?.brands && userPrefs.brands.length > 0 && (
          <section style={{ padding: '12px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
                {t('onboarding.forYou', lang)}
              </span>
              {userPrefs.brands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => router.push(`/catalog?brand=${brand}`)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    border: '1.5px solid var(--accent)',
                    background: 'var(--accent)',
                    color: 'var(--color-white)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'var(--font)',
                    transition: 'opacity 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.82' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                >
                  {brand}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Featured listings grid ────────────────────────────────────────── */}
        <section style={{ padding: '20px 16px 0' }}>
          <div className="max-w-7xl mx-auto">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 style={{ fontSize: 'clamp(15px, 2vw, 19px)', fontWeight: 700, color: 'var(--text)' }}>
                {userPrefs?.brands && userPrefs.brands.length > 0
                  ? t('onboarding.forYou', lang)
                  : t('hero.latestListings', lang)
                }
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
