'use client'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

// ─── SVG Icons per category (Tabler Icons style, MIT) ────────────────────────
const S = { width: 36, height: 36, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const icons: Record<string, React.ReactNode> = {
  car: (
    <svg {...S}>
      {/* Tabler: car */}
      <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M5 17h-2v-6l2 -5h9l4 4h1a2 2 0 0 1 2 2v5h-2m-4 0h-6m-6 -6h15m-6 0v-5" />
    </svg>
  ),
  suv: (
    <svg {...S}>
      {/* Tabler: car-suv */}
      <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M5 17h-2v-7a1 1 0 0 1 1 -1h12l3 4h1a1 1 0 0 1 1 1v3h-2m-4 0h-6" />
      <path d="M6 9l2 -4h7l2 4" />
    </svg>
  ),
  minivan: (
    <svg {...S}>
      {/* Tabler: van */}
      <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M3 17h-2v-11a2 2 0 0 1 2 -2h13v11" />
      <path d="M16 4l4 4h-4v-4z" />
      <path d="M16 8h4v9h-2" />
      <path d="M5 6h4v5h-4z" />
      <path d="M10 6h3v5h-3z" />
    </svg>
  ),
  pickup: (
    <svg {...S}>
      {/* Tabler: car-4wd / pickup style */}
      <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M3 17h-2v-6l3 -5h6v11" />
      <path d="M10 6h2l4 5h5v6h-2" />
      <path d="M10 11h9" />
    </svg>
  ),
  truck: (
    <svg {...S}>
      {/* Tabler: truck */}
      <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M5 17h-2v-11a1 1 0 0 1 1 -1h9v12m-4 0h6m4 0h2v-6a1 1 0 0 0 -1 -1h-2l-3 -4h-1" />
    </svg>
  ),
  bus: (
    <svg {...S}>
      {/* Tabler: bus */}
      <path d="M6 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M18 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M4 17h-2v-11a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v11h-2m-10 0h8" />
      <path d="M4 9l16 0" />
      <path d="M9 9l0 6" />
      <path d="M15 9l0 6" />
    </svg>
  ),
  motorcycle: (
    <svg {...S}>
      {/* Tabler: motorcycle */}
      <path d="M5 16m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
      <path d="M19 16m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
      <path d="M7.5 14l2.5 -4h5l2 -3" />
      <path d="M6 5l3 1l1 3h2" />
      <path d="M12 9h4" />
      <path d="M17 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
    </svg>
  ),
  special: (
    <svg {...S}>
      {/* Tabler: bulldozer */}
      <path d="M4 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M13 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M2 17h-1v-4l2 -5h7l1 9h-2" />
      <path d="M6 8v-5l6 3v2" />
      <path d="M15 17h-2" />
      <path d="M15 13h4l2 4h-6v-4z" />
    </svg>
  ),
  parts: (
    <svg {...S}>
      {/* Tabler: tool */}
      <path d="M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5" />
    </svg>
  ),
  commercial: (
    <svg {...S}>
      {/* Tabler: truck-delivery */}
      <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M5 17h-2v-4m-1 -8h11v12m-4 0h6m4 0h2v-6a1 1 0 0 0 -1 -1h-2l-3 -4h-1" />
      <path d="M3 9l11 0" />
      <path d="M3 13l11 0" />
    </svg>
  ),
  electric: (
    <svg {...S}>
      {/* Tabler: car + zap */}
      <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M5 17h-2v-6l2 -5h9l4 4h1a2 2 0 0 1 2 2v5h-2m-4 0h-6" />
      <path d="M13 4l-3 4h4l-3 4" strokeWidth="1.8" />
    </svg>
  ),
  other: (
    <svg {...S}>
      {/* Tabler: help-circle */}
      <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <path d="M12 17l0 .01" strokeWidth="2.5" />
      <path d="M12 13.5a1.5 1.5 0 0 1 1 -1.5a2.6 2.6 0 1 0 -3 -4" />
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
