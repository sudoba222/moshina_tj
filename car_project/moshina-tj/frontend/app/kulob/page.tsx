import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Автомобили в Кулябе — купить и продать машину | TAJCAR.TJ',
  description:
    'Объявления о продаже автомобилей в Кулябе и Хатлонской области. Toyota Land Cruiser, Chevrolet Cobalt, Daewoo от 1500 до 8000$. Мошинхои фуруши дар Кӯлоб — TajCar.tj',
  keywords: [
    'купить машину куляб',
    'авто куляб',
    'продажа авто куляб',
    'мошин куляб',
    'автомобиль куляб',
    'мошин кулоб',
    'toyota land cruiser куляб',
    'chevrolet cobalt куляб',
    'авто хатлонская область',
    'подержанные авто куляб',
    'авто до 5000 долларов куляб',
    'мошинхои фуруши дар кулоб',
    'харид мошин кулоб',
    'авто юг таджикистана',
  ],
  alternates: { canonical: '/kulob' },
  openGraph: {
    title: 'Автомобили в Кулябе | TAJCAR.TJ',
    description:
      'Купить авто в Кулябе от 1500$. Toyota, Chevrolet, Daewoo — объявления от частных продавцов юга Таджикистана.',
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
              borderRadius: 12,
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
              padding: '28px 24px',
            }}
          >
            <h2
              style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}
            >
              Авторынок Куляба — автомобили юга Таджикистана
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: '0 0 14px' }}>
              Куляб — один из крупнейших городов Хатлонской области и важный региональный центр юга Таджикистана. Автомобильный рынок здесь активно развивается: жители Куляба, Дангары, Шуробода и соседних районов регулярно ищут и продают машины. TajCar.tj — удобный способ купить или продать авто в Кулябе без посредников. Цены на подержанные автомобили в Кулябе начинаются от 1 500 долларов, средний бюджет покупки — 3 500–7 000 долларов.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: '0 0 14px' }}>
              Особой популярностью в Кулябе пользуется Toyota Land Cruiser — за проходимость и надёжность на горных дорогах юга страны. Среди бюджетных вариантов лидируют Chevrolet Cobalt, Daewoo Nexia и ВАЗ-2107. Для семей актуален Opel Astra и Hyundai Accent. Все продавцы на TajCar.tj — реальные люди: частные лица и небольшие дилеры. Каждое объявление проверяется модераторами до публикации, что снижает риск встретить мошенников.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: '0 0 20px' }}>
              Дар TajCar.tj шумо метавонед мошинхои фуруши дар Кӯлоб ва Вилояти Хатлонро пайдо кунед. Тойота Ленд Крузер, Шевролет Кобалт ва Дэу — маъмултарин мошинхо дар ин минтака. Нархи мошинхо аз 1 500 то 8 000 доллар. Бо фурушанда мустакиман тамос гиред.
            </p>

            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 14px' }}>
              Частые вопросы о покупке авто в Кулябе
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                  Какие машины популярны в Кулябе?
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  Toyota Land Cruiser Prado и 70 series пользуются большим спросом из-за горного рельефа региона. Среди доступных вариантов — Chevrolet Cobalt, Daewoo Nexia и ВАЗ. Эти автомобили дешёвы в обслуживании и ремонте.
                </p>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                  Сколько стоит машина в Кулябе?
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  Минимальные цены на рабочие подержанные автомобили в Кулябе — от 1 500 долларов. Среднебюджетные варианты — 3 500–7 000 долларов. Toyota Land Cruiser в хорошем состоянии стоит от 8 000 долларов.
                </p>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                  Как продать авто в Кулябе быстро?
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  Разместите объявление на TajCar.tj — это бесплатно. Добавьте 3–5 фото хорошего качества, укажите реальную цену и точное описание состояния. Объявления с фотографиями получают в среднем втрое больше звонков.
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
