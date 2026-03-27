import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Автомобили в Истаравшане — купить и продать машину | TAJCAR.TJ',
  description:
    'Объявления о продаже автомобилей в Истаравшане. Toyota, Chevrolet, Daewoo по доступным ценам. Мошинхои фуруши дар Истаравшан — TajCar.tj',
  keywords: [
    'купить машину истаравшан',
    'авто истаравшан',
    'продажа авто истаравшан',
    'мошин истаравшан',
    'уротеппа авто',
  ],
  alternates: { canonical: '/istaravshan' },
  openGraph: {
    title: 'Автомобили в Истаравшане | TAJCAR.TJ',
    description: 'Купить авто в Истаравшане. Объявления на TajCar.tj',
    url: 'https://tajcar.tj/istaravshan',
    type: 'website',
  },
}

const citySchema = {
  '@context': 'https://schema.org',
  '@type': 'SearchResultsPage',
  name: 'Автомобили в Истаравшане',
  description: 'Продажа автомобилей в Истаравшане, Согдийская область, Таджикистан',
  url: 'https://tajcar.tj/istaravshan',
  about: {
    '@type': 'City',
    name: 'Истаравшан',
    containedInPlace: { '@type': 'Country', name: 'Tajikistan' },
  },
}

const brands = ['Toyota', 'Chevrolet', 'Daewoo', 'VAZ', 'Hyundai', 'Opel', 'Nexia', 'Kia']

export default function IstaravshantPage() {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 80 }}>
        {/* Breadcrumb */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 16px 0' }}>
          <nav style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
              Главная
            </Link>
            {' / '}
            <span style={{ color: 'var(--text)' }}>Истаравшан</span>
          </nav>
        </div>

        {/* Hero */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px 16px' }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: 'var(--text)',
              margin: '0 0 8px',
              letterSpacing: '-0.02em',
            }}
          >
            Автомобили в Истаравшане
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            Мошинхои фуруши дар Истаравшан — купить или продать авто в Истаравшане
          </p>
          <Link
            href="/catalog?city=Истаравшан"
            style={{
              display: 'inline-block',
              background: 'var(--accent)',
              color: 'var(--color-white)',
              padding: '12px 24px',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 15,
              textDecoration: 'none',
            }}
          >
            Смотреть объявления в Истаравшане
          </Link>
        </div>

        {/* Popular brands */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
          <h2
            style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}
          >
            Популярные марки в Истаравшане
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {brands.map((brand) => (
              <Link
                key={brand}
                href={`/catalog?city=Истаравшан&brand=${brand}`}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--text)',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {brand} в Истаравшане
              </Link>
            ))}
          </div>
        </div>

        {/* SEO text block */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '24px',
            }}
          >
            <h2
              style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}
            >
              Авторынок Истаравшана — автомобили Согдийской области
            </h2>
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Истаравшан (бывший Уротеппа) — один из древнейших городов Согдийской области
              Таджикистана. На TajCar.tj вы найдёте актуальные объявления о продаже авто от
              продавцов Истаравшана. Подержанные автомобили Toyota, Chevrolet, Daewoo по
              доступным ценам. Звоните продавцу напрямую — без посредников.
            </p>
          </div>
        </div>
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(citySchema) }}
      />
    </>
  )
}
