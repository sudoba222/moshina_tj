'use client'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

function FlagRU({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.67)} viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="20" fill="#fff"/>
      <rect y="6.67" width="30" height="6.67" fill="#0039A6"/>
      <rect y="13.33" width="30" height="6.67" fill="#D52B1E"/>
    </svg>
  )
}

function FlagTJ({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.5)} viewBox="0 0 30 15" aria-hidden="true">
      <rect width="30" height="15" fill="#fff"/>
      <rect width="30" height="5" fill="#CC0001"/>
      <rect y="10" width="30" height="5" fill="#006600"/>
      <rect x="10" y="5" width="10" height="5" fill="#F8C300"/>
    </svg>
  )
}

export default function LanguageToggle() {
  const { lang, setLang } = useLang()
  const isRu = lang === 'ru'

  return (
    <button
      onClick={() => setLang(isRu ? 'tj' : 'ru')}
      aria-label={isRu ? t('dashboard.switchToTajik', lang) : t('dashboard.switchToRussian', lang)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'none',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '4px 9px',
        cursor: 'pointer',
        color: 'var(--text-muted)',
        fontSize: '12px',
        fontWeight: 700,
        letterSpacing: '0.05em',
      }}
    >
      {isRu ? <FlagTJ /> : <FlagRU />}
      {isRu ? 'ТЈ' : 'РУ'}
    </button>
  )
}
