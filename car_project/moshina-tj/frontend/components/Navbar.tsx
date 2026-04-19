'use client'
import { useState, FormEvent, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useLang } from '@/lib/LanguageContext'
import { useAuth } from '@/lib/AuthContext'
import { t } from '@/lib/i18n'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import { searchApi, type SuggestionItem } from '@/lib/api'
import { SORTED_BRANDS } from '@/lib/vehicleData'
import type { UserRole } from '@/types'

// Russian-language aliases for car brands common in Tajikistan market
const BRAND_RU_ALIASES: Record<string, string> = {
  'тойота': 'Toyota', 'тойта': 'Toyota', 'тоёта': 'Toyota',
  'шевроле': 'Chevrolet', 'шевролет': 'Chevrolet',
  'хендай': 'Hyundai', 'хюндай': 'Hyundai', 'хундай': 'Hyundai', 'хёндай': 'Hyundai',
  'киа': 'Kia', 'кіа': 'Kia',
  'мерседес': 'Mercedes-Benz', 'мерс': 'Mercedes-Benz', 'мерседес-бенц': 'Mercedes-Benz',
  'бмв': 'BMW',
  'ауди': 'Audi',
  'фольксваген': 'Volkswagen', 'фолькс': 'Volkswagen', 'вольксваген': 'Volkswagen',
  'лада': 'Lada', 'жигули': 'Lada',
  'дэу': 'Daewoo', 'дэо': 'Daewoo', 'daewoo': 'Daewoo',
  'ниссан': 'Nissan',
  'мазда': 'Mazda',
  'хонда': 'Honda',
  'митсубиси': 'Mitsubishi', 'митсубishi': 'Mitsubishi', 'митцубиси': 'Mitsubishi',
  'лексус': 'Lexus',
  'субару': 'Subaru',
  'шкода': 'Skoda',
  'пежо': 'Peugeot', 'пежот': 'Peugeot',
  'рено': 'Renault',
  'опель': 'Opel',
  'форд': 'Ford',
  'хаммер': 'Hummer',
  'джип': 'Jeep',
  'ланд ровер': 'Land Rover', 'ленд ровер': 'Land Rover',
  'порше': 'Porsche',
  'вольво': 'Volvo',
  'ситроен': 'Citroen',
  'сузуки': 'Suzuki',
  'мазерати': 'Maserati',
  'феррари': 'Ferrari',
  'ламборгини': 'Lamborghini',
  'бентли': 'Bentley',
  'роллс-ройс': 'Rolls-Royce', 'роллс ройс': 'Rolls-Royce',
  'астон мартин': 'Aston Martin',
  'бугатти': 'Bugatti',
  'альфа ромео': 'Alfa Romeo', 'альфа-ромео': 'Alfa Romeo',
  'фиат': 'Fiat',
  'сеат': 'SEAT',
  'сааб': 'Saab',
  'смарт': 'Smart',
  'мини': 'Mini',
  'инфинити': 'Infiniti',
  'акура': 'Acura',
  'линкольн': 'Lincoln',
  'кадиллак': 'Cadillac',
  'крайслер': 'Chrysler',
  'додж': 'Dodge',
  'рам': 'Ram',
  'бьюик': 'Buick',
  'понтиак': 'Pontiac',
  'чери': 'Chery', 'черри': 'Chery',
  'geely': 'Geely', 'джили': 'Geely',
  'haval': 'Haval', 'хавал': 'Haval', 'хавэл': 'Haval',
  'чанган': 'Changan', 'чангань': 'Changan',
  'бид': 'BYD', 'биид': 'BYD',
  'эксид': 'Exeed', 'ексид': 'Exeed',
  'джетур': 'Jetour', 'жетур': 'Jetour',
  'танк': 'Tank',
  'ора': 'Ora',
  'вей': 'Wey',
  'дипал': 'Deepal',
  'ниу': 'Nio', 'нио': 'Nio',
  'ли авто': 'Li Auto', 'ли ауто': 'Li Auto', 'лисиан': 'Li Auto',
  'ксенг': 'Xpeng', 'сяопэн': 'Xpeng',
  'линк': 'Lynk & Co', 'линк и ко': 'Lynk & Co',
  'айто': 'AITO', 'аито': 'AITO',
  'баик': 'BAIC', 'бэйцзин': 'BAIC',
  'дунфэн': 'Dongfeng', 'донгфенг': 'Dongfeng',
  'вояж': 'Voyah', 'войяж': 'Voyah',
  'хунци': 'Hongqi', 'хонгки': 'Hongqi',
  'фотон': 'Foton',
  'джак': 'JAC', 'жак': 'JAC',
  'лифан': 'Lifan',
  'мг': 'MG',
  'гак': 'GAC', 'гэк': 'GAC',
  'зикр': 'Zeekr', 'зикер': 'Zeekr',
  'омода': 'Omoda',
  'жако': 'Jaecoo', 'джако': 'Jaecoo',
  'аватр': 'Avatr',
  'роуви': 'Roewe', 'рэйв': 'Roewe',
  'бриллианс': 'Brilliance',
  'зоти': 'Zotye',
  'сяоми': 'Xiaomi', 'хиаоми': 'Xiaomi',
  'вулинг': 'Wuling',
  'баоджун': 'Baojun',
  'максус': 'Maxus',
  'айвейс': 'Aiways',
  'джиюэ': 'Jiyue',
  'лотус': 'Lotus',
  'поулстоунс': 'Polestones',
  'хайкан': 'Hycan',
  'соуист': 'Soueast',
  'фортинг': 'Forthing',
  'равон': 'Ravon',
  'дайхатсу': 'Daihatsu',
  'тава': 'Tata',
  'махиндра': 'Mahindra',
  'винфаст': 'VinFast',
  'протон': 'Proton',
  'перодуа': 'Perodua',

  'газ': 'GAZ', 'волга': 'GAZ',
  'уаз': 'UAZ',
  'камаз': 'KamAZ',
  'нексия': 'Chevrolet', 'малибу': 'Chevrolet', 'кобальт': 'Chevrolet',
  'карина': 'Toyota', 'камри': 'Toyota', 'прадо': 'Toyota', 'крузер': 'Toyota',
  'эланта': 'Hyundai', 'акцент': 'Hyundai', 'туксон': 'Hyundai', 'санта фе': 'Hyundai',
  'рио': 'Kia', 'церато': 'Kia', 'спортаж': 'Kia', 'соренто': 'Kia',
}

