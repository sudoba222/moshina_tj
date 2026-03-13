'use client'
import { useLang } from '@/lib/LanguageContext'

export default function LanguageToggle() {
  const { lang, setLang } = useLang()

  return (
    <button
      onClick={() => setLang(lang === 'ru' ? 'tj' : 'ru')}
      aria-label={lang === 'ru' ? 'Switch to Tajik' : 'Русский тилга ўтиш'}
      style={{
        background: 'none',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '5px 10px',
        cursor: 'pointer',
        color: 'var(--text-muted)',
        fontSize: '12px',
        fontWeight: 700,
        letterSpacing: '0.05em',
      }}
    >
      {lang === 'ru' ? 'ТЈ' : 'РУ'}
    </button>
  )
}
