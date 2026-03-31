'use client'
import { useState, useEffect } from 'react'
import { t } from '@/lib/i18n'
import { useLang } from '@/lib/LanguageContext'
import type { Lang } from '@/types'

export interface UserPrefs {
  city: string
  lang: Lang
  brands: string[]
}

interface Props {
  onComplete: (prefs: UserPrefs) => void
}

// ─── City data ─────────────────────────────────────────────────────────────────
const CITIES = [
  { value: 'Душанбе',    i18n: 'options.cityDushanbe' },
  { value: 'Хуҷанд',     i18n: 'options.cityKhujand' },
  { value: 'Бохтар',     i18n: 'options.cityBokhtar' },
  { value: 'Кӯлоб',      i18n: 'options.cityCulob' },
  { value: 'Истаравшан', i18n: 'options.cityIstaravshan' },
  { value: 'Пенджикент', i18n: 'options.cityPenjikent' },
  { value: 'Хорог',      i18n: 'options.cityKhorog' },
  { value: 'Турсунзода', i18n: 'options.cityTursunzoda' },
]

// ─── Brand data with inline SVG paths ─────────────────────────────────────────
const BRANDS: { name: string; color: string; icon: React.ReactNode }[] = [
  {
    name: 'Toyota',
    color: '#EB0A1E',
    icon: (
      // Toyota three-oval logo (simplified)
      <svg viewBox="0 0 40 28" width="40" height="28" fill="currentColor">
        <ellipse cx="20" cy="14" rx="19" ry="7.5" fill="none" stroke="currentColor" strokeWidth="2.2"/>
        <ellipse cx="20" cy="14" rx="8.5" ry="13" fill="none" stroke="currentColor" strokeWidth="2.2"/>
        <ellipse cx="20" cy="4.5" rx="11" ry="4" fill="none" stroke="currentColor" strokeWidth="2.2"/>
      </svg>
    ),
  },
  {
    name: 'BMW',
    color: '#1C69D4',
    icon: (
      // BMW roundel
      <svg viewBox="0 0 32 32" width="32" height="32">
        <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeWidth="2"/>
        <circle cx="16" cy="16" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M16 6.5 A9.5 9.5 0 0 0 6.5 16 L16 16 Z" fill="currentColor" fillOpacity="0.7"/>
        <path d="M16 16 L25.5 16 A9.5 9.5 0 0 0 16 25.5 Z" fill="currentColor" fillOpacity="0.7"/>
      </svg>
    ),
  },
  {
    name: 'Mercedes',
    color: '#333',
    icon: (
      // Three-pointed star
      <svg viewBox="0 0 32 32" width="32" height="32">
        <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeWidth="2"/>
        <polygon points="16,3 19.5,13.5 30,14.2 21.5,20.5 24,31 16,25 8,31 10.5,20.5 2,14.2 12.5,13.5"
          fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
        <line x1="16" y1="3" x2="16" y2="16" stroke="currentColor" strokeWidth="1.8"/>
        <line x1="16" y1="16" x2="5" y2="22.5" stroke="currentColor" strokeWidth="1.8"/>
        <line x1="16" y1="16" x2="27" y2="22.5" stroke="currentColor" strokeWidth="1.8"/>
        <circle cx="16" cy="16" r="2.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    name: 'Chevrolet',
    color: '#D4AA00',
    icon: (
      // Bowtie
      <svg viewBox="0 0 44 20" width="44" height="20">
        <path d="M2 2 L20 2 L15 18 L2 18 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M24 2 L42 2 L42 18 L29 18 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M15 10 L29 10" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
  },
  {
    name: 'Hyundai',
    color: '#002C5F',
    icon: (
      // Stylized H
      <svg viewBox="0 0 32 32" width="32" height="32">
        <ellipse cx="16" cy="16" rx="15" ry="11" fill="none" stroke="currentColor" strokeWidth="2"/>
        <text x="16" y="21" textAnchor="middle" fontSize="16" fontWeight="800"
          fontFamily="Arial,sans-serif" fill="currentColor" letterSpacing="-0.5">H</text>
      </svg>
    ),
  },
  {
    name: 'Kia',
    color: '#05141F',
    icon: (
      // KIA in rounded rectangle
      <svg viewBox="0 0 44 24" width="44" height="24">
        <rect x="1" y="1" width="42" height="22" rx="5" fill="none" stroke="currentColor" strokeWidth="2"/>
        <text x="22" y="17" textAnchor="middle" fontSize="13" fontWeight="900"
          fontFamily="Arial,sans-serif" fill="currentColor" letterSpacing="1">KIA</text>
      </svg>
    ),
  },
  {
    name: 'Lexus',
    color: '#1A1A1A',
    icon: (
      // L in oval
      <svg viewBox="0 0 40 28" width="40" height="28">
        <ellipse cx="20" cy="14" rx="19" ry="13" fill="none" stroke="currentColor" strokeWidth="2"/>
        <text x="20" y="20" textAnchor="middle" fontSize="18" fontWeight="700"
          fontFamily="Georgia,serif" fill="currentColor" fontStyle="italic">L</text>
      </svg>
    ),
  },
  {
    name: 'Honda',
    color: '#CC0000',
    icon: (
      // H in wings shape
      <svg viewBox="0 0 44 24" width="44" height="24">
        <path d="M4 12 Q6 4 14 6 L20 12 L24 12 L30 6 Q38 4 40 12 Q38 20 30 18 L24 12 L20 12 L14 18 Q6 20 4 12 Z"
          fill="none" stroke="currentColor" strokeWidth="1.8"/>
        <text x="22" y="17" textAnchor="middle" fontSize="14" fontWeight="800"
          fontFamily="Arial,sans-serif" fill="currentColor">H</text>
      </svg>
    ),
  },
  {
    name: 'Nissan',
    color: '#C3002F',
    icon: (
      // Circle with horizontal bar
      <svg viewBox="0 0 40 28" width="40" height="28">
        <ellipse cx="20" cy="14" rx="19" ry="13" fill="none" stroke="currentColor" strokeWidth="2"/>
        <line x1="2" y1="14" x2="38" y2="14" stroke="currentColor" strokeWidth="2"/>
        <text x="20" y="11.5" textAnchor="middle" fontSize="7.5" fontWeight="700"
          fontFamily="Arial,sans-serif" fill="currentColor" letterSpacing="0.5">NISSAN</text>
      </svg>
    ),
  },
  {
    name: 'Audi',
    color: '#BB0A30',
    icon: (
      // Four rings
      <svg viewBox="0 0 56 16" width="56" height="16">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="2"/>
        <circle cx="22" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="2"/>
        <circle cx="36" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="2"/>
        <circle cx="50" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
  },
  {
    name: 'Volkswagen',
    color: '#001E50',
    icon: (
      // VW in circle
      <svg viewBox="0 0 32 32" width="32" height="32">
        <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeWidth="2"/>
        <text x="16" y="21.5" textAnchor="middle" fontSize="13" fontWeight="900"
          fontFamily="Arial,sans-serif" fill="currentColor" letterSpacing="-0.5">VW</text>
      </svg>
    ),
  },
  {
    name: 'BYD',
    color: '#1565C0',
    icon: (
      // BYD text
      <svg viewBox="0 0 44 24" width="44" height="24">
        <rect x="1" y="1" width="42" height="22" rx="5" fill="none" stroke="currentColor" strokeWidth="2"/>
        <text x="22" y="17" textAnchor="middle" fontSize="13" fontWeight="900"
          fontFamily="Arial,sans-serif" fill="currentColor" letterSpacing="0.5">BYD</text>
      </svg>
    ),
  },
]

// ─── Map pin icon ──────────────────────────────────────────────────────────────
function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  )
}

// ─── Progress dots ─────────────────────────────────────────────────────────────
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '24px' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i + 1 === current ? '24px' : '8px',
          height: '8px',
          borderRadius: '4px',
          background: i + 1 <= current ? 'var(--accent)' : 'var(--border)',
          transition: 'width 0.3s ease, background 0.3s ease',
        }} />
      ))}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function OnboardingWizard({ onComplete }: Props) {
  const { lang, setLang } = useLang()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(1)
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedLang, setSelectedLang] = useState<Lang>(lang)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward')
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  function goNext() {
    setAnimDir('forward')
    setAnimKey((k) => k + 1)
    setStep((s) => s + 1)
  }

  function goBack() {
    setAnimDir('back')
    setAnimKey((k) => k + 1)
    setStep((s) => s - 1)
  }

  function finish() {
    const prefs: UserPrefs = { city: selectedCity, lang: selectedLang, brands: selectedBrands }
    localStorage.setItem('user_prefs', JSON.stringify(prefs))
    if (selectedLang !== lang) setLang(selectedLang)
    onComplete(prefs)
  }

  function skip() {
    onComplete({ city: selectedCity, lang: selectedLang, brands: selectedBrands })
  }

  function toggleBrand(name: string) {
    setSelectedBrands((prev) =>
      prev.includes(name) ? prev.filter((b) => b !== name) : [...prev, name]
    )
  }

  const slideIn = animDir === 'forward'
    ? 'stepSlideInRight 0.28s cubic-bezier(0.25,0.46,0.45,0.94) both'
    : 'stepSlideInLeft 0.28s cubic-bezier(0.25,0.46,0.45,0.94) both'

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 1001,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <style>{`
        @keyframes stepSlideInRight { from { opacity:0; transform: translateX(32px); } to { opacity:1; transform: translateX(0); } }
        @keyframes stepSlideInLeft  { from { opacity:0; transform: translateX(-32px); } to { opacity:1; transform: translateX(0); } }
        .brand-card:hover { transform: scale(1.04); }
        .city-btn:hover { border-color: var(--accent) !important; color: var(--accent) !important; }
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '24px',
        padding: 'clamp(24px, 5vw, 36px) clamp(20px, 4vw, 32px)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
            {t('onboarding.stepOf', lang).replace('{step}', String(step))}
          </span>
          <button
            onClick={skip}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600,
              fontFamily: 'var(--font)', padding: '2px 0',
            }}
          >
            {t('onboarding.skipAll', lang)}
          </button>
        </div>

        <ProgressDots current={step} total={3} />

        {/* Step content — animated */}
        <div key={animKey} style={{ animation: visible ? slideIn : 'none' }}>

          {/* ── Step 1: City ─────────────────────────────────────────────── */}
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px', letterSpacing: '-0.02em' }}>
                {t('onboarding.step1Title', lang)}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
                {t('onboarding.step1Sub', lang)}
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                maxHeight: '280px',
                overflowY: 'auto',
                paddingRight: '2px',
              }}>
                {CITIES.map(({ value, i18n }) => {
                  const selected = selectedCity === value
                  return (
                    <button
                      key={value}
                      className="city-btn"
                      onClick={() => setSelectedCity(selected ? '' : value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '11px 14px',
                        border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: '12px',
                        background: selected ? 'var(--accent)' : 'var(--bg)',
                        color: selected ? 'var(--color-white)' : 'var(--text)',
                        fontSize: '13px',
                        fontWeight: selected ? 700 : 500,
                        cursor: 'pointer',
                        fontFamily: 'var(--font)',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ color: selected ? 'var(--color-white)' : 'var(--accent)', flexShrink: 0 }}>
                        <PinIcon />
                      </span>
                      {t(i18n, lang)}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Step 2: Language ─────────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px', letterSpacing: '-0.02em' }}>
                {t('onboarding.step2Title', lang)}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
                {t('onboarding.step2Sub', lang)}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {(['ru', 'tj'] as const).map((l) => {
                  const selected = selectedLang === l
                  const label = l === 'ru' ? t('onboarding.langRu', lang) : t('onboarding.langTj', lang)
                  return (
                    <button
                      key={l}
                      onClick={() => setSelectedLang(l)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: '12px',
                        padding: '24px 16px',
                        border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: '16px',
                        background: selected ? 'var(--accent)' : 'var(--bg)',
                        color: selected ? 'var(--color-white)' : 'var(--text)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font)',
                        transition: 'all 0.15s ease',
                        boxShadow: selected ? '0 4px 16px rgba(220,38,38,0.2)' : 'none',
                      }}
                    >
                      {/* Flag icon */}
                      <svg width="40" height="28" viewBox="0 0 40 28" style={{ borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                        {l === 'ru' ? (
                          <>
                            <rect width="40" height="9.33" y="0" fill="#fff"/>
                            <rect width="40" height="9.33" y="9.33" fill="#0039A6"/>
                            <rect width="40" height="9.33" y="18.67" fill="#D52B1E"/>
                          </>
                        ) : (
                          <>
                            <rect width="40" height="9.33" y="0" fill="#CC0001"/>
                            <rect width="40" height="9.33" y="9.33" fill="#FFFFFF"/>
                            <rect width="40" height="9.33" y="18.67" fill="#007A3D"/>
                            <circle cx="14" cy="14" r="4.5" fill="none" stroke="#CC0001" strokeWidth="1.2"/>
                          </>
                        )}
                        {/* Flag border */}
                        <rect width="40" height="28" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1"/>
                      </svg>
                      <span style={{ fontSize: '14px', fontWeight: 700 }}>{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Step 3: Brands ───────────────────────────────────────────── */}
          {step === 3 && (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px', letterSpacing: '-0.02em' }}>
                {t('onboarding.step3Title', lang)}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                {t('onboarding.step3Sub', lang)}
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                maxHeight: '300px',
                overflowY: 'auto',
              }}>
                {BRANDS.map(({ name, color, icon }) => {
                  const selected = selectedBrands.includes(name)
                  return (
                    <button
                      key={name}
                      className="brand-card"
                      onClick={() => toggleBrand(name)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: '8px', padding: '12px 8px',
                        border: `2px solid ${selected ? color : 'var(--border)'}`,
                        borderRadius: '14px',
                        background: selected ? `${color}14` : 'var(--bg)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font)',
                        transition: 'all 0.18s ease',
                        position: 'relative',
                        minHeight: '76px',
                      }}
                    >
                      {/* Check badge */}
                      {selected && (
                        <span style={{
                          position: 'absolute', top: '6px', right: '6px',
                          width: '16px', height: '16px',
                          borderRadius: '50%',
                          background: color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      )}

                      {/* Brand icon */}
                      <span style={{ color: selected ? color : 'var(--text-muted)', transition: 'color 0.15s' }}>
                        {icon}
                      </span>

                      {/* Brand name */}
                      <span style={{
                        fontSize: '11px', fontWeight: 700,
                        color: selected ? color : 'var(--text-muted)',
                        transition: 'color 0.15s',
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}>
                        {name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          {step > 1 && (
            <button
              onClick={goBack}
              style={{
                flex: '0 0 auto',
                padding: '12px 18px',
                border: '1.5px solid var(--border)',
                borderRadius: '12px',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font)',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 2L4 7l5 5"/>
              </svg>
              {t('onboarding.back', lang)}
            </button>
          )}
          <button
            onClick={step < 3 ? goNext : finish}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              borderRadius: '12px',
              background: 'var(--accent)',
              color: 'var(--color-white)',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            {step < 3 ? t('onboarding.next', lang) : t('onboarding.finish', lang)}
            {step < 3 && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 2l5 5-5 5"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
