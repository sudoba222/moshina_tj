import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Автомобили в Душанбе — купить и продать машину | TAJCAR.TJ',
  description:
    'Тысячи объявлений о продаже автомобилей в Душанбе. Toyota Camry, Chevrolet Cobalt, Mercedes E-class, BMW 5, Lexus RX от 3000 до 25000$. Мошинхои фуруши дар Душанбе — TajCar.tj',
  keywords: [
    'купить машину душанбе',
    'авто душанбе',
    'продажа авто душанбе',
    'мошин душанбе',
    'авторынок душанбе',
    'купить toyota camry душанбе',
    'купить chevrolet cobalt душанбе',
    'mercedes e class душанбе',
    'bmw 5 серии душанбе',
    'lexus rx душанбе',
    'авто до 5000 долларов душанбе',
    'подержанные авто душанбе',
    'авто в рассрочку душанбе',
    'мошинхои фуруши дар душанбе',
    'харид мошин душанбе',
    'автосалон душанбе',
    'частные объявления авто душанбе',
  ],
  alternates: { canonical: '/dushanbe' },
  openGraph: {
    title: 'Автомобили в Душанбе | TAJCAR.TJ',
    description:
      'Купить авто в Душанбе от 3000$. Toyota Camry, Chevrolet, Mercedes, BMW, Lexus — тысячи объявлений на TajCar.tj',
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
              padding: '28px 24px',
            }}
          >
            <h2
              style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}
            >
              Авторынок Душанбе — всё об автомобильном рынке столицы
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: '0 0 14px' }}>
              Душанбе — крупнейший и самый активный автомобильный рынок Таджикистана. Здесь сосредоточено большинство автосалонов, частных продавцов и дилерских центров страны. На TajCar.tj вы найдёте тысячи актуальных объявлений о продаже автомобилей в Душанбе — от бюджетных вариантов за 3 000 долларов до премиальных автомобилей стоимостью 25 000 долларов и выше. Самые востребованные марки в столице: Toyota Camry и Corolla, Chevrolet Cobalt и Captiva, Mercedes-Benz E-Class, BMW 5-серии, Lexus RX и GX.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: '0 0 14px' }}>
              Рынок Душанбе предлагает самый широкий выбор как подержанных автомобилей с пробегом, так и новых машин от официальных дилеров. Средняя цена подержанного автомобиля в хорошем состоянии составляет от 5 000 до 12 000 долларов. Бюджетные варианты — Chevrolet Cobalt, Daewoo Nexia, Opel Vectra — доступны от 3 000 долларов. Если вас интересует рассрочка, многие дилеры Душанбе предлагают покупку автомобиля в рассрочку от 6 до 36 месяцев. Каждое объявление на TajCar.tj проходит проверку модераторами — это защищает вас от мошенников и недобросовестных продавцов.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: '0 0 20px' }}>
              Дар TajCar.tj шумо метавонед ҳазорҳо эълони фурӯши мошин дар Душанбе пайдо кунед. Мошинхои маъмул: Toyota Camry, Chevrolet Cobalt, Mercedes ва BMW. Нархи мошинхо аз 3 000 то 25 000 доллар. Хар як эълон аз тарафи мо тафтиш карда мешавад — харид карда аминед.
            </p>

            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 14px' }}>
              Частые вопросы о покупке авто в Душанбе
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                  Какие автомобили самые популярные в Душанбе?
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  Наибольшим спросом пользуются Toyota Camry, Chevrolet Cobalt, Hyundai Tucson и Lexus RX. Среди премиальных марок лидируют Mercedes-Benz E-Class и BMW 5-серии. Chevrolet Cobalt — самый доступный вариант, его легко обслуживать и найти запчасти по всему городу.
                </p>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                  Сколько стоит автомобиль в Душанбе?
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  Цены зависят от марки, года и состояния. Бюджетные подержанные авто начинаются от 3 000 долларов. Средний сегмент — 6 000–12 000 долларов. Новые и премиальные автомобили стоят от 15 000 долларов и выше. На TajCar.tj можно отфильтровать объявления по нужному ценовому диапазону.
                </p>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                  Можно ли купить авто в рассрочку в Душанбе?
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  Да. Многие дилеры на TajCar.tj предлагают рассрочку на автомобили в Душанбе сроком от 6 до 36 месяцев. Перейдите в раздел «Рассрочка» или используйте фильтр при поиске.
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
