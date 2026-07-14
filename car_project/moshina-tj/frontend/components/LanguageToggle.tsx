'use client'
import { useLang } from '@/lib/LanguageContext'

export default function LanguageToggle() {
  const { lang, setLang } = useLang()

  return (
    <div
      role="group"
      aria-label="Language"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {(['ru', 'tj'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          style={{
            padding: '4px 9px',
            background: lang === l ? 'var(--accent)' : 'transparent',
            color: lang === l ? 'var(--color-white)' : 'var(--text-muted)',
            border: 'none',
            cursor: lang === l ? 'default' : 'pointer',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            transition: 'background 0.13s, color 0.13s',
          }}
        >
          {l === 'ru' ? 'РУ' : 'ТЈ'}
        </button>
      ))}
    </div>
  )
}
