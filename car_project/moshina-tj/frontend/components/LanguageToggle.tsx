'use client'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

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
      {isRu ? 'ТЈ' : 'РУ'}
    </button>
  )
}
