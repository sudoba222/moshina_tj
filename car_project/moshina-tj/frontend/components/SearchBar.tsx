'use client'
import { useState, useEffect, useRef, useCallback, KeyboardEvent, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import { searchApi } from '@/lib/api'
import type { SuggestionItem } from '@/lib/api'

// ---------------------------------------------------------------------------
// Local search history (localStorage)
// ---------------------------------------------------------------------------
const HISTORY_KEY = 'search_history_v2'
const MAX_HISTORY = 8

function loadHistory(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveHistory(history: string[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
}

function addToHistory(query: string) {
  const h = loadHistory().filter((q) => q.toLowerCase() !== query.toLowerCase())
  saveHistory([query, ...h])
}

function removeFromHistory(query: string) {
  saveHistory(loadHistory().filter((q) => q !== query))
}

// ---------------------------------------------------------------------------
// Unified dropdown item type
// ---------------------------------------------------------------------------
type DropdownItem =
  | { kind: 'history'; term: string }
  | { kind: 'popular'; term: string }
  | { kind: 'suggestion'; term: string; type: 'brand' | 'model' | 'city'; count: number }

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function SearchIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function TrendIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function XSmallIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Type label pill
// ---------------------------------------------------------------------------
function TypeLabel({ type, lang }: { type: 'brand' | 'model' | 'city'; lang: string }) {
  const colors: Record<string, string> = {
    brand: 'rgba(var(--accent-rgb,200,56,8),0.1)',
    model: 'rgba(59,130,246,0.1)',
    city: 'rgba(16,185,129,0.1)',
  }
  const textColors: Record<string, string> = {
    brand: 'var(--accent)',
    model: 'var(--color-info)',
    city: 'var(--color-online)',
  }
  const labels: Record<string, Record<string, string>> = {
    brand: { ru: 'Марка', tj: 'Марка' },
    model: { ru: 'Модель', tj: 'Модел' },
    city: { ru: 'Город', tj: 'Шаҳр' },
  }
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px',
      background: colors[type], color: textColors[type], whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {labels[type]?.[lang] ?? type}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Highlight matching text in suggestion
// ---------------------------------------------------------------------------
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <strong style={{ color: 'var(--accent)', fontWeight: 700 }}>{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Main SearchBar component
// ---------------------------------------------------------------------------
interface SearchBarProps {
  defaultValue?: string
  didYouMean?: string
  onDidYouMeanClick?: (suggestion: string) => void
}

export default function SearchBar({ defaultValue = '', didYouMean, onDidYouMeanClick }: SearchBarProps) {
  const router = useRouter()
  const { lang } = useLang()

  const [query, setQuery] = useState(defaultValue)
  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [popular, setPopular] = useState<string[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [loadingPopular, setLoadingPopular] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync defaultValue
  useEffect(() => { setQuery(defaultValue) }, [defaultValue])

  // Load history from localStorage
  useEffect(() => { setHistory(loadHistory()) }, [focused])

  // Fetch popular searches when focused with empty query
  useEffect(() => {
    if (!focused || query.trim().length > 0) return
    if (popular.length > 0) return
    setLoadingPopular(true)
    searchApi.popular()
      .then((res) => setPopular(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingPopular(false))
  }, [focused, query, popular.length])

  // Fetch suggestions on query change
  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setSuggestions([])
      return
    }
    try {
      const res = await searchApi.suggestions(q.trim())
      setSuggestions(res.data.data ?? [])
      setActiveIndex(-1)
    } catch {
      setSuggestions([])
    }
  }, [])

  function handleChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 200)
  }

  // Build the unified dropdown items list
  const dropdownItems: DropdownItem[] = query.trim().length > 0
    ? suggestions.map((s) => ({ kind: 'suggestion' as const, term: s.term, type: s.type, count: s.count }))
    : [
        ...history.slice(0, 5).map((h) => ({ kind: 'history' as const, term: h })),
        ...popular.slice(0, 5).map((p) => ({ kind: 'popular' as const, term: p })),
      ]

  const isOpen = focused && dropdownItems.length > 0

  function submitSearch(value: string) {
    const trimmed = value.trim()
    setFocused(false)
    setSuggestions([])
    if (trimmed) {
      addToHistory(trimmed)
      setHistory(loadHistory())
      // Log search (fire and forget)
      searchApi.logSearch(trimmed, 0)
      router.push(`/catalog?q=${encodeURIComponent(trimmed)}`)
    } else {
      router.push('/catalog')
    }
  }

  function selectItem(item: DropdownItem) {
    setQuery(item.term)
    submitSearch(item.term)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (activeIndex >= 0 && activeIndex < dropdownItems.length) {
      selectItem(dropdownItems[activeIndex])
    } else {
      submitSearch(query)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      if (e.key === 'Escape') setFocused(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((p) => Math.min(p + 1, dropdownItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((p) => Math.max(p - 1, -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      selectItem(dropdownItems[activeIndex])
    } else if (e.key === 'Escape') {
      setFocused(false)
      setActiveIndex(-1)
      inputRef.current?.blur()
    }
  }

  function handleDeleteHistory(e: React.MouseEvent, term: string) {
    e.stopPropagation()
    removeFromHistory(term)
    setHistory(loadHistory())
  }

  function handleClearHistory() {
    saveHistory([])
    setHistory([])
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

  // Group suggestion items by type for category headers
  const hasHistory = query.trim().length === 0 && history.length > 0
  const hasPopular = query.trim().length === 0 && popular.length > 0
  const hasSuggestions = query.trim().length > 0 && suggestions.length > 0

  // Section groupings for categorized display
  const brandItems = dropdownItems.filter((i) => i.kind === 'suggestion' && i.type === 'brand')
  const modelItems = dropdownItems.filter((i) => i.kind === 'suggestion' && i.type === 'model')
  const cityItems = dropdownItems.filter((i) => i.kind === 'suggestion' && i.type === 'city')
  const historyItems = dropdownItems.filter((i) => i.kind === 'history')
  const popularItems = dropdownItems.filter((i) => i.kind === 'popular')

  // Flat ordered list for keyboard nav index tracking
  let flatIndex = 0
  function getAndIncrement() { return flatIndex++ }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: '640px' }}>
      <form onSubmit={handleSubmit} role="search" style={{ display: 'flex', width: '100%' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder={t('hero.searchPlaceholder', lang)}
            role="combobox"
            aria-label={t('hero.searchPlaceholder', lang)}
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls="search-dropdown"
            aria-activedescendant={activeIndex >= 0 ? `dropdown-item-${activeIndex}` : undefined}
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

          {/* Dropdown */}
          {isOpen && (
            <div
              id="search-dropdown"
              role="listbox"
              aria-label={lang === 'ru' ? 'Подсказки поиска' : 'Пешниҳодҳои ҷустуҷӯ'}
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                overflow: 'hidden',
                zIndex: 200,
                boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                maxHeight: '400px',
                overflowY: 'auto',
              }}
            >
              {/* ── History section ── */}
              {hasHistory && (
                <>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 14px 4px', borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {t('search.recentSearches', lang)}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {t('search.clearHistory', lang)}
                    </button>
                  </div>
                  {historyItems.map((item) => {
                    const idx = getAndIncrement()
                    return (
                      <div
                        key={`h-${item.term}`}
                        id={`dropdown-item-${idx}`}
                        role="option"
                        aria-selected={activeIndex === idx}
                        onMouseDown={() => selectItem(item)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px',
                          cursor: 'pointer', fontSize: '14px', color: 'var(--text)',
                          background: activeIndex === idx ? 'var(--accent-dim)' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                      >
                        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}><ClockIcon /></span>
                        <span style={{ flex: 1 }}>{item.term}</span>
                        <button
                          type="button"
                          onMouseDown={(e) => handleDeleteHistory(e, item.term)}
                          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                          aria-label={lang === 'ru' ? 'Удалить из истории' : 'Аз таърих нест кунед'}
                        >
                          <XSmallIcon />
                        </button>
                      </div>
                    )
                  })}
                </>
              )}

              {/* ── Popular section ── */}
              {hasPopular && !loadingPopular && (
                <>
                  <div style={{
                    padding: '8px 14px 4px',
                    borderTop: hasHistory ? '1px solid var(--border)' : 'none',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {t('search.popularSearches', lang)}
                    </span>
                  </div>
                  {popularItems.map((item) => {
                    const idx = getAndIncrement()
                    return (
                      <div
                        key={`p-${item.term}`}
                        id={`dropdown-item-${idx}`}
                        role="option"
                        aria-selected={activeIndex === idx}
                        onMouseDown={() => selectItem(item)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px',
                          cursor: 'pointer', fontSize: '14px', color: 'var(--text)',
                          background: activeIndex === idx ? 'var(--accent-dim)' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                      >
                        <span style={{ color: 'var(--color-warning-alt)', flexShrink: 0 }}><TrendIcon /></span>
                        <span>{item.term}</span>
                      </div>
                    )
                  })}
                </>
              )}

              {/* ── Structured suggestions (Brands) ── */}
              {hasSuggestions && brandItems.length > 0 && (
                <>
                  <div style={{ padding: '8px 14px 4px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {t('search.brandLabel', lang)}
                    </span>
                  </div>
                  {brandItems.map((item) => {
                    if (item.kind !== 'suggestion') return null
                    const idx = getAndIncrement()
                    return (
                      <div
                        key={`brand-${item.term}`}
                        id={`dropdown-item-${idx}`}
                        role="option"
                        aria-selected={activeIndex === idx}
                        onMouseDown={() => selectItem(item)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px',
                          cursor: 'pointer', fontSize: '14px', color: 'var(--text)',
                          background: activeIndex === idx ? 'var(--accent-dim)' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                      >
                        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}><SearchIcon /></span>
                        <span style={{ flex: 1 }}><HighlightMatch text={item.term} query={query} /></span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>
                          {item.count} {t('search.listingsCount', lang)}
                        </span>
                        <TypeLabel type={item.type} lang={lang} />
                      </div>
                    )
                  })}
                </>
              )}

              {/* ── Structured suggestions (Models) ── */}
              {hasSuggestions && modelItems.length > 0 && (
                <>
                  <div style={{ padding: '8px 14px 4px', borderTop: brandItems.length > 0 ? '1px solid var(--border)' : 'none', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {t('search.modelLabel', lang)}
                    </span>
                  </div>
                  {modelItems.map((item) => {
                    if (item.kind !== 'suggestion') return null
                    const idx = getAndIncrement()
                    return (
                      <div
                        key={`model-${item.term}`}
                        id={`dropdown-item-${idx}`}
                        role="option"
                        aria-selected={activeIndex === idx}
                        onMouseDown={() => selectItem(item)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px',
                          cursor: 'pointer', fontSize: '14px', color: 'var(--text)',
                          background: activeIndex === idx ? 'var(--accent-dim)' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                      >
                        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}><SearchIcon /></span>
                        <span style={{ flex: 1 }}><HighlightMatch text={item.term} query={query} /></span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>
                          {item.count} {t('search.listingsCount', lang)}
                        </span>
                        <TypeLabel type={item.type} lang={lang} />
                      </div>
                    )
                  })}
                </>
              )}

              {/* ── Structured suggestions (Cities) ── */}
              {hasSuggestions && cityItems.length > 0 && (
                <>
                  <div style={{ padding: '8px 14px 4px', borderTop: (brandItems.length > 0 || modelItems.length > 0) ? '1px solid var(--border)' : 'none', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {t('search.cityLabel', lang)}
                    </span>
                  </div>
                  {cityItems.map((item) => {
                    if (item.kind !== 'suggestion') return null
                    const idx = getAndIncrement()
                    return (
                      <div
                        key={`city-${item.term}`}
                        id={`dropdown-item-${idx}`}
                        role="option"
                        aria-selected={activeIndex === idx}
                        onMouseDown={() => selectItem(item)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px',
                          cursor: 'pointer', fontSize: '14px', color: 'var(--text)',
                          background: activeIndex === idx ? 'var(--accent-dim)' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                      >
                        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}><SearchIcon /></span>
                        <span style={{ flex: 1 }}><HighlightMatch text={item.term} query={query} /></span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>
                          {item.count} {t('search.listingsCount', lang)}
                        </span>
                        <TypeLabel type={item.type} lang={lang} />
                      </div>
                    )
                  })}
                </>
              )}

            </div>
          )}
        </div>

        <button
          type="submit"
          style={{
            background: 'var(--accent)', color: 'var(--color-white)', fontWeight: 700, fontSize: '15px',
            padding: '12px 22px', borderRadius: '0 10px 10px 0', border: 'none',
            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'opacity 0.15s ease',
            fontFamily: 'var(--font)',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
        >
          {t('hero.searchBtn', lang)}
        </button>
      </form>

      {/* "Did you mean?" */}
      {didYouMean && (
        <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>
          {t('search.didYouMean', lang)}:{' '}
          <button
            type="button"
            onClick={handleDidYouMeanClick}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: 'var(--accent)', fontWeight: 600, fontSize: '13px',
              textDecoration: 'underline', fontFamily: 'var(--font)',
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
