'use client'

interface PaginationProps {
  page: number
  pages: number
  onPageChange: (page: number) => void
}

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 3L5 8l5 5" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3l5 5-5 5" />
    </svg>
  )
}

export default function Pagination({ page, pages, onPageChange }: PaginationProps) {
  if (pages <= 1) return null

  const visiblePages = getVisiblePages(page, pages)

  return (
    <nav
      aria-label="Pagination"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        flexWrap: 'wrap',
      }}
    >
      {/* Previous */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: page <= 1 ? 'var(--text-muted)' : 'var(--text)',
          cursor: page <= 1 ? 'not-allowed' : 'pointer',
          opacity: page <= 1 ? 0.4 : 1,
          flexShrink: 0,
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <ChevronLeft />
      </button>

      {visiblePages.map((p, i) =>
        p === '...' ? (
          <span
            key={`ellipsis-${i}`}
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '14px',
              flexShrink: 0,
              userSelect: 'none',
            }}
          >
            &hellip;
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            aria-label={`Page ${p}`}
            aria-current={page === p ? 'page' : undefined}
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              border: page === p ? '1.5px solid var(--accent)' : '1px solid var(--border)',
              background: page === p ? 'var(--accent)' : 'var(--surface)',
              color: page === p ? 'var(--color-white)' : 'var(--text)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: page === p ? 700 : 500,
              flexShrink: 0,
              transition: 'border-color 0.15s, background 0.15s, color 0.15s',
            }}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
        aria-label="Next page"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: page >= pages ? 'var(--text-muted)' : 'var(--text)',
          cursor: page >= pages ? 'not-allowed' : 'pointer',
          opacity: page >= pages ? 0.4 : 1,
          flexShrink: 0,
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <ChevronRight />
      </button>
    </nav>
  )
}

function getVisiblePages(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}
