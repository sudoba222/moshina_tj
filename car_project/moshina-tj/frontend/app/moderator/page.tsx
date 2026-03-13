'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { adminApi } from '@/lib/api'
import { listingsApi } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import type { Listing, UserRole } from '@/types'
import type { ModerationSession } from '@/lib/api'

const ALLOWED_ROLES: UserRole[] = ['moderator', 'admin']
const SESSION_LIMIT = 10

const QUICK_REASONS = [
  'Дубликат объявления',
  'Неверная цена',
  'Нет фотографий',
  'Некорректные параметры',
  'Не та категория',
  'Запрещённый контент',
  'Неполное описание',
]

// ── Icons ──────────────────────────────────────────────────────────────────
function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconSkip() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function IconChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function IconCar() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h10l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2h-2" />
      <circle cx="7.5" cy="17" r="2.5" />
      <circle cx="16.5" cy="17" r="2.5" />
    </svg>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatPrice(price: number, currency: string) {
  return currency === 'USD' ? `$${price.toLocaleString('en-US')}` : `${price.toLocaleString()} сом.`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ModeratorPage() {
  const router = useRouter()
  const { user } = useAuth()

  type Screen = 'loading' | 'start' | 'workspace' | 'summary'

  const [screen, setScreen] = useState<Screen>('loading')
  const [session, setSession] = useState<ModerationSession | null>(null)
  const [pendingTotal, setPendingTotal] = useState(0)
  const [listing, setListing] = useState<Listing | null>(null)
  const [listingLoading, setListingLoading] = useState(false)
  const [similarListings, setSimilarListings] = useState<Listing[]>([])

  // Timer
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Photo carousel
  const [photoIdx, setPhotoIdx] = useState(0)

  // Reject panel
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectLoading, setRejectLoading] = useState(false)

  // Action loading
  const [actionLoading, setActionLoading] = useState(false)

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { router.replace('/auth/login'); return }
    if (!ALLOWED_ROLES.includes(user.role)) { router.replace('/'); return }
  }, [user, router])

  // ── On mount: check for active session ────────────────────────────────────
  useEffect(() => {
    if (!user || !ALLOWED_ROLES.includes(user.role)) return

    async function init() {
      try {
        const res = await adminApi.getActiveSession()
        const active = res.data.data
        if (active && active.is_active) {
          setSession(active)
          setScreen('workspace')
          startTimer(active.started_at)
          fetchNextListing()
        } else {
          // Fetch pending count for start screen
          try {
            const pendRes = await adminApi.getPendingListings(1, 1)
            setPendingTotal(pendRes.data.data.total)
          } catch {}
          setScreen('start')
        }
      } catch {
        setScreen('start')
      }
    }

    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // ── Timer ─────────────────────────────────────────────────────────────────
  function startTimer(startedAt: string) {
    const startMs = new Date(startedAt).getTime()
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startMs) / 1000))
    }, 1000)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // ── Fetch next listing ─────────────────────────────────────────────────────
  const fetchNextListing = useCallback(async () => {
    setListingLoading(true)
    setRejectOpen(false)
    setRejectReason('')
    setPhotoIdx(0)
    try {
      const res = await adminApi.getPendingListings(1, 1)
      const items = res.data.data.items
      if (items.length > 0) {
        setListing(items[0])
        setPendingTotal(res.data.data.total)
        // Fetch similar
        fetchSimilar(items[0])
      } else {
        setListing(null)
        setPendingTotal(0)
      }
    } catch {
      setListing(null)
    } finally {
      setListingLoading(false)
    }
  }, [])

  function fetchSimilar(l: Listing) {
    listingsApi.list({ brand: l.brand, limit: 5 })
      .then((res) => {
        const items = res.data.data.items.filter((item) => item.id !== l.id).slice(0, 3)
        setSimilarListings(items)
      })
      .catch(() => setSimilarListings([]))
  }

  // ── Session start ──────────────────────────────────────────────────────────
  async function handleStartSession() {
    try {
      const res = await adminApi.startSession()
      const newSession = res.data.data
      setSession(newSession)
      setScreen('workspace')
      startTimer(newSession.started_at)
      fetchNextListing()
    } catch {}
  }

  // ── Session end ────────────────────────────────────────────────────────────
  async function handleEndSession() {
    try {
      const res = await adminApi.endSession()
      if (timerRef.current) clearInterval(timerRef.current)
      setSession(res.data.data)
      setScreen('summary')
    } catch {
      if (timerRef.current) clearInterval(timerRef.current)
      setScreen('summary')
    }
  }

  // ── After approve/reject/skip: update session counters + fetch next ────────
  function advanceSession(type: 'approve' | 'reject' | 'skip') {
    setSession((prev) => {
      if (!prev) return prev
      const done = prev.approved_count + prev.rejected_count + prev.skipped_count + 1
      const updated = {
        ...prev,
        approved_count: type === 'approve' ? prev.approved_count + 1 : prev.approved_count,
        rejected_count: type === 'reject' ? prev.rejected_count + 1 : prev.rejected_count,
        skipped_count: type === 'skip' ? prev.skipped_count + 1 : prev.skipped_count,
      }
      if (done >= SESSION_LIMIT) {
        // end after state update
        setTimeout(() => handleEndSession(), 0)
      }
      return updated
    })
  }

  // ── Approve ────────────────────────────────────────────────────────────────
  async function handleApprove() {
    if (!listing) return
    setActionLoading(true)
    try {
      await adminApi.approveListing(listing.id)
      advanceSession('approve')
      await fetchNextListing()
    } catch {}
    setActionLoading(false)
  }

  // ── Reject ─────────────────────────────────────────────────────────────────
  async function handleReject() {
    if (!listing || !rejectReason.trim()) return
    setRejectLoading(true)
    try {
      await adminApi.rejectListing(listing.id, rejectReason.trim())
      advanceSession('reject')
      await fetchNextListing()
    } catch {}
    setRejectLoading(false)
  }

  // ── Skip ───────────────────────────────────────────────────────────────────
  async function handleSkip() {
    if (!listing) return
    setActionLoading(true)
    try {
      await adminApi.skipListing(listing.id)
      advanceSession('skip')
      await fetchNextListing()
    } catch {}
    setActionLoading(false)
  }

  if (!user || !ALLOWED_ROLES.includes(user.role)) return null

  // ── Screen: loading ────────────────────────────────────────────────────────
  if (screen === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--background)' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  // ── Screen: start ──────────────────────────────────────────────────────────
  if (screen === 'start') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--background)' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '48px 40px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--accent)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#fff' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Сессия модерации
          </h1>

          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.5 }}>
            В очереди: <strong style={{ color: 'var(--text-primary)' }}>{pendingTotal}</strong> объявлений
          </p>

          <button
            onClick={handleStartSession}
            style={{
              width: '100%', padding: '14px', background: 'var(--accent)', color: '#fff',
              fontWeight: 800, fontSize: '16px', borderRadius: '12px', border: 'none',
              cursor: 'pointer', letterSpacing: '0.02em',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            Начать сессию
          </button>

          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '16px' }}>
            Лимит сессии: {SESSION_LIMIT} объявлений
          </p>

          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <Link href="/dashboard" style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
              Вернуться в личный кабинет
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Screen: summary ────────────────────────────────────────────────────────
  if (screen === 'summary') {
    const totalDone = (session?.approved_count ?? 0) + (session?.rejected_count ?? 0) + (session?.skipped_count ?? 0)
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--background)' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '48px 40px', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', background: 'rgba(22,163,74,0.12)', border: '2px solid #16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#16a34a' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '24px' }}>
            Сессия завершена
          </h1>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: '12px', padding: '16px 8px' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a' }}>{session?.approved_count ?? 0}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '4px' }}>Одобрено</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(200,56,8,0.08)', border: '1px solid rgba(200,56,8,0.3)', borderRadius: '12px', padding: '16px 8px' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent)' }}>{session?.rejected_count ?? 0}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '4px' }}>Отклонено</div>
            </div>
            <div style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 8px' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>{session?.skipped_count ?? 0}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '4px' }}>Пропущено</div>
            </div>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <IconClock />
            Длительность: <strong style={{ color: 'var(--text-primary)' }}>{formatElapsed(elapsed)}</strong>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '32px' }}>
            Проверено: <strong style={{ color: 'var(--text-primary)' }}>{totalDone}</strong> объявлений
          </p>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                setSession(null)
                setElapsed(0)
                setPendingTotal(0)
                setScreen('start')
                // refetch pending count
                adminApi.getPendingListings(1, 1)
                  .then((res) => setPendingTotal(res.data.data.total))
                  .catch(() => {})
              }}
              style={{ flex: 1, padding: '12px', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: '14px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
            >
              Новая сессия
            </button>
            <Link
              href="/dashboard"
              style={{ flex: 1, padding: '12px', background: 'var(--card)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '14px', borderRadius: '10px', border: '1px solid var(--border)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              В кабинет
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Screen: workspace ──────────────────────────────────────────────────────
  const done = (session?.approved_count ?? 0) + (session?.rejected_count ?? 0) + (session?.skipped_count ?? 0)
  const progressPct = Math.min((done / SESSION_LIMIT) * 100, 100)
  const images = listing?.images ?? []
  const currentImage = images[photoIdx]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--background)', overflow: 'hidden' }}>

      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div style={{
        height: '52px', background: 'var(--card)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: '20px', flexShrink: 0,
      }}>
        {/* Title */}
        <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
          Модерация
        </span>

        {/* Progress */}
        <div style={{ flex: 1, maxWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {done} / {SESSION_LIMIT}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {pendingTotal > 0 ? `${pendingTotal} в очереди` : 'очередь пуста'}
            </span>
          </div>
          <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--accent)', borderRadius: '2px', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          <IconClock />
          {formatElapsed(elapsed)}
        </div>

        {/* End session */}
        <button
          onClick={handleEndSession}
          style={{
            padding: '6px 14px', background: 'none', border: '1px solid var(--border)',
            borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          Завершить сессию
        </button>
      </div>

      {/* ── 3-column layout ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT PANEL (actions) ──────────────────────────────────────────── */}
        <div style={{
          width: '256px', flexShrink: 0, borderRight: '1px solid var(--border)',
          overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px',
          background: 'var(--card)',
        }}>
          {/* Approve */}
          <button
            onClick={handleApprove}
            disabled={!listing || actionLoading}
            style={{
              width: '100%', padding: '12px 0', background: listing && !actionLoading ? '#16a34a' : 'var(--border)',
              color: '#fff', fontWeight: 800, fontSize: '14px', borderRadius: '10px',
              border: 'none', cursor: listing && !actionLoading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
            onMouseEnter={(e) => { if (listing && !actionLoading) e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            <IconCheck />
            ОДОБРИТЬ
          </button>

          {/* Reject */}
          <button
            onClick={() => setRejectOpen(!rejectOpen)}
            disabled={!listing || actionLoading}
            style={{
              width: '100%', padding: '12px 0',
              background: rejectOpen ? 'var(--accent)' : 'rgba(200,56,8,0.1)',
              color: rejectOpen ? '#fff' : 'var(--accent)',
              fontWeight: 800, fontSize: '14px', borderRadius: '10px',
              border: `1px solid ${rejectOpen ? 'var(--accent)' : 'rgba(200,56,8,0.3)'}`,
              cursor: listing && !actionLoading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
            onMouseEnter={(e) => { if (listing && !actionLoading) e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            <IconX />
            ОТКЛОНИТЬ
          </button>

          {/* Reject expanded panel */}
          {rejectOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Быстрые причины
              </p>
              {QUICK_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setRejectReason(reason)}
                  style={{
                    width: '100%', padding: '7px 10px', textAlign: 'left',
                    background: rejectReason === reason ? 'rgba(200,56,8,0.12)' : 'var(--background)',
                    border: `1px solid ${rejectReason === reason ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: '8px', fontSize: '12px', fontWeight: rejectReason === reason ? 700 : 500,
                    color: rejectReason === reason ? 'var(--accent)' : 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { if (rejectReason !== reason) e.currentTarget.style.background = 'var(--card)' }}
                  onMouseLeave={(e) => { if (rejectReason !== reason) e.currentTarget.style.background = 'var(--background)' }}
                >
                  {reason}
                </button>
              ))}

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Или введите причину..."
                rows={3}
                style={{
                  width: '100%', background: 'var(--background)', border: '1px solid var(--border)',
                  borderRadius: '8px', padding: '8px 10px', fontSize: '12px', color: 'var(--text-primary)',
                  outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5,
                  marginTop: '4px',
                }}
              />

              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || rejectLoading}
                style={{
                  width: '100%', padding: '10px 0',
                  background: rejectReason.trim() && !rejectLoading ? 'var(--accent)' : 'var(--border)',
                  color: '#fff', fontWeight: 700, fontSize: '13px', borderRadius: '8px',
                  border: 'none', cursor: rejectReason.trim() && !rejectLoading ? 'pointer' : 'not-allowed',
                }}
              >
                {rejectLoading ? 'Отправка...' : 'Подтвердить отклонение'}
              </button>
            </div>
          )}

          {/* Skip */}
          <button
            onClick={handleSkip}
            disabled={!listing || actionLoading}
            style={{
              width: '100%', padding: '11px 0', background: 'none',
              color: 'var(--text-secondary)', fontWeight: 700, fontSize: '13px', borderRadius: '10px',
              border: '1px solid var(--border)', cursor: listing && !actionLoading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
            onMouseEnter={(e) => { if (listing && !actionLoading) { e.currentTarget.style.borderColor = 'var(--text-secondary)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <IconSkip />
            ПРОПУСТИТЬ
          </button>
        </div>

        {/* ── CENTER PANEL (listing detail) ─────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', minWidth: 0 }}>
          {listingLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ height: '320px', borderRadius: '12px', background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ height: '24px', borderRadius: '8px', background: 'var(--border)', animation: 'pulse 1.5s infinite', width: '60%' }} />
              <div style={{ height: '16px', borderRadius: '6px', background: 'var(--border)', animation: 'pulse 1.5s infinite', width: '40%' }} />
            </div>
          ) : !listing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', gap: '16px' }}>
              <div style={{ opacity: 0.3 }}><IconCar /></div>
              <p style={{ fontSize: '16px', fontWeight: 600 }}>Новых объявлений нет</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Очередь модерации пуста</p>
              <button
                onClick={handleEndSession}
                style={{ marginTop: '8px', padding: '10px 24px', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: '13px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
              >
                Завершить сессию
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Photo carousel */}
              <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: 'var(--border)', aspectRatio: '16/9', maxHeight: '340px' }}>
                {images.length > 0 && currentImage ? (
                  <Image
                    src={currentImage.url}
                    alt={`${listing.brand} ${listing.model} фото ${photoIdx + 1}`}
                    fill
                    sizes="(max-width: 1200px) 60vw, 700px"
                    style={{ objectFit: 'cover' }}
                    priority
                  />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', opacity: 0.4 }}>
                    <IconCar />
                    <span style={{ marginLeft: '8px', fontSize: '13px' }}>Нет фотографий</span>
                  </div>
                )}

                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setPhotoIdx((prev) => (prev - 1 + images.length) % images.length)}
                      style={{
                        position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                        width: '34px', height: '34px', background: 'rgba(0,0,0,0.55)', border: 'none',
                        borderRadius: '50%', cursor: 'pointer', color: '#fff', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                      aria-label="Предыдущее фото"
                    >
                      <IconChevronLeft />
                    </button>
                    <button
                      onClick={() => setPhotoIdx((prev) => (prev + 1) % images.length)}
                      style={{
                        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                        width: '34px', height: '34px', background: 'rgba(0,0,0,0.55)', border: 'none',
                        borderRadius: '50%', cursor: 'pointer', color: '#fff', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                      aria-label="Следующее фото"
                    >
                      <IconChevronRight />
                    </button>
                    <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '5px' }}>
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setPhotoIdx(idx)}
                          style={{
                            width: idx === photoIdx ? '20px' : '6px', height: '6px',
                            background: idx === photoIdx ? '#fff' : 'rgba(255,255,255,0.5)',
                            borderRadius: '3px', border: 'none', cursor: 'pointer', padding: 0,
                            transition: 'width 0.2s ease',
                          }}
                          aria-label={`Фото ${idx + 1}`}
                        />
                      ))}
                    </div>
                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.55)', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: 600, color: '#fff' }}>
                      {photoIdx + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>

              {/* Heading */}
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                  {listing.brand} {listing.model} {listing.year}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent)' }}>
                    {formatPrice(listing.price, listing.currency)}
                  </span>
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                    background: listing.type === 'sale' ? 'rgba(59,130,246,0.12)' : 'rgba(168,85,247,0.12)',
                    color: listing.type === 'sale' ? '#2563eb' : '#9333ea',
                  }}>
                    {listing.type === 'sale' ? 'Продажа' : 'Аренда'}
                  </span>
                  {listing.installment_available && (
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>
                      Рассрочка
                    </span>
                  )}
                </div>
              </div>

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { label: 'Город', value: listing.city },
                  { label: 'Топливо', value: listing.fuel ?? '—' },
                  { label: 'КПП', value: listing.transmission ?? '—' },
                  { label: 'Пробег', value: listing.mileage != null ? `${listing.mileage.toLocaleString()} км` : '—' },
                  { label: 'Цвет', value: listing.color ?? '—' },
                  { label: 'Дата подачи', value: formatDate(listing.created_at) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>{label}</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Seller info */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>Продавец</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    ID: {listing.user_id.slice(0, 8)}...
                  </div>
                </div>
                {listing.is_dealer_listing && (
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>Тип</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>Дилер</div>
                  </div>
                )}
              </div>

              {/* Description */}
              {listing.description && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Описание</div>
                  <div style={{
                    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px',
                    padding: '12px 14px', fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6,
                    maxHeight: '200px', overflowY: 'auto',
                  }}>
                    {listing.description}
                  </div>
                </div>
              )}

              {/* Rental rules */}
              {listing.type === 'rent' && listing.rental_rules && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Условия аренды</div>
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {listing.rental_rules.min_age && (
                      <DetailItem label="Мин. возраст" value={`${listing.rental_rules.min_age} лет`} />
                    )}
                    {listing.rental_rules.deposit != null && (
                      <DetailItem label="Залог" value={`${listing.rental_rules.deposit.toLocaleString()} ${listing.rental_rules.deposit_currency ?? ''}`} />
                    )}
                    {listing.rental_rules.max_km_per_day && (
                      <DetailItem label="Макс. км/день" value={`${listing.rental_rules.max_km_per_day} км`} />
                    )}
                    {listing.rental_rules.delivery_available !== undefined && (
                      <DetailItem label="Доставка" value={listing.rental_rules.delivery_available ? 'Да' : 'Нет'} />
                    )}
                    {listing.rental_rules.insurance_included !== undefined && (
                      <DetailItem label="Страховка" value={listing.rental_rules.insurance_included ? 'Включена' : 'Не включена'} />
                    )}
                    {listing.rental_rules.fuel_policy && (
                      <DetailItem label="Топливо" value={listing.rental_rules.fuel_policy} />
                    )}
                    {listing.rental_rules.notes && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <DetailItem label="Примечания" value={listing.rental_rules.notes} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Open listing link */}
              <div style={{ paddingBottom: '8px' }}>
                <Link
                  href={`/car/${listing.id}`}
                  target="_blank"
                  style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  Открыть объявление
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL (similar listings) ───────────────────────────────── */}
        <div style={{
          width: '280px', flexShrink: 0, borderLeft: '1px solid var(--border)',
          overflowY: 'auto', padding: '16px', background: 'var(--card)',
        }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', margin: '0 0 12px' }}>
            Похожие объявления
          </p>

          {!listing ? (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Нет объявления для сравнения</p>
          ) : similarListings.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Похожих объявлений не найдено</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {similarListings.map((sim) => {
                const simPrimary = sim.images.find((i) => i.is_primary) ?? sim.images[0]
                return (
                  <Link
                    key={sim.id}
                    href={`/car/${sim.id}`}
                    target="_blank"
                    style={{ textDecoration: 'none', display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '10px' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
                  >
                    <div style={{ width: '60px', height: '46px', borderRadius: '6px', overflow: 'hidden', background: 'var(--border)', flexShrink: 0, position: 'relative' }}>
                      {simPrimary ? (
                        <Image src={simPrimary.url} alt="" fill sizes="60px" style={{ objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', opacity: 0.5 }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h10l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2h-2" /><circle cx="7.5" cy="17" r="2.5" /><circle cx="16.5" cy="17" r="2.5" /></svg>
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sim.brand} {sim.model} {sim.year}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', marginTop: '2px' }}>
                        {formatPrice(sim.price, sim.currency)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {new Date(sim.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Inline keyframes for loading spinner */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}
