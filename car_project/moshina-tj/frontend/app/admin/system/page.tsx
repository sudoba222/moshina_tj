'use client'
import { useCallback, useEffect, useState } from 'react'
import { adminApi, vehicleApi } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { AdminStats, AuditLog } from '@/types'
import { thStyle, tdStyle } from '../components/shared'
import { useToast } from '../components/ToastContext'

export default function AdminSystemPage() {
  const { lang } = useLang()
  const { showToast } = useToast()

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditPage, setAuditPage] = useState(1)
  const [auditTotal, setAuditTotal] = useState(0)
  const [logsLoading, setLogsLoading] = useState(false)

  const loadStats = useCallback(async () => {
    try {
      const res = await adminApi.getStats()
      setStats(res.data.data)
    } catch { /* silent — stats are non-critical here */ }
  }, [])

  const loadLogs = useCallback(async (p: number) => {
    setLogsLoading(true)
    try {
      const res = await adminApi.getAuditLogs(p)
      setAuditLogs(res.data.data.items)
      setAuditTotal(res.data.data.total)
    } catch (e) {
      showToast(t('common.genericError', lang), 'error')
    }
    setLogsLoading(false)
  }, [lang, showToast])

  useEffect(() => { loadStats(); loadLogs(1) }, [loadStats, loadLogs])

  function handlePage(p: number) {
    setAuditPage(p)
    loadLogs(p)
  }

  const [nhtsa, setNhtsa] = useState<{ loading: boolean; result: string }>({ loading: false, result: '' })
  async function handleNhtsaImport(makesOnly: boolean) {
    setNhtsa({ loading: true, result: '' })
    try {
      const res = await vehicleApi.importNhtsa(makesOnly)
      const d = res.data.data
      setNhtsa({ loading: false, result: `+${d.added_makes} makes, +${d.added_models} models` })
      showToast(t('admin.importSuccess', lang), 'success')
    } catch {
      setNhtsa({ loading: false, result: '' })
      showToast(t('admin.importError', lang), 'error')
    }
  }

  const totalPages = Math.ceil(auditTotal / 20)

  return (
    <div>
      <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', margin: '0 0 20px 0' }}>
        {t('admin.system', lang)}
      </h1>

      {/* NHTSA vehicle database import */}
      <div style={{ background: 'var(--card)', borderRadius: '14px', padding: '20px', border: '1px solid var(--border)', marginBottom: '28px' }}>
        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)', marginBottom: '6px' }}>
          {lang === 'ru' ? 'База автомобилей (NHTSA)' : 'Пойгоҳи мошинаҳо (NHTSA)'}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
          {lang === 'ru'
            ? 'Импортирует марки и модели из бесплатной базы NHTSA (США, 10 000+ авто) + китайские/СНГ марки. Первый запуск занимает ~2–5 мин.'
            : 'Марка ва моделҳоро аз пойгоҳи ройгони NHTSA (ИМА, 10 000+ мошин) + марқаҳои Хитой/СНГ ворид мекунад. Бори аввал ~2–5 дақиқа.'}
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => handleNhtsaImport(true)}
            disabled={nhtsa.loading}
            style={{ height: '36px', padding: '0 16px', background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: nhtsa.loading ? 'not-allowed' : 'pointer' }}
          >
            {lang === 'ru' ? 'Только марки' : 'Танҳо марқаҳо'}
          </button>
          <button
            onClick={() => handleNhtsaImport(false)}
            disabled={nhtsa.loading}
            style={{ height: '36px', padding: '0 16px', background: 'var(--accent)', color: 'var(--color-white)', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: nhtsa.loading ? 'not-allowed' : 'pointer' }}
          >
            {nhtsa.loading
              ? (lang === 'ru' ? 'Импорт…' : 'Импорт…')
              : (lang === 'ru' ? 'Полный импорт (марки + модели)' : 'Импорти пурра (марқа + моделҳо)')}
          </button>
          {nhtsa.result && (
            <span style={{ fontSize: '13px', color: 'var(--color-success)', fontWeight: 600 }}>
              {nhtsa.result}
            </span>
          )}
        </div>
      </div>

      {/* Platform config cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '32px' }}>
        {[
          { label: t('admin.apiUrl', lang),     value: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1' },
          { label: t('admin.environment', lang), value: process.env.NODE_ENV ?? 'development' },
          { label: t('admin.version', lang),     value: '1.0.0' },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--card)', borderRadius: '12px', padding: '18px 20px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</div>
            <div style={{ fontSize: '13px', fontFamily: 'monospace', color: 'var(--text)', wordBreak: 'break-all' }}>{value}</div>
          </div>
        ))}
        {stats && [
          { label: t('admin.totalUsers', lang),    value: stats.total_users },
          { label: t('admin.totalListings', lang), value: stats.total_listings },
          { label: t('admin.totalDealers', lang),  value: stats.total_dealers },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--card)', borderRadius: '12px', padding: '18px 20px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)' }}>{value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Full audit log */}
      <div style={{ background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>{t('admin.auditLog', lang)}</span>
        </div>
        {logsLoading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading', lang)}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {[t('admin.auditActor', lang), t('admin.auditAction', lang), t('admin.auditTarget', lang), t('admin.auditTime', lang)].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ ...tdStyle, textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      {t('admin.noLogs', lang)}
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={tdStyle}>{log.actor_name ?? log.actor_id ?? '—'}</td>
                      <td style={tdStyle}>
                        <span style={{ background: 'var(--tag-bg)', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace' }}>{log.action}</span>
                      </td>
                      <td style={tdStyle}>{log.target_type ?? '—'} {log.target_id ? `#${log.target_id.slice(0, 6)}` : ''}</td>
                      <td style={tdStyle}>{new Date(log.created_at).toLocaleString('ru-RU')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', justifyContent: 'center', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
            <button
              disabled={auditPage === 1}
              onClick={() => handlePage(auditPage - 1)}
              style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: auditPage === 1 ? 'default' : 'pointer', opacity: auditPage === 1 ? 0.4 : 1 }}
            >
              &#8249;
            </button>
            <span style={{ padding: '6px 14px', fontSize: '13px', color: 'var(--text-muted)' }}>
              {auditPage} / {totalPages}
            </span>
            <button
              disabled={auditPage >= totalPages}
              onClick={() => handlePage(auditPage + 1)}
              style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: auditPage >= totalPages ? 'default' : 'pointer', opacity: auditPage >= totalPages ? 0.4 : 1 }}
            >
              &#8250;
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
