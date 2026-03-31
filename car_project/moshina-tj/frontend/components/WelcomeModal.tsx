'use client'
import { useEffect, useState } from 'react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/types'

interface Props {
  userName: string
  lang: Lang
  onContinue: () => void
  onSkip: () => void
}

export default function WelcomeModal({ userName, lang, onContinue, onSkip }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Small delay so the animation is perceived after register success
    const timer = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(timer)
  }, [])

  const firstName = userName.split(' ')[0]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('welcome.title', lang)}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <style>{`
        @keyframes welcomeSlideUp {
          from { opacity: 0; transform: translateY(32px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes carBounce {
          0%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          70% { transform: translateY(-4px); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.15); }
        }
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: '360px',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '24px',
        padding: 'clamp(28px, 6vw, 44px) clamp(24px, 5vw, 36px)',
        textAlign: 'center',
        animation: visible ? 'welcomeSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
        boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
      }}>

        {/* Car icon — animated */}
        <div style={{ marginBottom: '20px', animation: 'carBounce 2s ease-in-out infinite' }} aria-hidden="true">
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="36" cy="36" r="36" fill="var(--accent)" fillOpacity="0.1"/>
            <g transform="translate(10, 20)">
              {/* Car body */}
              <rect x="4" y="14" width="44" height="16" rx="4" fill="var(--accent)" fillOpacity="0.15" stroke="var(--accent)" strokeWidth="1.5"/>
              {/* Car roof */}
              <path d="M12 14 L16 4 L36 4 L40 14" fill="var(--accent)" fillOpacity="0.25" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/>
              {/* Windshield */}
              <path d="M15 13 L18 5 L34 5 L37 13" fill="var(--bg)" stroke="var(--accent)" strokeWidth="1" fillOpacity="0.8"/>
              {/* Wheels */}
              <circle cx="14" cy="30" r="5.5" fill="var(--card)" stroke="var(--accent)" strokeWidth="2"/>
              <circle cx="14" cy="30" r="2.5" fill="var(--accent)" fillOpacity="0.5"/>
              <circle cx="38" cy="30" r="5.5" fill="var(--card)" stroke="var(--accent)" strokeWidth="2"/>
              <circle cx="38" cy="30" r="2.5" fill="var(--accent)" fillOpacity="0.5"/>
              {/* Headlight */}
              <rect x="45" y="18" width="5" height="4" rx="1.5" fill="var(--accent)" fillOpacity="0.8"/>
              {/* Door line */}
              <line x1="26" y1="14" x2="26" y2="28" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.4"/>
            </g>
          </svg>
        </div>

        {/* Stars decoration */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '16px' }}>
          {[0, 1, 2].map((i) => (
            <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="var(--accent)"
              style={{ animation: `sparkle 1.4s ease-in-out ${i * 0.2}s infinite`, opacity: 0.7 }}>
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
            </svg>
          ))}
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: 'clamp(20px, 5vw, 26px)',
          fontWeight: 900,
          color: 'var(--text)',
          marginBottom: '8px',
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
        }}>
          {t('welcome.title', lang)},{' '}
          <span style={{ color: 'var(--accent)' }}>{firstName}</span>
        </h2>

        {/* Body */}
        <p style={{
          fontSize: '14px',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          marginBottom: '28px',
        }}>
          {t('welcome.body', lang)}
        </p>

        {/* CTA button */}
        <button
          onClick={onContinue}
          style={{
            width: '100%',
            background: 'var(--accent)',
            color: 'var(--color-white)',
            fontWeight: 700,
            fontSize: '15px',
            padding: '13px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font)',
            marginBottom: '12px',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          {t('welcome.startBtn', lang)}
        </button>

        {/* Skip */}
        <button
          onClick={onSkip}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontSize: '13px',
            fontWeight: 500,
            fontFamily: 'var(--font)',
            padding: '4px',
          }}
        >
          {t('welcome.skipBtn', lang)}
        </button>
      </div>
    </div>
  )
}
