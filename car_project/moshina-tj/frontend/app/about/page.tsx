import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'О нас | TAJCAR.TJ',
  description:
    'TAJCAR.TJ — главный авторынок Таджикистана. Узнайте больше о платформе, нашей миссии и преимуществах.',
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px 20px',
        textAlign: 'center',
        flex: '1 1 140px',
      }}
    >
      <p
        style={{
          fontSize: '32px',
          fontWeight: 800,
          color: 'var(--accent)',
          letterSpacing: '-0.03em',
          margin: 0,
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontSize: '13px',
          color: 'var(--text-muted)',
          marginTop: '4px',
          fontWeight: 500,
        }}
      >
        {label}
      </p>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ color: 'var(--accent)' }}>{icon}</div>
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
        {title}
      </h3>
      <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>
        {body}
      </p>
    </div>
  )
}

function ShieldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2L3 7v6c0 5.25 3.75 10.15 9 11.25C17.25 23.15 21 18.25 21 13V7L12 2z" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function ZapIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

interface StatsData {
  listings_count: number
  dealers_count: number
  cities_count: number
  users_count: number
}

async function fetchStats(): Promise<StatsData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL
  if (!baseUrl) return null
  try {
    const res = await fetch(`${baseUrl}/stats`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    const json = await res.json()
    if (!json?.success || !json?.data) return null
    return json.data as StatsData
  } catch {
    return null
  }
}

function formatStat(value: number | null | undefined): string {
  if (value == null) return '—'
  return value.toLocaleString('ru-RU')
}

export default async function AboutPage() {
  const stats = await fetchStats()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1, paddingBottom: '60px' }}>
        {/* Hero */}
        <div
          style={{
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            padding: '60px 16px',
            textAlign: 'center',
          }}
        >
          <div className="max-w-3xl mx-auto">
            <div style={{ marginBottom: '16px' }}>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '36px',
                  color: 'var(--accent)',
                  letterSpacing: '-0.03em',
                }}
              >
                TAJCAR
              </span>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: '22px',
                  color: 'var(--text-muted)',
                }}
              >
                .TJ
              </span>
            </div>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: 'var(--text)',
                letterSpacing: '-0.02em',
                marginBottom: '16px',
              }}
            >
              Главный авторынок Таджикистана
            </h1>
            <p
              style={{
                fontSize: '16px',
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                maxWidth: '560px',
                margin: '0 auto',
              }}
            >
              Мы создаём удобное и безопасное пространство для покупки, продажи и аренды
              автомобилей по всему Таджикистану.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 md:px-6" style={{ paddingTop: '52px' }}>
          {/* Mission */}
          <section style={{ marginBottom: '52px' }}>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--text)',
                marginBottom: '16px',
                letterSpacing: '-0.02em',
              }}
            >
              Наша миссия
            </h2>
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderLeft: '4px solid var(--accent)',
                borderRadius: '12px',
                padding: '24px',
              }}
            >
              <p
                style={{
                  fontSize: '16px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.75,
                  margin: 0,
                  fontStyle: 'italic',
                }}
              >
                Сделать покупку и продажу автомобилей в Таджикистане простой, прозрачной и
                доступной для каждого — будь то частный продавец в Душанбе или дилер в
                Худжанде.
              </p>
            </div>
          </section>

          {/* Stats */}
          <section style={{ marginBottom: '52px' }}>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--text)',
                marginBottom: '20px',
                letterSpacing: '-0.02em',
              }}
            >
              Платформа в цифрах
            </h2>
            <div className="flex flex-wrap gap-4">
              <StatCard value={formatStat(stats?.listings_count)} label="объявлений" />
              <StatCard value={formatStat(stats?.cities_count)} label="городов" />
              <StatCard value={formatStat(stats?.dealers_count)} label="дилеров" />
              <StatCard value="2024" label="год основания" />
            </div>
          </section>

          {/* Why TAJCAR.TJ */}
          <section style={{ marginBottom: '52px' }}>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--text)',
                marginBottom: '20px',
                letterSpacing: '-0.02em',
              }}
            >
              Почему TAJCAR.TJ
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FeatureCard
                icon={<ShieldIcon />}
                title="Модерация каждого объявления"
                body="Каждое объявление проверяется модераторами перед публикацией. Мошеннические и недостоверные объявления удаляются."
              />
              <FeatureCard
                icon={<TagIcon />}
                title="Бесплатно для частных лиц"
                body="Подать объявление о продаже или аренде автомобиля можно бесплатно. Мы не берём комиссию с продавца."
              />
              <FeatureCard
                icon={<ZapIcon />}
                title="Быстрая публикация"
                body="После регистрации разместить объявление можно за несколько минут. Простая форма, пошаговый мастер, помощь ИИ."
              />
              <FeatureCard
                icon={<StarIcon />}
                title="Официальные дилеры"
                body="Верифицированные дилеры со своими страницами, каталогами и контактами. Проверяйте сертификаты прямо на сайте."
              />
            </div>
          </section>

          {/* Contact */}
          <section
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '36px 28px',
              textAlign: 'center',
            }}
          >
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--text)',
                marginBottom: '10px',
                letterSpacing: '-0.02em',
              }}
            >
              Связаться с нами
            </h2>
            <p
              style={{
                fontSize: '15px',
                color: 'var(--text-muted)',
                marginBottom: '24px',
                lineHeight: 1.6,
              }}
            >
              Есть вопросы, предложения или хотите стать партнёром?<br />
              Пишите — мы отвечаем быстро.
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '12px',
              }}
            >
              <a
                href="mailto:support@tajcar.tj"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--accent)',
                  color: 'var(--color-white)',
                  fontWeight: 700,
                  fontSize: '15px',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                }}
              >
                support@tajcar.tj
              </a>
              <Link
                href="/catalog"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--surface)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '15px',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  textDecoration: 'none',
                }}
              >
                Смотреть объявления
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
