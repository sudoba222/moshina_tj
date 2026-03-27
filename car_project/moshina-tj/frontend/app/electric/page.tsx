import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Электромобили в Таджикистане — BYD, Tesla, Zeekr | TAJCAR.TJ',
  description:
    'Купить электромобиль в Таджикистане. BYD, Tesla, Zeekr, Ora — лучшие цены. Мошинхои барки дар Точикистон. Зарядные станции в Душанбе.',
  keywords: [
    'электромобили таджикистан',
    'купить BYD душанбе',
    'tesla таджикистан',
    'мошинхои барки',
    'электрокар душанбе',
    'zeekr таджикистан',
    'byd точикистон',
    'электромобиль душанбе',
    'купить электрокар таджикистан',
    'ora good cat таджикистан',
  ],
  alternates: { canonical: '/electric' },
  openGraph: {
    title: 'Электромобили в Таджикистане — BYD, Tesla, Zeekr | TAJCAR.TJ',
    description:
      'Купить электромобиль в Таджикистане. BYD, Tesla, Zeekr — лучшие цены на TajCar.tj',
    url: 'https://tajcar.tj/electric',
    type: 'website',
  },
}

const electricSchema = {
  '@context': 'https://schema.org',
  '@type': 'SearchResultsPage',
  name: 'Электромобили в Таджикистане',
  description:
    'Продажа электромобилей в Таджикистане: BYD, Tesla, Zeekr, Ora и другие марки',
  url: 'https://tajcar.tj/electric',
  about: {
    '@type': 'ItemList',
    name: 'Электромобили',
    description: 'Список электромобилей, доступных для покупки в Таджикистане',
  },
}

interface EvModel {
  brand: string
  model: string
  label: string
  href: string
}

const evModels: EvModel[] = [
  { brand: 'BYD', model: 'Han', label: 'BYD Han', href: '/catalog?brand=BYD&fuel=Электро&model=Han' },
  { brand: 'BYD', model: 'Atto 3', label: 'BYD Atto 3', href: '/catalog?brand=BYD&fuel=Электро&model=Atto+3' },
  { brand: 'Tesla', model: 'Model 3', label: 'Tesla Model 3', href: '/catalog?brand=Tesla&fuel=Электро' },
  { brand: 'Zeekr', model: '001', label: 'Zeekr 001', href: '/catalog?brand=Zeekr&fuel=Электро' },
  { brand: 'Ora', model: 'Good Cat', label: 'Ora Good Cat', href: '/catalog?brand=Ora&fuel=Электро' },
  { brand: 'BYD', model: 'Dolphin', label: 'BYD Dolphin', href: '/catalog?brand=BYD&fuel=Электро&model=Dolphin' },
]

export default function ElectricPage() {
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
            <span style={{ color: 'var(--text)' }}>Электромобили</span>
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
            Электромобили в Таджикистане
          </h1>
          <p
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              margin: '0 0 4px',
            }}
          >
            Мошинхои барки дар Тоҷикистон
          </p>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
            BYD, Tesla, Zeekr — будущее уже здесь. Покупайте электромобили без посредников на
            TajCar.tj
          </p>
          <Link
            href="/catalog?fuel=Электро"
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
            Все электромобили в каталоге
          </Link>
        </div>

        {/* Popular EV models grid */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px 16px' }}>
          <h2
            style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}
          >
            Популярные модели электромобилей
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12,
            }}
          >
            {evModels.map((ev) => (
              <Link
                key={ev.label}
                href={ev.href}
                style={{
                  display: 'block',
                  padding: '16px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--text)',
                  textDecoration: 'none',
                }}
              >
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {ev.brand}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{ev.model}</div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--accent)',
                    marginTop: 8,
                    fontWeight: 600,
                  }}
                >
                  Электро
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Brand quick links */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 16px 16px' }}>
          <h2
            style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}
          >
            Марки электромобилей в Таджикистане
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {['BYD', 'Tesla', 'Zeekr', 'Ora', 'Nio', 'Xpeng', 'Li Auto'].map((brand) => (
              <Link
                key={brand}
                href={`/catalog?brand=${brand}&fuel=Электро`}
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
                {brand}
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
              Электромобили в Таджикистане — всё что нужно знать
            </h2>
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                margin: '0 0 12px',
              }}
            >
              Рынок электромобилей в Таджикистане быстро растёт. Самые популярные марки:
              BYD Han, BYD Atto 3, BYD Dolphin, Tesla Model 3, Zeekr 001 и Ora Good Cat.
              Большинство электромобилей привозят из Китая напрямую — что даёт значительную
              экономию по сравнению с традиционными авто на бензине.
            </p>
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Зарядная инфраструктура в Таджикистане развивается: зарядные станции появляются в
              Душанбе и других крупных городах. TajCar.tj — лучшее место для поиска
              электромобилей в Таджикистане. Используйте фильтр «Электро» в каталоге для поиска
              актуальных объявлений.
            </p>
          </div>
        </div>
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(electricSchema) }}
      />
    </>
  )
}
