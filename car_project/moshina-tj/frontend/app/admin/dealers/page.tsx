'use client'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { adminApi } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { Dealer } from '@/types'
import {
  thStyle,
  tdStyle,
  inputStyle,
  Pagination,
  LoadingRow,
  ModalBackdrop,
  ModalCard,
  ModalTitle,
  ModalActions,
  BtnPrimary,
  BtnSecondary,
  FormField,
  ErrorText,
  RolePill,
  extractApiError,
} from '../components/shared'
import { IconSearch, IconEdit, IconCheck, IconX } from '../components/icons'
import { useToast } from '../components/ToastContext'

const PAGE_SIZE = 20

// ── Create Dealer modal ────────────────────────────────────────────────────────
function CreateDealerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const { lang } = useLang()
  const { showToast } = useToast()
  const [form, setForm] = useState({ user_id: '', phone: '', name: '', business_name: '', city: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setError('')
    if (!form.business_name.trim()) { setError('Введите название автосалона'); return }
    if (!form.user_id.trim() && !form.phone.trim()) { setError('Укажите ID пользователя или номер телефона'); return }
    setSaving(true)
    try {
      await adminApi.createDealer({
        user_id: form.user_id.trim() || undefined,
        phone: form.phone.trim() || undefined,
        name: form.name.trim() || undefined,
        business_name: form.business_name.trim(),
        city: form.city.trim() || undefined,
        description: form.description.trim() || undefined,
      })
      showToast('Дилер создан', 'success')
      onCreated()
      onClose()
    } catch (e) {
      setError(extractApiError(e, t('common.errorSave', lang)))
    }
    setSaving(false)
  }

  const field = (key: keyof typeof form, label: string, placeholder?: string, type = 'text') => (
    <FormField label={label}>
      <input
        type={type}
        placeholder={placeholder ?? ''}
        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
        value={form[key]}
        onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
      />
    </FormField>
  )

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalCard maxWidth="440px">
        <ModalTitle>Создать аккаунт дилера</ModalTitle>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Укажите ID существующего пользователя или номер телефона для создания нового.
        </p>

        {error && <ErrorText>{error}</ErrorText>}

        {field('user_id', 'ID пользователя (если уже есть аккаунт)', 'xxxxxxxx-xxxx-...')}
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '-8px 0 8px', fontWeight: 600 }}>— или —</p>
        {field('phone', 'Телефон (создать нового пользователя)', '+992...')}
        {field('name', 'Имя пользователя', 'Имя')}
        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0 8px' }} />
        {field('business_name', 'Название автосалона *', 'Авто Плюс')}
        {field('city', 'Город', 'Душанбе')}
        <FormField label="Описание">
          <textarea
            placeholder="Краткое описание..."
            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '72px' }}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
        </FormField>

        <ModalActions>
          <BtnSecondary onClick={onClose}>{t('adminForm.cancel', lang)}</BtnSecondary>
          <BtnPrimary onClick={handleSave} disabled={saving}>
            {saving ? t('adminForm.saving', lang) : 'Создать дилера'}
          </BtnPrimary>
        </ModalActions>
      </ModalCard>
    </ModalBackdrop>
  )
}

// ── Edit max-ads modal ─────────────────────────────────────────────────────────
function EditMaxAdsModal({
  dealer,
  onClose,
  onSave,
  saving,
  error,
}: {
  dealer: Dealer
  onClose: () => void
  onSave: (maxAds: number) => void
  saving: boolean
  error: string | null
}) {
  const { lang } = useLang()
  const [value, setValue] = useState(String(dealer.max_ads_allowed ?? 10))

  function handleSave() {
    const n = parseInt(value, 10)
    if (!isNaN(n) && n > 0) onSave(n)
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalCard maxWidth="360px">
        <ModalTitle>{t('admin.editMaxAds', lang)}</ModalTitle>
        <p className="text-[13px] mb-3" style={{ color: 'var(--text-secondary)' }}>
          {dealer.business_name}
        </p>

        {error && <ErrorText>{error}</ErrorText>}

        <FormField label={t('admin.maxAdsAllowed', lang)}>
          <input
            type="number"
            min={1}
            max={9999}
            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            autoFocus
          />
        </FormField>

        <ModalActions>
          <BtnSecondary onClick={onClose}>
            {t('adminForm.cancel', lang)}
          </BtnSecondary>
          <BtnPrimary
            onClick={handleSave}
            disabled={saving || !value || parseInt(value, 10) < 1}
          >
            {saving
              ? t('adminForm.saving', lang)
              : t('adminForm.save', lang)}
          </BtnPrimary>
        </ModalActions>
      </ModalCard>
    </ModalBackdrop>
  )
}

