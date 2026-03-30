import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Автомобили в Худжанде — купить и продать машину | TAJCAR.TJ',
  description:
    'Объявления о продаже автомобилей в Худжанде. Toyota, Chevrolet Cobalt, Daewoo Nexia, Hyundai от 2500 до 15000$. Авторынок Согдийской области. Мошинхои фуруши дар Хуҷанд — TajCar.tj',
  keywords: [
    'купить машину худжанд',
    'авто худжанд',
    'продажа авто худжанд',
    'мошин худжанд',
    'авторынок худжанд',
    'машина худжанд',
    'купить toyota худжанд',
    'chevrolet cobalt худжанд',
    'daewoo nexia худжанд',
    'авто согдийская область',
    'авто север таджикистана',
    'подержанные авто худжанд',
    'авто до 5000 долларов худжанд',
    'мошинхои фуруши дар хучанд',
    'харид мошин хучанд',
    'авто в рассрочку худжанд',
  ],
  alternates: { canonical: '/khujand' },
  openGraph: {
    title: 'Автомобили в Худжанде | TAJCAR.TJ',
    description:
      'Купить авто в Худжанде от 2500$. Toyota, Chevrolet, Daewoo, Hyundai — объявления от частных продавцов и дилеров Согдийской области.',
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
              padding: '28px 24px',
            }}
          >
            <h2
              style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}
            >
              Авторынок Худжанда — автомобили Согдийской области
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: '0 0 14px' }}>
              Худжанд — второй по величине город Таджикистана и главный экономический центр Согдийской области. Автомобильный рынок Худжанда занимает второе место в стране по объёму сделок. На TajCar.tj представлены объявления от частных владельцев и дилеров Худжанда, Исфары, Канибадама и других городов севера Таджикистана. Цены здесь немного ниже, чем в Душанбе: подержанные автомобили в хорошем состоянии стоят от 2 500 до 15 000 долларов.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: '0 0 14px' }}>
              Самые популярные марки в Худжанде и Согдийской области — Toyota Corolla и Camry, Chevrolet Cobalt и Aveo, Daewoo Nexia и Matiz, Hyundai Accent. Daewoo Nexia и Chevrolet Cobalt особенно востребованы за низкую стоимость обслуживания и доступность запчастей. Toyota Corolla — надёжный выбор для тех, кто ищет автомобиль для ежедневных поездок. TajCar.tj предоставляет прямую связь с продавцом без посредников — вы звоните напрямую и договариваетесь об осмотре.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, margin: '0 0 20px' }}>
              Дар TajCar.tj шумо метавонед мошинхои фуруши дар Хуҷанд ва вилояти Сугдро пайдо кунед. Нархи мошинхо аз 2 500 то 15 000 доллар. Тойота, Шевролет, Дэу — маъмултарин мошинхо дар ин минтака. Бо фурушанда мустакиман тамос гиред.
            </p>

            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 14px' }}>
              Частые вопросы о покупке авто в Худжанде
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                  Где купить машину в Худжанде?
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  На TajCar.tj — крупнейшей онлайн-площадке Таджикистана. Здесь собраны объявления от частных лиц и дилеров Худжанда и всей Согдийской области. Используйте фильтр «Город: Худжанд» и выбирайте из сотен вариантов.
                </p>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                  Какие авто самые дешёвые в Худжанде?
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  Самые доступные варианты — Daewoo Nexia, Chevrolet Cobalt, Opel Vectra и ВАЗ. Их цена начинается от 2 500–3 500 долларов. Запчасти на эти машины легко найти в Худжанде и стоят недорого.
                </p>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                  Можно ли продать машину в Худжанде через интернет?
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  Да. Зарегистрируйтесь на TajCar.tj, разместите объявление с фото и ценой — покупатели из Худжанда и всего Таджикистана увидят его уже через несколько минут после проверки модератором.
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