function matchRussianBrands(q: string): SuggestionItem[] {
  const lower = q.toLowerCase().trim()
  if (!lower) return []
  const matches = new Set<string>()
  // Exact prefix match
  for (const [ru, en] of Object.entries(BRAND_RU_ALIASES)) {
    if (ru.startsWith(lower) || ru.includes(lower)) {
      matches.add(en)
    }
  }
  // Also fuzzy: match brand English names against partial Cyrillic input
  return Array.from(matches).slice(0, 6).map((name): SuggestionItem => ({ term: name, type: 'brand', count: 0 }))
}

const NAV_LINKS = [
  { href: '/catalog',     key: 'nav.catalog' },
  { href: '/categories',  key: 'nav.categories' },
  { href: '/rent',        key: 'nav.rent' },
  { href: '/installment', key: 'nav.installment' },
  { href: '/dealers',     key: 'nav.dealers' },
] as const

function getRoleLink(role: UserRole): { href: string; key: string } | null {
  switch (role) {
    case 'admin':     return { href: '/admin',     key: 'nav.admin' }
    case 'moderator': return { href: '/moderator', key: 'nav.moderator' }
    case 'manager':   return { href: '/manager',   key: 'nav.manager' }
    case 'support':   return { href: '/support',   key: 'nav.support' }
    case 'dealer':    return { href: '/dashboard', key: 'nav.dashboard' }
    default:          return null
  }
}

// Pure text/SVG logo — no image file
function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const big = size === 'md'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 0, userSelect: 'none' }}>
      {/* accent bar */}
      <span style={{
        display: 'inline-block',
        width: big ? '4px' : '3px',
        height: big ? '22px' : '18px',
        borderRadius: '2px',
        background: 'var(--accent)',
        marginRight: big ? '7px' : '5px',
        flexShrink: 0,
      }} />
      <span style={{
        fontWeight: 900,
        fontSize: big ? '20px' : '17px',
        letterSpacing: '-0.04em',
        color: 'var(--text)',
        lineHeight: 1,
      }}>
        TAJ<span style={{ color: 'var(--accent)' }}>CAR</span>
      </span>
      <span style={{
        fontWeight: 600,
        fontSize: big ? '11px' : '9px',
        color: 'var(--text-muted)',
        letterSpacing: '0.01em',
        alignSelf: 'flex-end',
        marginBottom: big ? '2px' : '1px',
        marginLeft: '2px',
      }}>
        .TJ
      </span>
    </span>
  )
}

