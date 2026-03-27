import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Автомобили в Бохтаре — купить и продать машину | TAJCAR.TJ',
  description:
    'Объявления о продаже автомобилей в Бохтаре (бывший Курган-Тюбе). Toyota, Chevrolet, Hyundai. Мошинхои фуруши дар Бохтар — TajCar.tj',
  keywords: [
    'купить машину бохтар',
    'авто бохтар',
    'продажа авто бохтар',
    'мошин бохтар',
    'курган тюбе авто',
    'автомобиль бохтар',
  ],
  alternates: { canonical: '/bokhtar' },
  openGraph: {
    title: 'Автомобили в Бохтаре | TAJCAR.TJ',
    description: 'Купить авто в Бохтаре. Объявления на TajCar.tj',
    url: 'https://tajcar.tj/bokhtar',
    type: 'website',
  },
}

const citySchema = {
  '@context': 'https://schema.org',
  '@type': 'SearchResultsPage',
  name: 'Автомобили в Бохтаре',
  description: 'Продажа автомобилей в Бохтаре, Хатлонская область, Таджикистан',
  url: 'https://tajcar.tj/bokhtar',
  about: {
    '@type': 'City',
    name: 'Бохтар',
    containedInPlace: { '@type': 'Country', name: 'Tajikistan' },
  },
}

const brands = ['Toyota', 'Chevrolet', 'Daewoo', 'Hyundai', 'Kia', 'Opel', 'VAZ', 'Nexia']

export default function BokhtarPage() {
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
            <span style={{ color: 'var(--text)' }}>Бохтар</span>
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
            Автомобили в Бохтаре
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            Мошинхои фуруши дар Бохтар — купить или продать авто в центре Хатлонской области
          </p>
          <Link
            href="/catalog?city=Бохтар"
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
            Смотреть объявления в Бохтаре
          </Link>
        </div>

        {/* Popular brands */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
          <h2
            style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}
          >
            Популярные марки в Бохтаре
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {brands.map((brand) => (
              <Link
                key={brand}
                href={`/catalog?city=Бохтар&brand=${brand}`}
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
                {brand} в Бохтаре
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
              Авторынок Бохтара — автомобили Хатлонской области
            </h2>
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Бохтар (бывший Курган-Тюбе) — административный центр Хатлонской области и один из
              крупнейших городов юга Таджикистана. На TajCar.tj вы найдёте актуальные объявления о
              продаже авто от продавцов Бохтара и всей Хатлонской области. Широкий выбор
              подержанных автомобилей по доступным ценам.
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
