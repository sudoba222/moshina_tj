'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CarCard from '@/components/CarCard'
import Pagination from '@/components/Pagination'
import { listingsApi, searchApi, type ListingFilters } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { Listing } from '@/types'

const CITIES = [
  'Душанбе', 'Хуҷанд', 'Бохтар', 'Кӯлоб', 'Истаравшан',
  'Пенджикент', 'Вахш', 'Хорог', 'Турсунзода', 'Нораком',
]

const BRANDS = [
  'Toyota', 'Chevrolet', 'BMW', 'Mercedes', 'Hyundai', 'Kia',
  'Honda', 'Daewoo', 'Audi', 'Lexus', 'Nissan', 'Volkswagen',
  'Ford', 'Mazda', 'Lada', 'Mitsubishi',
]

const FUELS = ['Бензин', 'Дизель', 'Газ', 'Электро', 'Гибрид']
const TRANSMISSIONS = ['Автомат', 'Механика', 'Вариатор']
const COLORS = [
  { label: 'Белый',    value: 'Белый',     swatch: '#f5f5f5' },
  { label: 'Чёрный',   value: 'Черный',    swatch: '#1a1a1a' },
  { label: 'Серебро',  value: 'Серебро',   swatch: '#c0c0c0' },
  { label: 'Красный',  value: 'Красный',   swatch: '#c83808' },
  { label: 'Синий',    value: 'Синий',     swatch: '#2563eb' },
  { label: 'Зелёный',  value: 'Зелёный',   swatch: '#16a34a' },
  { label: 'Другой',   value: 'Другой',    swatch: 'linear-gradient(135deg, #f59e0b, #8b5cf6)' },
]
const MILEAGE_OPTIONS = [
  { label: { ru: 'Любой',         tj: 'Ҳар гуна' },   value: '' },
  { label: { ru: 'До 50 000 км',  tj: 'То 50 000 км' }, value: '50000' },
  { label: { ru: 'До 100 000 км', tj: 'То 100 000 км' }, value: '100000' },
  { label: { ru: 'До 150 000 км', tj: 'То 150 000 км' }, value: '150000' },
  { label: { ru: 'До 200 000 км', tj: 'То 200 000 км' }, value: '200000' },
]

function CatalogFallback() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ height: '100px', background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)' }} />
      <div className="max-w-7xl mx-auto px-4 md:px-6 w-full" style={{ paddingTop: '32px' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <CatalogSkeleton key={i} />)}
        </div>
      </div>
    </div>
  )
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<CatalogFallback />}>
      <CatalogContent />
    </Suspense>
  )
}

