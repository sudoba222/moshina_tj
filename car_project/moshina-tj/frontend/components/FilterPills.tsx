'use client'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

export type FilterValue = 'all' | 'sale' | 'rent' | 'installment'

interface FilterPillsProps {
  value: FilterValue
  onChange: (value: FilterValue) => void
}

const PILLS: { key: FilterValue; labelKey: string }[] = [
  { key: 'all',         labelKey: 'filters.all' },
  { key: 'sale',        labelKey: 'filters.sale' },
  { key: 'rent',        labelKey: 'filters.rent' },
  { key: 'installment', labelKey: 'filters.installment' },
]

export default function FilterPills({ value, onChange }: FilterPillsProps) {
  const { lang } = useLang()

  return (
    <div
      role="group"
      aria-label="Filter listings"
      className="flex flex-wrap gap-2"
    >
      {PILLS.map((pill) => {
        const active = value === pill.key
        return (
          <button
            key={pill.key}
            onClick={() => onChange(pill.key)}
            aria-pressed={active}
            style={{
              padding: '8px 18px',
              borderRadius: '999px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
              background: active ? 'var(--accent)' : 'var(--surface)',
              color: active ? '#fff' : 'var(--text-muted)',
              border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
            }}
          >
            {t(pill.labelKey, lang)}
          </button>
        )
      })}
    </div>
  )
}
