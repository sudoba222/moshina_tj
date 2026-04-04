'use client'
import { useState, useCallback, useRef } from 'react'
import { adminApi } from '@/lib/api'
import type { StaffSearchItem, ListingLogEntry } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { Lang } from '@/types'
import {
  thStyle, tdStyle, inputStyle, StatusBadge, ModalBackdrop, ModalCard,
  formatDate, extractApiError,
} from '../components/shared'
import { IconSearch, IconX } from '../components/icons'
import { useToast } from '../components/ToastContext'

// ── Action label + color map ──────────────────────────────────────────────────

const ACTION_META: Record<string, { label: { ru: string; tj: string }; color: string }> = {
  created:       { label: { ru: 'Создано',              tj: 'Сохта шуд'          }, color: 'var(--color-success)' },
  approved:      { label: { ru: 'Одобрено',             tj: 'Тасдиқ шуд'         }, color: 'var(--color-success)' },
  rejected:      { label: { ru: 'Отклонено',            tj: 'Рад шуд'            }, color: 'var(--color-error)'   },
  admin_deleted: { label: { ru: 'Удалено (модератор)',  tj: 'Ҳазф (муназзим)'    }, color: 'var(--color-error)'   },
  resubmitted:   { label: { ru: 'Повторно отправлено',  tj: 'Дубора фиристода шуд'}, color: 'var(--accent)'       },
  activated:     { label: { ru: 'Активировано',         tj: 'Фаъол шуд'          }, color: 'var(--color-success)' },
  deactivated:   { label: { ru: 'Деактивировано',       tj: 'Ғайрифаъол шуд'     }, color: 'var(--text-muted)'    },
  staff_edit:    { label: { ru: 'Отредактировано',      tj: 'Вироиш шуд'         }, color: 'var(--accent)'        },
  login:         { label: { ru: 'Вход',                 tj: 'Вуруд'              }, color: 'var(--accent)'        },
}

function actionLabel(action: string, lang: Lang): string {
  return ACTION_META[action]?.label[lang] ?? action
}
function actionColor(action: string): string {
  return ACTION_META[action]?.color ?? 'var(--text-muted)'
}

// ── Log timeline ─────────────────────────────────────────────────────────────

