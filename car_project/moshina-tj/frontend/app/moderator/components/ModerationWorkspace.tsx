'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import ActionPanel from './ActionPanel'
import ContentPanel from './ContentPanel'
import AuthorContext from './AuthorContext'
import Toast, { type ToastVariant } from './Toast'
import { IconClock, IconArrowLeft, IconCheck, IconCar } from './icons'
import { formatElapsed } from './utils'
import { adminApi } from '@/lib/api'
import type { ModerationSession } from '@/lib/api'
import { t } from '@/lib/i18n'
import type { Lang, Listing } from '@/types'

interface ModerationWorkspaceProps {
  lang: Lang
  session: ModerationSession
  onSessionEnd: (ended: ModerationSession) => void
  onBack: () => void
}

interface SessionStats {
  approved: number
  rejected: number
  skipped: number
}

interface ToastState {
  id: number
  message: string
  variant: ToastVariant
}

export default function ModerationWorkspace({
  lang,
  session: initialSession,
  onSessionEnd,
  onBack,
}: ModerationWorkspaceProps) {
  // Buffer: prefetched listings waiting to be reviewed
  const [buffer, setBuffer]           = useState<Listing[]>([])
  const [current, setCurrent]         = useState<Listing | null>(null)
  const [isLoading, setIsLoading]     = useState(true)
  const [savedFlash, setSavedFlash]   = useState(false)

  // Optimistic session counters (separate from the server session object)
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    approved: initialSession.approved_count,
    rejected: initialSession.rejected_count,
    skipped:  initialSession.skipped_count,
  })

  // Timer — computed from session start time so it resumes correctly after refresh
  const [elapsed, setElapsed]       = useState(() => {
    const startMs = new Date(initialSession.started_at).getTime()
    return Math.floor((Date.now() - startMs) / 1000)
  })
  const timerMinutes                = initialSession.timer_minutes ?? null
  const timerRef                    = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoEndedRef                = useRef(false)

  // Photo index (lifted up so ActionPanel hotkeys can also control it)
  const [photoIndex, setPhotoIndex] = useState(0)

  // Action in-flight flag — prevents double-firing during optimistic advance
  const actionInFlightRef = useRef(false)

  // savedFlash timeout ref
  const savedFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Toast state
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastIdRef = useRef(0)

  function showToast(message: string, variant: ToastVariant) {
    toastIdRef.current += 1
    setToast({ id: toastIdRef.current, message, variant })
  }

  // ── Start timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const startMs = new Date(initialSession.started_at).getTime()
    timerRef.current = setInterval(() => {
      const e = Math.floor((Date.now() - startMs) / 1000)
      setElapsed(e)
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSession.started_at])

  // ── Auto-end when countdown timer reaches 0 ─────────────────────────────────
  useEffect(() => {
    if (timerMinutes === null) return
    const limitSecs = timerMinutes * 60
    if (elapsed >= limitSecs && !autoEndedRef.current) {
      autoEndedRef.current = true
      if (timerRef.current) clearInterval(timerRef.current)
      adminApi
        .endSession(true)
        .then((res) => onSessionEnd(res.data.data))
        .catch(() =>
          onSessionEnd({
            ...initialSession,
            is_active: false,
            approved_count: sessionStats.approved,
            rejected_count: sessionStats.rejected,
            skipped_count:  sessionStats.skipped,
          })
        )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, timerMinutes])

  // ── Prefetch buffer ──────────────────────────────────────────────────────────
  const fetchBuffer = useCallback(async () => {
    try {
      const res = await adminApi.getPendingListings(1, 5, true)
      const items = res.data.data.items
      setBuffer(items)
    } catch {
      setBuffer([])
    }
  }, [])

  // Initial load
  useEffect(() => {
    async function init() {
      setIsLoading(true)
      try {
        const res = await adminApi.getPendingListings(1, 5, true)
        const items = res.data.data.items
        if (items.length > 0) {
          setCurrent(items[0])
          setBuffer(items.slice(1))
        } else {
          setCurrent(null)
          setBuffer([])
        }
      } catch {
        setCurrent(null)
        setBuffer([])
      }
      setIsLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Advance to next listing (optimistic) ─────────────────────────────────────
  const advanceToNext = useCallback(() => {
    setPhotoIndex(0)
    if (buffer.length > 0) {
      const [next, ...rest] = buffer
      setCurrent(next)
      setBuffer(rest)
      if (rest.length < 2) {
        fetchBuffer()
      }
    } else {
      // Buffer empty — try to fetch more
      setCurrent(null)
      setIsLoading(true)
      adminApi.getPendingListings(1, 5, true)
        .then((res) => {
          const items = res.data.data.items
          if (items.length > 0) {
            setCurrent(items[0])
            setBuffer(items.slice(1))
          } else {
            setCurrent(null)
            setBuffer([])
          }
        })
        .catch(() => setCurrent(null))
        .finally(() => setIsLoading(false))
    }
  }, [buffer, fetchBuffer])

  // ── Refetch buffer when it drops below 2 ─────────────────────────────────────
  useEffect(() => {
    if (buffer.length < 2 && current !== null) {
      fetchBuffer()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buffer.length])

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function handleApprove() {
    if (!current || actionInFlightRef.current) return
    actionInFlightRef.current = true
    const id = current.id
    setSessionStats((prev) => ({ ...prev, approved: prev.approved + 1 }))
    advanceToNext()
    showToast(t('mod.toastApproved', lang), 'approve')
    try {
      await adminApi.approveListing(id)
    } catch {
      // Revert optimistic counter and show error
      setSessionStats((prev) => ({ ...prev, approved: prev.approved - 1 }))
      showToast(t('mod.toastActionFailed', lang), 'error')
    } finally {
      actionInFlightRef.current = false
    }
  }

  async function handleReject(reasons: string[]) {
    if (!current || actionInFlightRef.current) return
    actionInFlightRef.current = true
    const id = current.id
    setSessionStats((prev) => ({ ...prev, rejected: prev.rejected + 1 }))
    advanceToNext()
    showToast(t('mod.toastRejected', lang), 'reject')
    try {
      await adminApi.rejectListing(id, reasons.join('; '))
    } catch {
      setSessionStats((prev) => ({ ...prev, rejected: prev.rejected - 1 }))
      showToast(t('mod.toastActionFailed', lang), 'error')
    } finally {
      actionInFlightRef.current = false
    }
  }

  async function handleSkip() {
    if (!current || actionInFlightRef.current) return
    actionInFlightRef.current = true
    const id = current.id
    setSessionStats((prev) => ({ ...prev, skipped: prev.skipped + 1 }))
    advanceToNext()
    showToast(t('mod.toastSkipped', lang), 'skip')
    try {
      await adminApi.skipListing(id)
    } catch {
      setSessionStats((prev) => ({ ...prev, skipped: prev.skipped - 1 }))
      showToast(t('mod.toastActionFailed', lang), 'error')
    } finally {
      actionInFlightRef.current = false
    }
  }

  async function handleEndSession() {
    if (timerRef.current) clearInterval(timerRef.current)
    try {
      const res = await adminApi.endSession(autoEndedRef.current)
      onSessionEnd(res.data.data)
    } catch {
      // Return a synthetic ended session
      onSessionEnd({
        ...initialSession,
        is_active: false,
        approved_count: sessionStats.approved,
        rejected_count: sessionStats.rejected,
        skipped_count:  sessionStats.skipped,
      })
    }
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (!current || actionInFlightRef.current) return

      const imgCount = current.images?.length ?? 0

      switch (e.key) {
        case 'a':
        case 'A':
          e.preventDefault()
          handleApprove()
          break
        case 'r':
        case 'R':
          // R triggers reject — ActionPanel handles enabling only when reasons selected
          break
        case 's':
        case 'S':
          e.preventDefault()
          handleSkip()
          break
        case 'ArrowLeft':
          if (imgCount > 1) {
            e.preventDefault()
            setPhotoIndex((p) => (p - 1 + imgCount) % imgCount)
          }
          break
        case 'ArrowRight':
          if (imgCount > 1) {
            e.preventDefault()
            setPhotoIndex((p) => (p + 1) % imgCount)
          }
          break
        case 'Escape':
          if (window.confirm(t('moderator.endSession', lang) + '?')) {
            handleEndSession()
          }
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, lang])

  // ── Timer display ─────────────────────────────────────────────────────────────
  const timerWarning = timerMinutes !== null && (timerMinutes * 60 - elapsed) < 60 && elapsed > 0
  const timerDisplay = timerMinutes !== null
    ? formatElapsed(Math.max(0, timerMinutes * 60 - elapsed))
    : formatElapsed(elapsed)

  const totalDone = sessionStats.approved + sessionStats.rejected + sessionStats.skipped
  const progressDenom = totalDone + buffer.length + (current ? 1 : 0)
  const progressPct = progressDenom > 0 ? Math.round((totalDone / progressDenom) * 100) : 0

  return (
    <div style={{ height: '100vh', overflow: 'hidden', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{
        height: '48px',
        background: 'var(--nav-bg)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '12px',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', fontSize: '13px', padding: '4px 8px', borderRadius: '6px',
          }}
          aria-label="Back to dashboard"
        >
          <IconArrowLeft />
          {t('moderator.back', lang)}
        </button>

        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
          {t('moderator.queue', lang)}
        </span>

        <span style={{
          background: 'var(--accent-dim)', color: 'var(--accent)',
          padding: '2px 8px', borderRadius: '100px', fontSize: '12px', fontWeight: 600,
        }}>
          {totalDone + 1} {t('moderator.queueCounter', lang)} {progressDenom}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {savedFlash && (
            <span style={{ fontSize: '12px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IconCheck size={12} />
              {t('moderator.saved', lang)}
            </span>
          )}

          {/* Timer */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: timerWarning ? 'var(--color-error-dim)' : 'var(--surface)',
            border: `1px solid ${timerWarning ? 'var(--color-error)' : 'var(--border)'}`,
            padding: '4px 10px', borderRadius: '8px',
          }}
            role="timer"
            aria-live="off"
          >
            <IconClock />
            <span style={{
              fontSize: '13px', fontWeight: 700,
              color: timerWarning ? 'var(--color-error)' : 'var(--text)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {timerDisplay}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', background: 'var(--border)', flexShrink: 0 }}>
        <div style={{
          height: '100%',
          width: `${progressPct}%`,
          background: 'var(--accent)',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* 3-column body */}
      <div className="mod-cols" style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

        {/* Left: Action panel */}
        <ActionPanel
          lang={lang}
          hasListing={current !== null}
          isLoading={isLoading}
          sessionStats={sessionStats}
          onApprove={handleApprove}
          onReject={handleReject}
          onSkip={handleSkip}
          onEndSession={handleEndSession}
        />

        {/* Center: Content */}
        <div
          className="mod-center"
          style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}
        >
          {isLoading ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: 'var(--text-muted)', fontSize: '14px',
            }}>
              {t('common.loading', lang)}
            </div>
          ) : !current ? (
            /* ── Empty queue state (W2) ───────────────────────────────── */
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', gap: '16px', padding: '40px 32px',
            }}>
              {/* Checkmark icon */}
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: 'var(--color-success-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-success)',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '18px', marginBottom: '6px' }}>
                  {t('mod.queueEmptyTitle', lang)}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {t('mod.queueEmptyDesc', lang)}
                </div>
              </div>

              {/* Session stats summary */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                width: '100%',
                maxWidth: '320px',
              }}>
                {[
                  { label: t('moderator.approved', lang), value: sessionStats.approved, color: 'var(--color-success)' },
                  { label: t('moderator.rejected', lang), value: sessionStats.rejected, color: 'var(--color-error)' },
                  { label: t('moderator.skipped', lang),  value: sessionStats.skipped,  color: 'var(--text-muted)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '14px 8px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color }}>{value}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{label}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleEndSession}
                style={{
                  padding: '11px 32px',
                  background: 'var(--accent)', color: 'var(--color-white)',
                  border: 'none', borderRadius: '10px', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 600,
                }}
              >
                {t('moderator.endSession', lang)}
              </button>
            </div>
          ) : (
            <ContentPanel
              lang={lang}
              listing={current}
              photoIndex={photoIndex}
              onPhotoNavigate={setPhotoIndex}
              savedFlash={savedFlash}
              onSaved={() => {
                setSavedFlash(true)
                if (savedFlashRef.current) clearTimeout(savedFlashRef.current)
                savedFlashRef.current = setTimeout(() => setSavedFlash(false), 2000)
              }}
            />
          )}
        </div>

        {/* Right: Author context */}
        {current && (
          <AuthorContext
            lang={lang}
            listing={current}
          />
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Responsive mobile overrides */}
      <style>{`
        @media (max-width: 1023px) {
          .mod-cols { flex-direction: column !important; overflow-y: auto !important; }
          .mod-left  { width: 100% !important; border-right: none !important; border-bottom: 1px solid var(--border) !important; }
          .mod-right { display: none !important; }
          .mod-center { overflow-y: visible !important; }
        }
      `}</style>
    </div>
  )
}
