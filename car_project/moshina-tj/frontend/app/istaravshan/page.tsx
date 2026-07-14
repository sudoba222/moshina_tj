import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Автомобили в Истаравшане — купить и продать машину | TAJCAR.TJ',
  description:
    'Объявления о продаже автомобилей в Истаравшане (Уротеппа). Toyota, Chevrolet, Daewoo от 1500 до 6000$. Мошинхои фуруши дар Истаравшан — TajCar.tj',
  keywords: [
    'купить машину истаравшан',
    'авто истаравшан',
    'продажа авто истаравшан',
    'мошин истаравшан',
    'уротеппа авто',
    'авто уротеппа',
    'купить авто уротеппа',
    'chevrolet cobalt истаравшан',
    'toyota истаравшан',
    'подержанные авто истаравшан',
    'мошинхои фуруши дар истаравшан',
    'харид мошин истаравшан',
    'авто согд таджикистан',
  ],
  alternates: { canonical: '/istaravshan' },
  openGraph: {
    title: 'Автомобили в Истаравшане | TAJCAR.TJ',
    description:
      'Купить авто в Истаравшане от 1500$. Toyota, Chevrolet, Daewoo — объявления от частных продавцов Согдийской области.',
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
              borderRadius: 12,
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
              padding: '28px 24px',
            }}
          >
            <h2
              style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}
            >
              Авторынок Истаравшана — автомобили Согдийской области
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: '0 0 14px' }}>
              Истаравшан (до 2000 года — Уротеппа) — один из древнейших городов Таджикистана, расположенный в центральной части Согдийской области. Местный рынок подержанных автомобилей предлагает доступные цены: большинство сделок заключается в диапазоне от 1 500 до 6 000 долларов. TajCar.tj публикует объявления от продавцов Истаравшана и окрестных районов Согда — Аштского, Шахристанского и Зафарободского.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: '0 0 14px' }}>
              Наиболее популярные автомобили в Истаравшане — Chevrolet Cobalt, Daewoo Nexia и Toyota Corolla. Их выбирают за сочетание цены и надёжности. Opel Astra и ВАЗ-2107 — самые доступные варианты в регионе, при этом хорошо знакомые местным механикам. При покупке авто в Истаравшане рекомендуем уточнять, проходила ли машина техническое обслуживание, и проверять документы до передачи денег. На TajCar.tj можно легко связаться с продавцом напрямую.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: '0 0 20px' }}>
              Дар TajCar.tj шумо метавонед мошинхои фуруши дар Истаравшан (Уротеппа) ва атрофи онро пайдо кунед. Шевролет Кобалт, Дэу ва Тойота — маъмултарин мошинхои ин шахр. Нархи мошинхо аз 1 500 то 6 000 доллар. Мустакиман бо фурушанда тамос гиред.
            </p>

            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 14px' }}>
              Частые вопросы о покупке авто в Истаравшане
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                  Как называется город Уротеппа сейчас?
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  С 2000 года город официально называется Истаравшан. Оба названия — Истаравшан и Уротеппа — используются жителями и понятны при поиске авто в регионе.
                </p>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                  Сколько стоит авто в Истаравшане?
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  Большинство подержанных автомобилей в Истаравшане стоят от 1 500 до 6 000 долларов. Самые доступные — Daewoo Nexia от 1 500 $, Chevrolet Cobalt от 3 000 $, Toyota Corolla от 4 000 $.
                </p>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                  Где разместить объявление о продаже авто в Истаравшане?
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  На TajCar.tj — бесплатно и быстро. После регистрации заполните форму объявления, добавьте фото и укажите цену. Объявление увидят покупатели из Истаравшана, Худжанда и всего Таджикистана.
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
