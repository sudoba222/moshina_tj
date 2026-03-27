import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Автомобили в Турсунзода — купить и продать машину | TAJCAR.TJ',
  description:
    'Объявления о продаже автомобилей в Турсунзода. Toyota, Chevrolet, Daewoo по доступным ценам. Мошинхои фуруши дар Турсунзода — TajCar.tj',
  keywords: [
    'купить машину турсунзода',
    'авто турсунзода',
    'продажа авто турсунзода',
    'мошин турсунзода',
    'автомобиль турсунзода',
  ],
  alternates: { canonical: '/tursunzoda' },
  openGraph: {
    title: 'Автомобили в Турсунзода | TAJCAR.TJ',
    description: 'Купить авто в Турсунзода. Объявления на TajCar.tj',
    url: 'https://tajcar.tj/tursunzoda',
    type: 'website',
  },
}

const citySchema = {
  '@context': 'https://schema.org',
  '@type': 'SearchResultsPage',
  name: 'Автомобили в Турсунзода',
  description: 'Продажа автомобилей в Турсунзода, Республиканские районы, Таджикистан',
  url: 'https://tajcar.tj/tursunzoda',
  about: {
    '@type': 'City',
    name: 'Турсунзода',
    containedInPlace: { '@type': 'Country', name: 'Tajikistan' },
  },
}

const brands = ['Toyota', 'Chevrolet', 'Daewoo', 'VAZ', 'Hyundai', 'Opel', 'Nexia', 'Mercedes']

export default function TursunzodaPage() {
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
            <span style={{ color: 'var(--text)' }}>Турсунзода</span>
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
            Автомобили в Турсунзода
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            Мошинхои фуруши дар Турсунзода — купить или продать авто в Турсунзода
          </p>
          <Link
            href="/catalog?city=Турсунзода"
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
            Смотреть объявления в Турсунзода
          </Link>
        </div>

        {/* Popular brands */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
          <h2
            style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}
          >
            Популярные марки в Турсунзода
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {brands.map((brand) => (
              <Link
                key={brand}
                href={`/catalog?city=Турсунзода&brand=${brand}`}
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
                {brand} в Турсунзода
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
              Авторынок Турсунзода — автомобили западного Таджикистана
            </h2>
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Турсунзода — промышленный город западного Таджикистана, расположенный недалеко от
              Душанбе. На TajCar.tj вы найдёте актуальные объявления о продаже авто от продавцов
              Турсунзода. Широкий выбор автомобилей — от бюджетных до премиальных марок.
              Покупайте надёжно и безопасно через платформу.
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
