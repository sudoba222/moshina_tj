'use client'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { catalogApi, type CarBrand, type CarModelItem } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
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
  BtnDanger,
  FormField,
  ErrorText,
  extractApiError,
} from '../../../../components/shared'
import {
  IconPlus,
  IconEdit,
  IconSearch,
  IconChevronRight,
  IconArrowLeft,
} from '../../../../components/icons'
import { useToast } from '../../../../components/ToastContext'

const PAGE_SIZE = 50

// ── Delete icon ────────────────────────────────────────────────────────────────
function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  )
}

// ── Model modal ────────────────────────────────────────────────────────────────
function ModelModal({
  initial,
  onClose,
  onSave,
  saving,
  error,
}: {
  initial: string | null
  onClose: () => void
  onSave: (name: string) => void
  saving: boolean
  error: string | null
}) {
  const { lang } = useLang()
  const isEdit = initial !== null
  const [name, setName] = useState(initial ?? '')

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalCard maxWidth="380px">
        <ModalTitle>
          {isEdit ? t('admin.editModel', lang) : t('admin.addModel', lang)}
        </ModalTitle>

        {error && <ErrorText>{error}</ErrorText>}

        <FormField label={t('admin.modelName', lang) + ' *'}>
          <input
            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onSave(name.trim()) }}
            placeholder="Camry"
            autoFocus
          />
        </FormField>

        <ModalActions>
          <BtnSecondary onClick={onClose}>
            {t('adminForm.cancel', lang)}
          </BtnSecondary>
          <BtnPrimary
            onClick={() => onSave(name.trim())}
            disabled={saving || !name.trim()}
          >
            {saving ? t('adminForm.saving', lang) : t('adminForm.save', lang)}
          </BtnPrimary>
        </ModalActions>
      </ModalCard>
    </ModalBackdrop>
  )
}

// ── Delete confirm modal ───────────────────────────────────────────────────────
function DeleteModelModal({
  model,
  onClose,
  onConfirm,
  deleting,
}: {
  model: CarModelItem
  onClose: () => void
  onConfirm: () => void
  deleting: boolean
}) {
  const { lang } = useLang()
  return (
    <ModalBackdrop onClose={onClose}>
      <ModalCard maxWidth="360px">
        <ModalTitle>{t('admin.deleteModel', lang)}</ModalTitle>
        <p className="text-[13px] mb-4" style={{ color: 'var(--text-secondary)' }}>
          {model.name}
          {' — '}
          {t('admin.irreversible', lang)}
        </p>
        <ModalActions>
          <BtnSecondary onClick={onClose}>
            {t('adminForm.cancel', lang)}
          </BtnSecondary>
          <BtnDanger onClick={onConfirm} disabled={deleting}>
            {deleting ? t('adminForm.deleting', lang) : t('admin.deleteBtn2', lang)}
          </BtnDanger>
        </ModalActions>
      </ModalCard>
    </ModalBackdrop>
  )
}

