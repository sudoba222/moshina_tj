'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { adminApi } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { UserRole } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────
interface UserRow {
  id: string
  user_number: number | null
  name: string | null
  phone: string | null
  email: string | null
  role: UserRole
  is_banned: boolean
  ban_reason: string | null
  created_at: string
  email_verified: boolean
  phone_verified: boolean
}

const ALLOWED_ROLES: UserRole[] = ['moderator', 'admin']

const ROLE_COLOR: Record<string, string> = {
  user:      'var(--text-muted)',
  dealer:    '#6366f1',
  moderator: 'var(--color-warning)',
  admin:     'var(--accent)',
  manager:   '#8b5cf6',
  support:   '#06b6d4',
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ModeratorUsersPage() {
  const router  = useRouter()
  const { user } = useAuth()
  const { lang } = useLang()

  const [users, setUsers]         = useState<UserRow[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [pages, setPages]         = useState(1)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterBanned, setFilterBanned] = useState<boolean | undefined>(undefined)

  // Ban modal
  const [banTarget, setBanTarget]     = useState<UserRow | null>(null)
  const [banReason, setBanReason]     = useState('')
  const [banLoading, setBanLoading]   = useState(false)

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auth guard
  useEffect(() => {
    if (user && !ALLOWED_ROLES.includes(user.role)) router.replace('/')
    if (!user) router.replace('/auth/login')
  }, [user, router])

  const fetchUsers = useCallback(async (p: number, q: string, banned: boolean | undefined) => {
    setLoading(true)
    try {
      const res = await adminApi.getUsers(p, undefined, q || undefined, banned)
      const d = res.data.data as unknown as { items: UserRow[]; total: number; page: number; pages: number }
      setUsers(d.items ?? [])
      setTotal(d.total ?? 0)
      setPage(d.page ?? 1)
      setPages(d.pages ?? 1)
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers(1, '', undefined)
  }, [fetchUsers])

  function handleSearch(val: string) {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      fetchUsers(1, val, filterBanned)
    }, 400)
  }

  function handleBannedFilter(val: boolean | undefined) {
    setFilterBanned(val)
    setPage(1)
    fetchUsers(1, search, val)
  }

  function goPage(p: number) {
    setPage(p)
    fetchUsers(p, search, filterBanned)
  }

  async function doBan() {
    if (!banTarget) return
    setBanLoading(true)
    try {
      await adminApi.banUser(banTarget.id, banReason || undefined)
      setBanTarget(null)
      setBanReason('')
      fetchUsers(page, search, filterBanned)
    } catch {
      // keep modal open on error
    } finally {
      setBanLoading(false)
    }
  }

  async function doUnban(userId: string) {
    try {
      await adminApi.unbanUser(userId)
      fetchUsers(page, search, filterBanned)
    } catch { /* noop */ }
  }

  const inp: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1.5px solid var(--border)',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '14px',
    color: 'var(--text)',
    outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 16px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <Link href="/moderator" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', textDecoration: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>
              {lang === 'ru' ? 'Пользователи' : 'Корбарон'}
            </h1>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {total} {lang === 'ru' ? 'пользователей' : 'нафар'}
            </div>
          </div>
        </div>

        {/* Quick nav */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {[
            { href: '/moderator',          label: lang === 'ru' ? 'Очередь'      : 'Навбат' },
            { href: '/moderator/users',    label: lang === 'ru' ? 'Пользователи' : 'Корбарон', active: true },
            { href: '/moderator/listings', label: lang === 'ru' ? 'Объявления'   : 'Эълонҳо' },
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
            placeholder={lang === 'ru' ? 'Имя, телефон, email, #ID...' : 'Ном, телефон, email, #ID...'}
            style={{ ...inp, flex: 1, minWidth: '200px' }}
          />
          {([
            { label: lang === 'ru' ? 'Все' : 'Ҳама',       val: undefined },
            { label: lang === 'ru' ? 'Активные' : 'Фаъол', val: false },
            { label: lang === 'ru' ? 'Забанены' : 'Бан',   val: true },
          ] as { label: string; val: boolean | undefined }[]).map(({ label, val }) => (
            <button
              key={label}
              onClick={() => handleBannedFilter(val)}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1.5px solid',
                borderColor: filterBanned === val ? 'var(--accent)' : 'var(--border)',
                background: filterBanned === val ? 'var(--accent)' : 'var(--card)',
                color: filterBanned === val ? 'var(--color-white)' : 'var(--text)',
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
          ) : users.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              {lang === 'ru' ? 'Пользователи не найдены' : 'Корбарон ёфт нашуд'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['#', lang === 'ru' ? 'Пользователь' : 'Корбар', lang === 'ru' ? 'Контакт' : 'Тамос', lang === 'ru' ? 'Роль' : 'Нақш', lang === 'ru' ? 'Дата' : 'Сана', lang === 'ru' ? 'Статус' : 'Ҳолат', lang === 'ru' ? 'Действия' : 'Амалиёт'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    >
                      {/* # */}
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {u.user_number != null ? `#${u.user_number}` : '—'}
                      </td>

                      {/* Name + UUID */}
                      <td style={{ padding: '14px 16px', maxWidth: '200px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.name ?? (lang === 'ru' ? 'Без имени' : 'Бе ном')}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>
                          {u.id.slice(0, 8)}…
                        </div>
                      </td>

                      {/* Contact */}
                      <td style={{ padding: '14px 16px', maxWidth: '220px' }}>
                        {u.phone && (
                          <div style={{ fontSize: '13px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 0111.28 19 19.5 19.5 0 015 12.72 19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                            {u.phone}
                            {u.phone_verified && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                          </div>
                        )}
                        {u.email && (
                          <div style={{ fontSize: '13px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: u.phone ? '2px' : 0 }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
                            {u.email_verified && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                          </div>
                        )}
                      </td>

                      {/* Role */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '100px', background: `${ROLE_COLOR[u.role]}22`, color: ROLE_COLOR[u.role], textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {u.role}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(u.created_at).toLocaleDateString('ru-RU')}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        {u.is_banned ? (
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '100px', background: 'var(--color-error-dim)', color: 'var(--color-error)' }}>
                            {lang === 'ru' ? 'Забанен' : 'Бан'}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '100px', background: 'var(--color-success-dim)', color: 'var(--color-success)' }}>
                            {t('admin.active', lang)}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <Link
                            href={`/admin/users/${u.id}`}
                            style={{
                              padding: '5px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                              background: 'var(--surface)', border: '1px solid var(--border)',
                              color: 'var(--text)', textDecoration: 'none', whiteSpace: 'nowrap',
                            }}
                          >
                            {lang === 'ru' ? 'Профиль' : 'Профил'}
                          </Link>
                          {u.is_banned ? (
                            <button
                              onClick={() => doUnban(u.id)}
                              style={{ padding: '5px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'var(--color-success-dim)', border: '1px solid var(--color-success)', color: 'var(--color-success)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              {lang === 'ru' ? 'Разбанить' : 'Фаъол кунед'}
                            </button>
                          ) : (
                            u.role === 'user' || u.role === 'dealer' ? (
                              <button
                                onClick={() => { setBanTarget(u); setBanReason('') }}
                                style={{ padding: '5px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'var(--color-error-dim)', border: '1px solid var(--color-error)', color: 'var(--color-error)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >
                                {lang === 'ru' ? 'Забанить' : 'Бан'}
                              </button>
                            ) : null
                          )}
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

      {/* Ban modal */}
      {banTarget && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setBanTarget(null) }}
        >
          <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '28px', maxWidth: '420px', width: '100%', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
              {lang === 'ru' ? 'Заблокировать пользователя' : 'Корбарро бан кунед'}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {banTarget.name ?? banTarget.phone ?? banTarget.email ?? banTarget.id.slice(0, 8)}
            </p>
            <textarea
              rows={3}
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder={lang === 'ru' ? 'Причина блокировки (необязательно)' : 'Сабаби бан (ихтиёрӣ)'}
              style={{ ...inp, width: '100%', resize: 'vertical', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setBanTarget(null)}
                style={{ flex: 1, padding: '11px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                {t('common.cancel', lang)}
              </button>
              <button
                onClick={doBan}
                disabled={banLoading}
                style={{ flex: 1, padding: '11px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: banLoading ? 'not-allowed' : 'pointer', border: 'none', background: 'var(--color-error)', color: 'var(--color-white)', opacity: banLoading ? 0.7 : 1 }}
              >
                {banLoading ? '...' : (lang === 'ru' ? 'Забанить' : 'Бан кунед')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
