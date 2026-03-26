'use client'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

export default function AuctionPage() {
  const { lang } = useLang()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '60px 24px', maxWidth: '480px' }}>

          {/* Icon */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '20px',
            background: 'var(--accent-dim, rgba(37,99,235,0.08))',
            border: '2px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {/* Gavel head */}
              <path d="M14 4l6 6-1.5 1.5-6-6z" />
              <path d="M4 14l6 6 1.5-1.5-6-6z" />
              {/* Gavel handle */}
              <line x1="9" y1="15" x2="6" y2="18" />
              {/* Podium */}
              <line x1="3" y1="21" x2="13" y2="21" />
              {/* Strike line */}
              <path d="M7.5 8.5l8 8" />
            </svg>
          </div>

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.4)',
            borderRadius: '100px', padding: '4px 14px',
            fontSize: '12px', fontWeight: 700, color: 'var(--color-warning, #ca8a04)',
            marginBottom: '16px', letterSpacing: '0.04em',
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'var(--color-warning, #ca8a04)', display: 'inline-block', animation: 'pulse 2s infinite',
            }} />
            {t('auction.badge', lang)}
          </div>

          <h1 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 800, color: 'var(--text)', marginBottom: '12px', lineHeight: 1.2 }}>
            {t('auction.title', lang)}
          </h1>

          <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '32px' }}>
            {t('auction.sub', lang)}
          </p>

          {/* Features preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left', marginBottom: '36px' }}>
            {(['feature1', 'feature2', 'feature3'] as const).map((key) => (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '10px 14px',
                fontSize: '14px', color: 'var(--text)',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t(`auction.${key}`, lang)}
              </div>
            ))}
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {t('auction.notify', lang)}
          </p>
        </div>
      </main>
      <Footer />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
