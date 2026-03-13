'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { listingsApi, authApi, usersApi } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import Cookies from 'js-cookie'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { Listing } from '@/types'

type Tab = 'profile' | 'listings' | 'settings'

export default function DashboardPage() {
  const router = useRouter()
  const { lang } = useLang()
  const { user, login } = useAuth()

  const [tab, setTab] = useState<Tab>('profile')
  const [listings, setListings] = useState<Listing[]>([])
  const [listingsLoading, setListingsLoading] = useState(false)
  const [listingsFilter, setListingsFilter] = useState<'active' | 'inactive'>('active')

  // Profile edit state
  const [editMode, setEditMode] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState(false)

  // Password change
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)

  useEffect(() => {
    if (!user) { router.replace('/auth/login'); return }
    setName(user.name ?? '')
    setPhone(user.phone ?? '')
  }, [user, router])

  useEffect(() => {
    if (tab !== 'listings' || !user) return
    setListingsLoading(true)
    usersApi.getListings(user.id, 1)
      .then((res) => setListings(res.data.data.items))
      .catch(() => setListings([]))
      .finally(() => setListingsLoading(false))
  }, [tab, user])

  async function saveProfile() {
    setProfileError(''); setProfileSuccess(false)
    if (!name.trim()) { setProfileError(lang === 'ru' ? 'Введите имя' : 'Ном ворид кунед'); return }
    setProfileSaving(true)
    try {
      const res = await authApi.updateProfile({ name: name.trim() })
      const token = Cookies.get('token') ?? ''
      login(token, res.data.data)
      setProfileSuccess(true)
      setEditMode(false)
    } catch {
      setProfileError(lang === 'ru' ? 'Ошибка при сохранении' : 'Хато ҳангоми нигоҳ доштан')
    } finally {
      setProfileSaving(false)
    }
  }

  async function changePassword() {
    setPwdError(''); setPwdSuccess(false)
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError(lang === 'ru' ? 'Заполните все поля' : 'Ҳама майдонҳоро пур кунед')
      return
    }
    if (newPwd !== confirmPwd) {
      setPwdError(lang === 'ru' ? 'Пароли не совпадают' : 'Рамзҳо мувофиқат намекунанд')
      return
    }
    if (newPwd.length < 6) {
      setPwdError(lang === 'ru' ? 'Минимум 6 символов' : 'Ҳадди ақал 6 аломат')
      return
    }
    setPwdLoading(true)
    try {
      await authApi.changePassword(currentPwd, newPwd)
      setPwdSuccess(true)
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (err) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setPwdError(msg ?? (lang === 'ru' ? 'Ошибка' : 'Хато'))
    } finally {
      setPwdLoading(false)
    }
  }

  async function toggleListingStatus(id: string, currentlyActive: boolean) {
    try {
      if (currentlyActive) {
        await listingsApi.deactivate(id)
      } else {
        await listingsApi.activate(id)
      }
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, is_active: !currentlyActive } : l))
    } catch {
      // swallow
    }
  }

  if (!user) return null

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '11px 14px',
    fontSize: '15px',
    color: 'var(--text)',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: '6px',
    display: 'block',
  }

  const filteredListings = listings.filter((l) =>
    listingsFilter === 'active' ? l.is_active : !l.is_active
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        <div className="max-w-5xl mx-auto px-4 md:px-6" style={{ paddingTop: '32px', paddingBottom: '60px' }}>

          <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, color: 'var(--text)', marginBottom: '28px' }}>
            {t('dashboard.title', lang)}
          </h1>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '28px', overflowX: 'auto' }}>
            {(['profile', 'listings', 'settings'] as Tab[]).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setTab(tabKey)}
                style={{
                  padding: '10px 20px',
                  fontWeight: 700,
                  fontSize: '14px',
                  background: 'none',
                  border: 'none',
                  borderBottom: tab === tabKey ? '2px solid var(--accent)' : '2px solid transparent',
                  color: tab === tabKey ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                {t(`dashboard.${tabKey}` as Parameters<typeof t>[0], lang)}
              </button>
            ))}
          </div>

          {/* ── Profile tab ── */}
          {tab === 'profile' && (
            <div className="animate-fade-in">
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: 'clamp(20px, 4vw, 36px)', maxWidth: '560px' }}>
                {/* Avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '16px',
                    background: 'var(--accent)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '28px', fontWeight: 800, flexShrink: 0,
                  }}>
                    {(user.name ?? user.phone).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
                      {user.name ?? user.phone}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'capitalize' }}>
                      {user.role}
                    </div>
                  </div>
                </div>

                {editMode ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label htmlFor="dash-name" style={labelStyle}>{t('admin.name', lang)}</label>
                      <input id="dash-name" type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
                    </div>
                    {profileError && <p style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 600 }}>{profileError}</p>}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={saveProfile}
                        disabled={profileSaving}
                        style={{ flex: 1, background: profileSaving ? 'var(--text-muted)' : 'var(--accent)', color: '#fff', fontWeight: 700, padding: '11px', borderRadius: '10px', border: 'none', cursor: profileSaving ? 'not-allowed' : 'pointer' }}
                      >
                        {profileSaving ? t('common.loading', lang) : t('dashboard.save', lang)}
                      </button>
                      <button
                        onClick={() => { setEditMode(false); setProfileError('') }}
                        style={{ padding: '11px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: '10px', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        {t('dashboard.cancel', lang)}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <InfoRow label={t('auth.phone', lang)} value={user.phone} />
                    <InfoRow label={t('admin.name', lang)} value={user.name ?? '—'} />
                    {user.email && <InfoRow label="Email" value={user.email} />}
                    {profileSuccess && <p style={{ color: '#16a34a', fontSize: '13px', fontWeight: 600 }}>{lang === 'ru' ? 'Сохранено' : 'Нигоҳ дошта шуд'}</p>}
                    <button
                      onClick={() => { setEditMode(true); setProfileSuccess(false) }}
                      style={{ marginTop: '4px', background: 'var(--accent)', color: '#fff', fontWeight: 700, padding: '11px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}
                    >
                      {t('dashboard.editProfile', lang)}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── My listings tab ── */}
          {tab === 'listings' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                {/* Active/Inactive toggle */}
                <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  {(['active', 'inactive'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setListingsFilter(f)}
                      style={{
                        padding: '7px 16px', fontSize: '13px', fontWeight: 700,
                        background: listingsFilter === f ? 'var(--accent)' : 'var(--surface)',
                        color: listingsFilter === f ? '#fff' : 'var(--text-muted)',
                        border: 'none', cursor: 'pointer',
                      }}
                    >
                      {t(`dashboard.${f}` as Parameters<typeof t>[0], lang)}
                    </button>
                  ))}
                </div>
                <Link
                  href="/post"
                  style={{ height: '36px', padding: '0 16px', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: '13px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="5.5" y1="1" x2="5.5" y2="10" />
                    <line x1="1" y1="5.5" x2="10" y2="5.5" />
                  </svg>
                  {lang === 'ru' ? 'Новое объявление' : 'Эълони нав'}
                </Link>
              </div>

              {listingsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} style={{ height: '120px', borderRadius: '12px' }} className="skeleton" />
                  ))}
                </div>
              ) : filteredListings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }}>
                    <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h10l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2h-2" />
                    <circle cx="7.5" cy="17" r="2.5" /><circle cx="16.5" cy="17" r="2.5" />
                  </svg>
                  <p style={{ marginBottom: '16px' }}>{t('dashboard.noListings', lang)}</p>
                  <Link href="/post" style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '14px' }}>
                    {t('dashboard.addFirst', lang)}
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredListings.map((listing) => (
                    <DashboardListingRow
                      key={listing.id}
                      listing={listing}
                      lang={lang}
                      onToggle={() => toggleListingStatus(listing.id, listing.is_active)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Settings tab ── */}
          {tab === 'settings' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '560px' }}>
                {/* Change password */}
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: 'clamp(20px, 4vw, 28px)' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '20px' }}>
                    {t('dashboard.changePassword', lang)}
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label htmlFor="cur-pwd" style={labelStyle}>{t('dashboard.currentPassword', lang)}</label>
                      <input id="cur-pwd" type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label htmlFor="new-pwd" style={labelStyle}>{t('dashboard.newPassword', lang)}</label>
                      <input id="new-pwd" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label htmlFor="conf-pwd" style={labelStyle}>{t('dashboard.confirmPassword', lang)}</label>
                      <input id="conf-pwd" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} style={inputStyle} />
                    </div>
                    {pwdError && <p style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 600 }}>{pwdError}</p>}
                    {pwdSuccess && <p style={{ color: '#16a34a', fontSize: '13px', fontWeight: 600 }}>{lang === 'ru' ? 'Пароль изменён' : 'Рамз иваз шуд'}</p>}
                    <button
                      onClick={changePassword}
                      disabled={pwdLoading}
                      style={{ background: pwdLoading ? 'var(--text-muted)' : 'var(--accent)', color: '#fff', fontWeight: 700, padding: '11px', borderRadius: '10px', border: 'none', cursor: pwdLoading ? 'not-allowed' : 'pointer' }}
                    >
                      {pwdLoading ? t('common.loading', lang) : t('dashboard.save', lang)}
                    </button>
                  </div>
                </div>

                {/* Language */}
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: 'clamp(20px, 4vw, 28px)' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>
                    {t('dashboard.language', lang)}
                  </h2>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    {lang === 'ru' ? 'Используйте переключатель языка в шапке сайта.' : 'Аз ивазкунаки забон дар сарлавҳа истифода баред.'}
                  </p>
                </div>

                {/* Notifications placeholder */}
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: 'clamp(20px, 4vw, 28px)' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>
                    {t('dashboard.notifications', lang)}
                  </h2>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    {lang === 'ru' ? 'Настройки уведомлений будут доступны в следующей версии.' : 'Танзимоти огоҳиҳо дар нашри оянда дастрас мешавад.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>{value}</span>
    </div>
  )
}

