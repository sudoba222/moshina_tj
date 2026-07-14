import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Автомобили в Бохтаре — купить и продать машину | TAJCAR.TJ',
  description:
    'Объявления о продаже автомобилей в Бохтаре (Курган-Тюбе) — административном центре Хатлонской области. Toyota, Chevrolet, Hyundai от 2000 до 10000$. Мошинхои фуруши дар Бохтар — TajCar.tj',
  keywords: [
    'купить машину бохтар',
    'авто бохтар',
    'продажа авто бохтар',
    'мошин бохтар',
    'курган тюбе авто',
    'автомобиль бохтар',
    'купить авто курган тюбе',
    'авто хатлон',
    'chevrolet cobalt бохтар',
    'toyota бохтар',
    'подержанные авто бохтар',
    'авто до 5000 бохтар',
    'мошинхои фуруши дар бохтар',
    'харид мошин бохтар',
    'авторынок хатлонская область',
  ],
  alternates: { canonical: '/bokhtar' },
  openGraph: {
    title: 'Автомобили в Бохтаре | TAJCAR.TJ',
    description:
      'Купить авто в Бохтаре от 2000$. Toyota, Chevrolet, Hyundai — объявления от частных продавцов и дилеров Хатлонской области.',
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
              borderRadius: 12,
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
              padding: '28px 24px',
            }}
          >
            <h2
              style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}
            >
              Авторынок Бохтара — автомобили Хатлонской области
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: '0 0 14px' }}>
              Бохтар (до 2018 года — Курган-Тюбе) — административный центр Хатлонской области и один из быстро развивающихся городов юга Таджикистана. С ростом населения и деловой активности в регионе спрос на автомобили здесь стабильно растёт. TajCar.tj объединяет объявления от продавцов Бохтара, Колхозобода, Джиликуля и других районов Хатлонской области. Цены на авто в регионе — от 2 000 до 10 000 долларов.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: '0 0 14px' }}>
              Наиболее востребованные автомобили в Бохтаре — Chevrolet Cobalt и Captiva, Toyota Corolla, Hyundai Accent и Kia Rio. Бюджетный сегмент представлен Daewoo Nexia и ВАЗ. Chevrolet Cobalt продолжает оставаться самым продаваемым автомобилем в регионе благодаря низкой цене и простоте обслуживания. При покупке авто в Бохтаре рекомендуем проверять историю обслуживания и осматривать машину на сервисе — особенно если покупаете у частного лица. На TajCar.tj каждое объявление проходит модерацию.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: '0 0 20px' }}>
              Дар TajCar.tj шумо метавонед мошинхои фуруши дар Бохтар ва Вилояти Хатлонро пайдо кунед. Шевролет Кобалт, Тойота Королла, Хюндай — маъмултарин мошинхои минтака. Нархи мошинхо аз 2 000 то 10 000 доллар. Хар як эълон тафтиш карда мешавад.
            </p>

            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 14px' }}>
              Частые вопросы о покупке авто в Бохтаре
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                  Где найти авто в Бохтаре (Курган-Тюбе)?
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  TajCar.tj — самая удобная площадка для поиска авто в Бохтаре. Используйте фильтр «Город: Бохтар» и смотрите свежие объявления от продавцов Хатлонской области. Для широкого охвата также можно искать по всей области.
                </p>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                  Какие авто самые популярные в Бохтаре?
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  Chevrolet Cobalt, Toyota Corolla и Hyundai Accent — лидеры продаж в регионе. Они доступны по цене, экономичны и просты в обслуживании. Для загородных поездок выбирают Toyota Land Cruiser или Chevrolet Captiva.
                </p>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                  Как безопасно купить авто у частного лица в Бохтаре?
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  Договоритесь об осмотре при дневном свете, проверьте документы на машину и при возможности съездите на диагностику. Объявления на TajCar.tj прошли проверку модераторов, что снижает риск мошенничества.
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
