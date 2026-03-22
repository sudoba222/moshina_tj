'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import ActionPanel from './ActionPanel'
import ContentPanel from './ContentPanel'
import AuthorContext from './AuthorContext'
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

  // Timer
  const [elapsed, setElapsed]       = useState(0)
  const [timerMinutes]              = useState<number | null>(initialSession.limit > 0 ? null : null)
  const timerRef                    = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoEndedRef                = useRef(false)

  // Photo index (lifted up so ActionPanel hotkeys can also control it)
  const [photoIndex, setPhotoIndex] = useState(0)

  // Action in-flight flag — prevents double-firing during optimistic advance
  const actionInFlightRef = useRef(false)

  // savedFlash timeout ref
  const savedFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      // Refetch buffer if it's getting low
      if (rest.length < 2) {
        fetchBuffer().then((newItems) => {
          // fetchBuffer updates the buffer state directly via setBuffer
          void newItems
        })
        // We need to separately handle since fetchBuffer sets buffer state
        // We already call setBuffer inside fetchBuffer so just trigger it
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
    try {
      await adminApi.approveListing(id)
    } catch {
      // silent — optimistic; the listing stays claimed
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
    try {
      await adminApi.rejectListing(id, reasons.join('; '))
    } catch {
      // silent
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
    try {
      await adminApi.skipListing(id)
    } catch {
      // silent
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
          // We can't directly call reject without reasons here; ActionPanel owns that.
          // This is a no-op shortcut indicator; the user selects reasons first.
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
  const timerWarning = timerMinutes != null && elapsed > 0 && (timerMinutes * 60 - elapsed) < 60
  const timerDisplay = timerMinutes != null
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
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', gap: '12px', padding: '32px',
            }}>
              <div style={{ color: 'var(--text-muted)' }}><IconCar size={48} /></div>
              <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '16px' }}>
                {t('moderator.noQueue', lang)}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {t('moderator.noQueueDesc', lang)}
              </div>
              <button
                onClick={handleEndSession}
                style={{
                  marginTop: '8px', padding: '10px 24px',
                  background: 'var(--accent)', color: 'var(--color-white)',
                  border: 'none', borderRadius: '10px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 600,
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
