import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Автомобили в Душанбе — купить и продать машину | TAJCAR.TJ',
  description:
    'Тысячи объявлений о продаже автомобилей в Душанбе. Toyota, Mercedes, Chevrolet, BMW по лучшим ценам. Мошинхои фуруши дар Душанбе — TajCar.tj',
  keywords: [
    'купить машину душанбе',
    'авто душанбе',
    'продажа авто душанбе',
    'мошин душанбе',
    'авторынок душанбе',
  ],
  alternates: { canonical: '/dushanbe' },
  openGraph: {
    title: 'Автомобили в Душанбе | TAJCAR.TJ',
    description: 'Купить авто в Душанбе. Тысячи объявлений на TajCar.tj',
    url: 'https://tajcar.tj/dushanbe',
    type: 'website',
  },
}

const citySchema = {
  '@context': 'https://schema.org',
  '@type': 'SearchResultsPage',
  name: 'Автомобили в Душанбе',
  description: 'Продажа автомобилей в Душанбе, Таджикистан',
  url: 'https://tajcar.tj/dushanbe',
  about: {
    '@type': 'City',
    name: 'Душанбе',
    containedInPlace: { '@type': 'Country', name: 'Tajikistan' },
  },
}

const brands = ['Toyota', 'Chevrolet', 'Mercedes', 'BMW', 'Hyundai', 'Kia', 'Lexus', 'Daewoo']

export default function DushanbePage() {
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
            <span style={{ color: 'var(--text)' }}>Душанбе</span>
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
            Автомобили в Душанбе
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            Мошинхои фуруши дар Душанбе — купить или продать авто в столице Таджикистана
          </p>
          <Link
            href="/catalog?city=Душанбе"
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
            Смотреть объявления в Душанбе
          </Link>
        </div>

        {/* Popular brands */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
          <h2
            style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}
          >
            Популярные марки в Душанбе
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {brands.map((brand) => (
              <Link
                key={brand}
                href={`/catalog?city=Душанбе&brand=${brand}`}
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
                {brand} в Душанбе
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
              Авторынок Душанбе — всё об автомобильном рынке столицы
            </h2>
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Душанбе — крупнейший автомобильный рынок Таджикистана. На TajCar.tj вы найдёте
              тысячи объявлений от частных продавцов и официальных дилеров столицы. Самые
              популярные марки в Душанбе: Toyota Camry, Chevrolet Cobalt, Mercedes-Benz E-Class,
              BMW 5-серии и Hyundai Tucson. Покупайте и продавайте автомобили безопасно — каждое
              объявление проходит модерацию.
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