function LogTimeline({ entries, lang }: { entries: ListingLogEntry[]; lang: Lang }) {
  if (entries.length === 0) {
    return (
      <p className="text-center py-8 text-[13px]" style={{ color: 'var(--text-muted)' }}>
        {t('activity.noLogs', lang)}
      </p>
    )
  }

  return (
    <div style={{ position: 'relative', paddingLeft: '28px' }}>
      {/* Vertical line */}
      <div style={{
        position: 'absolute', left: '7px', top: '8px', bottom: '8px',
        width: '2px', background: 'var(--border)',
      }} />

      {entries.map((entry, idx) => {
        const color = actionColor(entry.action)
        const isLast = idx === entries.length - 1
        return (
          <div
            key={entry.id}
            style={{
              position: 'relative',
              marginBottom: isLast ? 0 : '20px',
            }}
          >
            {/* Dot */}
            <div style={{
              position: 'absolute',
              left: '-28px',
              top: '3px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: color,
              border: '2px solid var(--bg)',
              boxShadow: `0 0 0 2px ${color}33`,
            }} />

            {/* Content */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '10px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color }}>
                  {actionLabel(entry.action, lang)}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {formatDate(entry.created_at)}
                </span>
              </div>

              {/* Status transition */}
              {(entry.from_status || entry.to_status) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  {entry.from_status && (
                    <StatusBadge status={entry.from_status} />
                  )}
                  {entry.from_status && entry.to_status && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>→</span>
                  )}
                  {entry.to_status && (
                    <StatusBadge status={entry.to_status} />
                  )}
                </div>
              )}

              {/* Actor */}
              {(entry.actor_name || entry.actor_role) && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: entry.reason ? '4px' : 0 }}>
                  {t('activity.by', lang)}{' '}
                  <strong>{entry.actor_name ?? '—'}</strong>
                  {entry.actor_role && (
                    <span style={{
                      marginLeft: '6px',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                      letterSpacing: '0.04em',
                    }}>
                      {entry.actor_role}
                    </span>
                  )}
                </div>
              )}

              {/* Reason / comment */}
              {entry.reason && (
                <div style={{
                  marginTop: '6px',
                  padding: '6px 10px',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: 'var(--text)',
                  fontStyle: 'italic',
                }}>
                  &ldquo;{entry.reason}&rdquo;
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const { lang } = useLang()
  const { showToast } = useToast()

  // Search state
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [items, setItems] = useState<StaffSearchItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Log modal state
  const [selectedItem, setSelectedItem] = useState<StaffSearchItem | null>(null)
  const [logs, setLogs] = useState<ListingLogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  const doSearch = useCallback(async (q: string, st: string, incDel: boolean, p: number) => {
    setSearching(true)
    setHasSearched(true)
    try {
      // Detect if query looks like a UUID
      const isUuid = /^[0-9a-f-]{36}$/i.test(q.trim())
      const isPhone = q.startsWith('+') || /^\d{7,}$/.test(q.trim())

      const res = await adminApi.getListings(
        st === 'all' ? undefined : st,
        p,
        isUuid || isPhone ? undefined : (q || undefined),
      )

      // Re-run with staff search if phone was detected
      if (isPhone && q) {
        const staffRes = await adminApi.staffSearch({
          user_phone: q.trim(),
          status: st !== 'all' ? st : undefined,
          page: p,
          limit: 20,
        })
        setItems(staffRes.data.data.items as StaffSearchItem[])
        setTotal(staffRes.data.data.total)
        setPage(staffRes.data.data.page)
        setPages(staffRes.data.data.pages)
        setSearching(false)
        return
      }

      if (isUuid && q) {
        const staffRes = await adminApi.staffSearch({
          listing_id: q.trim(),
          page: p,
          limit: 20,
        })
        setItems(staffRes.data.data.items as StaffSearchItem[])
        setTotal(staffRes.data.data.total)
        setPage(staffRes.data.data.page)
        setPages(staffRes.data.data.pages)
        setSearching(false)
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = res.data.data as any
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
      setPage(data.page ?? 1)
      setPages(data.pages ?? 1)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
    setSearching(false)
  }, [lang, showToast])

  function handleSearch(e?: React.FormEvent) {
    e?.preventDefault()
    doSearch(query, statusFilter, includeDeleted, 1)
  }

  function handlePageChange(p: number) {
    doSearch(query, statusFilter, includeDeleted, p)
  }

  async function openLogs(item: StaffSearchItem) {
    setSelectedItem(item)
    setLogs([])
    setLogsLoading(true)
    try {
      const res = await adminApi.getListingLogs(item.id)
      setLogs(res.data.data.items)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
    setLogsLoading(false)
  }

  const totalPages = pages

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[20px] font-bold m-0 mb-1" style={{ color: 'var(--text)' }}>
          {t('activity.title', lang)}
        </h1>
        <p className="text-[13px] m-0" style={{ color: 'var(--text-muted)' }}>
          {t('activity.desc', lang)}
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-[10px] flex-wrap items-end">
          {/* Main search input */}
          <div className="relative flex-1 min-w-[240px]">
            <span className="absolute left-[10px] top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
              <IconSearch />
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('activity.searchPlaceholder', lang)}
              style={{ ...inputStyle, width: '100%', paddingLeft: '32px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ ...inputStyle, minWidth: '130px' }}
          >
            {['all', 'active', 'pending', 'rejected'].map((s) => (
              <option key={s} value={s}>{t(`activity.status_${s}` as Parameters<typeof t>[0], lang)}</option>
            ))}
          </select>

          {/* Include deleted toggle */}
          <label className="flex items-center gap-[6px] cursor-pointer select-none" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => setIncludeDeleted(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: '15px', height: '15px' }}
            />
            {t('activity.includeDeleted', lang)}
          </label>

          <button
            type="submit"
            disabled={searching}
            style={{
              height: '36px',
              padding: '0 20px',
              background: 'var(--accent)',
              color: 'var(--color-white)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: searching ? 'not-allowed' : 'pointer',
              opacity: searching ? 0.7 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {searching ? '...' : t('activity.searchBtn', lang)}
          </button>
        </div>
      </form>

      {/* Results */}
      {hasSearched && (
        <div className="rounded-[14px] border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          {/* Count row */}
          <div className="px-4 py-3 border-b text-[12px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            {searching ? t('common.loading', lang) : `${t('activity.found', lang)}: ${total}`}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {[
                    t('activity.col_listing', lang),
                    t('activity.col_owner', lang),
                    t('activity.col_status', lang),
                    t('activity.col_created', lang),
                    t('activity.col_lastAction', lang),
                    '',
                  ].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {searching ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10" style={{ ...tdStyle, color: 'var(--text-muted)' }}>
                      <div
                        className="inline-block w-5 h-5 rounded-full border-2"
                        style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }}
                      />
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10" style={{ ...tdStyle, color: 'var(--text-muted)' }}>
                      {t('activity.noResults', lang)}
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => openLogs(item)}
                      className="hover:bg-[var(--surface)]"
                    >
                      {/* Listing thumbnail + title */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {item.primary_image_url ? (
                            <img
                              src={item.primary_image_url}
                              alt=""
                              style={{ width: '44px', height: '34px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                            />
                          ) : (
                            <div style={{ width: '44px', height: '34px', borderRadius: '6px', background: 'var(--surface)', flexShrink: 0 }} />
                          )}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>
                              {item.brand} {item.model} {item.year}
                            </div>
                            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '1px' }}>
                              {item.id.slice(0, 8)}…
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td style={tdStyle}>
                        {item.user ? (
                          <div>
                            <div style={{ fontSize: '13px', color: 'var(--text)' }}>{item.user.name ?? '—'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.user.phone}</div>
                          </div>
                        ) : '—'}
                      </td>

                      {/* Status */}
                      <td style={tdStyle}>
                        <StatusBadge status={item.status} />
                      </td>

                      {/* Created */}
                      <td className="whitespace-nowrap" style={tdStyle}>
                        {formatDate(item.created_at)}
                      </td>

                      {/* Last action */}
                      <td style={tdStyle}>
                        {item.last_log ? (
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: actionColor(item.last_log.action) }}>
                              {actionLabel(item.last_log.action, lang)}
                            </div>
                            {item.last_log.actor_name && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {item.last_log.actor_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* View logs button */}
                      <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); openLogs(item) }}
                          style={{
                            padding: '4px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: 'var(--accent-dim)',
                            color: 'var(--accent)',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          {t('activity.viewLog', lang)}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex gap-2 px-4 py-3 justify-center items-center border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
                className="px-[14px] py-[6px] rounded-lg border"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}
              >
                &#8249;
              </button>
              <span className="px-[14px] py-[6px] text-[13px]" style={{ color: 'var(--text-muted)' }}>
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="px-[14px] py-[6px] rounded-lg border"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.4 : 1 }}
              >
                &#8250;
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty state before first search */}
      {!hasSearched && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '60px 32px', gap: '12px', color: 'var(--text-muted)',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.3 }}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p className="text-[13px] text-center m-0" style={{ maxWidth: '320px' }}>
            {t('activity.emptyHint', lang)}
          </p>
        </div>
      )}

      {/* Log modal */}
      {selectedItem && (
        <ModalBackdrop onClose={() => setSelectedItem(null)}>
          <ModalCard maxWidth="560px">
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)' }}>
                  {selectedItem.brand} {selectedItem.model} {selectedItem.year}
                </div>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {selectedItem.id}
                </div>
                {selectedItem.user && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {t('activity.owner', lang)}: <strong>{selectedItem.user.name ?? selectedItem.user.phone}</strong>
                    <span style={{ marginLeft: '6px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {selectedItem.user.phone}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                aria-label="Close"
              >
                <IconX />
              </button>
            </div>

            {/* Status + created row */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                  {t('activity.col_status', lang)}
                </div>
                <StatusBadge status={selectedItem.status} />
              </div>
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                  {t('activity.col_created', lang)}
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text)' }}>{formatDate(selectedItem.created_at)}</span>
              </div>
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                  {t('activity.views', lang)}
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text)' }}>{selectedItem.views}</span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--border)', marginBottom: '20px' }} />

            {/* Timeline */}
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '14px' }}>
              {t('activity.timeline', lang)}
            </div>

            <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {logsLoading ? (
                <p className="text-center text-[13px] py-6" style={{ color: 'var(--text-muted)' }}>
                  {t('common.loading', lang)}
                </p>
              ) : (
                <LogTimeline entries={logs} lang={lang} />
              )}
            </div>
          </ModalCard>
        </ModalBackdrop>
      )}
    </div>
  )
}
