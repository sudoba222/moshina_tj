import type { Metadata } from 'next'
import HomeClient from './HomeClient'
import type { Listing } from '@/types'
import type { MarketplaceStats } from '@/lib/api'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tajcar.tj'

export const metadata: Metadata = {
  title: 'Купить или продать авто в Таджикистане — TAJCAR.TJ | Авторынок',
  description:
    'Купить машину в Таджикистане — тысячи объявлений о продаже автомобилей в Душанбе, Худжанде, Бохтаре. Аренда авто, рассрочка, автосалоны. Продайте авто быстро на TAJCAR.TJ.',
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'Купить или продать авто в Таджикистане — TAJCAR.TJ',
    description:
      'Купить машину в Таджикистане — тысячи объявлений о продаже автомобилей в Душанбе, Худжанде, Бохтаре. Аренда авто, рассрочка.',
    url: SITE_URL,
    type: 'website',
    locale: 'ru_TJ',
    siteName: 'TAJCAR.TJ',
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: 'TAJCAR.TJ — Авторынок Таджикистана' }],
  },
}

async function fetchFeatured(): Promise<Listing[]> {
  if (!API_URL) return []
  try {
    const res = await fetch(`${API_URL}/listings/featured`, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json?.data) ? json.data : []
  } catch {
    return []
  }
}

async function fetchStats(): Promise<MarketplaceStats | null> {
  if (!API_URL) return null
  try {
    const res = await fetch(`${API_URL}/stats`, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const json = await res.json()
    return json?.data ?? null
  } catch {
    return null
  }
}

export default async function HomePage() {
  const [initialFeatured, initialStats] = await Promise.all([
    fetchFeatured(),
    fetchStats(),
  ])

  return (
    <>
      <HomeClient initialFeatured={initialFeatured} initialStats={initialStats} />

      {/*
        Server-rendered SEO section — rendered directly in the HTML before
        any JavaScript. Google reads this immediately on crawl. Contains
        keyword-rich Russian text for Tajikistan car market searches.
        Styled as a natural "about the marketplace" section below the footer.
      */}
      <section
        aria-label="О сайте TAJCAR.TJ — авторынок Таджикистана"
        style={{
          background: 'var(--card)',
          borderTop: '1px solid var(--border)',
          padding: '40px 16px',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          <h2
            style={{
              fontSize: 'clamp(18px, 3vw, 24px)',
              fontWeight: 700,
              color: 'var(--text)',
              margin: '0 0 12px',
              lineHeight: 1.3,
            }}
          >
            Купить или продать автомобиль в Таджикистане — TAJCAR.TJ
          </h2>

          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 8px', maxWidth: '820px', lineHeight: 1.7 }}>
            TAJCAR.TJ — главный авторынок Таджикистана. Тысячи объявлений о продаже новых и подержанных
            автомобилей в Душанбе, Худжанде, Бохтаре, Кулябе и других городах. Купите машину мечты или
            продайте авто быстро и выгодно. Доступны аренда авто и покупка в рассрочку.
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 28px', maxWidth: '820px', lineHeight: 1.7 }}>
            Ищете <strong>купить машину в Душанбе</strong>? Или <strong>аренда авто в Таджикистане</strong>?
            На TAJCAR.TJ вы найдёте Toyota, Chevrolet, Hyundai, BMW, Mercedes и другие марки.
            Частные объявления и автосалоны — всё в одном месте.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '28px' }}>

            {/* Popular sections */}
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
                Разделы сайта
              </h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { href: '/catalog',              label: 'Каталог автомобилей' },
                  { href: '/rent',                 label: 'Аренда автомобилей' },
                  { href: '/installment',          label: 'Авто в рассрочку' },
                  { href: '/dealers',              label: 'Автосалоны Таджикистана' },
                  { href: '/electric',             label: 'Электромобили' },
                  { href: '/catalog?condition=used', label: 'Б/У автомобили' },
                  { href: '/post',                 label: 'Подать объявление' },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} style={{ fontSize: '14px', color: 'var(--accent)', textDecoration: 'none' }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cities */}
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
                Авто по городам
              </h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { href: '/dushanbe',    label: 'Купить авто в Душанбе' },
                  { href: '/khujand',     label: 'Купить авто в Худжанде' },
                  { href: '/bokhtar',     label: 'Купить авто в Бохтаре' },
                  { href: '/kulob',       label: 'Купить авто в Кулябе' },
                  { href: '/istaravshan', label: 'Купить авто в Истаравшане' },
                  { href: '/tursunzoda',  label: 'Купить авто в Турсунзода' },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} style={{ fontSize: '14px', color: 'var(--accent)', textDecoration: 'none' }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Popular brands */}
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
                Популярные марки
              </h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  'Toyota', 'Chevrolet', 'Hyundai', 'Kia', 'BMW',
                  'Mercedes-Benz', 'Lexus', 'Honda', 'Nissan', 'Audi',
                  'Volkswagen', 'Daewoo', 'Lada', 'Haval', 'BYD',
                ].map((brand) => (
                  <li key={brand}>
                    <Link
                      href={`/catalog?brand=${encodeURIComponent(brand)}`}
                      style={{ fontSize: '14px', color: 'var(--accent)', textDecoration: 'none' }}
                    >
                      {brand} в Таджикистане
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>
    </>
  )
}
