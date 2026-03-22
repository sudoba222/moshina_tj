'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/api'
import type { ModeratorActivity } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { AdminStats, AuditLog } from '@/types'
import StatCard from '@/components/admin/StatCard'
import { MiniBarChart, DonutChart } from '@/components/admin/MiniChart'
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
      <div className="grid gap-[14px] mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-[14px] p-5 h-[110px] border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div style={{ ...s, width: '40px', height: '40px', borderRadius: '10px', marginBottom: '16px' }} />
            <div style={{ ...s, width: '60%', height: '20px', marginBottom: '8px' }} />
            <div style={{ ...s, width: '40%', height: '12px' }} />
          </div>
        ))}
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {[1, 2].map((i) => (
          <div key={i} className="rounded-[14px] p-[18px] h-40 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div style={{ ...s, width: '40%', height: '14px', marginBottom: '20px' }} />
            <div style={{ ...s, width: '100%', height: '100px', borderRadius: '8px' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Stat icons ────────────────────────────────────────────────────────────────
function IconStatUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}
function IconStatListings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  )
}
function IconStatPending() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
function IconStatDealers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="9" width="18" height="13" rx="1" />
      <path d="M8 9V5a1 1 0 011-1h6a1 1 0 011 1v4" />
      <line x1="12" y1="12" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
    </svg>
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
    } catch (e) {
      showToast(t('common.genericError', lang), 'error')
    }
    setLoading(false)
  }, [lang, showToast])

  useEffect(() => { loadData() }, [loadData])

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-bold leading-tight m-0" style={{ color: 'var(--text)' }}>
            {t('admin.dashboard', lang)}
          </h1>
          <p className="text-[13px] mt-0.5 mb-0" style={{ color: 'var(--text-muted)' }}>
            {lang === 'ru' ? 'Обзор платформы в реальном времени' : 'Баррасии платформа дар вақти воқеӣ'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/moderator"
            className="flex items-center gap-[6px] px-[14px] py-2 rounded-lg text-[12px] font-semibold no-underline"
            style={{ background: 'var(--accent)', color: 'var(--color-white)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            {t('admin.moderation', lang)}
            {stats && stats.pending_listings > 0 && (
              <span className="rounded-[100px] px-[5px] text-[10px] font-bold" style={{ background: 'rgba(255,255,255,0.25)' }}>
                {stats.pending_listings}
              </span>
            )}
          </Link>
          <Link
            href="/admin/dealers"
            className="flex items-center gap-[6px] px-[14px] py-2 rounded-lg text-[12px] font-semibold no-underline border"
            style={{ background: 'var(--surface)', color: 'var(--text)', borderColor: 'var(--border)' }}
          >
            {lang === 'ru' ? 'Дилеры' : 'Дилерҳо'}
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
              style={{ background: 'var(--color-warning-bg)', borderColor: 'var(--color-warning-border)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <span className="text-[13px] font-medium" style={{ color: 'var(--color-warning-text)' }}>
                <strong>{stats.pending_listings}</strong> {t('admin.pendingAlert', lang)}
              </span>
              <Link
                href="/moderator"
                className="ml-auto px-3 py-1 rounded-[6px] text-[12px] font-bold no-underline"
                style={{ background: 'var(--color-warning-text)', color: 'var(--color-white)' }}
              >
                {lang === 'ru' ? 'Перейти' : 'Гузаштан'}
              </Link>
            </div>
          )}

          {/* 4 Stat cards */}
          <div className="grid gap-[14px] mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <StatCard label={t('admin.totalUsers', lang)}    value={stats?.total_users ?? 0}    accentColor="var(--color-info)"    icon={<IconStatUsers />} />
            <StatCard label={t('admin.activeListings', lang)} value={stats?.active_listings ?? 0} accentColor="var(--color-success)" icon={<IconStatListings />} />
            <StatCard label={t('admin.pending', lang)}       value={stats?.pending_listings ?? 0} accentColor="var(--color-warning)" icon={<IconStatPending />} />
            <StatCard label={t('admin.totalDealers', lang)}  value={stats?.total_dealers ?? 0}  accentColor="var(--accent)"        icon={<IconStatDealers />} />
          </div>

          {/* Secondary stats */}
          {stats && (
            <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
              {[
                { label: t('admin.totalListings', lang), value: stats.total_listings, color: 'var(--text)' },
                { label: t('admin.totalStaff', lang),    value: stats.total_staff ?? 0,    color: 'var(--text)' },
                { label: lang === 'ru' ? 'Отклонено' : 'Рад шуд', value: stats.rejected_listings ?? 0, color: 'var(--color-error)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-[10px] px-4 py-[14px] border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                  <div className="text-[11px] font-bold uppercase tracking-[0.06em] mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
                  <div className="text-[22px] font-extrabold" style={{ color }}>{value.toLocaleString('ru-RU')}</div>
                </div>
              ))}
            </div>
          )}

          {/* Charts */}
          {stats && (
            <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              <div className="rounded-[14px] border px-5 py-[18px]" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="text-[13px] font-bold mb-4" style={{ color: 'var(--text)' }}>
                  {lang === 'ru' ? 'Объявления по статусу' : 'Эълонҳо аз рӯи вазъ'}
                </div>
                <DonutChart
                  size={90}
                  data={[
                    { label: lang === 'ru' ? 'Активные' : 'Фаъол',    value: stats.active_listings,   color: 'var(--color-success)' },
                    { label: lang === 'ru' ? 'На проверке' : 'Тафтиш', value: stats.pending_listings,  color: 'var(--color-warning)' },
                    { label: lang === 'ru' ? 'Отклонены' : 'Рад',      value: stats.rejected_listings ?? 0, color: 'var(--color-error)' },
                    { label: lang === 'ru' ? 'Прочие' : 'Дигар',       value: Math.max(0, stats.total_listings - stats.active_listings - stats.pending_listings - (stats.rejected_listings ?? 0)), color: 'var(--border-strong)' },
                  ].filter((d) => d.value > 0)}
                />
              </div>

              {moderatorActivity.length > 0 && (
                <div className="rounded-[14px] border px-5 py-[18px]" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                  <div className="text-[13px] font-bold mb-4" style={{ color: 'var(--text)' }}>
                    {t('admin.moderatorPerf', lang)}
                  </div>
                  <MiniBarChart
                    height={100}
                    barColor="var(--accent)"
                    data={moderatorActivity.map((m) => ({
                      label: (m.moderator_name ?? m.phone ?? '?').split(' ')[0],
                      value: m.posts_today,
                    }))}
                  />
                </div>
              )}
            </div>
          )}

          {/* Moderator performance table */}
          {moderatorActivity.length > 0 && (
            <div className="rounded-[14px] border mb-5 overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between px-4 py-[14px] border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="font-bold text-[14px]" style={{ color: 'var(--text)' }}>{t('admin.moderatorPerf', lang)}</span>
                <Link href="/moderator" className="text-[12px] flex items-center gap-1 no-underline" style={{ color: 'var(--accent)' }}>
                  {t('admin.goToModerator', lang)} <IconExternalLink />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {[t('admin.name', lang), t('admin.phone', lang), t('admin.role', lang), t('admin.listingsToday', lang), 'Online'].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {moderatorActivity.map((m) => (
                      <tr key={m.moderator_id}>
                        <td style={tdStyle}>{m.moderator_name ?? '—'}</td>
                        <td style={tdStyle}>{m.phone}</td>
                        <td style={tdStyle}>
                          <span className="px-2 py-0.5 rounded-[100px] text-[11px] font-semibold" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                            moderator
                          </span>
                        </td>
                        <td style={tdStyle}>{m.posts_today}</td>
                        <td style={tdStyle}>
                          <span className="inline-block w-2 h-2 rounded-full mr-[6px]" style={{ background: m.is_online ? 'var(--color-online)' : 'var(--border-strong)' }} />
                          {m.is_online ? 'Online' : 'Offline'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent audit log */}
          {auditLogs.length > 0 && (
            <div className="rounded-[14px] border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between px-4 py-[14px] border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="font-bold text-[14px]" style={{ color: 'var(--text)' }}>{t('admin.recentActivity', lang)}</span>
                <Link href="/admin/system" className="text-[12px] flex items-center gap-1 no-underline" style={{ color: 'var(--accent)' }}>
                  {lang === 'ru' ? 'Полный журнал' : 'Журнали пурра'} <IconExternalLink />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {[t('admin.auditActor', lang), t('admin.auditAction', lang), t('admin.auditTarget', lang), t('admin.auditTime', lang)].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.slice(0, 10).map((log) => (
                      <tr key={log.id}>
                        <td style={tdStyle}>{log.actor_name ?? log.actor_id ?? '—'}</td>
                        <td style={tdStyle}>
                          <span className="px-2 py-0.5 rounded-[6px] text-[12px] font-mono" style={{ background: 'var(--tag-bg)' }}>{log.action}</span>
                        </td>
                        <td style={tdStyle}>{log.target_type ?? '—'} {log.target_id ? `#${log.target_id.slice(0, 6)}` : ''}</td>
                        <td style={tdStyle}>{new Date(log.created_at).toLocaleString('ru-RU')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
