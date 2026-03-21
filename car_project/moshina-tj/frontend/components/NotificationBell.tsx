'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { notificationsApi } from '@/lib/api'
import type { NotificationItem } from '@/lib/api'
import { useSocket } from '@/lib/SocketContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function timeAgo(dateStr: string, lang: 'ru' | 'tj'): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return t('notifications.justNow', lang)
  if (diff < 3600) return `${Math.floor(diff / 60)} ${t('notifications.minAgo', lang)}`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ${t('notifications.hrAgo', lang)}`
  return `${Math.floor(diff / 86400)} ${t('notifications.dayAgo', lang)}`
}

export default function NotificationBell() {
  const { lang } = useLang()
  const router = useRouter()
  const { onMessage } = useSocket()
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchUnreadCount = useCallback(() => {
    notificationsApi.unreadCount()
      .then((res) => setUnreadCount(res.data.data.count))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchUnreadCount()
    pollRef.current = setInterval(fetchUnreadCount, 30000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchUnreadCount])

  // Listen for incoming WS messages and bump the unread count
  useEffect(() => {
    const unsub = onMessage(() => {
      setUnreadCount((c) => c + 1)
    })
    return unsub
  }, [onMessage])

  // Close panel on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function handleOpen() {
    const next = !open
    setOpen(next)
    if (next && items.length === 0) {
      setLoading(true)
      notificationsApi.list(1)
        .then((res) => setItems(res.data.data.items))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }

  async function handleMarkAll() {
    await notificationsApi.markAllRead().catch(() => {})
    setUnreadCount(0)
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  async function handleNotificationClick(n: NotificationItem) {
    if (!n.is_read) {
      await notificationsApi.markRead(n.id).catch(() => {})
      setUnreadCount((c) => Math.max(0, c - 1))
      setItems((prev) => prev.map((item) => item.id === n.id ? { ...item, is_read: true } : item))
    }
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        aria-label={t('notifications.title', lang)}
        aria-haspopup="true"
        aria-expanded={open}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          background: 'none',
          border: '1.5px solid var(--border)',
          borderRadius: '8px',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount} unread`}
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              minWidth: '16px',
              height: '16px',
              padding: '0 4px',
              background: '#ef4444',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 800,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="animate-scale-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '320px',
            maxHeight: '420px',
            overflowY: 'auto',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-md)',
            zIndex: 200,
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            position: 'sticky',
            top: 0,
            background: 'var(--card)',
            zIndex: 1,
          }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
              {t('notifications.title', lang)}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 0',
                }}
              >
                {t('notifications.markAllRead', lang)}
              </button>
            )}
          </div>

          {/* Body */}
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              {t('common.loading', lang)}
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              {t('notifications.empty', lang)}
            </div>
          ) : (
            items.slice(0, 10).map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  width: '100%',
                  padding: '12px 16px',
                  background: n.is_read ? 'transparent' : 'var(--accent-dim, rgba(37,99,235,0.06))',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = n.is_read ? 'transparent' : 'var(--accent-dim, rgba(37,99,235,0.06))' }}
              >
                {/* Unread dot */}
                <div style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: n.is_read ? 'transparent' : 'var(--accent)',
                  flexShrink: 0,
                  marginTop: '5px',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '4px' }}>
                    {n.body}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {timeAgo(n.created_at, lang)}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
