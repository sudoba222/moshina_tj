'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Pagination from '@/components/Pagination'
import { adminApi, chatApi, supportApi } from '@/lib/api'
import type { ChatMessage, SupportTicket } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { SupportStats, User, Listing, UserRole } from '@/types'

const ALLOWED_ROLES: UserRole[] = ['support', 'manager', 'admin']

type Tab = 'stats' | 'banned' | 'rejected' | 'messages'

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px',
      padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px',
    }}>
      <span style={{ fontSize: '28px', fontWeight: 800, color: accent ? 'var(--accent)' : 'var(--text)' }}>
        {value.toLocaleString()}
      </span>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function avatarColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0
  const hue = Math.abs(h) % 360
  return `hsl(${hue},55%,45%)`
}

function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'сейчас'
  if (diff < 3600) return `${Math.floor(diff / 60)}м`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч`
  return `${Math.floor(diff / 86400)}д`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SupportPage() {
  const router = useRouter()
  const { lang } = useLang()
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('stats')
  const [stats, setStats] = useState<SupportStats | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Banned users
  const [bannedUsers, setBannedUsers] = useState<User[]>([])
  const [bannedPage, setBannedPage] = useState(1)
  const [bannedTotal, setBannedTotal] = useState(0)
  const [bannedPages, setBannedPages] = useState(1)

  // Rejected listings
  const [rejectedListings, setRejectedListings] = useState<Listing[]>([])
  const [rejectedPage, setRejectedPage] = useState(1)
  const [rejectedTotal, setRejectedTotal] = useState(0)
  const [rejectedPages, setRejectedPages] = useState(1)

  const [loading, setLoading] = useState(false)

  // ── Messages tab state ──────────────────────────────────────────────────────
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'closed'>('all')
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [msgInput, setMsgInput] = useState('')
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchTickets = useCallback(() => {
    setLoadingTickets(true)
    supportApi.listTickets()
      .then((res) => setTickets(res.data.data))
      .catch(() => {})
      .finally(() => setLoadingTickets(false))
  }, [])

  const fetchMessages = useCallback((ticketId: string) => {
    setLoadingMessages(true)
    chatApi.getMessages(ticketId)
      .then((res) => {
        setMessages(res.data.data.items)
        chatApi.markRead(ticketId).catch(() => {})
        setTickets((prev) => prev.map((tk) => tk.id === ticketId ? { ...tk, unread_count: 0 } : tk))
      })
      .catch(() => {})
      .finally(() => setLoadingMessages(false))
  }, [])

  useEffect(() => {
    if (tab === 'messages') fetchTickets()
  }, [tab, fetchTickets])

  useEffect(() => {
    if (selectedTicketId) fetchMessages(selectedTicketId)
  }, [selectedTicketId, fetchMessages])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time WebSocket messages (disabled — socket removed)
  useEffect(() => {
    const unsub = () => {}
    if (false) {
      // placeholder to keep the effect structure
      } else {
        setTickets((prev) => prev.map((tk) =>
          tk.id === msg.conversation_id
            ? { ...tk, unread_count: tk.unread_count + 1 }
            : tk
        ))
      }
    })
    return unsub
  }, [selectedTicketId])

  async function handleSend() {
    if (!selectedTicketId || !msgInput.trim() || sendingMessage) return
    const content = msgInput.trim()
    setMsgInput('')
    setSendingMessage(true)
    try {
      await chatApi.sendMessage(selectedTicketId, content)
      await fetchMessages(selectedTicketId)
    } catch {
      // restore input on failure
      setMsgInput(content)
    } finally {
      setSendingMessage(false)
    }
  }

  async function handleAssign(ticketId: string) {
    await supportApi.assignTicket(ticketId).catch(() => {})
    fetchTickets()
  }

  async function handleClose(ticketId: string) {
    await supportApi.closeTicket(ticketId).catch(() => {})
    fetchTickets()
  }

  function handleSelectTicket(id: string) {
    setSelectedTicketId(id)
    setMobileShowChat(true)
  }

  const filteredTickets = tickets.filter((tk) => {
    if (ticketFilter === 'open') return !tk.is_closed
    if (ticketFilter === 'closed') return tk.is_closed
    return true
  })

  const selectedTicket = tickets.find((tk) => tk.id === selectedTicketId) ?? null

  useEffect(() => {
    if (!user) { router.replace('/auth/login'); return }
    if (!ALLOWED_ROLES.includes(user.role)) { router.replace('/'); return }
  }, [user, router])

  const fetchStats = useCallback(() => {
    setLoading(true)
    adminApi.getSupportStats()
      .then((res) => { setStats(res.data.data); setLastRefresh(new Date()) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fetchBannedUsers = useCallback((page: number) => {
    adminApi.getUsers(page, undefined, undefined, true)
      .then((res) => {
        setBannedUsers(res.data.data.items)
        setBannedTotal(res.data.data.total)
        setBannedPages(res.data.data.pages)
      })
      .catch(() => {})
  }, [])

  const fetchRejectedListings = useCallback((page: number) => {
    adminApi.getListings('rejected', page)
      .then((res) => {
        setRejectedListings(res.data.data.items)
        setRejectedTotal(res.data.data.total)
        setRejectedPages(res.data.data.pages)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!user || !ALLOWED_ROLES.includes(user.role)) return
    fetchStats()
  }, [user, fetchStats])

  useEffect(() => {
    if (tab === 'banned') fetchBannedUsers(bannedPage)
  }, [tab, bannedPage, fetchBannedUsers])

  useEffect(() => {
    if (tab === 'rejected') fetchRejectedListings(rejectedPage)
  }, [tab, rejectedPage, fetchRejectedListings])

  if (!user || !ALLOWED_ROLES.includes(user.role)) return null

  const TABS: { key: Tab; label: string }[] = [
    { key: 'stats', label: t('admin.stats', lang) },
    { key: 'banned', label: t('support.bannedTab', lang) },
    { key: 'rejected', label: t('support.rejectedTab', lang) },
    { key: 'messages', label: t('support.inbox', lang) },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
          <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
            {t('support.title', lang)}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>
            {user.name ?? user.phone} · {user.role}
          </p>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
            {TABS.map((tb) => (
              <button key={tb.key} onClick={() => setTab(tb.key)} style={{
                padding: '8px 20px', borderRadius: '100px', fontWeight: 600, fontSize: '14px',
                background: tab === tb.key ? 'var(--accent)' : 'var(--card)',
                color: tab === tb.key ? 'var(--color-white)' : 'var(--text-muted)',
                border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {tb.label}
              </button>
            ))}
          </div>

          {/* Stats Tab */}
          {tab === 'stats' && (
            <div>
              {stats ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                    <StatCard label={t('support.totalUsers', lang)} value={stats.total_users} accent />
                    <StatCard label={t('support.bannedUsers', lang)} value={stats.banned_users} />
                    <StatCard label={t('support.totalListings', lang)} value={stats.total_listings} accent />
                    <StatCard label={t('support.activeListings', lang)} value={stats.active_listings} />
                    <StatCard label={t('support.pendingListings', lang)} value={stats.pending_listings} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    <StatCard label={t('support.rejectedListings', lang)} value={stats.rejected_listings} />
                    <StatCard label={t('support.totalDealers', lang)} value={stats.total_dealers} accent />
                    <StatCard label={t('support.verifiedDealers', lang)} value={stats.verified_dealers} />
                    <StatCard label={t('support.todayNewUsers', lang)} value={stats.today_new_users} accent />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-8" style={{ maxWidth: '400px' }}>
                    <StatCard label={t('support.todayNewListings', lang)} value={stats.today_new_listings} accent />
                  </div>

                  {/* System Health */}
                  <div style={{
                    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px',
                    padding: '24px', marginTop: '8px',
                  }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>
                      {t('support.systemHealth', lang)}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-online)', display: 'inline-block' }} />
                        <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 600 }}>API: {t('support.systemOk', lang)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-online)', display: 'inline-block' }} />
                        <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 600 }}>DB: {t('support.systemOk', lang)}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {t('support.lastRefresh', lang)}: {lastRefresh.toLocaleTimeString()}
                      </div>
                      <button onClick={fetchStats} disabled={loading} style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                        background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)',
                        borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                      }}>
                        <RefreshIcon />
                        {t('support.refresh', lang)}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {t('common.loading', lang)}
                </div>
              )}
            </div>
          )}

          {/* Banned Users Tab */}
          {tab === 'banned' && (
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {bannedTotal} {t('support.bannedUsers', lang).toLowerCase()}
              </p>
              {bannedUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  {t('support.noBannedUsers', lang)}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {bannedUsers.map((u) => (
                    <div key={u.id} style={{
                      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px',
                      padding: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
                          {u.name ?? u.phone}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>{u.phone}</div>
                        {u.ban_reason && (
                          <div style={{ fontSize: '13px', color: 'var(--color-error)', background: 'var(--color-error-dim)', borderRadius: '6px', padding: '4px 8px', display: 'inline-block' }}>
                            {t('support.banReason', lang)}: {u.ban_reason}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {bannedPages > 1 && (
                <div style={{ marginTop: '24px' }}>
                  <Pagination page={bannedPage} pages={bannedPages} onPageChange={setBannedPage} />
                </div>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {tab === 'messages' && (
            <div>
              {/* Sub-filter row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {(['all', 'open', 'closed'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setTicketFilter(f)}
                    style={{
                      padding: '6px 16px', borderRadius: '100px', fontWeight: 600, fontSize: '13px',
                      background: ticketFilter === f ? 'var(--accent)' : 'var(--card)',
                      color: ticketFilter === f ? 'var(--color-white)' : 'var(--text-muted)',
                      border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {f === 'all' ? t('support.all', lang) : f === 'open' ? t('support.open', lang) : t('support.closed', lang)}
                  </button>
                ))}
                <button
                  onClick={fetchTickets}
                  disabled={loadingTickets}
                  style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 14px', background: 'var(--accent-dim)', color: 'var(--accent)',
                    border: '1px solid var(--accent)', borderRadius: '8px', cursor: 'pointer',
                    fontSize: '13px', fontWeight: 600,
                  }}
                >
                  <RefreshIcon />
                  {t('support.refresh', lang)}
                </button>
              </div>

              {/* Two-panel layout */}
              <div style={{ display: 'flex', gap: '0', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', minHeight: '520px' }}>

                {/* Left: ticket list — hidden on mobile when chat is open */}
                <div
                  className={mobileShowChat ? 'hidden md:flex' : 'flex'}
                  style={{
                    width: '320px', flexShrink: 0, flexDirection: 'column',
                    borderRight: '1px solid var(--border)', background: 'var(--card)',
                    overflowY: 'auto',
                  }}
                >
                  {loadingTickets ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      {t('common.loading', lang)}
                    </div>
                  ) : filteredTickets.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      {t('support.noTickets', lang)}
                    </div>
                  ) : (
                    filteredTickets.map((tk) => {
                      const name = tk.participant?.name ?? (lang === 'ru' ? 'Аноним' : 'Ношинос')
                      const isSelected = tk.id === selectedTicketId
                      return (
                        <button
                          key={tk.id}
                          onClick={() => handleSelectTicket(tk.id)}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: '12px',
                            padding: '14px 16px', width: '100%', textAlign: 'left',
                            background: isSelected ? 'var(--accent-dim)' : 'transparent',
                            border: 'none', borderBottom: '1px solid var(--border)',
                            cursor: 'pointer', transition: 'background 0.1s',
                          }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--surface)' }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                        >
                          {/* Avatar */}
                          <div style={{
                            width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                            background: tk.participant ? avatarColor(tk.participant.id) : 'var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '15px', fontWeight: 700, color: 'var(--color-white)',
                          }}>
                            {name.charAt(0).toUpperCase()}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {name}
                              </span>
                              {tk.last_message && (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                                  {relativeTime(tk.last_message.created_at)}
                                </span>
                              )}
                              {tk.unread_count > 0 && (
                                <span style={{
                                  minWidth: '18px', height: '18px', padding: '0 4px',
                                  background: 'var(--color-error)', color: 'var(--color-white)',
                                  fontSize: '10px', fontWeight: 800, borderRadius: '9px',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                }}>
                                  {tk.unread_count}
                                </span>
                              )}
                            </div>

                            {tk.last_message && (
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
                                {tk.last_message.content.slice(0, 50)}
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {tk.assignee === null && (
                                <span style={{
                                  fontSize: '11px', fontWeight: 600, padding: '1px 7px',
                                  background: 'var(--border)', color: 'var(--text-muted)',
                                  borderRadius: '6px',
                                }}>
                                  {t('support.unassigned', lang)}
                                </span>
                              )}
                              {tk.assignee !== null && (
                                <span style={{
                                  fontSize: '11px', color: 'var(--text-muted)',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  {t('support.assignedTo', lang)}: {tk.assignee.name ?? '—'}
                                </span>
                              )}
                              {tk.is_closed && (
                                <span style={{
                                  fontSize: '11px', fontWeight: 600, padding: '1px 7px',
                                  background: 'var(--color-success-dim)', color: 'var(--color-success)',
                                  borderRadius: '6px',
                                }}>
                                  {t('support.closed', lang)}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>

                {/* Right: chat panel */}
                <div
                  className={!mobileShowChat ? 'hidden md:flex' : 'flex'}
                  style={{ flex: 1, flexDirection: 'column', background: 'var(--bg)', minWidth: 0 }}
                >
                  {selectedTicket === null ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px', padding: '32px', textAlign: 'center' }}>
                      {t('support.selectTicket', lang)}
                    </div>
                  ) : (
                    <>
                      {/* Chat header */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 16px', borderBottom: '1px solid var(--border)',
                        background: 'var(--card)', flexShrink: 0, flexWrap: 'wrap',
                      }}>
                        {/* Mobile back button */}
                        <button
                          onClick={() => setMobileShowChat(false)}
                          className="flex md:hidden"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-muted)', padding: '4px',
                          }}
                          aria-label={t('common.back', lang)}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                          </svg>
                        </button>

                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                          background: selectedTicket.participant ? avatarColor(selectedTicket.participant.id) : 'var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '14px', fontWeight: 700, color: 'var(--color-white)',
                        }}>
                          {(selectedTicket.participant?.name ?? 'A').charAt(0).toUpperCase()}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                            {selectedTicket.participant?.name ?? (lang === 'ru' ? 'Аноним' : 'Ношинос')}
                          </div>
                          {selectedTicket.assignee && (
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {t('support.assignedTo', lang)}: {selectedTicket.assignee.name ?? '—'}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          {!selectedTicket.is_closed && selectedTicket.assignee === null && (
                            <button
                              onClick={() => handleAssign(selectedTicket.id)}
                              style={{
                                padding: '6px 12px', fontSize: '12px', fontWeight: 600,
                                background: 'var(--accent-dim)', color: 'var(--accent)',
                                border: '1px solid var(--accent)', borderRadius: '8px', cursor: 'pointer',
                              }}
                            >
                              {t('support.assignMe', lang)}
                            </button>
                          )}
                          {!selectedTicket.is_closed && (
                            <button
                              onClick={() => handleClose(selectedTicket.id)}
                              style={{
                                padding: '6px 12px', fontSize: '12px', fontWeight: 600,
                                background: 'var(--color-error-dim)', color: 'var(--color-error)',
                                border: '1px solid var(--color-error)', borderRadius: '8px', cursor: 'pointer',
                              }}
                            >
                              {t('support.close', lang)}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Messages list */}
                      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {loadingMessages ? (
                          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '32px' }}>
                            {t('common.loading', lang)}
                          </div>
                        ) : messages.length === 0 ? (
                          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '32px' }}>
                            {t('chat.noMessages', lang)}
                          </div>
                        ) : (
                          messages.map((msg) => {
                            const isMine = msg.sender_id === user?.id
                            return (
                              <div
                                key={msg.id}
                                style={{
                                  display: 'flex', flexDirection: 'column',
                                  alignItems: isMine ? 'flex-end' : 'flex-start',
                                  maxWidth: '75%', alignSelf: isMine ? 'flex-end' : 'flex-start',
                                }}
                              >
                                <div style={{
                                  padding: '8px 12px', borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                  background: isMine ? 'var(--accent)' : 'var(--card)',
                                  color: isMine ? 'var(--color-white)' : 'var(--text)',
                                  fontSize: '13px', lineHeight: 1.5,
                                  border: isMine ? 'none' : '1px solid var(--border)',
                                  wordBreak: 'break-word',
                                }}>
                                  {msg.content}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px', padding: '0 4px' }}>
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            )
                          })
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Input row */}
                      {!selectedTicket.is_closed && (
                        <div style={{
                          display: 'flex', gap: '8px', padding: '12px 16px',
                          borderTop: '1px solid var(--border)', background: 'var(--card)', flexShrink: 0,
                        }}>
                          <input
                            type="text"
                            value={msgInput}
                            onChange={(e) => setMsgInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() } }}
                            placeholder={t('chat.typeMessage', lang)}
                            disabled={sendingMessage}
                            style={{
                              flex: 1, height: '40px', padding: '0 14px',
                              background: 'var(--bg)', border: '1.5px solid var(--border)',
                              borderRadius: '8px', fontSize: '13px', color: 'var(--text)', outline: 'none',
                            }}
                          />
                          <button
                            onClick={() => void handleSend()}
                            disabled={sendingMessage || !msgInput.trim()}
                            style={{
                              height: '40px', padding: '0 18px',
                              background: 'var(--accent)', color: 'var(--color-white)',
                              fontWeight: 600, fontSize: '13px',
                              border: 'none', borderRadius: '8px', cursor: 'pointer',
                              opacity: (sendingMessage || !msgInput.trim()) ? 0.5 : 1,
                            }}
                          >
                            {sendingMessage ? t('chat.sending', lang) : t('chat.send', lang)}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Rejected Listings Tab */}
          {tab === 'rejected' && (
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {rejectedTotal} {t('support.rejectedListings', lang).toLowerCase()}
              </p>
              {rejectedListings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  {t('support.noRejectedListings', lang)}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {rejectedListings.map((l) => (
                    <div key={l.id} style={{
                      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px',
                      padding: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
                          {l.brand} {l.model} {l.year} · {l.city}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                          {l.price.toLocaleString()} {l.currency}
                        </div>
                        {l.rejection_reason && (
                          <div style={{ fontSize: '13px', color: 'var(--color-error)', background: 'var(--color-error-dim)', borderRadius: '6px', padding: '4px 8px', display: 'inline-block' }}>
                            {t('support.rejectionReason', lang)}: {l.rejection_reason}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(l.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {rejectedPages > 1 && (
                <div style={{ marginTop: '24px' }}>
                  <Pagination page={rejectedPage} pages={rejectedPages} onPageChange={setRejectedPage} />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
