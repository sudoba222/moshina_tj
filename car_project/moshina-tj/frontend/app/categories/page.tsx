'use client'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

// ─── SVG Icons per category ──────────────────────────────────────────────────
const icons: Record<string, React.ReactNode> = {
  car: (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3v-7l3-4h10l3 4v7h-2"/>
      <circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
    </svg>
  ),
  suv: (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17v-5l2-5h14l2 5v5"/><path d="M3 12h18"/>
      <circle cx="7" cy="17" r="1.5"/><circle cx="17" cy="17" r="1.5"/>
    </svg>
  ),
  minivan: (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 17H2V8l2-3h14l2 3v9h-2"/>
      <rect x="6" y="5" width="8" height="6" rx="1"/>
      <circle cx="7" cy="17" r="1.5"/><circle cx="17" cy="17" r="1.5"/>
    </svg>
  ),
  pickup: (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17H2V10l3-5h7v5h8v7h-2"/>
      <rect x="10" y="10" width="8" height="5"/>
      <circle cx="6" cy="17" r="1.5"/><circle cx="18" cy="17" r="1.5"/>
    </svg>
  ),
  truck: (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2"/>
      <path d="M16 8h4l3 3v5h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
  bus: (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M2 10h20"/><path d="M7 10v4"/><path d="M17 10v4"/>
      <circle cx="7" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>
    </svg>
  ),
  motorcycle: (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/>
      <path d="M5 17h4l4-8h3l2 4h-3"/><path d="M13 9l3 8"/>
    </svg>
  ),
  special: (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20v-4H2z"/><path d="M10 16V8l-4 4"/><path d="M14 16V8l4 4"/>
      <rect x="8" y="3" width="8" height="5" rx="1"/>
    </svg>
  ),
  parts: (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  commercial: (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="6" width="14" height="12" rx="2"/>
      <path d="M15 10h4l3 3v5h-7V10z"/>
      <circle cx="5.5" cy="19.5" r="1.5"/><circle cx="18.5" cy="19.5" r="1.5"/>
    </svg>
  ),
  electric: (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3v-7l3-4h10l3 4v7h-2"/>
      <circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
      <path d="M13 2 9 9h5l-4 7"/>
    </svg>
  ),
  other: (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
}

const CATEGORIES = [
  { id: 'car',        descRu: 'Легковые, хэтчбеки, кроссоверы',       descTj: 'Мошинаҳои сабук, хэтчбек, кроссовер' },
  { id: 'suv',        descRu: 'Полноприводные и проходимые авто',       descTj: 'Мошинаҳои полноприводӣ ва гузаранда' },
  { id: 'minivan',    descRu: 'Семейные и пассажирские минивэны',       descTj: 'Минивэнҳои оилавӣ ва мусофирбар' },
  { id: 'pickup',     descRu: 'Пикапы для работы и отдыха',            descTj: 'Пикапҳо барои кор ва истироҳат' },
  { id: 'truck',      descRu: 'Бортовые, самосвалы, рефрижераторы',    descTj: 'Борӣ, самосвал, рефрижератор' },
  { id: 'bus',        descRu: 'Городские, межгородские и школьные',    descTj: 'Шаҳрӣ, байнишаҳрӣ ва мактабӣ' },
  { id: 'motorcycle', descRu: 'Мотоциклы, скутеры, эндуро',            descTj: 'Мотосикл, скутер, эндуро' },
  { id: 'special',    descRu: 'Экскаваторы, краны, бульдозеры',        descTj: 'Экскаватор, кран, бульдозер' },
  { id: 'parts',      descRu: 'Запчасти, аксессуары, шины, диски',     descTj: 'Эҳтиётқисм, аксессуар, шина, диск' },
  { id: 'commercial', descRu: 'Газели, микроавтобусы, фургоны',        descTj: 'Газель, микроавтобус, фургон' },
  { id: 'electric',   descRu: 'Электрокары и гибриды',                 descTj: 'Мошинаҳои барқӣ ва гибридӣ' },
  { id: 'other',      descRu: 'Прочий транспорт',                       descTj: 'Нақлиёти дигар' },
]

export default function CategoriesPage() {
  const { lang } = useLang()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1, padding: 'clamp(24px,4vw,48px) clamp(14px,4vw,24px) 80px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: 'clamp(24px,4vw,34px)', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
              {t('categories.pageTitle', lang)}
            </h1>
            <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
              {t('categories.pageSubtitle', lang)}
            </p>
          </div>

          {/* Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '16px',
          }}>
            {CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '18px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLDivElement).style.transform = 'none'
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
                }}
              >
                {/* Icon */}
                <div style={{
                  width: '64px', height: '64px', borderRadius: '16px',
                  background: 'var(--accent-dim)', color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {icons[cat.id]}
                </div>

                {/* Title + description */}
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
                    {t(`categories.${cat.id}` as Parameters<typeof t>[0], lang)}
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {lang === 'ru' ? cat.descRu : cat.descTj}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <Link
                    href={`/catalog?category=${cat.id}`}
                    style={{
                      flex: 1, textAlign: 'center', padding: '10px 0',
                      borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                      background: 'var(--accent)', color: 'var(--color-white)',
                      textDecoration: 'none', transition: 'opacity 0.13s',
                    }}
                  >
                    {t('categories.browseCategory', lang)}
                  </Link>
                  <Link
                    href={`/post?category=${cat.id}`}
                    style={{
                      padding: '10px 14px', borderRadius: '10px', fontSize: '13px',
                      fontWeight: 700, border: '1.5px solid var(--border)',
                      background: 'var(--surface)', color: 'var(--text)',
                      textDecoration: 'none', whiteSpace: 'nowrap',
                      transition: 'border-color 0.13s',
                    }}
                  >
                    +
                  </Link>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>
      <Footer />
    </div>
  )
}
