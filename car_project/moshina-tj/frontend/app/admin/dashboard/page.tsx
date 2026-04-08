'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/api'
import type { ModeratorActivity } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { AdminStats, AuditLog, NewUserEntry } from '@/types'
import StatCard from '@/components/admin/StatCard'
import { DonutChart } from '@/components/admin/MiniChart'
import { thStyle, tdStyle } from '../components/shared'
import { IconExternalLink } from '../components/icons'
import { useToast } from '../components/ToastContext'

// ── Skeleton ──────────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  const s: React.CSSProperties = {
    background: 'var(--border)',
    borderRadius: '8px',
    animation: 'dash-skel 1.5s ease-in-out infinite',
  }
  return (
    <div>
      <style>{`@keyframes dash-skel { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <div className="grid gap-[14px] mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-[14px] p-5 h-[110px] border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div style={{ ...s, width: '40px', height: '40px', borderRadius: '10px', marginBottom: '16px' }} />
            <div style={{ ...s, width: '60%', height: '20px', marginBottom: '8px' }} />
            <div style={{ ...s, width: '40%', height: '12px' }} />
          </div>
        ))}
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {[1, 2].map((i) => (
          <div key={i} className="rounded-[14px] p-[18px] h-64 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div style={{ ...s, width: '40%', height: '14px', marginBottom: '20px' }} />
            <div style={{ ...s, width: '100%', height: '160px', borderRadius: '8px' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── SVG icons ─────────────────────────────────────────────────────────────────
function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}
function IconListings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  )
}
function IconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
function IconDealers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="9" width="18" height="13" rx="1" />
      <path d="M8 9V5a1 1 0 011-1h6a1 1 0 011 1v4" />
      <line x1="12" y1="12" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  )
}
function IconXCircle() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}
function IconUserPlus() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  )
}
function IconShield() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

// ── Audit action badge ────────────────────────────────────────────────────────
function AuditActionBadge({ action }: { action: string }) {
  const lower = action.toLowerCase()
  let bg = 'var(--tag-bg)'
  let color = 'var(--text-muted)'

  if (lower.includes('approve') || lower.includes('activate')) {
    bg = 'var(--color-success-dim)'; color = 'var(--color-success)'
  } else if (lower.includes('ban')) {
    bg = 'var(--color-warning-dim)'; color = 'var(--color-warning)'
  } else if (lower.includes('reject') || lower.includes('delete')) {
    bg = 'var(--color-error-dim)'; color = 'var(--color-error)'
  } else if (lower.includes('login') || lower.includes('register')) {
    bg = 'var(--color-info-dim)'; color = 'var(--color-info)'
  }

  return (
    <span
      className="px-2 py-0.5 rounded-[6px] text-[11px] font-semibold font-mono whitespace-nowrap"
      style={{ background: bg, color }}
    >
      {action}
    </span>
  )
}

// ── Role badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    admin:     { bg: 'var(--color-error-dim)',   color: 'var(--color-error)' },
    moderator: { bg: 'var(--accent-dim)',         color: 'var(--accent)' },
    manager:   { bg: 'var(--color-info-dim)',     color: 'var(--color-info)' },
    support:   { bg: 'var(--color-warning-dim)', color: 'var(--color-warning)' },
  }
  const style = map[role.toLowerCase()] ?? { bg: 'var(--tag-bg)', color: 'var(--text-muted)' }
  return (
    <span
      className="px-2 py-0.5 rounded-[100px] text-[11px] font-semibold uppercase tracking-[0.04em]"
      style={{ background: style.bg, color: style.color }}
    >
      {role}
    </span>
  )
}

// ── Line chart with tooltip ───────────────────────────────────────────────────
interface GrowthPoint { date: string; count: number }

interface LineChartProps {
  data: GrowthPoint[]
  lineColor?: string
  height?: number
  label: string
}

function GrowthLineChart({ data, lineColor = 'var(--accent)', height = 160, label }: LineChartProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; count: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  if (data.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>
      </div>
    )
  }

  const W = 300
  const padTop = 10
  const padBottom = 28
  const padLeft = 32
  const padRight = 8
  const chartW = W - padLeft - padRight
  const chartH = height - padTop - padBottom

  const maxVal = Math.max(...data.map((d) => d.count), 1)
  const minVal = Math.min(...data.map((d) => d.count))
  const range = maxVal - minVal || 1

  const pts = data.map((d, i) => ({
    x: padLeft + (i / (data.length - 1)) * chartW,
    y: padTop + chartH - ((d.count - minVal) / range) * chartH,
    date: d.date,
    count: d.count,
  }))

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ')
  const area = [
    `M ${pts[0].x} ${padTop + chartH}`,
    ...pts.map((p) => `L ${p.x} ${p.y}`),
    `L ${pts[pts.length - 1].x} ${padTop + chartH}`,
    'Z',
  ].join(' ')

  // Y-axis tick values
  const yTicks = [minVal, Math.round(minVal + range / 2), maxVal]

  // X-axis labels: first, last, and a few evenly spaced
  const xLabelIndices = new Set<number>([0, data.length - 1])
  const step = Math.ceil(data.length / 5)
  for (let i = step; i < data.length - 1; i += step) xLabelIndices.add(i)

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * W
    // Find closest point
    let best = pts[0]
    let bestDist = Math.abs(pts[0].x - mouseX)
    for (const p of pts) {
      const d = Math.abs(p.x - mouseX)
      if (d < bestDist) { bestDist = d; best = p }
    }
    setTooltip({ x: best.x, y: best.y, date: best.date, count: best.count })
  }

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso)
      return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`
    } catch {
      return iso
    }
  }

  const tooltipW = 90
  const tooltipH = 38

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: '8px',
        }}
      >
        {label}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          viewBox={`0 0 ${W} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={label}
          style={{ display: 'block', minWidth: '240px', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Y axis ticks */}
          {yTicks.map((tick) => {
            const ty = padTop + chartH - ((tick - minVal) / range) * chartH
            return (
              <g key={tick}>
                <line
                  x1={padLeft - 4}
                  y1={ty}
                  x2={padLeft + chartW}
                  y2={ty}
                  stroke="var(--border)"
                  strokeWidth="0.5"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 6}
                  y={ty + 4}
                  textAnchor="end"
                  fontSize="8"
                  fill="var(--text-muted)"
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                >
                  {tick}
                </text>
              </g>
            )
          })}

          {/* Area fill */}
          <path d={area} fill={lineColor} opacity="0.08" />

          {/* Line */}
          <polyline
            points={polyline}
            fill="none"
            stroke={lineColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* X labels */}
          {pts
            .filter((_, i) => xLabelIndices.has(i))
            .map((p, i) => (
              <text
                key={i}
                x={p.x}
                y={height - 4}
                textAnchor={p.x < padLeft + 10 ? 'start' : p.x > W - 12 ? 'end' : 'middle'}
                fontSize="8"
                fill="var(--text-muted)"
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
              >
                {formatDate(p.date)}
              </text>
            ))}

          {/* Tooltip */}
          {tooltip && (() => {
            const tx = Math.min(tooltip.x, W - tooltipW - 4)
            const ty = Math.max(tooltip.y - tooltipH - 8, padTop)
            return (
              <g>
                <circle cx={tooltip.x} cy={tooltip.y} r="3.5" fill={lineColor} />
                <rect
                  x={tx}
                  y={ty}
                  width={tooltipW}
                  height={tooltipH}
                  rx="5"
                  fill="var(--card)"
                  stroke="var(--border)"
                  strokeWidth="1"
                />
                <text
                  x={tx + tooltipW / 2}
                  y={ty + 13}
                  textAnchor="middle"
                  fontSize="9"
                  fill="var(--text-muted)"
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                >
                  {formatDate(tooltip.date)}
                </text>
                <text
                  x={tx + tooltipW / 2}
                  y={ty + 28}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="var(--text)"
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                >
                  {tooltip.count.toLocaleString('ru-RU')}
                </text>
              </g>
            )
          })()}
        </svg>
      </div>
    </div>
  )
}

// ── Section card wrapper ───────────────────────────────────────────────────────
function SectionCard({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-[14px] border overflow-hidden"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div
        className="flex items-center justify-between px-4 py-[14px] border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="font-bold text-[14px]" style={{ color: 'var(--text)' }}>
          {title}
        </span>
        {action}
      </div>
      {children}
    </div>
  )
}

// ── New Users Slide-over Panel ────────────────────────────────────────────────
const PERIOD_OPTIONS = [
  { days: 1,  label: 'Сегодня' },
  { days: 7,  label: '7 дней' },
  { days: 30, label: '30 дней' },
]

function NewUsersPanel({ onClose }: { onClose: () => void }) {
  const [days, setDays] = useState(1)
  const [page, setPage] = useState(1)
  const [users, setUsers] = useState<NewUserEntry[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  const load = useCallback(async (d: number, p: number) => {
    setLoading(true)
    try {
      const res = await adminApi.getNewUsers(d, p)
      setUsers(res.data.data.items)
      setTotal(res.data.data.total)
      setPages(res.data.data.pages)
    } catch {
      showToast('Ошибка загрузки', 'error')
    }
    setLoading(false)
  }, [showToast])

  useEffect(() => { load(days, page) }, [days, page, load])

  const changePeriod = (d: number) => { setDays(d); setPage(1) }

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    } catch { return iso }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 49 }}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Новые пользователи"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '740px',
          background: 'var(--bg)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-xl, -8px 0 40px rgba(0,0,0,0.18))',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
        >
          <div>
            <div className="font-bold text-[16px]" style={{ color: 'var(--text)' }}>
              Новые пользователи
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {total} {total === 1 ? 'пользователь' : total < 5 ? 'пользователя' : 'пользователей'} за выбранный период
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '6px 10px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Закрыть
          </button>
        </div>

        {/* Period tabs */}
        <div className="flex gap-2 px-5 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => changePeriod(opt.days)}
              style={{
                padding: '5px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: days === opt.days ? 'var(--accent)' : 'var(--border)',
                background: days === opt.days ? 'var(--accent)' : 'var(--surface)',
                color: days === opt.days ? 'var(--color-white)' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
          <Link
            href="/admin/users"
            className="ml-auto flex items-center gap-1 text-[12px] no-underline"
            style={{ color: 'var(--accent)' }}
          >
            Все пользователи <IconExternalLink />
          </Link>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                Нет новых пользователей за этот период
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Пользователь', 'Контакты', 'Объявления', 'Статус', 'Дата регистрации'].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      {/* Name + role */}
                      <td style={{ ...tdStyle, minWidth: '140px' }}>
                        <div className="flex items-center gap-[10px]">
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: 'var(--accent)',
                              opacity: 0.15,
                              flexShrink: 0,
                              position: 'relative',
                            }}
                          >
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 7 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                                {(u.name || u.phone || '?').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                              {u.name || '—'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              #{u.user_number ?? '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contacts */}
                      <td style={{ ...tdStyle, minWidth: '160px' }}>
                        <div style={{ fontSize: 12 }}>
                          {u.phone && !u.phone.startsWith('email_') && (
                            <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>
                              {u.phone}
                              {u.phone_verified && (
                                <span style={{ marginLeft: 4, color: 'var(--color-success)', fontSize: 10 }}>✓</span>
                              )}
                            </div>
                          )}
                          {u.email && (
                            <div style={{ color: 'var(--text-muted)' }}>
                              {u.email}
                              {u.email_verified && (
                                <span style={{ marginLeft: 4, color: 'var(--color-success)', fontSize: 10 }}>✓</span>
                              )}
                            </div>
                          )}
                          {u.telegram_linked && (
                            <div style={{ color: 'var(--color-info)', fontSize: 11, marginTop: 2 }}>
                              Telegram
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Listings */}
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                          {u.listing_count}
                        </div>
                        {u.active_listing_count > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--color-success)' }}>
                            {u.active_listing_count} акт.
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={tdStyle}>
                        {u.is_banned ? (
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'var(--color-error-dim)', color: 'var(--color-error)' }}>
                            Заблокирован
                          </span>
                        ) : (
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'var(--color-success-dim)', color: 'var(--color-success)' }}>
                            Активен
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {formatDate(u.created_at)}
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
          <div
            className="flex items-center justify-between px-5 py-3 border-t flex-shrink-0"
            style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
          >
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={{
                padding: '5px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: page <= 1 ? 'var(--text-muted)' : 'var(--text)',
                opacity: page <= 1 ? 0.5 : 1,
              }}
            >
              ← Назад
            </button>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {page} / {pages}
            </span>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: '5px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: page >= pages ? 'not-allowed' : 'pointer',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: page >= pages ? 'var(--text-muted)' : 'var(--text)',
                opacity: page >= pages ? 0.5 : 1,
              }}
            >
              Вперёд →
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const { lang } = useLang()
  const { showToast } = useToast()

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [moderatorActivity, setModeratorActivity] = useState<ModeratorActivity[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewUsers, setShowNewUsers] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, aRes, logsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getModeratorActivity(),
        adminApi.getAuditLogs(1),
      ])
      setStats(sRes.data.data)
      setModeratorActivity(aRes.data.data ?? [])
      setAuditLogs(logsRes.data.data.items ?? [])
    } catch {
      showToast(t('common.genericError', lang), 'error')
    }
    setLoading(false)
  }, [lang, showToast])

  useEffect(() => { loadData() }, [loadData])

  return (
    <div>
      {showNewUsers && <NewUsersPanel onClose={() => setShowNewUsers(false)} />}

      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-bold leading-tight m-0" style={{ color: 'var(--text)' }}>
            {t('admin.dashboard', lang)}
          </h1>
          <p className="text-[13px] mt-0.5 mb-0" style={{ color: 'var(--text-muted)' }}>
            {t('admin.sectionOverview', lang)}
          </p>
        </div>
        {/* Quick actions */}
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/moderator"
            className="flex items-center gap-[6px] px-[14px] py-2 rounded-lg text-[12px] font-semibold no-underline"
            style={{ background: 'var(--accent)', color: 'var(--color-white)' }}
          >
            <IconShield />
            {t('admin.moderation', lang)}
            {stats && stats.pending_listings > 0 && (
              <span
                className="rounded-[100px] px-[6px] py-[1px] text-[10px] font-bold"
                style={{ background: 'rgba(255,255,255,0.25)' }}
              >
                {stats.pending_listings}
              </span>
            )}
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-[6px] px-[14px] py-2 rounded-lg text-[12px] font-semibold no-underline border"
            style={{ background: 'var(--surface)', color: 'var(--text)', borderColor: 'var(--border)' }}
          >
            {t('admin.manageUsers', lang)}
          </Link>
          <Link
            href="/admin/dealers"
            className="flex items-center gap-[6px] px-[14px] py-2 rounded-lg text-[12px] font-semibold no-underline border"
            style={{ background: 'var(--surface)', color: 'var(--text)', borderColor: 'var(--border)' }}
          >
            {t('admin.sectionDealers', lang)}
          </Link>
        </div>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Pending alert */}
          {stats && stats.pending_listings > 0 && (
            <div
              role="alert"
              className="flex items-center gap-[10px] px-4 py-3 rounded-[10px] border mb-5"
              style={{
                background: 'var(--color-warning-dim)',
                borderColor: 'var(--color-warning)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="text-[13px] font-medium" style={{ color: 'var(--color-warning)' }}>
                <strong>{stats.pending_listings}</strong>{' '}
                {t('admin.pendingAlert', lang)}
              </span>
              <Link
                href="/moderator"
                className="ml-auto px-3 py-1 rounded-[6px] text-[12px] font-bold no-underline"
                style={{ background: 'var(--color-warning)', color: 'var(--color-white)' }}
              >
                {t('admin.goToModerator', lang)}
              </Link>
            </div>
          )}

          {/* 6 KPI cards */}
          <div
            className="grid gap-[14px] mb-6"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))' }}
          >
            <StatCard
              label={t('admin.totalUsers', lang)}
              value={stats?.total_users ?? 0}
              accentColor="var(--color-info)"
              icon={<IconUsers />}
              trend={
                stats?.new_users_today !== undefined
                  ? { value: stats.new_users_today, label: `+${stats.new_users_today} ${t('admin.newUsersToday', lang)}` }
                  : undefined
              }
              onClick={() => setShowNewUsers(true)}
            />
            <StatCard
              label={t('admin.activeListings', lang)}
              value={stats?.active_listings ?? 0}
              accentColor="var(--color-success)"
              icon={<IconListings />}
            />
            <StatCard
              label={t('admin.pending', lang)}
              value={stats?.pending_listings ?? 0}
              accentColor={stats && stats.pending_listings > 0 ? 'var(--color-error)' : 'var(--color-warning)'}
              icon={<IconClock />}
            />
            <StatCard
              label={t('admin.totalDealers', lang)}
              value={stats?.total_dealers ?? 0}
              accentColor="var(--accent)"
              icon={<IconDealers />}
              trend={
                stats?.verified_dealers !== undefined
                  ? { value: stats.verified_dealers, label: `${stats.verified_dealers} ${t('admin.verifiedDealers', lang)}` }
                  : undefined
              }
            />
            <StatCard
              label={t('admin.rejectedListings', lang)}
              value={stats?.rejected_listings ?? 0}
              accentColor="var(--color-error)"
              icon={<IconXCircle />}
            />
            <StatCard
              label={t('admin.newUsersToday', lang)}
              value={stats?.new_users_today ?? stats?.active_users_today ?? 0}
              accentColor="var(--color-success)"
              icon={<IconUserPlus />}
              onClick={() => setShowNewUsers(true)}
            />
          </div>

          {stats && (
            <>
              {/* Growth charts row */}
              {((stats.user_growth && stats.user_growth.length >= 2) ||
                (stats.listing_growth && stats.listing_growth.length >= 2)) && (
                <div
                  className="grid gap-4 mb-6"
                  style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
                >
                  {stats.user_growth && stats.user_growth.length >= 2 && (
                    <div
                      className="rounded-[14px] border px-5 py-[18px]"
                      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
                    >
                      <GrowthLineChart
                        data={stats.user_growth}
                        lineColor="var(--color-info)"
                        height={160}
                        label={t('admin.userGrowth', lang)}
                      />
                    </div>
                  )}
                  {stats.listing_growth && stats.listing_growth.length >= 2 && (
                    <div
                      className="rounded-[14px] border px-5 py-[18px]"
                      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
                    >
                      <GrowthLineChart
                        data={stats.listing_growth}
                        lineColor="var(--color-success)"
                        height={160}
                        label={t('admin.listingGrowth', lang)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Donut + moderator bar chart row */}
              <div
                className="grid gap-4 mb-6"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
              >
                {/* Listings distribution donut */}
                <div
                  className="rounded-[14px] border px-5 py-[18px]"
                  style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
                >
                  <div className="text-[13px] font-bold mb-4" style={{ color: 'var(--text)' }}>
                    {t('admin.analytics', lang)}
                  </div>
                  <DonutChart
                    size={90}
                    data={[
                      {
                        label: t('admin.activeListings', lang),
                        value: stats.active_listings,
                        color: 'var(--color-success)',
                      },
                      {
                        label: t('admin.pending', lang),
                        value: stats.pending_listings,
                        color: 'var(--color-warning)',
                      },
                      {
                        label: t('admin.rejectedListings', lang),
                        value: stats.rejected_listings ?? 0,
                        color: 'var(--color-error)',
                      },
                      {
                        label: t('admin.all', lang),
                        value: Math.max(
                          0,
                          stats.total_listings -
                            stats.active_listings -
                            stats.pending_listings -
                            (stats.rejected_listings ?? 0)
                        ),
                        color: 'var(--border-strong)',
                      },
                    ].filter((d) => d.value > 0)}
                  />
                </div>

                {/* Moderator mini chart */}
                {moderatorActivity.length > 0 && (
                  <div
                    className="rounded-[14px] border px-5 py-[18px]"
                    style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
                  >
                    <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--text)' }}>
                      {t('admin.moderatorPerf', lang)}
                    </div>
                    <div className="flex flex-col gap-2">
                      {moderatorActivity.map((m) => {
                        const maxToday = Math.max(...moderatorActivity.map((a) => a.posts_today), 1)
                        const pct = (m.posts_today / maxToday) * 100
                        return (
                          <div key={m.moderator_id} className="flex items-center gap-3">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{
                                background: m.is_online
                                  ? 'var(--color-online)'
                                  : 'var(--border-strong)',
                              }}
                              aria-hidden="true"
                            />
                            <div
                              className="text-[12px] truncate flex-shrink-0"
                              style={{ color: 'var(--text)', width: '80px' }}
                            >
                              {(m.moderator_name ?? m.phone ?? '?').split(' ')[0]}
                            </div>
                            <div
                              className="flex-1 rounded-[3px] overflow-hidden"
                              style={{ height: '6px', background: 'var(--border)' }}
                            >
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: '100%',
                                  background: 'var(--accent)',
                                  borderRadius: '3px',
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </div>
                            <div
                              className="text-[12px] font-bold flex-shrink-0"
                              style={{ color: 'var(--text)', minWidth: '24px', textAlign: 'right' }}
                            >
                              {m.posts_today}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Moderator performance table */}
          {moderatorActivity.length > 0 && (
            <div className="mb-5">
              <SectionCard
                title={t('admin.moderatorPerf', lang)}
                action={
                  <Link
                    href="/moderator"
                    className="text-[12px] flex items-center gap-1 no-underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    {t('admin.goToModerator', lang)} <IconExternalLink />
                  </Link>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {[
                          t('admin.name', lang),
                          t('admin.phone', lang),
                          t('admin.role', lang),
                          t('admin.listingsToday', lang),
                          t('admin.onlineStatus', lang),
                        ].map((h) => (
                          <th key={h} style={thStyle}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {moderatorActivity.map((m) => (
                        <tr key={m.moderator_id}>
                          <td style={tdStyle}>
                            <span style={{ fontWeight: 600 }}>{m.moderator_name ?? '—'}</span>
                          </td>
                          <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>
                            {m.phone}
                          </td>
                          <td style={tdStyle}>
                            <RoleBadge role="moderator" />
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 700 }}>{m.posts_today}</td>
                          <td style={tdStyle}>
                            <span
                              className="inline-block w-2 h-2 rounded-full mr-[6px]"
                              style={{
                                background: m.is_online
                                  ? 'var(--color-online)'
                                  : 'var(--border-strong)',
                              }}
                              aria-hidden="true"
                            />
                            <span style={{ color: m.is_online ? 'var(--color-online)' : 'var(--text-muted)' }}>
                              {m.is_online ? t('admin.onlineNow', lang) : t('admin.offlineNow', lang)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </div>
          )}

          {/* Recent audit log */}
          {auditLogs.length > 0 && (
            <SectionCard
              title={t('admin.recentActivity', lang)}
              action={
                <Link
                  href="/admin/system"
                  className="text-[12px] flex items-center gap-1 no-underline"
                  style={{ color: 'var(--accent)' }}
                >
                  {t('admin.auditLog', lang)} <IconExternalLink />
                </Link>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {[
                        t('admin.auditActor', lang),
                        t('admin.auditAction', lang),
                        t('admin.auditTarget', lang),
                        t('admin.auditTime', lang),
                      ].map((h) => (
                        <th key={h} style={thStyle}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.slice(0, 10).map((log) => (
                      <tr key={log.id}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>
                          {log.actor_name ?? log.actor_id ?? '—'}
                        </td>
                        <td style={tdStyle}>
                          <AuditActionBadge action={log.action} />
                        </td>
                        <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>
                          {log.target_type ?? '—'}
                          {log.target_id ? (
                            <span
                              className="ml-1 font-mono text-[11px]"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              #{log.target_id.slice(0, 6)}
                            </span>
                          ) : null}
                        </td>
                        <td style={{ ...tdStyle, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(log.created_at).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  )
}
