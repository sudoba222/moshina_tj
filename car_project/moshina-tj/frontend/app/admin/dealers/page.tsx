'use client'
import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { Dealer } from '@/types'
import { thStyle, tdStyle, Pagination, LoadingRow, extractApiError } from '../components/shared'
import { useToast } from '../components/ToastContext'

const PAGE_SIZE = 20

export default function AdminDealersPage() {
  const { lang } = useLang()
  const { showToast } = useToast()

  const [dealers, setDealers] = useState<Dealer[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadDealers = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await adminApi.getDealers(p)
      setDealers(res.data.data.items)
      setTotal(res.data.data.total)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
    setLoading(false)
  }, [lang, showToast])

  useEffect(() => { loadDealers(page) }, [page, loadDealers])

  async function handleVerifyDealer(dealerId: string) {
    setActionLoading(dealerId)
    try {
      await adminApi.verifyDealer(dealerId)
      showToast(lang === 'ru' ? 'Дилер верифицирован' : 'Дилер тасдиқ шуд', 'success')
      loadDealers(page)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
    setActionLoading(null)
  }

  async function handleUnverifyDealer(dealerId: string) {
    setActionLoading(dealerId)
    try {
      await adminApi.unverifyDealer(dealerId)
      showToast(lang === 'ru' ? 'Верификация снята' : 'Тасдиқ бардошта шуд', 'success')
      loadDealers(page)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
    setActionLoading(null)
  }

  return (
    <div>
      <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', margin: '0 0 20px 0' }}>
        {t('admin.tabDealers', lang)}
      </h1>

      <div style={{ background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr>
                {[t('admin.name', lang), t('admin.phone', lang), t('admin.city', lang), t('admin.status', lang), t('admin.actions', lang)].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <LoadingRow colSpan={5} />
              ) : dealers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    {t('common.noData', lang)}
                  </td>
                </tr>
              ) : (
                dealers.map((d) => (
                  <tr key={d.id}>
                    <td style={tdStyle}>{d.business_name}</td>
                    <td style={tdStyle}>{d.phone ?? '—'}</td>
                    <td style={tdStyle}>{d.city ?? '—'}</td>
                    <td style={tdStyle}>
                      {d.verified ? (
                        <span style={{ background: 'var(--color-success-dim)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>
                          {t('admin.verified', lang)}
                        </span>
                      ) : (
                        <span style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>
                          {t('admin.notVerified', lang)}
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      {d.verified ? (
                        <button
                          onClick={() => handleUnverifyDealer(d.id)}
                          disabled={actionLoading === d.id}
                          style={{ padding: '4px 10px', background: 'var(--color-error-dim)', color: 'var(--color-error)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, opacity: actionLoading === d.id ? 0.6 : 1 }}
                        >
                          {t('admin.unverifyDealer', lang)}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleVerifyDealer(d.id)}
                          disabled={actionLoading === d.id}
                          style={{ padding: '4px 10px', background: 'var(--color-success-dim)', color: 'var(--color-success)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, opacity: actionLoading === d.id ? 0.6 : 1 }}
                        >
                          {t('admin.verifyDealer', lang)}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPage={(p) => setPage(p)} />
      </div>
    </div>
  )
}
