'use client'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { adminApi, adminListingsApi } from '@/lib/api'
import type { AdminListingDetail } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { Listing } from '@/types'
import {
  thStyle, tdStyle, inputStyle, StatusBadge, RolePill, Pagination,
  LoadingRow, ModalBackdrop, ModalCard, ModalTitle, ModalActions,
  BtnPrimary, BtnSecondary, BtnDanger, FormField, formatDate, extractApiError,
} from '../components/shared'
import { IconSearch, IconCheck, IconX, IconExternalLink } from '../components/icons'
import { useToast } from '../components/ToastContext'

const PAGE_SIZE = 20

function ListingsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang } = useLang()
  const { showToast } = useToast()

  const page = Number(searchParams.get('page') ?? '1')
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''

  function updateParams(updates: Record<string, string>) {
    const p = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => {
      if (v) p.set(k, v)
      else p.delete(k)
    })
    router.replace(`?${p.toString()}`)
  }

  const [listings, setListings] = useState<Listing[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  // Modals
  const [rejectListingId, setRejectListingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [deleteListingId, setDeleteListingId] = useState<string | null>(null)
  const [editListingData, setEditListingData] = useState<Listing | null>(null)
  const [editListingForm, setEditListingForm] = useState<Record<string, string | number | boolean>>({})
  const [editLoading, setEditLoading] = useState(false)
  const [logsListingId, setLogsListingId] = useState<string | null>(null)
  const [logsDetail, setLogsDetail] = useState<AdminListingDetail | null>(null)
  const [logsLoading, setLogsLoading] = useState(false)

  const loadListings = useCallback(async (p: number, s: string, q: string) => {
    setLoading(true)
    try {
      const res = await adminApi.getListings(s || undefined, p, q || undefined)
      setListings(res.data.data.items)
      setTotal(res.data.data.total)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
    setLoading(false)
  }, [lang, showToast])

  useEffect(() => { loadListings(page, status, search) }, [page, status, search, loadListings])

  async function handleApproveListing(id: string) {
    try {
      await adminApi.approveListing(id)
      showToast(lang === 'ru' ? 'Объявление одобрено' : 'Эълон тасдиқ шуд', 'success')
      loadListings(page, status, search)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
  }

  async function handleRejectListing(id: string) {
    try {
      await adminApi.rejectListing(id, rejectReason.trim() || 'Отклонено')
      setRejectListingId(null)
      setRejectReason('')
      showToast(lang === 'ru' ? 'Объявление отклонено' : 'Эълон рад шуд', 'success')
      loadListings(page, status, search)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
  }

  async function handleDeactivateListing(id: string) {
    try {
      await adminApi.deactivateListing(id)
      showToast(lang === 'ru' ? 'Объявление деактивировано' : 'Эълон хомӯш шуд', 'success')
      loadListings(page, status, search)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
  }

  async function handleEditListing() {
    if (!editListingData) return
    setEditLoading(true)
    try {
      await adminApi.editListing(editListingData.id, editListingForm)
      setEditListingData(null)
      showToast(lang === 'ru' ? 'Данные сохранены' : 'Маълумот нигоҳ дошта шуд', 'success')
      loadListings(page, status, search)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
    setEditLoading(false)
  }

  async function handleDeleteListing() {
    if (!deleteListingId) return
    try {
      await adminApi.deleteListing(deleteListingId)
      setDeleteListingId(null)
      showToast(lang === 'ru' ? 'Объявление удалено' : 'Эълон ҳазф шуд', 'success')
      loadListings(page, status, search)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
  }

  async function openListingLogs(id: string) {
    setLogsListingId(id)
    setLogsDetail(null)
    setLogsLoading(true)
    try {
      const res = await adminListingsApi.getDetail(id)
      setLogsDetail(res.data.data)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
    setLogsLoading(false)
  }

  function openEditListing(l: Listing) {
    setEditListingData(l)
    setEditListingForm({
      brand: l.brand, model: l.model, year: l.year, price: l.price,
      currency: l.currency, city: l.city, mileage: l.mileage ?? '',
      fuel: l.fuel ?? '', transmission: l.transmission ?? '',
      color: l.color ?? '', description: l.description ?? '', status: l.status,
    })
  }

  const statusOptions = [
    { v: '', label: t('admin.all', lang) },
    { v: 'pending', label: t('admin.pending', lang) },
    { v: 'active', label: t('admin.active', lang) },
    { v: 'rejected', label: t('dashboard.rejected_badge', lang) },
  ]

  return (
    <div>
      <h1 className="text-[20px] font-bold m-0 mb-4" style={{ color: 'var(--text)' }}>
        {t('admin.listings', lang)}
      </h1>

      {/* Search */}
      <div className="flex gap-[10px] flex-wrap mb-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-[10px] top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}><IconSearch /></span>
          <input
            value={search}
            onChange={(e) => updateParams({ search: e.target.value, page: '1' })}
            placeholder={t('admin.searchListings', lang)}
            style={{ ...inputStyle, width: '100%', paddingLeft: '32px', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-[6px] flex-wrap mb-4">
        {statusOptions.map(({ v, label }) => (
          <RolePill
            key={v || 'all'}
            role={label}
            active={status === v}
            onClick={() => updateParams({ status: v, page: '1' })}
          />
        ))}
      </div>

      <div className="rounded-[14px] border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['', t('admin.brand', lang), t('admin.model', lang), t('admin.city', lang), t('admin.created', lang), t('admin.status', lang), t('admin.actions', lang)].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <LoadingRow colSpan={7} />
              ) : listings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 px-4" style={{ ...tdStyle, color: 'var(--text-muted)' }}>
                    {lang === 'ru' ? 'Нет объявлений' : 'Эълон нест'}
                  </td>
                </tr>
              ) : (
                listings.map((l) => (
                  <tr key={l.id}>
                    <td style={{ ...tdStyle, width: '48px', padding: '8px 12px' }}>
                      {l.images?.[0] ? (
                        <div className="relative w-9 h-9 rounded-[6px] overflow-hidden">
                          <Image src={l.images[0].url} alt="" fill style={{ objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-[6px]" style={{ background: 'var(--surface)' }} />
                      )}
                    </td>
                    <td style={tdStyle}>{l.brand}</td>
                    <td style={tdStyle}>{l.model} {l.year}</td>
                    <td style={tdStyle}>{l.city}</td>
                    <td className="whitespace-nowrap" style={tdStyle}>{formatDate(l.created_at)}</td>
                    <td style={tdStyle}><StatusBadge status={l.status} /></td>
                    <td className="whitespace-nowrap" style={tdStyle}>
                      <div className="flex gap-1 items-center">
                        {l.status === 'pending' && (
                          <button
                            onClick={() => handleApproveListing(l.id)}
                            className="flex items-center gap-[3px] px-2 py-1 rounded-[6px] text-[11px] font-semibold cursor-pointer border-0"
                            style={{ background: 'var(--color-success-dim)', color: 'var(--color-success)' }}
                          >
                            <IconCheck /> {t('admin.approveBtn', lang)}
                          </button>
                        )}
                        {l.status !== 'rejected' && (
                          <button
                            onClick={() => setRejectListingId(l.id)}
                            className="flex items-center gap-[3px] px-2 py-1 rounded-[6px] text-[11px] font-semibold cursor-pointer border-0"
                            style={{ background: 'var(--color-error-dim)', color: 'var(--color-error)' }}
                          >
                            <IconX /> {t('admin.rejectBtn', lang)}
                          </button>
                        )}
                        {l.status === 'active' && (
                          <button
                            onClick={() => handleDeactivateListing(l.id)}
                            className="px-2 py-1 rounded-[6px] text-[11px] cursor-pointer border"
                            style={{ background: 'var(--tag-bg)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
                          >
                            {t('admin.deactivate', lang)}
                          </button>
                        )}
                        <button
                          onClick={() => openEditListing(l)}
                          className="px-2 py-1 rounded-[6px] text-[11px] cursor-pointer border"
                          style={{ background: 'var(--tag-bg)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
                        >
                          {lang === 'ru' ? 'Изм.' : 'Таҳ.'}
                        </button>
                        <button
                          onClick={() => openListingLogs(l.id)}
                          className="px-2 py-1 rounded-[6px] text-[11px] font-semibold cursor-pointer border"
                          style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                        >
                          {t('admin.viewLogs', lang)}
                        </button>
                        <button
                          onClick={() => setDeleteListingId(l.id)}
                          className="flex items-center px-2 py-1 rounded-[6px] text-[11px] cursor-pointer border-0"
                          style={{ background: 'var(--color-error-dim)', color: 'var(--color-error)' }}
                        >
                          <IconX />
                        </button>
                        <Link
                          href={`/car/${l.id}`}
                          target="_blank"
                          className="flex items-center gap-[3px] px-2 py-1 rounded-[6px] text-[11px] no-underline border"
                          style={{ background: 'var(--tag-bg)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
                        >
                          <IconExternalLink />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPage={(p) => updateParams({ page: String(p) })} />
      </div>

      {/* Reject modal */}
      {rejectListingId && (
        <ModalBackdrop onClose={() => { setRejectListingId(null); setRejectReason('') }}>
          <ModalCard>
            <ModalTitle>{t('admin.rejectBtn', lang)}</ModalTitle>
            <FormField label={t('admin.rejectReason', lang)}>
              <input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mb-[14px]"
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </FormField>
            <ModalActions>
              <BtnSecondary onClick={() => { setRejectListingId(null); setRejectReason('') }}>{t('dashboard.cancel', lang)}</BtnSecondary>
              <BtnDanger onClick={() => handleRejectListing(rejectListingId)}>{t('admin.rejectBtn', lang)}</BtnDanger>
            </ModalActions>
          </ModalCard>
        </ModalBackdrop>
      )}

      {/* Edit listing modal */}
      {editListingData && (
        <ModalBackdrop onClose={() => setEditListingData(null)}>
          <ModalCard maxWidth="560px">
            <ModalTitle>{lang === 'ru' ? 'Редактировать объявление' : 'Таҳрири эълон'}</ModalTitle>
            <div className="grid grid-cols-2 gap-[10px] mb-[10px]">
              {([
                { label: lang === 'ru' ? 'Марка' : 'Марка', key: 'brand' },
                { label: lang === 'ru' ? 'Модель' : 'Модел', key: 'model' },
                { label: lang === 'ru' ? 'Год' : 'Сол', key: 'year' },
                { label: lang === 'ru' ? 'Цена' : 'Нарх', key: 'price' },
                { label: lang === 'ru' ? 'Валюта' : 'Асъор', key: 'currency' },
                { label: lang === 'ru' ? 'Город' : 'Шаҳр', key: 'city' },
                { label: lang === 'ru' ? 'Пробег' : 'Пробег', key: 'mileage' },
                { label: lang === 'ru' ? 'Топливо' : 'Сӯзишворӣ', key: 'fuel' },
                { label: lang === 'ru' ? 'КПП' : 'КПП', key: 'transmission' },
                { label: lang === 'ru' ? 'Цвет' : 'Ранг', key: 'color' },
              ] as const).map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.05em] mb-[3px]" style={{ color: 'var(--text-muted)' }}>{label}</label>
                  <input
                    value={String(editListingForm[key] ?? '')}
                    onChange={(e) => setEditListingForm((f) => ({ ...f, [key]: e.target.value }))}
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
            <div className="mb-[10px]">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.05em] mb-[3px]" style={{ color: 'var(--text-muted)' }}>
                {t('adminForm.descriptionLabel', lang)}
              </label>
              <textarea
                value={String(editListingForm.description ?? '')}
                onChange={(e) => setEditListingForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
            <div className="mb-[14px]">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.05em] mb-[3px]" style={{ color: 'var(--text-muted)' }}>
                {t('admin.status', lang)}
              </label>
              <select
                value={String(editListingForm.status ?? '')}
                onChange={(e) => setEditListingForm((f) => ({ ...f, status: e.target.value }))}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              >
                <option value="pending">pending</option>
                <option value="active">active</option>
                <option value="rejected">rejected</option>
              </select>
            </div>
            <ModalActions>
              <BtnSecondary onClick={() => setEditListingData(null)}>{t('dashboard.cancel', lang)}</BtnSecondary>
              <BtnPrimary onClick={handleEditListing} disabled={editLoading}>{t('dashboard.save', lang)}</BtnPrimary>
            </ModalActions>
          </ModalCard>
        </ModalBackdrop>
      )}

      {/* Delete listing confirm */}
      {deleteListingId && (
        <ModalBackdrop onClose={() => setDeleteListingId(null)}>
          <ModalCard>
            <ModalTitle>{lang === 'ru' ? 'Удалить объявление?' : 'Эълонро ҳазф кунед?'}</ModalTitle>
            <p className="text-[13px] mb-[18px]" style={{ color: 'var(--text-muted)' }}>
              {lang === 'ru' ? 'Объявление будет удалено безвозвратно.' : 'Эълон барои ҳамеша ҳазф мешавад.'}
            </p>
            <ModalActions>
              <BtnSecondary onClick={() => setDeleteListingId(null)}>{t('dashboard.cancel', lang)}</BtnSecondary>
              <BtnDanger onClick={handleDeleteListing}>{t('admin.deleteBtn2', lang)}</BtnDanger>
            </ModalActions>
          </ModalCard>
        </ModalBackdrop>
      )}

      {/* Logs modal */}
      {logsListingId && (
        <ModalBackdrop onClose={() => { setLogsListingId(null); setLogsDetail(null) }}>
          <ModalCard maxWidth="560px">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[16px] m-0" style={{ color: 'var(--text)' }}>{t('admin.viewLogs', lang)}</h3>
              <button
                onClick={() => { setLogsListingId(null); setLogsDetail(null) }}
                className="flex items-center border rounded-lg cursor-pointer px-2 py-[6px]"
                style={{ background: 'none', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                aria-label={lang === 'ru' ? 'Закрыть' : 'Пӯшидан'}
              >
                <IconX />
              </button>
            </div>

            {logsLoading ? (
              <div className="text-center py-6" style={{ color: 'var(--text-muted)' }}>{t('common.loading', lang)}</div>
            ) : logsDetail ? (
              <>
                <div className="flex gap-3 items-center mb-5 p-[14px] rounded-[10px] border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  {logsDetail.primary_image_url && (
                    <div className="relative w-[60px] h-11 rounded-[6px] overflow-hidden shrink-0">
                      <Image src={logsDetail.primary_image_url} alt="" fill style={{ objectFit: 'cover' }} sizes="60px" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[14px]" style={{ color: 'var(--text)' }}>
                      {logsDetail.brand} {logsDetail.model} {logsDetail.year}
                    </div>
                    <div className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {logsDetail.city} · {logsDetail.user.name ?? logsDetail.user.phone ?? logsDetail.user.email ?? '—'}
                    </div>
                  </div>
                  <StatusBadge status={logsDetail.status} />
                </div>

                {logsDetail.logs.length === 0 ? (
                  <p className="text-center text-[14px] py-5" style={{ color: 'var(--text-muted)' }}>
                    {t('admin.noLogs', lang)}
                  </p>
                ) : (
                  <div className="flex flex-col gap-[10px] max-h-[50vh] overflow-y-auto">
                    {logsDetail.logs.map((log, i) => (
                      <div key={log.id ?? i} className="p-3 rounded-[10px] border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                        <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                          <span className="px-2 py-0.5 rounded-[6px] text-[12px] font-mono" style={{ background: 'var(--tag-bg)', color: 'var(--text)' }}>
                            {log.action}
                          </span>
                          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {new Date(log.created_at).toLocaleString('ru-RU')}
                          </span>
                        </div>
                        <div className="text-[12px] mt-[6px]" style={{ color: 'var(--text-secondary)' }}>
                          <span className="font-semibold">{t('admin.logBy', lang)}:</span> {log.actor_name ?? '—'}
                          {log.from_status && log.to_status && (
                            <span className="ml-2">
                              <StatusBadge status={log.from_status} />
                              <span className="mx-1" style={{ color: 'var(--text-muted)' }}>→</span>
                              <StatusBadge status={log.to_status} />
                            </span>
                          )}
                        </div>
                        {log.reason && (
                          <div className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
                            <span className="font-semibold">{t('admin.logReason', lang)}:</span> {log.reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </ModalCard>
        </ModalBackdrop>
      )}
    </div>
  )
}

export default function AdminListingsPage() {
  return (
    <Suspense fallback={null}>
      <ListingsPageInner />
    </Suspense>
  )
}
