'use client'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

export interface AdminTableColumn<T> {
  key: string
  header: string
  /** Custom render function for a cell */
  render?: (row: T) => React.ReactNode
  /** Inline style overrides for the <th> */
  headerStyle?: React.CSSProperties
  /** Inline style overrides for each <td> */
  cellStyle?: React.CSSProperties
  /** Whether to hide this column on mobile */
  hideOnMobile?: boolean
}

interface AdminTableProps<T extends { id: string }> {
  columns: AdminTableColumn<T>[]
  rows: T[]
  loading?: boolean
  loadingText?: string
  emptyText?: string
  /** Total count for pagination display */
  total?: number
  page?: number
  pageSize?: number
  onPrevPage?: () => void
  onNextPage?: () => void
  /** Highlight a row on hover */
  onRowClick?: (row: T) => void
  /** Optional caption for accessibility */
  caption?: string
}

// ── Shared style constants ─────────────────────────────────────────────────────
const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: '11px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--border)',
  background: 'var(--surface)',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: '13px',
  color: 'var(--text)',
  borderBottom: '1px solid var(--border)',
  verticalAlign: 'middle',
}

export default function AdminTable<T extends { id: string }>({
  columns,
  rows,
  loading = false,
  loadingText,
  emptyText,
  total,
  page,
  pageSize = 20,
  onPrevPage,
  onNextPage,
  onRowClick,
  caption,
}: AdminTableProps<T>) {
  const { lang } = useLang()
  const resolvedLoadingText = loadingText ?? t('common.loading', lang)
  const resolvedEmptyText = emptyText ?? t('common.noData', lang)
  const hasPagination = page !== undefined && (onPrevPage || onNextPage)
  const totalPages = total && pageSize ? Math.ceil(total / pageSize) : undefined

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
        <LoadingSpinner />
        <div style={{ marginTop: '10px' }}>{resolvedLoadingText}</div>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'var(--card)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}
          aria-label={caption}
        >
          {caption && (
            <caption style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
              {caption}
            </caption>
          )}
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={{ ...thStyle, ...col.headerStyle }}
                  className={col.hideOnMobile ? 'admin-table-col-hide-mobile' : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px' }}
                >
                  {resolvedEmptyText}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={onRowClick ? (e) => { e.currentTarget.style.background = 'var(--surface)' } : undefined}
                  onMouseLeave={onRowClick ? (e) => { e.currentTarget.style.background = '' } : undefined}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{ ...tdStyle, ...col.cellStyle }}
                      className={col.hideOnMobile ? 'admin-table-col-hide-mobile' : undefined}
                    >
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {hasPagination && rows.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderTop: '1px solid var(--border)',
            fontSize: '13px',
            color: 'var(--text-muted)',
          }}
        >
          <span>
            {total !== undefined && (
              <>
                {'Всего'}: <strong style={{ color: 'var(--text)' }}>{total.toLocaleString('ru-RU')}</strong>
              </>
            )}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PageButton
              onClick={onPrevPage}
              disabled={!onPrevPage || page === 1}
              aria-label="Previous page"
            >
              ‹
            </PageButton>
            <span style={{ padding: '4px 10px', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              {page}{totalPages ? ` / ${totalPages}` : ''}
            </span>
            <PageButton
              onClick={onNextPage}
              disabled={!onNextPage || rows.length < pageSize}
              aria-label="Next page"
            >
              ›
            </PageButton>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .admin-table-col-hide-mobile { display: none; }
        }
      `}</style>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PageButton({
  children,
  onClick,
  disabled,
  'aria-label': ariaLabel,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  'aria-label'?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        width: '30px',
        height: '30px',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        fontSize: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  )
}

function LoadingSpinner() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ animation: 'admin-table-spin 0.8s linear infinite', display: 'inline-block' }}
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0110 10" />
      <style>{`@keyframes admin-table-spin { to { transform: rotate(360deg) } }`}</style>
    </svg>
  )
}
