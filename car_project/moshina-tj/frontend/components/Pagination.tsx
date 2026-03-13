'use client'

interface PaginationProps {
  page: number
  pages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, pages, onPageChange }: PaginationProps) {
  if (pages <= 1) return null

  const visiblePages = getVisiblePages(page, pages)

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1 flex-wrap"
    >
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        style={{
          padding: '8px 14px',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: page <= 1 ? 'var(--text-muted)' : 'var(--text)',
          cursor: page <= 1 ? 'not-allowed' : 'pointer',
          opacity: page <= 1 ? 0.4 : 1,
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        ←
      </button>

      {visiblePages.map((p, i) =>
        p === '...' ? (
          <span
            key={`ellipsis-${i}`}
            style={{
              padding: '8px 6px',
              color: 'var(--text-muted)',
              fontSize: '14px',
            }}
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            aria-label={`Page ${p}`}
            aria-current={page === p ? 'page' : undefined}
            style={{
              padding: '8px 13px',
              borderRadius: '8px',
              border: page === p ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: page === p ? 'var(--accent)' : 'var(--surface)',
              color: page === p ? '#fff' : 'var(--text)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              minWidth: '38px',
            }}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
        aria-label="Next page"
        style={{
          padding: '8px 14px',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: page >= pages ? 'var(--text-muted)' : 'var(--text)',
          cursor: page >= pages ? 'not-allowed' : 'pointer',
          opacity: page >= pages ? 0.4 : 1,
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        →
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