// ── Search-params-aware inner page ────────────────────────────────────────────
function DealersPageInner() {
  const { lang } = useLang()
  const { showToast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get('page') ?? '1')
  const search = searchParams.get('search') ?? ''
  const filter = (searchParams.get('filter') ?? 'all') as 'all' | 'verified' | 'unverified'

  function updateParams(updates: Record<string, string>) {
    const p = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k) })
    router.replace(`?${p.toString()}`)
  }

  const [dealers, setDealers] = useState<Dealer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Create dealer modal
  const [showCreate, setShowCreate] = useState(false)

  // Edit max-ads modal
  const [editTarget, setEditTarget] = useState<Dealer | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  const loadDealers = useCallback(async (p: number, verifiedFilter: 'all' | 'verified' | 'unverified') => {
    setLoading(true)
    try {
      const verified = verifiedFilter === 'all' ? undefined : verifiedFilter === 'verified'
      const res = await adminApi.getDealers(p, verified)
      setDealers(res.data.data.items)
      setTotal(res.data.data.total)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
    setLoading(false)
  }, [lang, showToast])

  useEffect(() => {
    loadDealers(page, filter)
  }, [page, filter, loadDealers])

  // Client-side search filter (applied on top of server filter)
  const visibleDealers = search.trim()
    ? dealers.filter((d) => {
        const q = search.toLowerCase()
        return (
          d.business_name.toLowerCase().includes(q) ||
          (d.phone ?? '').toLowerCase().includes(q) ||
          (d.city ?? '').toLowerCase().includes(q)
        )
      })
    : dealers

  // ── Verify / Unverify ──────────────────────────────────────────────────────
  async function handleVerify(dealerId: string) {
    setActionLoading(dealerId)
    try {
      await adminApi.verifyDealer(dealerId)
      showToast(t('admin.verified', lang), 'success')
      loadDealers(page, filter)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
    setActionLoading(null)
  }

  async function handleUnverify(dealerId: string) {
    setActionLoading(dealerId)
    try {
      await adminApi.unverifyDealer(dealerId)
      showToast(t('admin.notVerified', lang), 'success')
      loadDealers(page, filter)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
    setActionLoading(null)
  }

  // ── Edit max-ads ───────────────────────────────────────────────────────────
  async function handleSaveMaxAds(maxAds: number) {
    if (!editTarget) return
    setEditSaving(true)
    setEditError(null)
    try {
      await adminApi.updateDealer(editTarget.id, { max_ads_allowed: maxAds })
      showToast(t('adminForm.dataSaved', lang), 'success')
      setEditTarget(null)
      loadDealers(page, filter)
    } catch (e) {
      setEditError(extractApiError(e, t('common.errorSave', lang)))
    }
    setEditSaving(false)
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          {t('admin.tabDealers', lang)}
        </h1>
        <BtnPrimary onClick={() => setShowCreate(true)}>+ Создать дилера</BtnPrimary>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        {/* Verification filter pills */}
        <div className="flex gap-2">
          {(['all', 'verified', 'unverified'] as const).map((v) => (
            <RolePill
              key={v}
              role={t(`admin.filter${v.charAt(0).toUpperCase() + v.slice(1)}`, lang)}
              active={filter === v}
              onClick={() => updateParams({ filter: v, page: '1' })}
            />
          ))}
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '360px' }}>
          <span
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
            aria-hidden="true"
          >
            <IconSearch />
          </span>
          <input
            value={search}
            onChange={(e) => updateParams({ search: e.target.value, page: '1' })}
            placeholder={t('admin.searchDealers', lang)}
            aria-label={t('admin.searchDealers', lang)}
            style={{ ...inputStyle, width: '100%', paddingLeft: '32px', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr>
                {[
                  t('admin.dealerLogo', lang),
                  t('admin.name', lang),
                  t('admin.phone', lang),
                  t('admin.city', lang),
                  t('admin.status', lang),
                  t('admin.dealerListings', lang),
                  t('admin.maxAdsAllowed', lang),
                  t('admin.actions', lang),
                ].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <LoadingRow colSpan={8} />
              ) : visibleDealers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    {t('common.noData', lang)}
                  </td>
                </tr>
              ) : (
                visibleDealers.map((d) => (
                  <tr key={d.id}>
                    {/* Logo */}
                    <td style={tdStyle}>
                      {d.logo_url ? (
                        <div style={{ width: '36px', height: '36px', position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
                          <Image
                            src={d.logo_url}
                            alt={d.business_name}
                            fill
                            style={{ objectFit: 'cover' }}
                            sizes="36px"
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            width: '36px', height: '36px', borderRadius: '8px',
                            background: 'var(--surface)', border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)',
                            flexShrink: 0,
                          }}
                        >
                          {d.business_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>

                    {/* Business name */}
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text)' }}>
                      {d.business_name}
                    </td>

                    {/* Phone */}
                    <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>
                      {d.phone ?? '—'}
                    </td>

                    {/* City */}
                    <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>
                      {d.city ?? '—'}
                    </td>

                    {/* Verified badge */}
                    <td style={tdStyle}>
                      {d.verified ? (
                        <span
                          className="px-2 py-0.5 rounded-[100px] text-[11px] font-semibold whitespace-nowrap"
                          style={{ background: 'var(--color-success-dim)', color: 'var(--color-success)' }}
                        >
                          {t('admin.verified', lang)}
                        </span>
                      ) : (
                        <span
                          className="px-2 py-0.5 rounded-[100px] text-[11px] font-semibold whitespace-nowrap"
                          style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}
                        >
                          {t('admin.notVerified', lang)}
                        </span>
                      )}
                    </td>

                    {/* Active listings count */}
                    <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>
                      {d.active_listings_count ?? '—'}
                    </td>

                    {/* Max ads allowed */}
                    <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>
                      {d.max_ads_allowed ?? '—'}
                    </td>

                    {/* Actions */}
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      <div className="flex items-center gap-2">
                        {/* Verify / Unverify toggle */}
                        {d.verified ? (
                          <button
                            onClick={() => handleUnverify(d.id)}
                            disabled={actionLoading === d.id}
                            aria-label={t('admin.unverifyDealer', lang)}
                            className="flex items-center gap-1 px-[10px] py-[5px] rounded-[6px] border text-[12px] font-semibold cursor-pointer"
                            style={{
                              background: 'var(--color-error-dim)',
                              borderColor: 'var(--color-error)',
                              color: 'var(--color-error)',
                              opacity: actionLoading === d.id ? 0.6 : 1,
                            }}
                          >
                            <IconX />
                            {t('admin.unverifyDealer', lang)}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleVerify(d.id)}
                            disabled={actionLoading === d.id}
                            aria-label={t('admin.verifyDealer', lang)}
                            className="flex items-center gap-1 px-[10px] py-[5px] rounded-[6px] border text-[12px] font-semibold cursor-pointer"
                            style={{
                              background: 'var(--color-success-dim)',
                              borderColor: 'var(--color-success)',
                              color: 'var(--color-success)',
                              opacity: actionLoading === d.id ? 0.6 : 1,
                            }}
                          >
                            <IconCheck />
                            {t('admin.verifyDealer', lang)}
                          </button>
                        )}

                        {/* Edit max ads */}
                        <button
                          onClick={() => { setEditTarget(d); setEditError(null) }}
                          aria-label={t('admin.editMaxAds', lang)}
                          className="flex items-center justify-center w-[30px] h-[30px] rounded-[6px] border cursor-pointer"
                          style={{
                            background: 'var(--surface)',
                            borderColor: 'var(--border)',
                            color: 'var(--text)',
                          }}
                        >
                          <IconEdit />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          onPage={(p) => updateParams({ page: String(p) })}
        />
      </div>

      {/* Create dealer modal */}
      {showCreate && (
        <CreateDealerModal
          onClose={() => setShowCreate(false)}
          onCreated={() => loadDealers(page, filter)}
        />
      )}

      {/* Edit max-ads modal */}
      {editTarget && (
        <EditMaxAdsModal
          dealer={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleSaveMaxAds}
          saving={editSaving}
          error={editError}
        />
      )}
    </div>
  )
}

// ── Page export with Suspense boundary ────────────────────────────────────────
export default function AdminDealersPage() {
  return (
    <Suspense fallback={null}>
      <DealersPageInner />
    </Suspense>
  )
}