// ── Search-params-aware inner page ────────────────────────────────────────────
function ModelsPageInner() {
  const { lang } = useLang()
  const { showToast } = useToast()
  const params = useParams<{ brandId: string }>()
  const brandId = params.brandId
  const router = useRouter()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get('page') ?? '1')
  const search = searchParams.get('search') ?? ''

  function updateParams(updates: Record<string, string>) {
    const p = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k) })
    router.replace(`?${p.toString()}`)
  }

  // Brand info for breadcrumb
  const [brand, setBrand] = useState<CarBrand | null>(null)
  const [brandLoading, setBrandLoading] = useState(true)

  // Models list
  const [models, setModels] = useState<CarModelItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  // Modal state
  const [addModal, setAddModal] = useState(false)
  const [editTarget, setEditTarget] = useState<CarModelItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CarModelItem | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Load brand name for breadcrumb — fetch page 1 with large limit; sufficient for breadcrumb display
  useEffect(() => {
    setBrandLoading(true)
    catalogApi.adminGetBrands(1)
      .then((res) => {
        const data = res.data.data
        const items = 'items' in data ? data.items : (data as unknown as CarBrand[])
        const found = items.find((b) => b.id === brandId)
        setBrand(found ?? null)
      })
      .catch(() => {})
      .finally(() => setBrandLoading(false))
  }, [brandId])

  const loadModels = useCallback(async (p: number, s: string) => {
    setLoading(true)
    try {
      const res = await catalogApi.adminGetModels(brandId, p, s || undefined)
      const data = res.data.data
      if ('items' in data) {
        setModels(data.items)
        setTotal(data.total)
      } else {
        // flat array fallback
        const arr = data as unknown as CarModelItem[]
        setModels(arr)
        setTotal(arr.length)
      }
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
    setLoading(false)
  }, [brandId, lang, showToast])

  useEffect(() => {
    loadModels(page, search)
  }, [page, search, loadModels])

  // ── Create ─────────────────────────────────────────────────────────────────
  async function handleCreate(name: string) {
    setSaving(true)
    setModalError(null)
    try {
      await catalogApi.adminAddModel(brandId, name)
      showToast(lang === 'ru' ? 'Модель добавлена' : 'Модел илова шуд', 'success')
      setAddModal(false)
      loadModels(page, search)
    } catch (e) {
      setModalError(extractApiError(e, t('common.errorCreate', lang)))
    }
    setSaving(false)
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  async function handleUpdate(name: string) {
    if (!editTarget) return
    setSaving(true)
    setModalError(null)
    try {
      await catalogApi.adminUpdateModel(brandId, editTarget.id, name)
      showToast(lang === 'ru' ? 'Модель обновлена' : 'Модел навсозӣ шуд', 'success')
      setEditTarget(null)
      loadModels(page, search)
    } catch (e) {
      setModalError(extractApiError(e, t('common.errorSave', lang)))
    }
    setSaving(false)
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await catalogApi.adminDeleteModel(brandId, deleteTarget.id)
      showToast(lang === 'ru' ? 'Модель удалена' : 'Модел ҳазф шуд', 'success')
      setDeleteTarget(null)
      loadModels(page, search)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
    setDeleting(false)
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-1 flex-wrap" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
        <Link href="/admin/catalog/brands" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          {t('admin.catalogBreadcrumb', lang)}
        </Link>
        <IconChevronRight />
        <Link href="/admin/catalog/brands" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          {t('admin.tabBrands', lang)}
        </Link>
        <IconChevronRight />
        <span style={{ color: 'var(--text)' }}>
          {brandLoading ? '...' : (brand?.name ?? brandId)}
        </span>
        <IconChevronRight />
        <span style={{ color: 'var(--text)' }}>{t('admin.tabModels', lang)}</span>
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/catalog/brands"
            aria-label={t('adminForm.backToBrands', lang)}
            className="flex items-center justify-center w-8 h-8 rounded-lg border"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            <IconArrowLeft />
          </Link>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            {brandLoading ? '...' : (brand?.name ?? brandId)}
            {' — '}
            {t('admin.tabModels', lang)}
          </h1>
        </div>
        <button
          onClick={() => { setAddModal(true); setModalError(null) }}
          className="flex items-center gap-2 px-4 py-[9px] rounded-lg border-0 text-[13px] font-bold cursor-pointer"
          style={{ background: 'var(--accent)', color: 'var(--color-white)' }}
        >
          <IconPlus />
          {t('admin.addModel', lang)}
        </button>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <span
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
            aria-hidden="true"
          >
            <IconSearch />
          </span>
          <input
            value={search}
            onChange={(e) => updateParams({ search: e.target.value, page: '1' })}
            placeholder={t('admin.searchModels', lang)}
            aria-label={t('admin.searchModels', lang)}
            style={{ ...inputStyle, width: '100%', paddingLeft: '32px', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '400px' }}>
            <thead>
              <tr>
                {[
                  t('admin.id', lang),
                  t('admin.modelName', lang),
                  t('admin.actions', lang),
                ].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <LoadingRow colSpan={3} />
              ) : models.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ ...tdStyle, textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    {t('common.noData', lang)}
                  </td>
                </tr>
              ) : (
                models.map((model) => (
                  <tr key={model.id}>
                    {/* ID */}
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'monospace' }}>
                      {model.id.slice(0, 8)}
                    </td>

                    {/* Name */}
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text)' }}>
                      {model.name}
                    </td>

                    {/* Actions */}
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditTarget(model); setModalError(null) }}
                          aria-label={t('admin.editModel', lang)}
                          className="flex items-center justify-center w-[30px] h-[30px] rounded-[6px] border cursor-pointer"
                          style={{
                            background: 'var(--surface)',
                            borderColor: 'var(--border)',
                            color: 'var(--text)',
                          }}
                        >
                          <IconEdit />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(model)}
                          aria-label={t('admin.deleteModel', lang)}
                          className="flex items-center justify-center w-[30px] h-[30px] rounded-[6px] border cursor-pointer"
                          style={{
                            background: 'var(--color-error-dim)',
                            borderColor: 'var(--color-error)',
                            color: 'var(--color-error)',
                          }}
                        >
                          <IconTrash />
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

      {/* Add modal */}
      {addModal && (
        <ModelModal
          initial={null}
          onClose={() => setAddModal(false)}
          onSave={handleCreate}
          saving={saving}
          error={modalError}
        />
      )}

      {/* Edit modal */}
      {editTarget && (
        <ModelModal
          initial={editTarget.name}
          onClose={() => setEditTarget(null)}
          onSave={handleUpdate}
          saving={saving}
          error={modalError}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteModelModal
          model={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}
    </div>
  )
}

// ── Page export with Suspense boundary ────────────────────────────────────────
export default function AdminModelsPage() {
  return (
    <Suspense fallback={null}>
      <ModelsPageInner />
    </Suspense>
  )
}
