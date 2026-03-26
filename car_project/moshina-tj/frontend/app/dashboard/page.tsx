'use client'
import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { listingsApi, authApi, usersApi, favoritesApi, chatApi } from '@/lib/api'
import type { ConversationItem, ChatMessage } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { useSocket } from '@/lib/SocketContext'
import { t } from '@/lib/i18n'
import CarCard from '@/components/CarCard'
import type { Listing } from '@/types'

type Tab = 'profile' | 'listings' | 'favorites' | 'settings' | 'messages'

// ─── SearchParams reader (must be inside Suspense) ────────────────────────────
function SearchParamsReader({ onParams }: { onParams: (tab: Tab | null, conv: string | null) => void }) {
  const params = useSearchParams()
  const tabParam = params.get('tab') as Tab | null
  const convParam = params.get('conv')
  useEffect(() => {
    onParams(tabParam, convParam)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam, convParam])
  return null
}

export default function DashboardPage() {
  const router = useRouter()
  const { lang } = useLang()
  const { user, loading: authLoading, updateUser } = useAuth()

  const [tab, setTab] = useState<Tab>('profile')
  const [listings, setListings] = useState<Listing[]>([])
  const [listingsLoading, setListingsLoading] = useState(false)
  const [listingsFilter, setListingsFilter] = useState<'active' | 'inactive'>('active')
  const [listingsPage, setListingsPage] = useState(1)
  const [listingsTotalPages, setListingsTotalPages] = useState(1)

  const [favorites, setFavorites] = useState<Listing[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)

  // Profile edit state
  const [editMode, setEditMode] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [whatsappNumber, setWhatsappNumber] = useState(user?.whatsapp_number ?? '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState(false)

  // Messages state
  const { onMessage, sendMessage: wsSend } = useSocket()
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [convsLoading, setConvsLoading] = useState(false)
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [msgsLoading, setMsgsLoading] = useState(false)
  const [msgInput, setMsgInput] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Password change
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/auth/login'); return }
    setName(user.name ?? '')
    setPhone(user.phone ?? '')
    setWhatsappNumber(user.whatsapp_number ?? '')
  }, [user, authLoading, router])

  // Load conversations when Messages tab is active
  useEffect(() => {
    if (tab !== 'messages' || !user) return
    setConvsLoading(true)
    chatApi.listConversations()
      .then((res) => setConversations(res.data.data))
      .catch(() => setConversations([]))
      .finally(() => setConvsLoading(false))
  }, [tab, user])

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConvId || tab !== 'messages') return
    setMsgsLoading(true)
    setMessages([])
    chatApi.getMessages(selectedConvId, 1)
      .then((res) => {
        setMessages([...res.data.data.items].reverse())
        chatApi.markRead(selectedConvId).catch(() => {})
      })
      .catch(() => setMessages([]))
      .finally(() => setMsgsLoading(false))
  }, [selectedConvId, tab])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Listen for incoming WS messages
  useEffect(() => {
    const unsub = onMessage((msg: ChatMessage) => {
      if (msg.conversation_id === selectedConvId) {
        setMessages((prev) => [...prev, msg])
      } else {
        // Update unread count in conversations list
        setConversations((prev) => prev.map((c) =>
          c.id === msg.conversation_id
            ? { ...c, unread_count: c.unread_count + 1, last_message: { content: msg.content, created_at: msg.created_at, is_mine: false } }
            : c
        ))
      }
    })
    return unsub
  }, [onMessage, selectedConvId])

  async function handleSendMessage() {
    if (!msgInput.trim() || !selectedConvId || sendingMsg) return
    const content = msgInput.trim()
    setMsgInput('')
    setSendingMsg(true)
    try {
      // Send via REST for persistence guarantee
      const res = await chatApi.sendMessage(selectedConvId, content)
      setMessages((prev) => [...prev, res.data.data])
      // Also push via WS for real-time delivery to the recipient
      wsSend(selectedConvId, content)
    } catch {
      setMsgInput(content)
    } finally {
      setSendingMsg(false)
    }
  }

  async function handleOpenSupportChat() {
    try {
      const res = await chatApi.createOrGet({ type: 'support' })
      const conv = res.data.data
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === conv.id)
        return exists ? prev : [conv, ...prev]
      })
      setSelectedConvId(conv.id)
    } catch {
      // swallow
    }
  }

  useEffect(() => {
    if (tab !== 'listings' || !user) return
    setListingsPage(1)
    setListingsTotalPages(1)
    setListings([])
  }, [tab, user, listingsFilter])

  useEffect(() => {
    if (tab !== 'listings' || !user) return
    setListingsLoading(true)
    usersApi.getListings(user.id, listingsPage)
      .then((res) => {
        const data = res.data.data
        setListings((prev) => listingsPage === 1 ? data.items : [...prev, ...data.items])
        setListingsTotalPages(data.pages ?? 1)
      })
      .catch(() => { if (listingsPage === 1) setListings([]) })
      .finally(() => setListingsLoading(false))
  }, [tab, user, listingsPage])

  useEffect(() => {
    if (tab !== 'favorites' || !user) return
    setFavoritesLoading(true)
    favoritesApi.list(1)
      .then((res) => setFavorites(res.data.data.items))
      .catch(() => setFavorites([]))
      .finally(() => setFavoritesLoading(false))
  }, [tab, user])

  async function saveProfile() {
    setProfileError(''); setProfileSuccess(false)
    if (!name.trim()) { setProfileError(lang === 'ru' ? 'Введите имя' : 'Ном ворид кунед'); return }
    setProfileSaving(true)
    try {
      const res = await authApi.updateProfile({
        name: name.trim(),
        whatsapp_number: whatsappNumber.trim() || null,
      })
      updateUser(res.data.data)
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

      <Suspense fallback={null}>
        <SearchParamsReader onParams={(tabParam, convParam) => {
          if (tabParam) setTab(tabParam)
          if (convParam) setSelectedConvId(convParam)
        }} />
      </Suspense>

      <main style={{ flex: 1 }} className="pb-mobile">
        <div className="max-w-5xl mx-auto px-4 md:px-6" style={{ paddingTop: '32px', paddingBottom: '60px' }}>

          <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, color: 'var(--text)', marginBottom: '28px' }}>
            {t('dashboard.title', lang)}
          </h1>

          {/* Tabs */}
          <div className="scrollbar-hide" style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '28px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
            {(['profile', 'listings', 'favorites', 'messages', 'settings'] as Tab[]).map((tabKey) => {
              const labelMap: Record<Tab, string> = {
                profile: t('dashboard.profile', lang),
                listings: t('dashboard.myListings', lang),
                favorites: t('favorites.title', lang),
                messages: t('chat.messages', lang),
                settings: t('dashboard.settings', lang),
              }
              return (
                <button
                  key={tabKey}
                  onClick={() => setTab(tabKey)}
                  style={{
                    padding: '12px 24px',
                    fontWeight: 700,
                    fontSize: '14px',
                    minHeight: '44px',
                    flexShrink: 0,
                    background: 'none',
                    border: 'none',
                    borderBottom: tab === tabKey ? '2px solid var(--accent)' : '2px solid transparent',
                    color: tab === tabKey ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.15s, border-color 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {tabKey === 'favorites' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={tab === 'favorites' ? 'var(--accent)' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  )}
                  {tabKey === 'messages' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  )}
                  {labelMap[tabKey]}
                </button>
              )
            })}
          </div>

          {/* ── Profile tab ── */}
          {tab === 'profile' && (
            <div className="animate-fade-in">
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: 'clamp(20px, 4vw, 36px)', maxWidth: '560px' }}>
                {/* Avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '16px',
                    background: 'var(--accent)', color: 'var(--color-white)',
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
                    <div>
                      <label htmlFor="dash-whatsapp" style={labelStyle}>{t('settings.whatsapp', lang)}</label>
                      <input
                        id="dash-whatsapp"
                        type="tel"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        placeholder={t('settings.whatsappPlaceholder', lang)}
                        style={inputStyle}
                      />
                    </div>
                    {profileError && <p style={{ color: 'var(--color-error)', fontSize: '13px', fontWeight: 600 }}>{profileError}</p>}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={saveProfile}
                        disabled={profileSaving}
                        style={{ flex: 1, background: profileSaving ? 'var(--text-muted)' : 'var(--accent)', color: 'var(--color-white)', fontWeight: 700, padding: '11px', borderRadius: '10px', border: 'none', cursor: profileSaving ? 'not-allowed' : 'pointer' }}
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
                    <InfoRow label={t('auth.phone', lang)} value={user.phone && user.phone.startsWith('+') ? user.phone : '—'} />
                    <InfoRow label={t('admin.name', lang)} value={user.name ?? '—'} />
                    {user.email && <InfoRow label="Email" value={user.email} />}
                    {user.whatsapp_number && <InfoRow label={t('settings.whatsapp', lang)} value={user.whatsapp_number} />}
                    {profileSuccess && <p style={{ color: 'var(--color-success)', fontSize: '13px', fontWeight: 600 }}>{lang === 'ru' ? 'Сохранено' : 'Нигоҳ дошта шуд'}</p>}
                    <button
                      onClick={() => { setEditMode(true); setProfileSuccess(false) }}
                      style={{ marginTop: '4px', background: 'var(--accent)', color: 'var(--color-white)', fontWeight: 700, padding: '11px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}
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
                        color: listingsFilter === f ? 'var(--color-white)' : 'var(--text-muted)',
                        border: 'none', cursor: 'pointer',
                      }}
                    >
                      {t(`dashboard.${f}` as Parameters<typeof t>[0], lang)}
                    </button>
                  ))}
                </div>
                <Link
                  href="/post"
                  style={{ height: '36px', padding: '0 16px', background: 'var(--accent)', color: 'var(--color-white)', fontWeight: 700, fontSize: '13px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
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
                  {listingsPage < listingsTotalPages && (
                    <button
                      onClick={() => setListingsPage((p) => p + 1)}
                      disabled={listingsLoading}
                      style={{ marginTop: '8px', padding: '11px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', fontWeight: 700, fontSize: '14px', color: 'var(--text)', cursor: listingsLoading ? 'not-allowed' : 'pointer' }}
                    >
                      {listingsLoading ? t('common.loading', lang) : lang === 'ru' ? 'Загрузить ещё' : 'Бештар бор кунед'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Favorites tab ── */}
          {tab === 'favorites' && (
            <div className="animate-fade-in">
              {favoritesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{ height: '260px', borderRadius: '8px' }} className="skeleton" />
                  ))}
                </div>
              ) : favorites.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }}>
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <p>{t('favorites.empty', lang)}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favorites.map((listing) => (
                    <CarCard
                      key={listing.id}
                      listing={listing}
                      lang={lang}
                      initialFavorited={true}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Messages tab ── */}
          {tab === 'messages' && (
            <div className="animate-fade-in" style={{ height: 'calc(100dvh - 280px)', minHeight: '400px', display: 'flex', gap: '0', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
              {/* Conversation list — hidden on mobile when a conv is selected */}
              <div style={{
                width: selectedConvId ? undefined : '100%',
                flex: selectedConvId ? '0 0 280px' : '1',
                borderRight: selectedConvId ? '1px solid var(--border)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--card)',
                // Hide list on mobile when conversation is open
              }}
                className={selectedConvId ? 'hidden md:flex md:flex-col' : 'flex flex-col'}
              >
                {/* Sidebar header */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                    {t('chat.conversations', lang)}
                  </span>
                  <button
                    onClick={handleOpenSupportChat}
                    style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', background: 'none', border: '1px solid var(--accent)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}
                  >
                    {t('chat.supportChat', lang)}
                  </button>
                </div>

                {/* List */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {convsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--border)' }} className="skeleton" />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ height: '12px', width: '60%', borderRadius: '4px', background: 'var(--border)' }} className="skeleton" />
                          <div style={{ height: '10px', width: '80%', borderRadius: '4px', background: 'var(--border)' }} className="skeleton" />
                        </div>
                      </div>
                    ))
                  ) : conversations.length === 0 ? (
                    <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      {t('chat.noConversations', lang)}
                    </div>
                  ) : (
                    conversations.map((conv) => {
                      const name = conv.type === 'support'
                        ? t('chat.supportChat', lang)
                        : (conv.other_participant?.name ?? (lang === 'ru' ? 'Пользователь' : 'Корбар'))
                      const initials = name.charAt(0).toUpperCase()
                      const isActive = selectedConvId === conv.id
                      return (
                        <button
                          key={conv.id}
                          onClick={() => setSelectedConvId(conv.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            width: '100%',
                            padding: '12px 16px',
                            background: isActive ? 'var(--accent-dim, rgba(37,99,235,0.08))' : 'transparent',
                            border: 'none',
                            borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                            borderBottom: '1px solid var(--border)',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--surface)' }}
                          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                        >
                          {/* Avatar */}
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: isActive ? 'var(--accent)' : 'var(--surface)', color: isActive ? 'var(--color-white)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 800, flexShrink: 0 }}>
                            {initials}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>
                                {name}
                              </span>
                              {conv.unread_count > 0 && (
                                <span style={{ minWidth: '18px', height: '18px', background: 'var(--accent)', color: 'var(--color-white)', fontSize: '10px', fontWeight: 800, borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0 }}>
                                  {conv.unread_count}
                                </span>
                              )}
                            </div>
                            {conv.last_message && (
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {conv.last_message.is_mine ? `${t('chat.you', lang)}: ` : ''}{conv.last_message.content}
                              </div>
                            )}
                            {conv.listing && (
                              <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {conv.listing.brand} {conv.listing.model} {conv.listing.year}
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Chat window */}
              {selectedConvId ? (
                <div
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)', minWidth: 0 }}
                  className="flex flex-col"
                >
                  {/* Chat header */}
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--card)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    {/* Back button — mobile only */}
                    <button
                      onClick={() => setSelectedConvId(null)}
                      aria-label={t('chat.back', lang)}
                      className="flex md:hidden"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    {(() => {
                      const conv = conversations.find((c) => c.id === selectedConvId)
                      const name = conv?.type === 'support'
                        ? t('chat.supportChat', lang)
                        : (conv?.other_participant?.name ?? (lang === 'ru' ? 'Пользователь' : 'Корбар'))
                      return (
                        <>
                          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--accent)', color: 'var(--color-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, flexShrink: 0 }}>
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{name}</div>
                            {conv?.listing && (
                              <div style={{ fontSize: '11px', color: 'var(--accent)' }}>
                                {conv.listing.brand} {conv.listing.model} {conv.listing.year}
                              </div>
                            )}
                          </div>
                        </>
                      )
                    })()}
                  </div>

                  {/* Messages */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {msgsLoading ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '24px' }}>
                        {t('common.loading', lang)}
                      </div>
                    ) : messages.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '24px' }}>
                        {t('chat.noMessages', lang)}
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMine = msg.sender_id === user?.id
                        return (
                          <div
                            key={msg.id}
                            style={{
                              display: 'flex',
                              justifyContent: isMine ? 'flex-end' : 'flex-start',
                            }}
                          >
                            <div style={{
                              maxWidth: '70%',
                              padding: '9px 13px',
                              borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                              background: isMine ? 'var(--accent)' : 'var(--surface)',
                              border: isMine ? 'none' : '1px solid var(--border)',
                              color: isMine ? 'var(--color-white)' : 'var(--text)',
                            }}>
                              <div style={{ fontSize: '14px', lineHeight: 1.5, wordBreak: 'break-word' }}>
                                {msg.content}
                              </div>
                              <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7, textAlign: isMine ? 'right' : 'left' }}>
                                {new Date(msg.created_at).toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'tg-TJ', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--card)', display: 'flex', gap: '10px', alignItems: 'flex-end', flexShrink: 0 }}>
                    <textarea
                      value={msgInput}
                      onChange={(e) => setMsgInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          void handleSendMessage()
                        }
                      }}
                      placeholder={t('chat.typeMessage', lang)}
                      rows={1}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        background: 'var(--bg)',
                        border: '1.5px solid var(--border)',
                        borderRadius: '10px',
                        fontSize: '14px',
                        color: 'var(--text)',
                        outline: 'none',
                        resize: 'none',
                        lineHeight: 1.5,
                        maxHeight: '100px',
                        overflowY: 'auto',
                      }}
                    />
                    <button
                      onClick={() => void handleSendMessage()}
                      disabled={!msgInput.trim() || sendingMsg}
                      aria-label={t('chat.send', lang)}
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: msgInput.trim() && !sendingMsg ? 'var(--accent)' : 'var(--border)',
                        color: 'var(--color-white)',
                        border: 'none',
                        cursor: !msgInput.trim() || sendingMsg ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                // Empty state on desktop when no conv selected
                <div className="hidden md:flex" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: 'var(--text-muted)' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ opacity: 0.3 }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <p style={{ fontSize: '14px' }}>{t('chat.noConversations', lang)}</p>
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
                    {pwdError && <p style={{ color: 'var(--color-error)', fontSize: '13px', fontWeight: 600 }}>{pwdError}</p>}
                    {pwdSuccess && <p style={{ color: 'var(--color-success)', fontSize: '13px', fontWeight: 600 }}>{lang === 'ru' ? 'Пароль изменён' : 'Рамз иваз шуд'}</p>}
                    <button
                      onClick={changePassword}
                      disabled={pwdLoading}
                      style={{ background: pwdLoading ? 'var(--text-muted)' : 'var(--accent)', color: 'var(--color-white)', fontWeight: 700, padding: '11px', borderRadius: '10px', border: 'none', cursor: pwdLoading ? 'not-allowed' : 'pointer' }}
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
          {listing.is_active && listing.status === 'active' && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-success)', background: 'var(--color-success-dim)', padding: '1px 7px', borderRadius: '4px', flexShrink: 0, whiteSpace: 'nowrap' }}>
              {t('dashboard.active_badge', lang)}
            </span>
          )}
          {listing.status === 'pending' && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-warning-alt)', background: 'var(--color-warning-dim)', padding: '1px 7px', borderRadius: '4px', flexShrink: 0, whiteSpace: 'nowrap' }}>
              {t('dashboard.pending_badge', lang)}
            </span>
          )}
          {listing.status === 'rejected' && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-error)', background: 'var(--color-error-dim, rgba(239,68,68,0.1))', padding: '1px 7px', borderRadius: '4px', flexShrink: 0, whiteSpace: 'nowrap' }}>
              {t('dashboard.rejected_badge', lang)}
            </span>
          )}
          {!listing.is_active && listing.status === 'active' && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--tag-bg)', padding: '1px 6px', borderRadius: '4px', flexShrink: 0 }}>
              {t('dashboard.inactive_badge', lang)}
            </span>
          )}
        </div>
        {listing.status === 'rejected' && listing.rejection_reason && (
          <p style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', marginBottom: '2px', background: 'var(--color-error-dim)', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>
            {t('dashboard.rejectionReason', lang)}: {listing.rejection_reason}
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
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
        {listing.status === 'rejected' ? (
          <Link
            href={`/post?edit=${listing.id}`}
            style={{ padding: '6px 12px', background: 'var(--color-error-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--color-error)', textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            {t('dashboard.fixAndResubmit', lang)}
          </Link>
        ) : (
          <Link
            href={`/post?edit=${listing.id}`}
            style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textDecoration: 'none' }}
          >
            {t('dashboard.edit', lang)}
          </Link>
        )}
        {listing.status !== 'pending' && listing.status !== 'rejected' && (
          <button
            onClick={onToggle}
            style={{
              padding: '6px 12px',
              background: listing.is_active ? 'var(--color-error-dim, rgba(239,68,68,0.08))' : 'var(--color-success-dim)',
              border: listing.is_active ? '1px solid var(--color-error-border, rgba(239,68,68,0.3))' : '1px solid rgba(22,163,74,0.3)',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              color: listing.is_active ? 'var(--color-error)' : 'var(--color-success)',
              cursor: 'pointer',
            }}
          >
            {listing.is_active ? t('dashboard.deactivate', lang) : t('dashboard.activate', lang)}
          </button>
        )}
      </div>
    </div>
  )
}
