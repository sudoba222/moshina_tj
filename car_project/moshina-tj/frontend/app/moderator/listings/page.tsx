'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { adminApi } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { UserRole, Listing, ListingStatus } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────
const ALLOWED_ROLES: UserRole[] = ['moderator', 'admin']

const STATUS_COLOR: Record<ListingStatus, string> = {
  pending:  'var(--color-warning)',
  active:   'var(--color-success)',
  rejected: 'var(--color-error)',
  draft:    'var(--text-muted)',
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ModeratorListingsPage() {
  const router  = useRouter()
  const { user } = useAuth()
  const { lang } = useLang()

  const [listings, setListings]   = useState<Listing[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [pages, setPages]         = useState(1)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState<ListingStatus | 'all'>('all')

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<Listing | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectLoading, setRejectLoading] = useState(false)

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auth guard
  useEffect(() => {
    if (user && !ALLOWED_ROLES.includes(user.role)) router.replace('/')
    if (!user) router.replace('/auth/login')
  }, [user, router])

  const fetchListings = useCallback(async (p: number, q: string, status: ListingStatus | 'all') => {
    setLoading(true)
    try {
      const statusParam = status === 'all' ? undefined : status
      const res = await adminApi.getListings(statusParam, p, q || undefined)
      const d = res.data.data as { items: Listing[]; total: number; page: number; pages: number }
      setListings(d.items ?? [])
      setTotal(d.total ?? 0)
      setPage(d.page ?? 1)
      setPages(d.pages ?? 1)
    } catch {
      setListings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchListings(1, '', 'all')
  }, [fetchListings])

  function handleSearch(val: string) {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      fetchListings(1, val, filterStatus)
    }, 400)
  }

  function handleStatusFilter(val: ListingStatus | 'all') {
    setFilterStatus(val)
    setPage(1)
    fetchListings(1, search, val)
  }

  function goPage(p: number) {
    setPage(p)
    fetchListings(p, search, filterStatus)
  }

  async function doApprove(listingId: string) {
    try {
      await adminApi.approveListing(listingId)
      fetchListings(page, search, filterStatus)
    } catch { /* noop */ }
  }

  async function doReject() {
    if (!rejectTarget || !rejectReason) return
    setRejectLoading(true)
    try {
      await adminApi.rejectListing(rejectTarget.id, rejectReason)
      setRejectTarget(null)
      setRejectReason('')
      fetchListings(page, search, filterStatus)
    } catch {
      // keep modal open on error
    } finally {
      setRejectLoading(false)
    }
  }

  async function doDeactivate(listingId: string) {
    try {
      await adminApi.deactivateListing(listingId)
      fetchListings(page, search, filterStatus)
    } catch { /* noop */ }
  }

  async function doActivate(listingId: string) {
    try {
      await adminApi.activateListing(listingId)
      fetchListings(page, search, filterStatus)
    } catch { /* noop */ }
  }

  async function doDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await adminApi.deleteListing(deleteTarget.id)
      setDeleteTarget(null)
      fetchListings(page, search, filterStatus)
    } catch {
      // keep modal open on error
    } finally {
      setDeleteLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1.5px solid var(--border)',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '14px',
    color: 'var(--text)',
    outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 16px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <Link href="/moderator" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', textDecoration: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>
              {lang === 'ru' ? 'Объявления' : 'Эълонҳо'}
            </h1>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {total} {lang === 'ru' ? 'объявлений' : 'эълон'}
            </div>
          </div>
        </div>

        {/* Quick nav */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {[
            { href: '/moderator',          label: lang === 'ru' ? 'Очередь'      : 'Навбат' },
            { href: '/moderator/users',    label: lang === 'ru' ? 'Пользователи' : 'Корбарон' },
            { href: '/moderator/listings', label: lang === 'ru' ? 'Объявления'   : 'Эълонҳо', active: true },
            { href: '/moderator/activity', label: lang === 'ru' ? 'Активность'   : 'Фаъолият' },
          ].map(({ href, label, active }) => (
            <Link key={href} href={href} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', background: active ? 'var(--accent)' : 'var(--card)', color: active ? 'var(--color-white)' : 'var(--text-secondary)', border: active ? '1px solid var(--accent)' : '1px solid var(--border)' }}>
              {label}
            </Link>
          ))}
        </div>

        {/* Search + filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={lang === 'ru' ? 'Название, VIN, пользователь, ID...' : 'Ном, VIN, корбар, ID...'}
            style={{ ...inp, flex: 1, minWidth: '220px' }}
          />
          {([
            { label: lang === 'ru' ? 'Все' : 'Ҳама',           val: 'all' },
            { label: t('common.inModeration', lang), val: 'pending' },
            { label: t('admin.active', lang),        val: 'active' },
            { label: lang === 'ru' ? 'Отклонены' : 'Рад шуд', val: 'rejected' },
          ] as { label: string; val: ListingStatus | 'all' }[]).map(({ label, val }) => (
            <button
              key={label}
              onClick={() => handleStatusFilter(val)}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1.5px solid',
                borderColor: filterStatus === val ? 'var(--accent)' : 'var(--border)',
                background: filterStatus === val ? 'var(--accent)' : 'var(--card)',
                color: filterStatus === val ? 'var(--color-white)' : 'var(--text)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              {t('common.loading', lang)}
            </div>
          ) : listings.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              {lang === 'ru' ? 'Объявления не найдены' : 'Эълонҳо ёфт нашуд'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['ID', 'VIN', lang === 'ru' ? 'Объявление' : 'Эълон', lang === 'ru' ? 'Пользователь' : 'Корбар', lang === 'ru' ? 'Цена' : 'Нарх', lang === 'ru' ? 'Город' : 'Шаҳр', lang === 'ru' ? 'Статус' : 'Ҳолат', lang === 'ru' ? 'Дата' : 'Сана', lang === 'ru' ? 'Действия' : 'Амалиёт'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing) => (
                    <tr key={listing.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    >
                      {/* ID */}
                      <td style={{ padding: '14px 16px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {listing.id.slice(0, 8)}
                      </td>

                      {/* VIN */}
                      <td style={{ padding: '14px 16px', fontSize: '12px', fontFamily: 'monospace' }}>
                        {listing.vin ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: 'var(--text)' }}>{listing.vin.slice(-4)}</span>
                            {listing.vin_verified && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Title (Brand Model Year) */}
                      <td style={{ padding: '14px 16px', maxWidth: '280px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {listing.brand} {listing.model} {listing.year}
                        </div>
                        {listing.description && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {listing.description}
                          </div>
                        )}
                      </td>

                      {/* User */}
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                        {listing.user_name ?? (lang === 'ru' ? 'Без имени' : 'Бе ном')}
                      </td>

                      {/* Price */}
                      <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                        ${listing.price.toLocaleString()}
                      </td>

                      {/* City */}
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                        {listing.city}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '100px', background: `${STATUS_COLOR[listing.status]}22`, color: STATUS_COLOR[listing.status], textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {listing.status === 'pending' && t('common.inModeration', lang)}
                          {listing.status === 'active' && t('admin.active', lang)}
                          {listing.status === 'rejected' && t('dashboard.rejected_badge', lang)}
                          {listing.status === 'draft' && t('staff.statusDraft', lang)}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(listing.created_at).toLocaleDateString('ru-RU')}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <Link
                            href={`/car/${listing.id}`}
                            target="_blank"
                            style={{
                              padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                              background: 'var(--surface)', border: '1px solid var(--border)',
                              color: 'var(--text)', textDecoration: 'none', whiteSpace: 'nowrap',
                            }}
                          >
                            {lang === 'ru' ? 'Открыть' : 'Кушодан'}
                          </Link>
                          {listing.status === 'pending' && (
                            <button
                              onClick={() => doApprove(listing.id)}
                              style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: 'var(--color-success-dim)', border: '1px solid var(--color-success)', color: 'var(--color-success)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              {lang === 'ru' ? 'Одобрить' : 'Тасдиқ'}
                            </button>
                          )}
                          {listing.status === 'active' && (
                            <button
                              onClick={() => doDeactivate(listing.id)}
                              style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              {lang === 'ru' ? 'Снять' : 'Бозпас гиред'}
                            </button>
                          )}
                          {listing.status === 'rejected' && (
                            <button
                              onClick={() => doActivate(listing.id)}
                              style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: 'var(--color-success-dim)', border: '1px solid var(--color-success)', color: 'var(--color-success)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              {lang === 'ru' ? 'Восстановить' : 'Барқарор'}
                            </button>
                          )}
                          {listing.status !== 'rejected' && (
                            <button
                              onClick={() => { setRejectTarget(listing); setRejectReason('') }}
                              style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: 'var(--color-error-dim)', border: '1px solid var(--color-error)', color: 'var(--color-error)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              {lang === 'ru' ? 'Отклонить' : 'Рад кунед'}
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteTarget(listing)}
                            style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            {lang === 'ru' ? 'Удалить' : 'Нест кунед'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '20px' }}>
            {Array.from({ length: Math.min(pages, 10) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => goPage(p)}
                style={{
                  width: '36px', height: '36px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', border: '1.5px solid',
                  borderColor: p === page ? 'var(--accent)' : 'var(--border)',
                  background: p === page ? 'var(--accent)' : 'var(--card)',
                  color: p === page ? 'var(--color-white)' : 'var(--text)',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectTarget && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setRejectTarget(null) }}
        >
          <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '28px', maxWidth: '420px', width: '100%', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
              {lang === 'ru' ? 'Отклонить объявление' : 'Эълонро рад кунед'}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {rejectTarget.brand} {rejectTarget.model} {rejectTarget.year}
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={lang === 'ru' ? 'Причина отклонения (обязательно)' : 'Сабаби рад (ҳатмӣ)'}
              style={{ ...inp, width: '100%', resize: 'vertical', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setRejectTarget(null)}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                {t('common.cancel', lang)}
              </button>
              <button
                onClick={doReject}
                disabled={rejectLoading || !rejectReason}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: (rejectLoading || !rejectReason) ? 'not-allowed' : 'pointer', border: 'none', background: 'var(--color-error)', color: 'var(--color-white)', opacity: (rejectLoading || !rejectReason) ? 0.7 : 1 }}
              >
                {rejectLoading ? '...' : (lang === 'ru' ? 'Отклонить' : 'Рад кунед')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null) }}
        >
          <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '28px', maxWidth: '420px', width: '100%', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
              {lang === 'ru' ? 'Удалить объявление' : 'Эълонро нест кунед'}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              {lang === 'ru' ? 'Вы уверены, что хотите удалить ' : 'Шумо мутмаин ҳастед, ки мехоҳед нест кунед '}
              {deleteTarget.brand} {deleteTarget.model} {deleteTarget.year}?
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                {t('common.cancel', lang)}
              </button>
              <button
                onClick={doDelete}
                disabled={deleteLoading}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: deleteLoading ? 'not-allowed' : 'pointer', border: 'none', background: 'var(--color-error)', color: 'var(--color-white)', opacity: deleteLoading ? 0.7 : 1 }}
              >
                {deleteLoading ? '...' : (lang === 'ru' ? 'Удалить' : 'Нест кунед')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