function DashboardListingRow({
  listing,
  lang,
  onToggle,
}: {
  listing: Listing
  lang: 'ru' | 'tj'
  onToggle: () => void
}) {
  const primaryImage = listing.images.find((img) => img.is_primary) ?? listing.images[0]
  const formatPrice = (p: number, c: string) => c === 'USD' ? `$${p.toLocaleString('en-US')}` : `${p.toLocaleString()} сом.`

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '14px',
      display: 'flex',
      gap: '14px',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Inactive overlay */}
      {!listing.is_active && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.04)', pointerEvents: 'none' }} />
      )}

      {/* Thumbnail */}
      <div style={{ width: '80px', height: '60px', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg)', flexShrink: 0, position: 'relative' }}>
        {primaryImage ? (
          <Image src={primaryImage.url} alt={`${listing.brand} ${listing.model}`} fill sizes="80px" style={{ objectFit: 'cover', opacity: listing.is_active ? 1 : 0.5 }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="1.2">
              <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h10l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2h-2" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
          <Link href={`/car/${listing.id}`} style={{ fontSize: '14px', fontWeight: 700, color: listing.is_active ? 'var(--text)' : 'var(--text-muted)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {listing.brand} {listing.model} {listing.year}
          </Link>
          {listing.status === 'pending' && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#b45309', background: 'rgba(234,179,8,0.15)', padding: '1px 7px', borderRadius: '4px', flexShrink: 0, whiteSpace: 'nowrap' }}>
              В модерации
            </span>
          )}
          {listing.status === 'active' && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', background: 'rgba(22,163,74,0.12)', padding: '1px 7px', borderRadius: '4px', flexShrink: 0, whiteSpace: 'nowrap' }}>
              Активно
            </span>
          )}
          {listing.status === 'rejected' && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', background: 'rgba(200,56,8,0.1)', padding: '1px 7px', borderRadius: '4px', flexShrink: 0, whiteSpace: 'nowrap' }}>
              Отклонено
            </span>
          )}
          {!listing.is_active && listing.status !== 'pending' && listing.status !== 'rejected' && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--tag-bg)', padding: '1px 6px', borderRadius: '4px', flexShrink: 0 }}>
              {t('dashboard.inactive_badge', lang)}
            </span>
          )}
        </div>
        {listing.status === 'rejected' && listing.rejection_reason && (
          <p style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '2px', marginBottom: '2px', fontStyle: 'italic' }}>
            {listing.rejection_reason}
          </p>
        )}
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatPrice(listing.price, listing.currency)}</span>
          <span>{listing.city}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            {listing.views}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <Link
          href={`/post?edit=${listing.id}`}
          style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textDecoration: 'none' }}
        >
          {t('dashboard.edit', lang)}
        </Link>
        <button
          onClick={onToggle}
          style={{
            padding: '6px 12px',
            background: listing.is_active ? 'rgba(200,56,8,0.08)' : 'rgba(22,163,74,0.08)',
            border: listing.is_active ? '1px solid rgba(200,56,8,0.3)' : '1px solid rgba(22,163,74,0.3)',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 700,
            color: listing.is_active ? 'var(--accent)' : '#16a34a',
            cursor: 'pointer',
          }}
        >
          {listing.is_active ? t('dashboard.deactivate', lang) : t('dashboard.activate', lang)}
        </button>
      </div>
    </div>
  )
}
