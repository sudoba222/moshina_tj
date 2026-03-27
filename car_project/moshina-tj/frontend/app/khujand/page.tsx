import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Автомобили в Худжанде — купить и продать машину | TAJCAR.TJ',
  description:
    'Тысячи объявлений о продаже автомобилей в Худжанде. Toyota, Chevrolet, Hyundai по лучшим ценам. Мошинхои фуруши дар Хуҷанд — TajCar.tj',
  keywords: [
    'купить машину худжанд',
    'авто худжанд',
    'продажа авто худжанд',
    'мошин худжанд',
    'авторынок худжанд',
    'машина худжанд',
  ],
  alternates: { canonical: '/khujand' },
  openGraph: {
    title: 'Автомобили в Худжанде | TAJCAR.TJ',
    description: 'Купить авто в Худжанде. Тысячи объявлений на TajCar.tj',
    url: 'https://tajcar.tj/khujand',
    type: 'website',
  },
}

const citySchema = {
  '@context': 'https://schema.org',
  '@type': 'SearchResultsPage',
  name: 'Автомобили в Худжанде',
  description: 'Продажа автомобилей в Худжанде, Таджикистан',
  url: 'https://tajcar.tj/khujand',
  about: {
    '@type': 'City',
    name: 'Худжанд',
    containedInPlace: { '@type': 'Country', name: 'Tajikistan' },
  },
}

const brands = ['Toyota', 'Chevrolet', 'Daewoo', 'Hyundai', 'Kia', 'Nexia', 'BMW', 'Mercedes']

export default function KhujandPage() {
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
            <span style={{ color: 'var(--text)' }}>Худжанд</span>
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
            Автомобили в Худжанде
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            Мошинхои фуруши дар Хуҷанд — купить или продать авто во втором по величине городе
            Таджикистана
          </p>
          <Link
            href="/catalog?city=Хуҷанд"
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
            Смотреть объявления в Худжанде
          </Link>
        </div>

        {/* Popular brands */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
          <h2
            style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}
          >
            Популярные марки в Худжанде
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {brands.map((brand) => (
              <Link
                key={brand}
                href={`/catalog?city=Хуҷанд&brand=${brand}`}
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
                {brand} в Худжанде
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
              Авторынок Худжанда — автомобили Согдийской области
            </h2>
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Худжанд — второй по величине город Таджикистана и центр Согдийской области. На
              TajCar.tj вы найдёте объявления о продаже автомобилей от продавцов Худжанда и всего
              севера страны. Популярные марки в регионе: Toyota, Chevrolet Cobalt, Daewoo Nexia,
              Hyundai Accent. Быстрая связь с продавцами — звоните напрямую через платформу.
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
