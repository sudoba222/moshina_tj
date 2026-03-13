'use client'
import { useState, useEffect, useRef, useCallback, KeyboardEvent, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import { searchApi } from '@/lib/api'

interface SearchBarProps {
  defaultValue?: string
  didYouMean?: string
  onDidYouMeanClick?: (suggestion: string) => void
}

export default function SearchBar({
  defaultValue = '',
  didYouMean,
  onDidYouMeanClick,
}: SearchBarProps) {
  const router = useRouter()
  const { lang } = useLang()
  const [query, setQuery] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync defaultValue changes (e.g. when catalog updates the URL)
  useEffect(() => {
    setQuery(defaultValue)
  }, [defaultValue])

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setSuggestions([])
      setOpen(false)
      return
    }
    try {
      const res = await searchApi.suggestions(q.trim())
      const items = (res.data.data ?? []).slice(0, 8)
      setSuggestions(items)
      setOpen(items.length > 0)
      setActiveIndex(-1)
    } catch {
      setSuggestions([])
      setOpen(false)
    }
  }, [])

  function handleChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300)
  }

  function submitSearch(value: string) {
    setOpen(false)
    setSuggestions([])
    const trimmed = value.trim()
    if (trimmed) {
      router.push(`/catalog?q=${encodeURIComponent(trimmed)}`)
    } else {
      router.push('/catalog')
    }
  }

  function selectSuggestion(suggestion: string) {
    setQuery(suggestion)
    submitSearch(suggestion)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    submitSearch(query)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  function handleBlur() {
    // Small delay so click on suggestion fires before blur closes the list
    setTimeout(() => setOpen(false), 120)
  }

  function handleDidYouMeanClick() {
    if (!didYouMean) return
    if (onDidYouMeanClick) {
      onDidYouMeanClick(didYouMean)
    } else {
      setQuery(didYouMean)
      submitSearch(didYouMean)
    }
  }

  const didYouMeanLabel =
    lang === 'ru'
      ? `Вы имели в виду: `
      : `Шумо мехостед: `

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: '640px' }}>
      <form
        onSubmit={handleSubmit}
        role="search"
        className="flex w-full"
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="search"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={() => {
              if (suggestions.length > 0) setOpen(true)
            }}
            placeholder={t('hero.searchPlaceholder', lang)}
            aria-label={t('hero.searchPlaceholder', lang)}
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls="search-suggestions"
            aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
            autoComplete="off"
            style={{
              width: '100%',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRight: 'none',
              borderRadius: '10px 0 0 10px',
              padding: '12px 16px',
              fontSize: '15px',
              color: 'var(--text)',
              outline: 'none',
              fontFamily: 'var(--font)',
            }}
          />

          {/* Suggestions dropdown */}
          {open && suggestions.length > 0 && (
            <ul
              id="search-suggestions"
              role="listbox"
              aria-label={lang === 'ru' ? 'Подсказки поиска' : 'Пешниҳодҳои ҷустуҷӯ'}
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                overflow: 'hidden',
                zIndex: 200,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                listStyle: 'none',
                margin: 0,
                padding: 0,
              }}
            >
              {suggestions.map((s, i) => (
                <li
                  key={s}
                  id={`suggestion-${i}`}
                  role="option"
                  aria-selected={activeIndex === i}
                  onMouseDown={() => selectSuggestion(s)}
                  onMouseEnter={() => setActiveIndex(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'var(--text)',
                    background: activeIndex === i ? 'var(--accent-dim)' : 'transparent',
                    borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.1s',
                  }}
                >
                  {/* Search icon */}
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, color: 'var(--text-muted)' }}
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="submit"
          style={{
            background: 'var(--accent)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '15px',
            padding: '12px 22px',
            borderRadius: '0 10px 10px 0',
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s ease',
            fontFamily: 'var(--font)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-hover)'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'
          }}
        >
          {t('hero.searchBtn', lang)}
        </button>
      </form>

      {/* "Did you mean?" */}
      {didYouMean && (
        <p
          style={{
            marginTop: '8px',
            fontSize: '13px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font)',
          }}
        >
          {didYouMeanLabel}
          <button
            type="button"
            onClick={handleDidYouMeanClick}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'var(--accent)',
              fontWeight: 600,
              fontSize: '13px',
              textDecoration: 'underline',
              fontFamily: 'var(--font)',
            }}
          >
            {didYouMean}
          </button>
          ?
        </p>
      )}
    </div>
  )
}
