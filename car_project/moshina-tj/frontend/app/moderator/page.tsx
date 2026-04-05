'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Suspense } from 'react'
import ModeratorDashboard from './components/ModeratorDashboard'
import ModerationWorkspace from './components/ModerationWorkspace'
import { formatElapsed } from './components/utils'
import { IconCheck } from './components/icons'
import { adminApi } from '@/lib/api'
import type { ModerationSession } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { UserRole } from '@/types'

type Screen = 'loading' | 'dashboard' | 'workspace' | 'summary'

const ALLOWED_ROLES: UserRole[] = ['moderator', 'admin']

// ── Summary screen ──────────────────────────────────────────────────────────────
function SummaryScreen({
  session,
  elapsed,
  lang,
  onNewSession,
}: {
  session: ModerationSession
  elapsed: number
  lang: ReturnType<typeof useLang>['lang']
  onNewSession: () => void
}) {
  const total = session.approved_count + session.rejected_count + session.skipped_count

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: 'var(--card)',
        borderRadius: '20px',
        border: '1px solid var(--border)',
        padding: '40px',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
      }}>
        {/* Success icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'var(--color-success-dim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: 'var(--color-success)',
        }}>
          <IconCheck size={28} />
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
          {t('moderator.sessionSummary', lang)}
        </h2>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '28px' }}>
          {formatElapsed(elapsed)}
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: t('moderator.approved', lang), value: session.approved_count, color: 'var(--color-success)' },
            { label: t('moderator.rejected', lang), value: session.rejected_count, color: 'var(--color-error)' },
            { label: t('moderator.skipped', lang),  value: session.skipped_count,  color: 'var(--text-muted)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: 'var(--surface)',
              borderRadius: '12px',
              padding: '16px 12px',
            }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </div>

        {total > 0 && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            {t('moderator.avgTime', lang)}: {formatElapsed(Math.round(elapsed / total))} / {t('admin.tabListings', lang)}
          </div>
        )}

        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
          {t('mod.summaryRedirect', lang)}
        </div>

        <button
          onClick={onNewSession}
          style={{
            width: '100%',
            height: '48px',
            background: 'var(--accent)',
            color: 'var(--color-white)',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t('moderator.newSession', lang)}
        </button>
      </div>
    </div>
  )
}

// ── Main page component ─────────────────────────────────────────────────────────
export default function ModeratorPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { lang } = useLang()

  const [screen, setScreen]             = useState<Screen>('loading')
  const [activeSession, setActiveSession] = useState<ModerationSession | null>(null)
  const [endedSession, setEndedSession]   = useState<ModerationSession | null>(null)

  // For the summary elapsed display — we compute from session timestamps
  const summaryElapsedRef = useRef(0)

  // ── Auth guard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      router.replace('/auth/login')
      return
    }
    if (!ALLOWED_ROLES.includes(user.role)) {
      router.replace('/')
    }
  }, [user, router])

  // ── Check for active session on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!user || !ALLOWED_ROLES.includes(user.role)) return

    async function init() {
      try {
        const res = await adminApi.getActiveSession()
        const active = res.data.data
        if (active && active.is_active) {
          setActiveSession(active)
          setScreen('workspace')
        } else {
          setScreen('dashboard')
        }
      } catch {
        setScreen('dashboard')
      }
    }

    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // ── Session start callback (from dashboard) ──────────────────────────────────
  function handleSessionStart(session: ModerationSession) {
    setActiveSession(session)
    setScreen('workspace')
  }

  // ── Session end callback (from workspace) ────────────────────────────────────
  function handleSessionEnd(ended: ModerationSession) {
    const startMs = new Date(ended.started_at).getTime()
    const endMs   = ended.ended_at ? new Date(ended.ended_at).getTime() : Date.now()
    summaryElapsedRef.current = Math.round((endMs - startMs) / 1000)
    setEndedSession(ended)
    setActiveSession(null)
    setScreen('summary')

    // Auto-redirect to dashboard after 5 seconds
    setTimeout(() => {
      setScreen('dashboard')
      setEndedSession(null)
    }, 5000)
  }

  // ── Loading screen ────────────────────────────────────────────────────────────
  if (screen === 'loading') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg)',
      }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          {t('common.loading', lang)}
        </div>
      </div>
    )
  }

  // ── Dashboard screen ──────────────────────────────────────────────────────────
  if (screen === 'dashboard') {
    return (
      <Suspense fallback={null}>
        <ModeratorDashboard
          lang={lang}
          onSessionStart={handleSessionStart}
        />
      </Suspense>
    )
  }

  // ── Workspace screen ──────────────────────────────────────────────────────────
  if (screen === 'workspace' && activeSession) {
    return (
      <ModerationWorkspace
        lang={lang}
        session={activeSession}
        onSessionEnd={handleSessionEnd}
        onBack={() => setScreen('dashboard')}
      />
    )
  }

  // ── Summary screen ────────────────────────────────────────────────────────────
  if (screen === 'summary' && endedSession) {
    return (
      <SummaryScreen
        session={endedSession}
        elapsed={summaryElapsedRef.current}
        lang={lang}
        onNewSession={() => {
          setEndedSession(null)
          setScreen('dashboard')
        }}
      />
    )
  }

  // Fallback (should not be reached)
  return null
}
