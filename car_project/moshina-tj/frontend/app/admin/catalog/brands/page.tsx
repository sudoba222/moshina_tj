'use client'
import { Fragment, Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { catalogApi } from '@/lib/api'
import type { CarBrand, CarModelItem } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import {
  thStyle, tdStyle, inputStyle, Pagination, LoadingRow,
  ModalBackdrop, ModalCard, ModalTitle, ModalActions,
  BtnPrimary, BtnSecondary, BtnDanger, FormField, ErrorText, extractApiError,
} from '../../components/shared'
import { IconSearch, IconPlus, IconEdit, IconX, IconChevronDown, IconChevronRight } from '../../components/icons'
import { useToast } from '../../components/ToastContext'

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const PAGE_SIZE = 50

function BrandsPageInner() {
  const { lang } = useLang()
  const { showToast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get('page') ?? '1')
  const search = searchParams.get('search') ?? ''

  function updateParams(updates: Record<string, string>) {
    const p = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k) })
    router.replace(`?${p.toString()}`)
  }

  const [brands, setBrands] = useState<CarBrand[]>([])
  const [brandsTotal, setBrandsTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [expandedBrandId, setExpandedBrandId] = useState<string | null>(null)
  const [brandModels, setBrandModels] = useState<Record<string, CarModelItem[]>>({})
  const [brandModelsLoading, setBrandModelsLoading] = useState<string | null>(null)
  const [newModelName, setNewModelName] = useState('')
  const [addModelBrandId, setAddModelBrandId] = useState<string | null>(null)
  const [editBrandData, setEditBrandData] = useState<CarBrand | null>(null)
  const [createBrandOpen, setCreateBrandOpen] = useState(false)
  const [createBrandForm, setCreateBrandForm] = useState({ name: '', slug: '', country: '', logo_url: '', is_popular: false })
  const [brandActionLoading, setBrandActionLoading] = useState(false)
  const [brandActionError, setBrandActionError] = useState('')
  const [deleteBrandId, setDeleteBrandId] = useState<string | null>(null)

  const loadBrands = useCallback(async (p: number, s: string) => {
    setLoading(true)
    try {
      const res = await catalogApi.adminGetBrands(p, s || undefined)
      setBrands(res.data.data.items)
      setBrandsTotal(res.data.data.total)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
    setLoading(false)
  }, [lang, showToast])

  const loadBrandModels = useCallback(async (brandId: string) => {
    setBrandModelsLoading(brandId)
    try {
      const res = await catalogApi.getModels(brandId)
      setBrandModels((prev) => ({ ...prev, [brandId]: res.data.data }))
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
    setBrandModelsLoading(null)
  }, [lang, showToast])

  useEffect(() => { loadBrands(page, search) }, [page, search, loadBrands])

  async function toggleExpandBrand(brandId: string) {
    if (expandedBrandId === brandId) {
      setExpandedBrandId(null)
    } else {
      setExpandedBrandId(brandId)
      if (!brandModels[brandId]) await loadBrandModels(brandId)
    }
  }

  async function handleCreateBrand() {
    setBrandActionError('')
    setBrandActionLoading(true)
    try {
      await catalogApi.adminCreateBrand({
        name: createBrandForm.name, slug: createBrandForm.slug,
        country: createBrandForm.country || undefined,
        logo_url: createBrandForm.logo_url || undefined,
        is_popular: createBrandForm.is_popular,
      })
      setCreateBrandOpen(false)
      setCreateBrandForm({ name: '', slug: '', country: '', logo_url: '', is_popular: false })
      showToast(lang === 'ru' ? 'Марка создана' : 'Марка сохта шуд', 'success')
      loadBrands(page, search)
    } catch (e) {
      setBrandActionError(extractApiError(e, t('common.errorCreate', lang)))
    }
    setBrandActionLoading(false)
  }

  async function handleUpdateBrand() {
    if (!editBrandData) return
    setBrandActionError('')
    setBrandActionLoading(true)
    try {
      await catalogApi.adminUpdateBrand(editBrandData.id, {
        name: editBrandData.name, slug: editBrandData.slug,
        country: editBrandData.country ?? undefined,
        logo_url: editBrandData.logo_url ?? undefined,
        is_popular: editBrandData.is_popular, is_active: editBrandData.is_active,
      })
      setEditBrandData(null)
      showToast(lang === 'ru' ? 'Данные сохранены' : 'Маълумот нигоҳ дошта шуд', 'success')
      loadBrands(page, search)
    } catch (e) {
      setBrandActionError(extractApiError(e, t('common.errorSave', lang)))
    }
    setBrandActionLoading(false)
  }

  async function handleDeleteBrand() {
    if (!deleteBrandId) return
    try {
      await catalogApi.adminDeleteBrand(deleteBrandId)
      setDeleteBrandId(null)
      showToast(lang === 'ru' ? 'Марка удалена' : 'Марка ҳазф шуд', 'success')
      loadBrands(page, search)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
  }

  async function handleAddModel(brandId: string) {
    if (!newModelName.trim()) return
    try {
      await catalogApi.adminAddModel(brandId, newModelName.trim())
      setNewModelName('')
      setAddModelBrandId(null)
      showToast(lang === 'ru' ? 'Модель добавлена' : 'Модел илова шуд', 'success')
      await loadBrandModels(brandId)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
  }

  async function handleDeleteModel(brandId: string, modelId: string) {
    try {
      await catalogApi.adminDeleteModel(brandId, modelId)
      showToast(lang === 'ru' ? 'Модель удалена' : 'Модел ҳазф шуд', 'success')
      await loadBrandModels(brandId)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            {lang === 'ru' ? 'Марки и модели' : 'Марка ва моделхо'}
          </h1>
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', borderBottom: '2px solid var(--accent)', paddingBottom: '2px' }}>
              {lang === 'ru' ? 'Марки' : 'Маркахо'}
            </span>
            <Link href="/admin/catalog/categories" style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none' }}>
              {lang === 'ru' ? 'Категории' : 'Категорияхо'}
            </Link>
          </div>
        </div>
        <button
          onClick={() => { setCreateBrandOpen(true); setBrandActionError('') }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--accent)', color: 'var(--color-white)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}
        >
          <IconPlus /> {lang === 'ru' ? 'Добавить марку' : 'Марка илова'}
        </button>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}><IconSearch /></span>
          <input
            value={search}
            onChange={(e) => updateParams({ search: e.target.value, page: '1' })}
            placeholder={lang === 'ru' ? 'Поиск марки...' : 'Ҷустуҷӯи марка...'}
            style={{ ...inputStyle, width: '100%', paddingLeft: '32px', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      <div style={{ background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr>
                {[
                  lang === 'ru' ? 'Марка' : 'Марка',
                  lang === 'ru' ? 'Страна' : 'Кишвар',
                  lang === 'ru' ? 'Популярная' : 'Машхур',
                  lang === 'ru' ? 'Моделей' : 'Моделхо',
                  lang === 'ru' ? 'Активна' : 'Фаъол',
                  lang === 'ru' ? 'Действия' : 'Амалхо',
                ].map((h) => <th key={h} style={thStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <LoadingRow colSpan={6} />
              ) : brands.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    {t('common.noData', lang)}
                  </td>
                </tr>
              ) : (
                brands.map((b) => (
                  <Fragment key={b.id}><tr>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => toggleExpandBrand(b.id)}
                            aria-expanded={expandedBrandId === b.id}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '2px' }}
                          >
                            {expandedBrandId === b.id ? <IconChevronDown /> : <IconChevronRight />}
                          </button>
                          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{b.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{b.slug}</span>
                        </div>
                      </td>
                      <td style={tdStyle}>{b.country ?? '—'}</td>
                      <td style={tdStyle}>
                        {b.is_popular ? (
                          <span style={{ background: 'var(--color-success-dim)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>
                            {lang === 'ru' ? 'Да' : 'Бале'}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ background: 'var(--tag-bg)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>
                          {b.model_count ?? '?'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {b.is_active ? (
                          <span style={{ background: 'var(--color-success-dim)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>
                            {lang === 'ru' ? 'Да' : 'Бале'}
                          </span>
                        ) : (
                          <span style={{ background: 'var(--color-error-dim)', color: 'var(--color-error)', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>
                            {lang === 'ru' ? 'Нет' : 'Не'}
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <Link
                            href={`/admin/catalog/brands/${b.id}/models`}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}
                          >
                            {t('admin.viewModels', lang)} <IconChevronRight />
                          </Link>
                          <button
                            onClick={() => { setEditBrandData({ ...b }); setBrandActionError('') }}
                            style={{ padding: '4px 10px', background: 'var(--tag-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            aria-label={t('admin.editBrand', lang)}
                          >
                            <IconEdit />
                          </button>
                          <button
                            onClick={() => setDeleteBrandId(b.id)}
                            style={{ padding: '4px 8px', background: 'var(--color-error-dim)', color: 'var(--color-error)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center' }}
                            aria-label={t('admin.deleteBrand', lang)}
                          >
                            <IconX />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedBrandId === b.id && (
                      <tr key={`${b.id}-models`}>
                        <td colSpan={6} style={{ padding: '0 0 0 40px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ padding: '12px 16px 12px 0' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                              {lang === 'ru' ? 'Модели' : 'Моделхо'}
                            </div>
                            {brandModelsLoading === b.id ? (
                              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t('common.loading', lang)}</div>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                {(brandModels[b.id] ?? []).map((m) => (
                                  <span key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '100px', padding: '3px 10px', fontSize: '12px', color: 'var(--text)' }}>
                                    {m.name}
                                    <button
                                      onClick={() => handleDeleteModel(b.id, m.id)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', display: 'flex', alignItems: 'center', padding: '0', marginLeft: '2px' }}
                                      aria-label={`Remove ${m.name}`}
                                    >
                                      <IconX />
                                    </button>
                                  </span>
                                ))}
                                {(brandModels[b.id] ?? []).length === 0 && (
                                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                    {lang === 'ru' ? 'Нет моделей' : 'Моделхо нест'}
                                  </span>
                                )}
                              </div>
                            )}
                            {addModelBrandId === b.id ? (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <input
                                  value={newModelName}
                                  onChange={(e) => setNewModelName(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddModel(b.id) }}
                                  placeholder={lang === 'ru' ? 'Название модели' : 'Номи модел'}
                                  style={{ ...inputStyle, fontSize: '16px', padding: '6px 10px' }}
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleAddModel(b.id)}
                                  style={{ padding: '6px 12px', background: 'var(--accent)', color: 'var(--color-white)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                                >
                                  {lang === 'ru' ? 'Добавить' : 'Илова'}
                                </button>
                                <button
                                  onClick={() => { setAddModelBrandId(null); setNewModelName('') }}
                                  style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--text)' }}
                                >
                                  {t('dashboard.cancel', lang)}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setAddModelBrandId(b.id); setNewModelName('') }}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', background: 'var(--card)', border: '1px dashed var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)' }}
                              >
                                <IconPlus /> {lang === 'ru' ? 'Добавить модель' : 'Модел илова'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={brandsTotal} pageSize={PAGE_SIZE} onPage={(p) => updateParams({ page: String(p) })} />
      </div>

      {/* Create brand modal */}
      {createBrandOpen && (
        <ModalBackdrop onClose={() => setCreateBrandOpen(false)}>
          <ModalCard maxWidth="420px">
            <ModalTitle>{lang === 'ru' ? 'Новая марка' : 'Марkai нав'}</ModalTitle>
            {([
              { label: lang === 'ru' ? 'Название' : 'Ном', key: 'name' },
              { label: 'Slug', key: 'slug' },
              { label: lang === 'ru' ? 'Страна' : 'Кишвар', key: 'country' },
              { label: lang === 'ru' ? 'URL логотипа' : 'URL логотип', key: 'logo_url' },
            ] as const).map(({ label, key }) => (
              <FormField key={key} label={label}>
                <input
                  value={createBrandForm[key]}
                  onChange={(e) => {
                    const val = e.target.value
                    setCreateBrandForm((f) => ({ ...f, [key]: val, ...(key === 'name' ? { slug: slugify(val) } : {}) }))
                  }}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                />
              </FormField>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <input type="checkbox" id="brand-popular" checked={createBrandForm.is_popular} onChange={(e) => setCreateBrandForm((f) => ({ ...f, is_popular: e.target.checked }))} />
              <label htmlFor="brand-popular" style={{ fontSize: '13px', color: 'var(--text)' }}>{lang === 'ru' ? 'Популярная марка' : 'Маркаи машхур'}</label>
            </div>
            {brandActionError && <ErrorText>{brandActionError}</ErrorText>}
            <ModalActions>
              <BtnSecondary onClick={() => setCreateBrandOpen(false)}>{t('dashboard.cancel', lang)}</BtnSecondary>
              <BtnPrimary onClick={handleCreateBrand} disabled={brandActionLoading}>{lang === 'ru' ? 'Создать' : 'Сохтан'}</BtnPrimary>
            </ModalActions>
          </ModalCard>
        </ModalBackdrop>
      )}

      {/* Edit brand modal */}
      {editBrandData && (
        <ModalBackdrop onClose={() => setEditBrandData(null)}>
          <ModalCard maxWidth="420px">
            <ModalTitle>{lang === 'ru' ? 'Редактировать марку' : 'Таҳрири марка'}</ModalTitle>
            {([
              { label: lang === 'ru' ? 'Название' : 'Ном', key: 'name' },
              { label: 'Slug', key: 'slug' },
              { label: lang === 'ru' ? 'Страна' : 'Кишвар', key: 'country' },
              { label: lang === 'ru' ? 'URL логотипа' : 'URL логотип', key: 'logo_url' },
            ] as const).map(({ label, key }) => (
              <FormField key={key} label={label}>
                <input
                  value={(editBrandData[key as keyof CarBrand] as string) ?? ''}
                  onChange={(e) => setEditBrandData((d) => d ? { ...d, [key]: e.target.value } : d)}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                />
              </FormField>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <input type="checkbox" id="edit-brand-popular" checked={editBrandData.is_popular} onChange={(e) => setEditBrandData((d) => d ? { ...d, is_popular: e.target.checked } : d)} />
              <label htmlFor="edit-brand-popular" style={{ fontSize: '13px', color: 'var(--text)' }}>{lang === 'ru' ? 'Популярная марка' : 'Маркаи машхур'}</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <input type="checkbox" id="edit-brand-active" checked={editBrandData.is_active ?? true} onChange={(e) => setEditBrandData((d) => d ? { ...d, is_active: e.target.checked } : d)} />
              <label htmlFor="edit-brand-active" style={{ fontSize: '13px', color: 'var(--text)' }}>{lang === 'ru' ? 'Активна' : 'Фаъол'}</label>
            </div>
            {brandActionError && <ErrorText>{brandActionError}</ErrorText>}
            <ModalActions>
              <BtnSecondary onClick={() => setEditBrandData(null)}>{t('dashboard.cancel', lang)}</BtnSecondary>
              <BtnPrimary onClick={handleUpdateBrand} disabled={brandActionLoading}>{t('dashboard.save', lang)}</BtnPrimary>
            </ModalActions>
          </ModalCard>
        </ModalBackdrop>
      )}

      {/* Delete confirm */}
      {deleteBrandId && (
        <ModalBackdrop onClose={() => setDeleteBrandId(null)}>
          <ModalCard>
            <ModalTitle>{lang === 'ru' ? 'Удалить марку?' : 'Маркаро хазф кунед?'}</ModalTitle>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              {lang === 'ru' ? 'Все модели этой марки также будут удалены.' : 'Хамаи моделхои ин марка низ хазф мешаванд.'}
            </p>
            <ModalActions>
              <BtnSecondary onClick={() => setDeleteBrandId(null)}>{t('dashboard.cancel', lang)}</BtnSecondary>
              <BtnDanger onClick={handleDeleteBrand}>{t('admin.deleteBtn2', lang)}</BtnDanger>
            </ModalActions>
          </ModalCard>
        </ModalBackdrop>
      )}
    </div>
  )
}

export default function AdminBrandsPage() {
  return (
    <Suspense fallback={null}>
      <BrandsPageInner />
    </Suspense>
  )
}
