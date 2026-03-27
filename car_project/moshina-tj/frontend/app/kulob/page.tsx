import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Автомобили в Кулябе — купить и продать машину | TAJCAR.TJ',
  description:
    'Объявления о продаже автомобилей в Кулябе. Toyota, Chevrolet, Daewoo по доступным ценам. Мошинхои фуруши дар Кӯлоб — TajCar.tj',
  keywords: [
    'купить машину куляб',
    'авто куляб',
    'продажа авто куляб',
    'мошин куляб',
    'автомобиль куляб',
    'мошин кулоб',
  ],
  alternates: { canonical: '/kulob' },
  openGraph: {
    title: 'Автомобили в Кулябе | TAJCAR.TJ',
    description: 'Купить авто в Кулябе. Объявления на TajCar.tj',
    url: 'https://tajcar.tj/kulob',
    type: 'website',
  },
}

const citySchema = {
  '@context': 'https://schema.org',
  '@type': 'SearchResultsPage',
  name: 'Автомобили в Кулябе',
  description: 'Продажа автомобилей в Кулябе, Хатлонская область, Таджикистан',
  url: 'https://tajcar.tj/kulob',
  about: {
    '@type': 'City',
    name: 'Куляб',
    containedInPlace: { '@type': 'Country', name: 'Tajikistan' },
  },
}

const brands = ['Toyota', 'Chevrolet', 'Daewoo', 'VAZ', 'Hyundai', 'Opel', 'Nexia', 'Kia']

export default function KulobPage() {
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
            <span style={{ color: 'var(--text)' }}>Куляб</span>
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
            Автомобили в Кулябе
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            Мошинхои фуруши дар Кӯлоб — купить или продать авто в Кулябе
          </p>
          <Link
            href="/catalog?city=Кӯлоб"
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
            Смотреть объявления в Кулябе
          </Link>
        </div>

        {/* Popular brands */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
          <h2
            style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}
          >
            Популярные марки в Кулябе
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {brands.map((brand) => (
              <Link
                key={brand}
                href={`/catalog?city=Кӯлоб&brand=${brand}`}
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
                {brand} в Кулябе
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
              Авторынок Куляба — автомобили юга Таджикистана
            </h2>
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Куляб — один из крупных городов Хатлонской области Таджикистана. На TajCar.tj вы
              найдёте актуальные объявления о продаже авто от продавцов Куляба. Широкий выбор
              подержанных автомобилей — Toyota, Chevrolet, Daewoo — по доступным ценам. Связь с
              продавцом напрямую без посредников.
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
