'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import CarCard from '@/components/CarCard'
import { listingsApi } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { Listing } from '@/types'

interface InfiniteListingsFeedProps {
  /** Listing id to exclude from the feed (the one being viewed) */
  excludeId?: string
  /** Optional heading shown above the feed */
  title?: string
}

/**
 * Endless recommendations feed — the "keep scrolling" pattern used by
 * Auto.ru / Encar at the bottom of a listing. Loads active listings page by
 * page and fetches the next page automatically when a sentinel scrolls into
 * view (IntersectionObserver). Dedupes and skips the currently-viewed car.
 */
export default function InfiniteListingsFeed({ excludeId, title }: InfiniteListingsFeedProps) {
  const { lang } = useLang()
  const [items, setItems] = useState<Listing[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const seenIds = useRef<Set<string>>(new Set(excludeId ? [excludeId] : []))
  const loadingRef = useRef(false)

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    setLoading(true)
    try {
      const res = await listingsApi.list({ page, limit: 12, sort: 'newest' })
      const data = res.data.data
      const fresh = data.items.filter((l) => {
        if (seenIds.current.has(l.id)) return false
        seenIds.current.add(l.id)
        return true
      })
      setItems((prev) => [...prev, ...fresh])
      setPage((p) => p + 1)
      setHasMore(data.page < data.pages)
    } catch {
      setHasMore(false)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [page, hasMore])

  // First page
  useEffect(() => {
    loadMore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-load when the sentinel is near the viewport
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: '600px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  if (items.length === 0 && !loading) return null

  return (
    <section style={{ marginTop: '56px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '20px' }}>
        {title ?? t('carDetail.moreToExplore', lang)}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {items.map((l) => (
          <CarCard key={l.id} listing={l} lang={lang} />
        ))}
      </div>

      {/* Sentinel + spinner */}
      <div ref={sentinelRef} style={{ height: '1px' }} aria-hidden="true" />
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }} aria-label={t('common.loading', lang)}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </svg>
        </div>
      )}
    </section>
  )
}
