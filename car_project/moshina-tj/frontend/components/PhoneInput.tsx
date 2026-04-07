'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

// ─── Country data ─────────────────────────────────────────────────────────────
interface Country {
  code: string
  dialCode: string
  flag: string
  name: string
}

const COUNTRIES: Country[] = [
  { code: 'TJ', dialCode: '+992', flag: '🇹🇯', name: 'Таджикистан' },
  { code: 'RU', dialCode: '+7',   flag: '🇷🇺', name: 'Россия' },
  { code: 'UZ', dialCode: '+998', flag: '🇺🇿', name: 'Узбекистан' },
  { code: 'KZ', dialCode: '+7',   flag: '🇰🇿', name: 'Казахстан' },
  { code: 'KG', dialCode: '+996', flag: '🇰🇬', name: 'Кыргызстан' },
  { code: 'TM', dialCode: '+993', flag: '🇹🇲', name: 'Туркменистан' },
  { code: 'AF', dialCode: '+93',  flag: '🇦🇫', name: 'Афганистан' },
  { code: 'CN', dialCode: '+86',  flag: '🇨🇳', name: 'Китай' },
  { code: 'DE', dialCode: '+49',  flag: '🇩🇪', name: 'Германия' },
  { code: 'AE', dialCode: '+971', flag: '🇦🇪', name: 'ОАЭ' },
  { code: 'US', dialCode: '+1',   flag: '🇺🇸', name: 'США' },
  { code: 'GB', dialCode: '+44',  flag: '🇬🇧', name: 'Великобритания' },
  { code: 'TR', dialCode: '+90',  flag: '🇹🇷', name: 'Турция' },
  { code: 'IR', dialCode: '+98',  flag: '🇮🇷', name: 'Иран' },
  { code: 'PK', dialCode: '+92',  flag: '🇵🇰', name: 'Пакистан' },
]

const DEFAULT_COUNTRY = COUNTRIES[0] // Tajikistan

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given a full phone string (e.g. "+992901234567"), return the matching
 * Country and the local part after the dial code.
 * Falls back to the default country if no match is found.
 */
function splitFullPhone(full: string): { country: Country; localNumber: string } {
  if (!full.startsWith('+')) {
    return { country: DEFAULT_COUNTRY, localNumber: full.replace(/\D/g, '') }
  }

  // Sort by dial code length descending so "+992" matches before "+9" etc.
  const sorted = [...COUNTRIES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length
  )

  for (const c of sorted) {
    if (full.startsWith(c.dialCode)) {
      return {
        country: c,
        localNumber: full.slice(c.dialCode.length).replace(/\D/g, ''),
      }
    }
  }

  return { country: DEFAULT_COUNTRY, localNumber: full.replace(/\D/g, '') }
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  hasError?: boolean
  searchPlaceholder?: string
  notFoundText?: string
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PhoneInput({
  value,
  onChange,
  placeholder = '000 000 0000',
  disabled = false,
  hasError = false,
  searchPlaceholder = 'Поиск страны...',
  notFoundText = 'Не найдено',
}: PhoneInputProps) {
  const { country: initialCountry, localNumber: initialLocal } = splitFullPhone(value)
  const [selectedCountry, setSelectedCountry] = useState<Country>(initialCountry)
  const [localNumber, setLocalNumber] = useState<string>(initialLocal)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Keep internal state in sync when value changes from outside
  useEffect(() => {
    const { country, localNumber: local } = splitFullPhone(value)
    setSelectedCountry(country)
    setLocalNumber(local)
  }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      // defer so the DOM has time to render
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [open])

  const handleCountrySelect = useCallback(
    (country: Country) => {
      setSelectedCountry(country)
      setOpen(false)
      setSearch('')
      onChange(`${country.dialCode}${localNumber}`)
    },
    [localNumber, onChange]
  )

  const handleLocalChange = useCallback(
    (raw: string) => {
      const digits = raw.replace(/\D/g, '')
      setLocalNumber(digits)
      onChange(`${selectedCountry.dialCode}${digits}`)
    },
    [selectedCountry, onChange]
  )

  const filteredCountries = search.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dialCode.includes(search)
      )
    : COUNTRIES

  const borderColor = hasError ? 'var(--color-error)' : 'var(--border)'

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      {/* ── Input row ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          border: `1px solid ${borderColor}`,
          borderRadius: '10px',
          overflow: 'hidden',
          background: 'var(--bg)',
          transition: 'border-color 0.15s',
        }}
      >
        {/* Dial-code button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Страна: ${selectedCountry.name}, код ${selectedCountry.dialCode}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '12px 10px 12px 12px',
            background: 'var(--surface)',
            border: 'none',
            borderRight: `1px solid ${borderColor}`,
            cursor: disabled ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            fontSize: '15px',
            color: 'var(--text)',
            fontFamily: 'inherit',
            transition: 'background 0.15s',
            minHeight: '44px',
          }}
          onMouseEnter={(e) => {
            if (!disabled) e.currentTarget.style.background = 'var(--card)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface)'
          }}
        >
          <span role="img" aria-hidden="true" style={{ fontSize: '16px', lineHeight: 1 }}>
            {selectedCountry.flag}
          </span>
          <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-secondary)' }}>
            {selectedCountry.dialCode}
          </span>
          {/* Chevron */}
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            style={{
              color: 'var(--text-muted)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s',
              flexShrink: 0,
            }}
          >
            <path d="M2 3.5l3 3 3-3" />
          </svg>
        </button>

        {/* Local number input */}
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          disabled={disabled}
          value={localNumber}
          placeholder={placeholder}
          onChange={(e) => handleLocalChange(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            padding: '12px 14px',
            fontSize: '15px',
            color: 'var(--text)',
            outline: 'none',
            fontFamily: 'inherit',
            minWidth: 0,
          }}
        />
      </div>

      {/* ── Dropdown ── */}
      {open && (
        <div
          role="listbox"
          aria-label="Выберите страну"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 200,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
            overflow: 'hidden',
            animation: 'scaleIn 0.15s ease',
          }}
        >
          {/* Search */}
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '7px 10px',
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ color: 'var(--text-muted)', flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '13px',
                  color: 'var(--text)',
                  width: '100%',
                  fontFamily: 'inherit',
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Очистить поиск"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M1 1l10 10M11 1L1 11" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Country list */}
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: '4px 0',
              maxHeight: '220px',
              overflowY: 'auto',
            }}
          >
            {filteredCountries.length === 0 ? (
              <li
                style={{
                  padding: '12px 16px',
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                }}
              >
                {notFoundText}
              </li>
            ) : (
              filteredCountries.map((country) => {
                const isActive = country.code === selectedCountry.code
                return (
                  <li key={country.code} role="option" aria-selected={isActive}>
                    <button
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 14px',
                        background: isActive ? 'var(--accent-dim)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        color: 'var(--text)',
                        transition: 'background 0.1s',
                        minHeight: '40px',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'var(--surface)'
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <span role="img" aria-hidden="true" style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>
                        {country.flag}
                      </span>
                      <span style={{ flex: 1, fontWeight: isActive ? 600 : 400 }}>
                        {country.name}
                      </span>
                      <span
                        style={{
                          fontSize: '13px',
                          color: 'var(--text-muted)',
                          fontWeight: 500,
                          flexShrink: 0,
                        }}
                      >
                        {country.dialCode}
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
