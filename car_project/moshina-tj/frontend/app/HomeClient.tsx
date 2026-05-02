'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CarCard from '@/components/CarCard'
import AdBannerSection from '@/components/AdBanner'
import FirstVisitModal from '@/components/FirstVisitModal'
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

  const categories = [
    {
      slug: 'car',
      ru: 'Легковые', tj: 'Сабук',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
          <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
          <path d="M5 17h-2v-6l2 -5h9l4 4h1a2 2 0 0 1 2 2v5h-2m-4 0h-6m-6 -6h15m-6 0v-5"/>
        </svg>
      ),
    },
    {
      slug: 'suv',
      ru: 'Внедорожники', tj: 'SUV',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
          <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
          <path d="M5 17h-2v-7a1 1 0 0 1 1 -1h12l3 4h1a1 1 0 0 1 1 1v3h-2m-4 0h-6"/>
          <path d="M6 9l2 -4h7l2 4"/>
        </svg>
      ),
    },
    {
      slug: 'electric',
      ru: 'Электро', tj: 'Барқӣ',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
          <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
          <path d="M5 17h-2v-6l2 -5h9l4 4h1a2 2 0 0 1 2 2v5h-2m-4 0h-6"/>
          <path d="M13 4l-3 4h4l-3 4" strokeWidth="1.8"/>
        </svg>
      ),
    },
    {
      slug: 'motorcycle',
      ru: 'Мото', tj: 'Мото',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 16m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/>
          <path d="M19 16m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/>
          <path d="M7.5 14l2.5 -4h5l2 -3"/>
          <path d="M6 5l3 1l1 3h2"/>
          <path d="M12 9h4"/>
          <path d="M17 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/>
        </svg>
      ),
    },
    {
      slug: 'truck',
      ru: 'Грузовики', tj: 'Боркаш',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
          <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
          <path d="M5 17h-2v-11a1 1 0 0 1 1 -1h9v12m-4 0h6m4 0h2v-6a1 1 0 0 0 -1 -1h-2l-3 -4h-1"/>
        </svg>
      ),
    },
    {
      slug: 'parts',
      ru: 'Запчасти', tj: 'Эҳтиёт',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5"/>
        </svg>
      ),
    },
    {
      slug: 'pickup',
      ru: 'Пикапы', tj: 'Пикап',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
          <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
          <path d="M3 17h-2v-6l3 -5h6v11"/>
          <path d="M10 6h2l4 5h5v6h-2"/>
          <path d="M10 11h9"/>
        </svg>
      ),
    },
    {
      slug: 'commercial',
      ru: 'Коммерческий', tj: 'Тиҷоратӣ',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
          <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
          <path d="M5 17h-2v-4m-1 -8h11v12m-4 0h6m4 0h2v-6a1 1 0 0 0 -1 -1h-2l-3 -4h-1"/>
          <path d="M3 9l11 0"/>
          <path d="M3 13l11 0"/>
        </svg>
      ),
    },
  ]

  const howItWorks = [
    {
      step: '1',
      ru_title: 'Найдите объявление',
      tj_title: 'Эълон пайдо кунед',
      ru_desc: 'Воспользуйтесь поиском или фильтрами',
      tj_desc: 'Ҷустуҷӯ ё филтрро истифода баред',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-white)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      ),
    },
    {
      step: '2',
      ru_title: 'Свяжитесь с продавцом',
      tj_title: 'Бо фурӯшанда тамос гиред',
      ru_desc: 'Позвоните или напишите напрямую',
      tj_desc: 'Мустақиман занг занед ё нависед',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-white)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.55 3.31 2 2 0 0 1 3.53 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
      ),
    },
    {
      step: '3',
      ru_title: 'Совершите сделку',
      tj_title: 'Муомила кунед',
      ru_desc: 'Встретьтесь и проверьте авто',
      tj_desc: 'Вохӯред ва мошинро санҷед',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-white)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
          <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
          <path d="M5 17h-2v-6l2-5h9l4 4h1a2 2 0 0 1 2 2v5h-2m-4 0h-6m-6-6h15m-6 0v-5"/>
        </svg>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <FirstVisitModal />
      <Navbar />

      <main style={{ flex: 1, paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }} className="pb-mobile">

        {/* ── HERO SECTION ──────────────────────────────────────────────────── */}
        <section className="hero-section" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: 'clamp(28px,5vw,52px) clamp(16px,3vw,32px) 0' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>

            {/* Eyebrow badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: '12px', fontWeight: 700, letterSpacing: '.06em', padding: '5px 12px', borderRadius: '9999px', textTransform: 'uppercase', marginBottom: '14px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 2s infinite', flexShrink: 0 }} aria-hidden="true" />
              {lang === 'ru' ? 'Таджикистан · 15 городов' : 'Тоҷикистон · 15 шаҳр'}
            </div>

            {/* H1 */}
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: '12px' }}>
              {lang === 'ru'
                ? <>Найдите свой <span style={{ color: 'var(--accent)' }}>автомобиль</span></>
                : <>Мошинаи худро <span style={{ color: 'var(--accent)' }}>ёбед</span></>}
            </h1>
            <p style={{ fontSize: 'clamp(14px, 1.8vw, 15px)', color: 'var(--muted)', marginBottom: '24px', lineHeight: 1.65, maxWidth: '540px' }}>
              {t('hero.sub', lang)}
            </p>

            {/* Search bar: vertical on mobile, single horizontal bar on sm+ */}
            <div className="hero-search-bar">
              {/* Input field */}
              <div className="hero-search-input-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleHeroSearch() }}
                  placeholder={t('hero.searchPlaceholder', lang)}
                  autoComplete="off"
                  aria-label={t('hero.searchPlaceholder', lang)}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '15px', color: 'var(--text)', minWidth: 0, height: '100%' }}
                />
              </div>

              {/* City select */}
              <div className="hero-search-divider" aria-hidden="true" />
              <div className="hero-search-select-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
                <select
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  aria-label={t('hero.searchCity', lang)}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 500, color: searchCity ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', minWidth: 0 }}
                >
                  <option value="">{t('hero.allCities', lang)}</option>
                  {CITIES_LIST.map((c) => (
                    <option key={c.value} value={c.value}>{t(c.labelKey, lang)}</option>
                  ))}
                </select>
              </div>

              {/* Brand select */}
              <div className="hero-search-divider" aria-hidden="true" />
              <div className="hero-search-select-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                </svg>
                <select
                  value={searchBrand}
                  onChange={(e) => setSearchBrand(e.target.value)}
                  aria-label={t('hero.searchBrand', lang)}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 500, color: searchBrand ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', minWidth: 0 }}
                >
                  <option value="">{t('hero.allBrands', lang)}</option>
                  {QUICK_BRANDS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Search button */}
              <button
                onClick={handleHeroSearch}
                className="hero-search-btn"
                aria-label={t('hero.searchBtn', lang)}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <span>{t('hero.searchBtn', lang)}</span>
              </button>
            </div>

            {/* Stats row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'stretch',
                marginTop: '32px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                overflow: 'hidden',
              }}
              role="list"
              aria-label="Platform statistics"
            >
              {STATS_KEYS.map(({ field, i18nKey }, idx) => (
                <div
                  key={i18nKey}
                  role="listitem"
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    textAlign: 'center',
                    padding: '16px 12px',
                    borderRight: idx < STATS_KEYS.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {statsLoading ? (
                    <span className="skeleton" style={{ display: 'inline-block', width: '52px', height: '22px', borderRadius: '4px' }} aria-hidden="true" />
                  ) : (
                    <span style={{ fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: 900, color: 'var(--accent)', lineHeight: 1, letterSpacing: '-0.03em' }}>
                      {stats ? `${formatStatNum(stats[field] as number)}+` : '—'}
                    </span>
                  )}
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.3, marginTop: '2px' }}>
                    {t(i18nKey, lang)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CATEGORIES GRID ───────────────────────────────────────────────── */}
        <section style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: 'clamp(28px, 4vw, 44px) 16px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h2 style={{ fontSize: 'clamp(17px, 2.5vw, 22px)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>
                {lang === 'ru' ? 'Категории' : 'Категорияҳо'}
              </h2>
              <Link
                href="/categories"
                style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 0', minHeight: '44px', opacity: 0.9 }}
              >
                {lang === 'ru' ? 'Все категории' : 'Ҳама категорияҳо'}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M2 7h10M8 3l4 4-4 4"/>
                </svg>
              </Link>
            </div>

            {/* Grid */}
            <div className="categories-grid">
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => router.push(`/catalog?category=${cat.slug}`)}
                  className="category-card"
                >
                  <div className="category-icon-wrap">
                    {cat.icon}
                  </div>
                  <span className="category-label">
                    {lang === 'ru' ? cat.ru : cat.tj}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── BRAND LOGOS STRIP ─────────────────────────────────────────────── */}
        <section className="brand-strip-section">
          <div style={{ position: 'relative' }}>
            <div aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40px', background: 'linear-gradient(to right, var(--surface), transparent)', pointerEvents: 'none', zIndex: 1 }} />
            <div aria-hidden="true" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '40px', background: 'linear-gradient(to left, var(--surface), transparent)', pointerEvents: 'none', zIndex: 1 }} />
            <div
              className="scrollbar-hide"
              style={{ display: 'flex', gap: '0', overflowX: 'auto', padding: '0 16px', WebkitOverflowScrolling: 'touch' }}
            >
              {QUICK_BRANDS.map((brand) => (
                <button
                  key={brand}
                  onClick={() => router.push(`/catalog?brand=${brand}`)}
                  className="brand-btn"
                  onMouseEnter={(e) => { e.currentTarget.style.borderBottomColor = 'var(--accent)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderBottomColor = 'transparent' }}
                >
                  <CarBrandLogo brand={brand} size={30} />
                  <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {brand}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── PERSONALIZED BRAND PILLS ──────────────────────────────────────── */}
        {userPrefs?.brands && userPrefs.brands.length > 0 && (
          <section style={{ padding: '16px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
                {t('onboarding.forYou', lang)}
              </span>
              {userPrefs.brands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => router.push(`/catalog?brand=${brand}`)}
                  style={{ padding: '5px 12px', borderRadius: '20px', border: '1.5px solid var(--accent)', background: 'var(--accent)', color: 'var(--color-white)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'opacity 0.15s', whiteSpace: 'nowrap' }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.82' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                >
                  {brand}
                </button>
              ))}
            </div>
          </section>
        )}



        {/* ── FEATURED LISTINGS ─────────────────────────────────────────────── */}
        <section style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: 'clamp(28px, 4vw, 44px) 16px' }}>
          <div className="max-w-7xl mx-auto">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: 'clamp(17px, 2.5vw, 22px)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>
                {userPrefs?.brands && userPrefs.brands.length > 0
                  ? t('onboarding.forYou', lang)
                  : t('hero.latestListings', lang)
                }
              </h2>
              <button
                onClick={() => router.push('/catalog')}
                style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 0', transition: 'opacity 0.15s ease', minHeight: '44px' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.75' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
              >
                {t('hero.viewAll', lang)}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M2 7h10M8 3l4 4-4 4"/>
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

        {/* ── AD BANNER ─────────────────────────────────────────────────────── */}
        <section style={{ padding: '24px 16px 0', background: 'var(--bg)' }}>
          <div className="max-w-7xl mx-auto">
            <AdBannerSection />
          </div>
        </section>

        {/* ── SELL YOUR CAR CTA BANNER ──────────────────────────────────────── */}
        <section style={{ padding: 'clamp(24px, 4vw, 40px) 16px', background: 'var(--bg)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="sell-banner">
              <div className="sell-banner-left">
                <h2 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, color: 'var(--color-white)', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '8px' }}>
                  {lang === 'ru' ? 'Продайте ваш автомобиль' : 'Мошини худро фурӯшед'}
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--color-white)', opacity: 0.8, lineHeight: 1.55, margin: 0 }}>
                  {lang === 'ru'
                    ? 'Разместите объявление бесплатно — тысячи покупателей увидят его уже сегодня'
                    : 'Эълонро ройгон гузоред — ҳазорон харидор онро имрӯз мебинанд'}
                </p>
              </div>
              <div className="sell-banner-right">
                <Link
                  href="/post"
                  className="sell-banner-btn"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.95)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-white)' }}
                >
                  {lang === 'ru' ? 'Разместить объявление' : 'Эълон гузоштан'}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── TRUST SECTION ─────────────────────────────────────────────────── */}
        <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: 'clamp(32px, 4vw, 56px) 16px' }}>
          <div className="max-w-7xl mx-auto">
            <h2 style={{ fontSize: 'clamp(17px, 2.5vw, 24px)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '28px', textAlign: 'center' }}>
              {t('trust.title', lang)}
            </h2>
            <div className="trust-grid">
              {([
                {
                  titleKey: 'trust.safeTitle',
                  descKey: 'trust.safeDesc',
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <polyline points="9 12 11 14 15 10"/>
                    </svg>
                  ),
                },
                {
                  titleKey: 'trust.verifiedTitle',
                  descKey: 'trust.verifiedDesc',
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  ),
                },
                {
                  titleKey: 'trust.supportTitle',
                  descKey: 'trust.supportDesc',
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
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
        /* ── Hero search bar ── */
        .hero-search-bar {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .hero-search-input-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          height: 54px;
          background: var(--card);
          border: 1.5px solid var(--border);
          border-radius: 14px;
          padding: 0 14px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .hero-search-input-wrap:focus-within {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-dim);
        }
        .hero-search-divider {
          display: none;
          width: 1px;
          background: var(--border);
          align-self: stretch;
          margin: 12px 0;
        }
        .hero-search-select-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 54px;
          background: var(--card);
          border: 1.5px solid var(--border);
          border-radius: 14px;
          padding: 0 14px;
          flex: 1;
          transition: border-color 0.2s;
        }
        .hero-search-select-wrap:focus-within {
          border-color: var(--accent);
        }
        .hero-search-btn {
          height: 54px;
          padding: 0 24px;
          background: var(--accent);
          color: var(--color-white);
          border: none;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.15s ease, opacity 0.15s ease;
          white-space: nowrap;
          width: 100%;
          font-family: var(--font);
          letter-spacing: 0.01em;
        }
        .hero-search-btn:hover {
          background: var(--accent-hover);
        }
        @media (min-width: 640px) {
          .hero-search-bar {
            flex-direction: row;
            align-items: center;
            background: var(--card);
            border: 1.5px solid var(--border);
            border-radius: 16px;
            box-shadow: 0 4px 32px rgba(0,0,0,0.08);
            padding: 0;
            overflow: hidden;
            gap: 0;
            transition: border-color 0.2s, box-shadow 0.2s;
          }
          .hero-search-bar:focus-within {
            border-color: var(--accent);
            box-shadow: 0 4px 32px rgba(0,0,0,0.08), 0 0 0 3px var(--accent-dim);
          }
          .hero-search-input-wrap {
            flex: 2;
            border: none;
            border-radius: 0;
            background: transparent;
            height: 62px;
            padding: 0 16px;
            box-shadow: none;
          }
          .hero-search-input-wrap:focus-within {
            border: none;
            box-shadow: none;
          }
          .hero-search-divider {
            display: block;
          }
          .hero-search-select-wrap {
            flex: 1;
            border: none;
            border-radius: 0;
            background: transparent;
            height: 62px;
            padding: 0 14px;
          }
          .hero-search-select-wrap:focus-within {
            border: none;
          }
          .hero-search-btn {
            height: 62px;
            border-radius: 0 14px 14px 0;
            padding: 0 28px;
            width: auto;
            flex-shrink: 0;
          }
        }

        /* ── Categories grid ── */
        .categories-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        @media (min-width: 540px) {
          .categories-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (min-width: 1024px) {
          .categories-grid { grid-template-columns: repeat(8, 1fr); gap: 12px; }
        }
        .category-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 20px 12px 16px;
          background: var(--card);
          border: 1.5px solid var(--border);
          border-radius: 16px;
          cursor: pointer;
          transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s cubic-bezier(0.16,1,0.3,1);
          box-shadow: var(--shadow-sm);
        }
        .category-card:hover {
          border-color: var(--accent);
          box-shadow: 0 4px 16px rgba(200,56,8,0.12);
          transform: translateY(-3px);
        }
        .category-card:active {
          transform: translateY(0) scale(0.97);
        }
        .category-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: var(--accent-dim);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.18s, transform 0.18s;
        }
        .category-card:hover .category-icon-wrap {
          background: rgba(200,56,8,0.14);
          transform: scale(1.08);
        }
        .category-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
          text-align: center;
          line-height: 1.3;
          transition: color 0.15s;
        }
        .category-card:hover .category-label {
          color: var(--accent);
        }

        /* ── Brand button ── */
        .brand-btn {
          flex-shrink: 0;
          height: 72px;
          min-width: 72px;
          padding: 8px 10px 6px;
          background: none;
          border: none;
          border-bottom: 2.5px solid transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          cursor: pointer;
          transition: border-color 0.15s, transform 0.15s;
        }
        .brand-btn:hover {
          transform: translateY(-1px);
        }

        /* ── Sell banner ── */
        .sell-banner {
          background: linear-gradient(135deg, var(--accent) 0%, #8b1a00 100%);
          border-radius: 20px;
          padding: clamp(24px, 4vw, 44px) clamp(20px, 4vw, 44px);
          display: flex;
          flex-direction: column;
          gap: 24px;
          align-items: flex-start;
          position: relative;
          overflow: hidden;
        }
        .sell-banner::before {
          content: '';
          position: absolute;
          top: -60px;
          right: -60px;
          width: 200px;
          height: 200px;
          background: rgba(255,255,255,0.06);
          border-radius: 50%;
          pointer-events: none;
        }
        .sell-banner::after {
          content: '';
          position: absolute;
          bottom: -80px;
          right: 80px;
          width: 280px;
          height: 280px;
          background: rgba(255,255,255,0.04);
          border-radius: 50%;
          pointer-events: none;
        }
        @media (min-width: 640px) {
          .sell-banner {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }
        .sell-banner-left {
          flex: 1;
          position: relative;
          z-index: 1;
        }
        .sell-banner-right {
          flex-shrink: 0;
          width: 100%;
          position: relative;
          z-index: 1;
        }
        @media (min-width: 640px) {
          .sell-banner-right { width: auto; }
        }
        .sell-banner-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--color-white);
          color: var(--accent);
          border: none;
          border-radius: 12px;
          padding: 14px 28px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.15s, transform 0.15s;
          white-space: nowrap;
          width: 100%;
          font-family: var(--font);
          letter-spacing: 0.01em;
        }
        .sell-banner-btn:hover {
          background: rgba(255,255,255,0.9);
          transform: translateY(-1px);
        }
        @media (min-width: 640px) {
          .sell-banner-btn { width: auto; }
        }

        /* ── Listings grid ── */
        .listings-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 480px) {
          .listings-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
        }
        @media (min-width: 768px) {
          .listings-grid { grid-template-columns: repeat(3, 1fr); gap: 14px; }
        }
        @media (min-width: 1200px) {
          .listings-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; }
        }

        /* ── Trust section ── */
        .trust-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        @media (min-width: 640px) {
          .trust-grid { grid-template-columns: repeat(3, 1fr); gap: 18px; }
        }
        .trust-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: clamp(20px, 3vw, 32px);
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: box-shadow 0.2s ease, transform 0.2s cubic-bezier(0.16,1,0.3,1);
          box-shadow: var(--shadow-sm);
        }
        .trust-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }
        .trust-icon {
          width: 52px;
          height: 52px;
          background: var(--accent-dim);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .trust-card-title {
          font-size: 16px;
          font-weight: 800;
          color: var(--text);
          letter-spacing: -0.01em;
          margin: 0;
        }
        .trust-card-desc {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.65;
          margin: 0;
        }
      `}</style>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div
      style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}
      aria-hidden="true"
    >
      <div className="skeleton card-image-wrap" style={{ borderRadius: 0 }} />
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Brand + model line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="skeleton" style={{ height: '20px', width: '20px', borderRadius: '50%', flexShrink: 0 }} />
          <div className="skeleton" style={{ height: '13px', width: '60%', borderRadius: '4px' }} />
        </div>
        {/* Price */}
        <div className="skeleton" style={{ height: '22px', width: '48%', borderRadius: '4px' }} />
        {/* Chips */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <div className="skeleton" style={{ height: '22px', width: '64px', borderRadius: '20px' }} />
          <div className="skeleton" style={{ height: '22px', width: '76px', borderRadius: '20px' }} />
        </div>
        {/* Location + date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '9px', borderTop: '1px solid var(--border)', marginTop: '1px' }}>
          <div className="skeleton" style={{ height: '11px', width: '38%', borderRadius: '4px' }} />
          <div className="skeleton" style={{ height: '11px', width: '22%', borderRadius: '4px' }} />
        </div>
      </div>
    </div>
  )
}

function EmptyState({ lang }: { lang: Lang }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
      <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" aria-hidden="true">
          <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h10l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2h-2"/>
          <circle cx="7.5" cy="17" r="2.5"/>
          <circle cx="16.5" cy="17" r="2.5"/>
        </svg>
      </div>
      <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>{t('catalog.noResults', lang)}</p>
      <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
        {lang === 'ru' ? 'Попробуйте изменить параметры поиска' : 'Параметрҳои ҷустуҷӯро тағйир диҳед'}
      </p>
    </div>
  )
}
