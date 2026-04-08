/* eslint-disable @next/next/no-img-element */
'use client'
import { useState, useEffect } from 'react'
import { t } from '@/lib/i18n'
import { useLang } from '@/lib/LanguageContext'
import { getCarBrandLogoUrl } from '@/lib/carBrandLogos'
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

// ─── Brand list derived from carBrandLogos.ts
//     These are the canonical display names — each must be lowercased before
//     passing to getCarBrandLogoUrl(). Order: most-popular-in-CIS first.
const BRAND_NAMES: string[] = [
  'Toyota', 'Chevrolet', 'BMW', 'Mercedes', 'Hyundai', 'Kia',
  'Audi', 'Volkswagen', 'Lexus', 'Honda', 'Nissan', 'Lada',
  'BYD', 'Geely', 'Haval', 'Chery', 'Daewoo', 'Mitsubishi',
  'Mazda', 'Subaru', 'Suzuki', 'Volvo', 'Skoda', 'Renault',
  'Peugeot', 'Citroen', 'Fiat', 'Ford', 'Jeep', 'Tesla',
  'Porsche', 'Land Rover', 'Jaguar', 'Mini', 'Infiniti',
  'Genesis', 'GAC', 'Changan', 'Hongqi', 'MG',
  'UAZ', 'GAZ', 'Lada',
]

// De-duplicate (Lada appears twice above as a safeguard)
const BRANDS: string[] = Array.from(new Set(BRAND_NAMES))

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

// ─── Brand logo — CDN image with initial-letter fallback ──────────────────────
function BrandLogo({ name, selected }: { name: string; selected: boolean }) {
  const [errored, setErrored] = useState(false)
  const logoUrl = getCarBrandLogoUrl(name)

  if (!logoUrl || errored) {
    // Fallback: first letter of the brand in a styled circle
    return (
      <div style={{
        width: '40px', height: '40px',
        borderRadius: '50%',
        background: selected ? 'var(--accent-dim)' : 'var(--surface)',
        border: '1.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '15px', fontWeight: 800,
        color: selected ? 'var(--accent)' : 'var(--text-muted)',
        flexShrink: 0,
        transition: 'background 0.15s, color 0.15s',
      }}>
        {name.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <img
      src={logoUrl}
      alt={name}
      onError={() => setErrored(true)}
      style={{
        width: '44px', height: '32px',
        objectFit: 'contain',
        display: 'block',
        flexShrink: 0,
      }}
    />
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
    const timer = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(timer)
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
        .lang-btn:hover { border-color: var(--accent) !important; }
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
                {CITIES.map(({ value, i18n: i18nKey }) => {
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
                      {t(i18nKey, lang)}
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
                  // Short code shown as the visual identifier (no flags)
                  const code = l === 'ru' ? 'РУ' : 'ТЈ'
                  return (
                    <button
                      key={l}
                      className="lang-btn"
                      onClick={() => setSelectedLang(l)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: '10px',
                        padding: '28px 16px',
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
                      {/* Language code badge — no flags, no emojis */}
                      <span style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '48px', height: '48px',
                        borderRadius: '12px',
                        background: selected ? 'rgba(255,255,255,0.18)' : 'var(--surface)',
                        border: `1.5px solid ${selected ? 'rgba(255,255,255,0.25)' : 'var(--border)'}`,
                        fontSize: '18px',
                        fontWeight: 900,
                        letterSpacing: '0.04em',
                        color: selected ? 'var(--color-white)' : 'var(--accent)',
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                      }}>
                        {code}
                      </span>
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
                maxHeight: '320px',
                overflowY: 'auto',
                paddingRight: '2px',
                // Smooth scroll on iOS
                WebkitOverflowScrolling: 'touch',
              }}>
                {BRANDS.map((name) => {
                  const selected = selectedBrands.includes(name)
                  return (
                    <button
                      key={name}
                      className="brand-card"
                      onClick={() => toggleBrand(name)}
                      aria-pressed={selected}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: '8px', padding: '12px 8px',
                        border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: '14px',
                        background: selected ? 'var(--accent-dim)' : 'var(--bg)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font)',
                        transition: 'all 0.18s ease',
                        position: 'relative',
                        minHeight: '84px',
                      }}
                    >
                      {/* Check badge */}
                      {selected && (
                        <span style={{
                          position: 'absolute', top: '6px', right: '6px',
                          width: '16px', height: '16px',
                          borderRadius: '50%',
                          background: 'var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      )}

                      {/* Brand logo (CDN) or initial-letter fallback */}
                      <BrandLogo name={name} selected={selected} />

                      {/* Brand name */}
                      <span style={{
                        fontSize: '10px', fontWeight: 700,
                        color: selected ? 'var(--accent)' : 'var(--text-muted)',
                        transition: 'color 0.15s',
                        textAlign: 'center',
                        lineHeight: 1.2,
                        wordBreak: 'break-word',
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