function CatalogContent() {
  const { lang } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [listings, setListings] = useState<Listing[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [didYouMean, setDidYouMean] = useState<string | null>(null)

  // Filter state
  const [type, setType] = useState<string>(searchParams.get('type') ?? '')
  const [city, setCity] = useState(searchParams.get('city') ?? '')
  const [brand, setBrand] = useState(searchParams.get('brand') ?? searchParams.get('q') ?? '')
  const [model, setModel] = useState(searchParams.get('model') ?? '')
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') ?? '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') ?? '')
  const [minYear, setMinYear] = useState(searchParams.get('min_year') ?? '')
  const [maxYear, setMaxYear] = useState(searchParams.get('max_year') ?? '')
  const [fuel, setFuel] = useState(searchParams.get('fuel') ?? '')
  const [transmission, setTransmission] = useState(searchParams.get('transmission') ?? '')
  const [color, setColor] = useState(searchParams.get('color') ?? '')
  const [maxMileage, setMaxMileage] = useState(searchParams.get('max_mileage') ?? '')
  const [installmentOnly, setInstallmentOnly] = useState(searchParams.get('installment') === 'true')
  const [sort, setSort] = useState(searchParams.get('sort') ?? '')
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1'))

  const activeFilterCount = [type, city, brand, model, minPrice, maxPrice, minYear, maxYear, fuel, transmission, color, maxMileage]
    .filter(Boolean).length + (installmentOnly ? 1 : 0)

  const fetchListings = useCallback(async () => {
    setLoading(true)
    setDidYouMean(null)
    try {
      const filters: ListingFilters = { page, limit: 20 }
      if (type) filters.type = type
      if (city) filters.city = city
      if (brand) filters.brand = brand
      if (model) filters.model = model
      if (minPrice) filters.min_price = Number(minPrice)
      if (maxPrice) filters.max_price = Number(maxPrice)
      if (minYear) filters.min_year = Number(minYear)
      if (maxYear) filters.max_year = Number(maxYear)
      if (fuel) filters.fuel = fuel
      if (transmission) filters.transmission = transmission
      if (color) filters.color = color
      if (maxMileage) filters.max_mileage = Number(maxMileage)
      if (installmentOnly) filters.installment = true
      if (sort) filters.sort = sort

      const res = await listingsApi.list(filters)
      const data = res.data.data
      setListings(data.items)
      setTotal(data.total)
      setPages(data.pages)

      // Show "did you mean" only when there are zero results and a text query exists
      const currentQ = searchParams.get('q')
      if (data.items.length === 0 && currentQ && currentQ.trim().length > 0) {
        try {
          const dymRes = await searchApi.didYouMean(currentQ.trim())
          const suggestion = dymRes.data.data
          if (suggestion && suggestion.toLowerCase() !== currentQ.trim().toLowerCase()) {
            setDidYouMean(suggestion)
          }
        } catch {
          // Non-critical — silently ignore
        }
      }
    } catch {
      setListings([])
    } finally {
      setLoading(false)
    }
  }, [type, city, brand, model, minPrice, maxPrice, minYear, maxYear, fuel, transmission, color, maxMileage, installmentOnly, sort, page, searchParams])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  function applyFilters() {
    setPage(1)
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    if (city) params.set('city', city)
    if (brand) params.set('brand', brand)
    if (model) params.set('model', model)
    if (minPrice) params.set('min_price', minPrice)
    if (maxPrice) params.set('max_price', maxPrice)
    if (minYear) params.set('min_year', minYear)
    if (maxYear) params.set('max_year', maxYear)
    if (fuel) params.set('fuel', fuel)
    if (transmission) params.set('transmission', transmission)
    if (color) params.set('color', color)
    if (maxMileage) params.set('max_mileage', maxMileage)
    if (installmentOnly) params.set('installment', 'true')
    if (sort) params.set('sort', sort)
    params.set('page', '1')
    router.push(`/catalog?${params.toString()}`, { scroll: false })
    setDrawerOpen(false)
  }

  function resetFilters() {
    setType(''); setCity(''); setBrand(''); setModel('')
    setMinPrice(''); setMaxPrice(''); setMinYear(''); setMaxYear('')
    setFuel(''); setTransmission(''); setColor(''); setMaxMileage('')
    setInstallmentOnly(false); setSort(''); setPage(1)
    router.push('/catalog')
  }

  function handlePageChange(p: number) {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleDidYouMeanClick(suggestion: string) {
    setDidYouMean(null)
    setBrand(suggestion)
    const params = new URLSearchParams()
    params.set('q', suggestion)
    params.set('page', '1')
    router.push(`/catalog?${params.toString()}`, { scroll: false })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '8px 10px',
    fontSize: '13px',
    color: 'var(--text)',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    marginBottom: '5px',
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  }

  const sidebarContent = (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {t('catalog.filters', lang)}
        </span>
        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {t('catalog.resetFilters', lang)}
          </button>
        )}
      </div>

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Type pills */}
        <div>
          <label style={labelStyle}>{t('post.type', lang)}</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['', 'sale', 'rent'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setType(v)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: type === v ? 'var(--accent)' : 'var(--surface)',
                  color: type === v ? '#fff' : 'var(--text-muted)',
                  border: type === v ? '1px solid var(--accent)' : '1px solid var(--border)',
                  transition: 'all 0.15s',
                }}
              >
                {v === '' ? t('filters.all', lang) : v === 'sale' ? t('filters.sale', lang) : t('filters.rent', lang)}
              </button>
            ))}
          </div>
        </div>

        {/* Brand */}
        <div>
          <label htmlFor="filter-brand" style={labelStyle}>{t('catalog.brand', lang)}</label>
          <select id="filter-brand" value={brand} onChange={(e) => setBrand(e.target.value)} style={inputStyle}>
            <option value="">{t('catalog.allBrands', lang)}</option>
            {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Model */}
        <div>
          <label htmlFor="filter-model" style={labelStyle}>{t('catalog.model', lang)}</label>
          <input
            id="filter-model"
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={brand ? 'Camry, Nexia...' : '—'}
            disabled={!brand}
            style={{ ...inputStyle, opacity: brand ? 1 : 0.5 }}
          />
        </div>

        {/* Year */}
        <div>
          <label style={labelStyle}>{t('catalog.minYear', lang)} / {t('catalog.maxYear', lang)}</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="number"
              value={minYear}
              onChange={(e) => setMinYear(e.target.value)}
              placeholder="1990"
              min={1990}
              max={2025}
              style={{ ...inputStyle, flex: 1 }}
            />
            <input
              type="number"
              value={maxYear}
              onChange={(e) => setMaxYear(e.target.value)}
              placeholder="2025"
              min={1990}
              max={2025}
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        </div>

        {/* Price */}
        <div>
          <label style={labelStyle}>{t('catalog.minPrice', lang)} / {t('catalog.maxPrice', lang)}</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="0"
              style={{ ...inputStyle, flex: 1 }}
            />
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="∞"
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        </div>

        {/* Mileage */}
        <div>
          <label htmlFor="filter-mileage" style={labelStyle}>{t('catalog.mileage', lang)}</label>
          <select id="filter-mileage" value={maxMileage} onChange={(e) => setMaxMileage(e.target.value)} style={inputStyle}>
            {MILEAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label[lang]}</option>
            ))}
          </select>
        </div>

        {/* Fuel */}
        <div>
          <label style={labelStyle}>{t('catalog.fuel', lang)}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            <button
              onClick={() => setFuel('')}
              style={{
                padding: '4px 9px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                background: fuel === '' ? 'var(--accent)' : 'var(--surface)',
                color: fuel === '' ? '#fff' : 'var(--text-muted)',
                border: fuel === '' ? '1px solid var(--accent)' : '1px solid var(--border)',
              }}
            >
              {t('filters.all', lang)}
            </button>
            {FUELS.map((f) => (
              <button
                key={f}
                onClick={() => setFuel(f === fuel ? '' : f)}
                style={{
                  padding: '4px 9px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: fuel === f ? 'var(--accent)' : 'var(--surface)',
                  color: fuel === f ? '#fff' : 'var(--text-muted)',
                  border: fuel === f ? '1px solid var(--accent)' : '1px solid var(--border)',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Transmission */}
        <div>
          <label style={labelStyle}>{t('catalog.transmission', lang)}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            <button
              onClick={() => setTransmission('')}
              style={{
                padding: '4px 9px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                background: transmission === '' ? 'var(--accent)' : 'var(--surface)',
                color: transmission === '' ? '#fff' : 'var(--text-muted)',
                border: transmission === '' ? '1px solid var(--accent)' : '1px solid var(--border)',
              }}
            >
              {t('filters.all', lang)}
            </button>
            {TRANSMISSIONS.map((tr) => (
              <button
                key={tr}
                onClick={() => setTransmission(tr === transmission ? '' : tr)}
                style={{
                  padding: '4px 9px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: transmission === tr ? 'var(--accent)' : 'var(--surface)',
                  color: transmission === tr ? '#fff' : 'var(--text-muted)',
                  border: transmission === tr ? '1px solid var(--accent)' : '1px solid var(--border)',
                }}
              >
                {tr}
              </button>
            ))}
          </div>
        </div>

        {/* Color swatches */}
        <div>
          <label style={labelStyle}>{t('catalog.color', lang)}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value === color ? '' : c.value)}
                title={c.label}
                aria-label={c.label}
                aria-pressed={color === c.value}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: c.swatch,
                  border: color === c.value ? '2.5px solid var(--accent)' : '2px solid var(--border)',
                  cursor: 'pointer',
                  boxShadow: color === c.value ? '0 0 0 2px var(--card), 0 0 0 4px var(--accent)' : 'none',
                  outline: 'none',
                  flexShrink: 0,
                  transition: 'box-shadow 0.15s ease',
                }}
              />
            ))}
          </div>
        </div>

        {/* City */}
        <div>
          <label htmlFor="filter-city" style={labelStyle}>{t('catalog.city', lang)}</label>
          <select id="filter-city" value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle}>
            <option value="">{t('catalog.allCities', lang)}</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Installment */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
          <input
            type="checkbox"
            checked={installmentOnly}
            onChange={(e) => setInstallmentOnly(e.target.checked)}
            style={{ accentColor: 'var(--accent)', width: '15px', height: '15px' }}
          />
          {t('catalog.installmentOnly', lang)}
        </label>

        {/* Sort */}
        <div>
          <label htmlFor="filter-sort" style={labelStyle}>{t('catalog.sort', lang)}</label>
          <select id="filter-sort" value={sort} onChange={(e) => setSort(e.target.value)} style={inputStyle}>
            <option value="">{t('catalog.sortNewest', lang)}</option>
            <option value="price_asc">{t('catalog.sortPriceAsc', lang)}</option>
            <option value="price_desc">{t('catalog.sortPriceDesc', lang)}</option>
            <option value="views">{t('catalog.sortViews', lang)}</option>
          </select>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={applyFilters}
            style={{
              flex: 1,
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '13px',
              padding: '9px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t('catalog.applyFilters', lang)}
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              style={{
                background: 'none',
                color: 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '13px',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              {t('catalog.resetFilters', lang)}
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6" style={{ paddingTop: '32px', paddingBottom: '60px' }}>

          {/* Title + mobile filter button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              {t('catalog.title', lang)}
            </h1>
            <button
              className="flex md:hidden items-center gap-2"
              onClick={() => setDrawerOpen((v) => !v)}
              style={{
                background: activeFilterCount > 0 ? 'var(--accent-dim)' : 'var(--card)',
                border: activeFilterCount > 0 ? '1px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: '6px',
                padding: '7px 12px',
                fontSize: '13px',
                fontWeight: 600,
                color: activeFilterCount > 0 ? 'var(--accent)' : 'var(--text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <line x1="1" y1="3.5" x2="13" y2="3.5" />
                <line x1="3" y1="7" x2="11" y2="7" />
                <line x1="5" y1="10.5" x2="9" y2="10.5" />
              </svg>
              {t('catalog.filters', lang)}
              {activeFilterCount > 0 && (
                <span style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '0 6px',
                  fontSize: '11px',
                  fontWeight: 800,
                  minWidth: '18px',
                  textAlign: 'center',
                }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile drawer overlay */}
          {drawerOpen && (
            <>
              <div
                className="md:hidden"
                onClick={() => setDrawerOpen(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.4)',
                  zIndex: 300,
                  animation: 'fadeIn 0.2s ease',
                }}
              />
              <div
                className="md:hidden animate-slide-right"
                style={{
                  position: 'fixed',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: 'min(320px, 90vw)',
                  background: 'var(--bg)',
                  zIndex: 301,
                  overflowY: 'auto',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                    {t('catalog.filters', lang)}
                  </span>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                    aria-label="Close filters"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="2" y1="2" x2="16" y2="16" />
                      <line x1="16" y1="2" x2="2" y2="16" />
                    </svg>
                  </button>
                </div>
                {sidebarContent}
              </div>
            </>
          )}

          <div className="flex gap-6">
            {/* Desktop sidebar */}
            <aside className="hidden md:block" style={{ width: '260px', flexShrink: 0 }}>
              {sidebarContent}
            </aside>

            {/* Results */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {t('catalog.found', lang)}: <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{total.toLocaleString()}</strong>
                </span>
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--accent)',
                      background: 'var(--accent-dim)',
                      border: '1px solid var(--accent)',
                      borderRadius: '20px',
                      padding: '3px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="1" y1="1" x2="9" y2="9" />
                      <line x1="9" y1="1" x2="1" y2="9" />
                    </svg>
                    {t('catalog.resetFilters', lang)}
                  </button>
                )}
              </div>

              {loading ? (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                  {Array.from({ length: 9 }).map((_, i) => <CatalogSkeleton key={i} />)}
                </div>
              ) : listings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)', fontSize: '16px' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }}>
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  {t('catalog.noResults', lang)}
                  {didYouMean && (
                    <div
                      style={{
                        marginTop: '20px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'var(--accent-dim)',
                        border: '1px solid var(--accent)',
                        borderRadius: '10px',
                        padding: '10px 16px',
                        fontSize: '14px',
                        color: 'var(--text)',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--accent)', flexShrink: 0 }}>
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                      </svg>
                      <span>
                        {lang === 'ru' ? 'Вы имели в виду: ' : 'Шумо мехостед: '}
                        <button
                          type="button"
                          onClick={() => handleDidYouMeanClick(didYouMean)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            color: 'var(--accent)',
                            fontWeight: 700,
                            fontSize: '14px',
                            textDecoration: 'underline',
                            fontFamily: 'var(--font)',
                          }}
                        >
                          {didYouMean}
                        </button>
                        ?
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                    {listings.map((listing, i) => (
                      <CarCard
                        key={listing.id}
                        listing={listing}
                        lang={lang}
                        className={`delay-${Math.min(i + 1, 8) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`}
                      />
                    ))}
                  </div>
                  <div style={{ marginTop: '36px' }}>
                    <Pagination page={page} pages={pages} onPageChange={handlePageChange} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function CatalogSkeleton() {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ height: '180px' }} className="skeleton" />
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ height: '20px', borderRadius: '4px', width: '55%' }} className="skeleton" />
        <div style={{ height: '14px', borderRadius: '4px', width: '80%' }} className="skeleton" />
        <div style={{ height: '12px', borderRadius: '4px', width: '65%' }} className="skeleton" />
      </div>
    </div>
  )
}
