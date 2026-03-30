import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Автомобили в Турсунзода — купить и продать машину | TAJCAR.TJ',
  description:
    'Объявления о продаже автомобилей в Турсунзода — промышленном городе в 70 км от Душанбе. Toyota, Chevrolet, Daewoo от 1500 до 6000$. Мошинхои фуруши дар Турсунзода — TajCar.tj',
  keywords: [
    'купить машину турсунзода',
    'авто турсунзода',
    'продажа авто турсунзода',
    'мошин турсунзода',
    'автомобиль турсунзода',
    'chevrolet cobalt турсунзода',
    'toyota турсунзода',
    'авто рядом с душанбе',
    'авто РРП таджикистан',
    'подержанные авто турсунзода',
    'мошинхои фуруши дар турсунзода',
    'харид мошин турсунзода',
  ],
  alternates: { canonical: '/tursunzoda' },
  openGraph: {
    title: 'Автомобили в Турсунзода | TAJCAR.TJ',
    description:
      'Купить авто в Турсунзода от 1500$. Toyota, Chevrolet, Mercedes — объявления от частных продавцов западного Таджикистана.',
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
              padding: '28px 24px',
            }}
          >
            <h2
              style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}
            >
              Авторынок Турсунзода — автомобили западного Таджикистана
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: '0 0 14px' }}>
              Турсунзода — промышленный город западного Таджикистана, расположенный примерно в 70 километрах от Душанбе. Благодаря близости к столице жители Турсунзода часто покупают и продают автомобили как на местном рынке, так и в Душанбе. TajCar.tj позволяет найти объявления от продавцов Турсунзода и Республиканских районов подчинения (РРП) в одном месте. Типичные цены на подержанные автомобили в регионе — от 1 500 до 6 000 долларов.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: '0 0 14px' }}>
              Наиболее востребованные марки в Турсунзода — Chevrolet Cobalt, Toyota Corolla, Daewoo Nexia и Mercedes-Benz (в среднем ценовом сегменте). Жители города часто выбирают машины с умеренным расходом топлива — для регулярных поездок между Турсунзода и Душанбе. Опытные механики в городе хорошо знакомы с Chevrolet, ВАЗ и Opel, что снижает расходы на обслуживание. На TajCar.tj каждое объявление проходит проверку модераторами, поэтому вы можете связаться с продавцом уверенно.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: '0 0 20px' }}>
              Дар TajCar.tj шумо метавонед мошинхои фуруши дар Турсунзода ва РРП-и Точикистонро пайдо кунед. Шевролет Кобалт, Тойота ва Мерседес — маъмултарин мошинхо. Нархи мошинхо аз 1 500 то 6 000 доллар. Мустакиман бо фурушанда тамос гиред — бе воситачи.
            </p>

            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 14px' }}>
              Частые вопросы о покупке авто в Турсунзода
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                  Стоит ли покупать авто в Турсунзода или лучше в Душанбе?
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  Оба варианта имеют смысл. В Турсунзода цены часто чуть ниже из-за меньшей конкуренции. Покупка в Душанбе даёт больший выбор, особенно в премиальном сегменте. На TajCar.tj вы можете смотреть объявления из обоих городов одновременно.
                </p>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                  Какие автомобили лучше всего для дороги Турсунзода — Душанбе?
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  Дорога хорошего качества, поэтому подходят обычные легковые автомобили. Toyota Corolla, Chevrolet Cobalt и Hyundai Accent — популярные варианты для регулярных поездок. Они экономичны и хорошо держат трассу.
                </p>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                  Как продать авто в Турсунзода?
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  Разместите объявление на TajCar.tj бесплатно. Укажите город Турсунзода, добавьте чёткие фото при хорошем освещении и установите конкурентную цену. Объявление увидят покупатели из Турсунзода, Душанбе и всего Таджикистана.
                </p>
              </div>
            </div>
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
