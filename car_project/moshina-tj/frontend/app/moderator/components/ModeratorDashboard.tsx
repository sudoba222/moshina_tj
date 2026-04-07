'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { IconArrowLeft, IconCalendar } from './icons'
import { formatElapsed, formatShortDate } from './utils'
import { adminApi } from '@/lib/api'
import type { ModerationSession } from '@/lib/api'
import { t } from '@/lib/i18n'
import type { Lang, SessionHistoryItem } from '@/types'

interface ModeratorDashboardProps {
  lang: Lang
  onSessionStart: (session: ModerationSession) => void
}

interface StatsCard {
  label: string
  value: number | string
  color?: string
}

export default function ModeratorDashboard({ lang, onSessionStart }: ModeratorDashboardProps) {
  // Stats
  const [pendingCount, setPendingCount]     = useState(0)
  const [approvedToday, setApprovedToday]   = useState(0)
  const [rejectedToday, setRejectedToday]   = useState(0)
  const [statsLoading, setStatsLoading]     = useState(true)

  // Session history
  const [history, setHistory]     = useState<SessionHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  // Session filter form
  const [filterTimer, setFilterTimer]       = useState<number | null>(null)
  const [filterType, setFilterType]         = useState<'sale' | 'rent' | null>(null)
  const [filterCity, setFilterCity]         = useState('')
  const [filterBrand, setFilterBrand]       = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo]     = useState('')
  const [starting, setStarting]             = useState(false)
  const [startError, setStartError]         = useState('')

  useEffect(() => {
    // Load admin stats for pending count
    adminApi
      .getStats()
      .then((res) => {
        setPendingCount(res.data.data.pending_listings)
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false))

    // Load session history to compute today's totals
    adminApi
      .getSessionHistory()
      .then((res) => {
        const items = res.data.data ?? []
        setHistory(items)

        // Compute approved/rejected today from sessions started today
        const todayStr = new Date().toISOString().slice(0, 10)
        let todayApproved = 0
        let todayRejected = 0
        for (const item of items) {
          if (item.started_at.startsWith(todayStr)) {
            todayApproved += item.posts_approved
            todayRejected += item.posts_rejected
          }
        }
        setApprovedToday(todayApproved)
        setRejectedToday(todayRejected)
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }, [])

  async function handleStartSession() {
    setStarting(true)
    setStartError('')
    try {
      const res = await adminApi.startSession({
        timer_minutes: filterTimer,
        filter_date_from: filterDateFrom ? new Date(filterDateFrom).toISOString() : null,
        filter_date_to:   filterDateTo   ? new Date(filterDateTo).toISOString()   : null,
        filter_type:      filterType,
        filter_city:      filterCity  || null,
        filter_brand:     filterBrand || null,
      })
      onSessionStart(res.data.data)
    } catch {
      setStartError(t('common.genericError', lang))
    } finally {
      setStarting(false)
    }
  }

  const statsCards: StatsCard[] = [
    { label: t('mod.inQueue', lang), value: statsLoading ? '…' : pendingCount, color: 'var(--accent)' },
    { label: t('mod.approvedToday', lang), value: statsLoading ? '…' : approvedToday, color: 'var(--color-success)' },
    { label: t('mod.rejectedToday', lang), value: statsLoading ? '…' : rejectedToday, color: 'var(--color-error)' },
  ]

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '13px',
    color: 'var(--text)',
    outline: 'none',
    width: '100%',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '5px',
    display: 'block',
  }

  const recentHistory = history.slice(0, 10)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 16px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <Link
            href="/dashboard"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px', borderRadius: '8px',
              background: 'var(--card)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
            aria-label="Back to dashboard"
          >
            <IconArrowLeft />
          </Link>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>
              {t('moderator.title', lang)}
            </h1>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {pendingCount} {t('moderator.pending', lang)}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)', display: 'grid' }}>
          {statsCards.map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '18px 16px',
              }}
            >
              <div style={{ fontSize: '28px', fontWeight: 700, color: color ?? 'var(--text)', lineHeight: 1 }}>
                {value}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Session start form */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '20px' }}>
            {t('moderator.startSession', lang)}
          </h2>

          {/* Timer presets */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>{t('moderator.filterTimer', lang)}</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[null, 10, 20, 30].map((m) => (
                <button
                  key={m ?? 'unlimited'}
                  onClick={() => setFilterTimer(m)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${filterTimer === m ? 'var(--accent)' : 'var(--border)'}`,
                    background: filterTimer === m ? 'var(--accent-dim)' : 'var(--surface)',
                    color: filterTimer === m ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: '13px',
                    fontWeight: filterTimer === m ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {m === null ? t('moderator.timerNoLimit', lang) : `${m} ${t('moderator.timerMin', lang)}`}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
            {/* Type */}
            <div>
              <label style={labelStyle}>{t('moderator.filterType', lang)}</label>
              <select
                value={filterType ?? ''}
                onChange={(e) => setFilterType((e.target.value as 'sale' | 'rent') || null)}
                style={inputStyle}
                aria-label="Filter type"
              >
                <option value="">{t('moderator.allTypes', lang)}</option>
                <option value="sale">{t('moderator.sale', lang)}</option>
                <option value="rent">{t('moderator.rent', lang)}</option>
              </select>
            </div>

            {/* Brand */}
            <div>
              <label style={labelStyle}>{t('moderator.filterBrand', lang)}</label>
              <input
                value={filterBrand}
                onChange={(e) => setFilterBrand(e.target.value)}
                style={inputStyle}
                placeholder="Toyota, BMW..."
                aria-label="Filter brand"
              />
            </div>

            {/* City */}
            <div>
              <label style={labelStyle}>{t('moderator.filterCity', lang)}</label>
              <input
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                style={inputStyle}
                placeholder={t('moderator.filterCityPlaceholder', lang)}
                aria-label="Filter city"
              />
            </div>

            {/* Date from */}
            <div>
              <label style={labelStyle}>
                <IconCalendar size={11} />
                {' '}{t('moderator.filterDateFrom', lang)}
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                style={inputStyle}
                aria-label="Date from"
              />
            </div>

            {/* Date to */}
            <div>
              <label style={labelStyle}>
                <IconCalendar size={11} />
                {' '}{t('moderator.filterDateTo', lang)}
              </label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                style={inputStyle}
                aria-label="Date to"
              />
            </div>
          </div>

          {startError && (
            <div style={{
              background: 'var(--color-error-dim)',
              color: 'var(--color-error)',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '13px',
              marginBottom: '12px',
            }}
              role="alert"
            >
              {startError}
            </div>
          )}

          <button
            onClick={handleStartSession}
            disabled={starting}
            style={{
              width: '100%',
              height: '52px',
              background: starting ? 'var(--border)' : 'var(--color-success)',
              color: starting ? 'var(--text-muted)' : 'var(--color-white)',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: starting ? 'not-allowed' : 'pointer',
              letterSpacing: '0.02em',
            }}
          >
            {starting ? t('common.loading', lang) : t('moderator.startSession', lang)}
          </button>
        </div>

        {/* Recent sessions table */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          overflow: 'hidden',
          marginBottom: '40px',
        }}>
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            fontWeight: 600,
            fontSize: '14px',
            color: 'var(--text)',
          }}>
            {t('moderator.sessionHistory', lang)}
          </div>

          {historyLoading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              {t('common.loading', lang)}
            </div>
          ) : recentHistory.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              {t('common.noData', lang)}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {[
                      t('admin.created', lang),
                      t('moderator.approved', lang),
                      t('moderator.rejected', lang),
                      t('moderator.skipped', lang),
                      t('moderator.duration', lang),
                      t('mod.filters', lang),
                    ].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        style={{
                          padding: '10px 14px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                          textAlign: 'left',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderBottom: '1px solid var(--border)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentHistory.map((row) => {
                    const filterParts: string[] = []
                    if (row.filters?.type)   filterParts.push(row.filters.type)
                    if (row.filters?.city)   filterParts.push(row.filters.city)
                    if (row.filters?.brand)  filterParts.push(row.filters.brand)
                    if (row.timer_minutes)   filterParts.push(`${row.timer_minutes} min`)

                    return (
                      <tr key={row.session_id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {formatShortDate(row.started_at)}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--color-success)', fontWeight: 700 }}>
                          {row.posts_approved}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--color-error)', fontWeight: 700 }}>
                          {row.posts_rejected}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text)' }}>
                          {row.posts_skipped}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                          {row.duration_seconds != null ? formatElapsed(row.duration_seconds) : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)' }}>
                          {filterParts.length > 0 ? filterParts.join(' / ') : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