export default function Navbar() {
  const { lang } = useLang()
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [showSugg, setShowSugg] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSugg(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) { setSuggestions([]); setShowSugg(false); return }
    debounceRef.current = setTimeout(async () => {
      const hasCyrillic = /[\u0400-\u04FF]/.test(q)
      // If Cyrillic input, try local Russian alias matching first (instant)
      if (hasCyrillic) {
        const ruHits = matchRussianBrands(q)
        if (ruHits.length > 0) {
          setSuggestions(ruHits)
          setShowSugg(true)
          return
        }
      }
      try {
        const res = await searchApi.suggestions(q.trim())
        const items = res.data.data ?? []
        if (items.length > 0) {
          setSuggestions(items.slice(0, 6))
          setShowSugg(true)
          return
        }
      } catch { /* fall through to local */ }
      // Local fallback: match brand names (Latin)
      const lower = q.toLowerCase()
      const localHits = SORTED_BRANDS
        .filter((b) => b.name.toLowerCase().includes(lower))
        .slice(0, 6)
        .map((b): SuggestionItem => ({ term: b.name, type: 'brand', count: 0 }))
      setSuggestions(localHits)
      setShowSugg(localHits.length > 0)
    }, 200)
  }, [])

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  function onSearch(e: FormEvent) {
    e.preventDefault()
    setShowSugg(false)
    router.push(query.trim() ? `/catalog?q=${encodeURIComponent(query.trim())}` : '/catalog')
  }

  function pickSuggestion(item: SuggestionItem) {
    setQuery(item.term)
    setShowSugg(false)
    const param = item.type === 'brand' ? 'brand' : item.type === 'city' ? 'city' : 'q'
    router.push(`/catalog?${param}=${encodeURIComponent(item.term)}`)
  }

  function active(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const roleLink = user ? getRoleLink(user.role) : null
  const initial = user ? (user.name ?? user.phone ?? '?').charAt(0).toUpperCase() : ''

  return (
    <>
    <header style={{ position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>

      {/* ── Main bar ── */}
      <div style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto" style={{ padding: '0 clamp(14px,3vw,28px)', height: '56px', display: 'flex', alignItems: 'center', gap: '20px' }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <Logo />
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex" style={{ alignItems: 'center', gap: '2px' }}>
            {NAV_LINKS.map(({ href, key }) => (
              <Link key={href} href={href} style={{
                display: 'inline-flex', alignItems: 'center', height: '36px',
                padding: '0 12px', borderRadius: '8px', fontSize: '14px',
                fontWeight: active(href) ? 700 : 500,
                color: active(href) ? 'var(--accent)' : 'var(--text-secondary)',
                background: active(href) ? 'var(--accent-dim)' : 'transparent',
                textDecoration: 'none', transition: 'all 0.13s', whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { if (!active(href)) { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text)' } }}
              onMouseLeave={(e) => { if (!active(href)) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
              >
                {t(key, lang)}
              </Link>
            ))}
          </nav>

          {/* Desktop search */}
          <div ref={searchRef} className="hidden md:flex" style={{ flex: 1, maxWidth: '420px', position: 'relative' }}>
            <form onSubmit={onSearch} role="search" style={{ width: '100%' }}>
              <div style={{ display: 'flex', width: '100%', borderRadius: '10px', overflow: 'hidden', border: '1.5px solid var(--border)', background: 'var(--bg)' }}>
                <input
                  type="search" value={query}
                  onChange={(e) => { setQuery(e.target.value); fetchSuggestions(e.target.value) }}
                  onFocus={() => { if (suggestions.length > 0) setShowSugg(true) }}
                  placeholder={t('hero.searchPlaceholder', lang)}
                  autoComplete="off"
                  style={{ flex: 1, height: '38px', padding: '0 14px', background: 'transparent', border: 'none', fontSize: '14px', color: 'var(--text)', outline: 'none' }}
                />
                <button type="submit" style={{ height: '38px', padding: '0 16px', background: 'var(--accent)', color: 'var(--color-white)', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  {t('hero.searchBtn', lang)}
                </button>
              </div>
            </form>
            {showSugg && suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', overflow: 'hidden', zIndex: 300 }}>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s) }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none', textAlign: 'left' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                  >
                    <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>{s.term}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {s.type === 'brand' ? t('search.brandLabel', lang) : s.type === 'city' ? t('search.cityLabel', lang) : t('search.modelLabel', lang)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: 1 }} className="flex-1 md:hidden" />

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <div className="hidden md:flex items-center gap-1">
              <LanguageToggle />
              <ThemeToggle />
            </div>

            {/* User menu */}
            {user ? (
              <div ref={dropRef} className="hidden md:block" style={{ position: 'relative' }}>
                <button onClick={() => setDropOpen((v) => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '5px 10px 5px 5px', cursor: 'pointer', transition: 'border-color 0.13s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'var(--accent)', color: 'var(--color-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, flexShrink: 0 }}>
                    {initial}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', maxWidth: '88px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.name ?? user.phone}
                  </span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                    <path d={dropOpen ? 'M2 6.5l3-3 3 3' : 'M2 3.5l3 3 3-3'} />
                  </svg>
                </button>

                {dropOpen && (
                  <div className="animate-scale-in" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: '190px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', overflow: 'hidden', zIndex: 200 }}>
                    <Link href="/dashboard" onClick={() => setDropOpen(false)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', fontSize: '13px', fontWeight: 600, color: 'var(--text)', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                      {t('nav.dashboard', lang)}
                    </Link>
                    {roleLink && (
                      <Link href={roleLink.href} onClick={() => setDropOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', fontSize: '13px', fontWeight: 600, color: 'var(--accent)', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        {t(roleLink.key, lang)}
                      </Link>
                    )}
                    <button onClick={() => { logout(); setDropOpen(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 14px', fontSize: '13px', fontWeight: 600, color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      {t('nav.logout', lang)}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/auth/login" className="hidden md:inline-flex items-center"
                style={{ height: '36px', padding: '0 14px', border: '1.5px solid var(--border)', borderRadius: '9px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', transition: 'border-color 0.13s' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                {t('nav.login', lang)}
              </Link>
            )}

            {/* Post CTA */}
            <Link href="/post" className="hidden md:inline-flex items-center"
              style={{ height: '38px', padding: '0 18px', background: 'var(--accent)', color: 'var(--color-white)', fontWeight: 700, fontSize: '13px', borderRadius: '10px', gap: '7px', whiteSpace: 'nowrap', transition: 'opacity 0.13s', letterSpacing: '0.01em' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
              {t('nav.addListing', lang)}
            </Link>

            {/* Hamburger */}
            <button onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu" className="flex md:hidden items-center justify-center"
              style={{ width: '44px', height: '44px', background: 'none', border: '1.5px solid var(--border)', borderRadius: '9px', cursor: 'pointer', color: 'var(--text)', flexShrink: 0 }}>
              {mobileOpen ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="2" x2="14" y2="14"/><line x1="14" y1="2" x2="2" y2="14"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="10" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg>
              )}
            </button>
          </div>
        </div>
      </div>

    </header>

      {/* ── Mobile drawer backdrop — OUTSIDE header to avoid backdrop-filter containment ── */}
      {mobileOpen && (
        <div className="md:hidden" onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998, backdropFilter: 'blur(3px)' }} />
      )}

      {/* ── Mobile drawer panel ── */}
      {mobileOpen && (
        <div id="mobile-nav-drawer" role="dialog" aria-modal="true" className="md:hidden"
          style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '300px', maxWidth: 'calc(100vw - 40px)', background: 'var(--nav-bg)', borderLeft: '1px solid var(--border)', boxShadow: '-4px 0 40px rgba(0,0,0,0.18)', zIndex: 9999, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* Drawer header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 18px 16px', borderBottom: '1px solid var(--border)' }}>
            <Link href="/" onClick={() => setMobileOpen(false)} style={{ textDecoration: 'none' }}>
              <Logo size="sm" />
            </Link>
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', minWidth: '44px', minHeight: '44px' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="2" x2="16" y2="16"/><line x1="16" y1="2" x2="2" y2="16"/></svg>
            </button>
          </div>

          {/* Mobile search */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
            <form onSubmit={(e) => { onSearch(e); setMobileOpen(false) }} role="search" style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1.5px solid var(--border)' }}>
              <input type="search" value={query}
                onChange={(e) => { setQuery(e.target.value); fetchSuggestions(e.target.value) }}
                onFocus={() => { if (suggestions.length > 0) setShowSugg(true) }}
                placeholder={t('hero.searchPlaceholder', lang)}
                autoComplete="off"
                style={{ flex: 1, height: '44px', padding: '0 13px', background: 'var(--bg)', border: 'none', fontSize: '14px', color: 'var(--text)', outline: 'none' }} />
              <button type="submit" style={{ height: '44px', padding: '0 14px', background: 'var(--accent)', color: 'var(--color-white)', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '13px', flexShrink: 0 }}>
                {t('hero.searchBtn', lang)}
              </button>
            </form>
            {showSugg && suggestions.length > 0 && (
              <div style={{ position: 'absolute', left: '16px', right: '16px', top: 'calc(100% - 1px)', background: 'var(--card)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden', zIndex: 10000 }}>
                {suggestions.map((s, i) => (
                  <button key={i} type="button"
                    onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s); setMobileOpen(false) }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', borderTop: i > 0 ? '1px solid var(--border)' : 'none', textAlign: 'left' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                  >
                    <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>{s.term}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      {s.type === 'brand' ? t('search.brandLabel', lang) : s.type === 'city' ? t('search.cityLabel', lang) : t('search.modelLabel', lang)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Post CTA — prominent at the top of the drawer nav */}
          <div style={{ padding: '12px 16px 4px' }}>
            <Link href="/post" onClick={() => setMobileOpen(false)}
              style={{ height: '48px', background: 'var(--accent)', color: 'var(--color-white)', fontWeight: 700, fontSize: '15px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="6.5" y1="1" x2="6.5" y2="12"/><line x1="1" y1="6.5" x2="12" y2="6.5"/></svg>
              {t('nav.addListing', lang)}
            </Link>
          </div>

          {/* Nav links */}
          <nav style={{ flex: 1, padding: '8px 0' }}>
            {NAV_LINKS.map(({ href, key }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                style={{ display: 'flex', alignItems: 'center', height: '50px', padding: '0 20px', fontSize: '15px', fontWeight: active(href) ? 700 : 500, color: active(href) ? 'var(--accent)' : 'var(--text)', borderLeft: `3px solid ${active(href) ? 'var(--accent)' : 'transparent'}`, transition: 'all 0.1s', textDecoration: 'none' }}>
                {t(key, lang)}
              </Link>
            ))}
            {user && (
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}
                style={{ display: 'flex', alignItems: 'center', height: '50px', padding: '0 20px', fontSize: '15px', fontWeight: active('/dashboard') ? 700 : 500, color: active('/dashboard') ? 'var(--accent)' : 'var(--text)', borderLeft: `3px solid ${active('/dashboard') ? 'var(--accent)' : 'transparent'}`, textDecoration: 'none' }}>
                {t('nav.dashboard', lang)}
              </Link>
            )}
            {user && roleLink && (
              <Link href={roleLink.href} onClick={() => setMobileOpen(false)}
                style={{ display: 'flex', alignItems: 'center', height: '50px', padding: '0 20px', fontSize: '15px', fontWeight: 600, color: 'var(--accent)', borderLeft: '3px solid transparent', textDecoration: 'none' }}>
                {t(roleLink.key, lang)}
              </Link>
            )}
          </nav>

          {/* Bottom actions — language, theme, login/logout */}
          <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <LanguageToggle />
              <ThemeToggle />
              {user ? (
                <button onClick={() => { logout(); setMobileOpen(false) }}
                  style={{ flex: 1, height: '40px', background: 'none', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--color-error)', cursor: 'pointer' }}>
                  {t('nav.logout', lang)}
                </button>
              ) : (
                <Link href="/auth/login" onClick={() => setMobileOpen(false)}
                  style={{ flex: 1, height: '40px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {t('nav.login', lang)}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
