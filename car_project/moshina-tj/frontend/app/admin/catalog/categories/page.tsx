'use client'
import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { catalogApi } from '@/lib/api'
import type { CarCategory } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import {
  thStyle, tdStyle, inputStyle, LoadingRow,
  ModalBackdrop, ModalCard, ModalTitle, ModalActions,
  BtnPrimary, BtnSecondary, BtnDanger, FormField, ErrorText, extractApiError,
} from '../../components/shared'
import { IconPlus, IconEdit, IconX } from '../../components/icons'
import { useToast } from '../../components/ToastContext'

type CategoryForm = {
  name_ru: string
  name_tj: string
  slug: string
  icon_url: string
  description_ru: string
  description_tj: string
  filter_config_raw: string
  display_order: number
}

const EMPTY_FORM: CategoryForm = {
  name_ru: '', name_tj: '', slug: '',
  icon_url: '', description_ru: '', description_tj: '',
  filter_config_raw: '{}', display_order: 0,
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function parseFilterConfig(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null) return parsed
    return null
  } catch {
    return null
  }
}

function categoryToForm(c: CarCategory): CategoryForm {
  return {
    name_ru: c.name_ru,
    name_tj: c.name_tj,
    slug: c.slug,
    icon_url: c.icon_url ?? '',
    description_ru: c.description_ru ?? '',
    description_tj: c.description_tj ?? '',
    filter_config_raw: c.filter_config ? JSON.stringify(c.filter_config, null, 2) : '{}',
    display_order: c.display_order,
  }
}

function CategoriesPageInner() {
  const { lang } = useLang()
  const { showToast } = useToast()

  const [categories, setCategories] = useState<CarCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CategoryForm>(EMPTY_FORM)
  const [createJsonError, setCreateJsonError] = useState('')
  const [editData, setEditData] = useState<CarCategory | null>(null)
  const [editForm, setEditForm] = useState<CategoryForm>(EMPTY_FORM)
  const [editJsonError, setEditJsonError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const loadCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await catalogApi.adminGetCategories()
      setCategories(res.data.data ?? [])
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
    setLoading(false)
  }, [lang, showToast])

  useEffect(() => { loadCategories() }, [loadCategories])

  function openCreate() {
    setCreateForm(EMPTY_FORM)
    setCreateJsonError('')
    setActionError('')
    setCreateOpen(true)
  }

  function openEdit(c: CarCategory) {
    setEditData(c)
    setEditForm(categoryToForm(c))
    setEditJsonError('')
    setActionError('')
  }

  async function handleCreate() {
    setActionError('')
    const parsed = parseFilterConfig(createForm.filter_config_raw)
    if (parsed === null) {
      setCreateJsonError(t('admin.catalogJsonError', lang))
      return
    }
    setCreateJsonError('')
    setActionLoading(true)
    try {
      await catalogApi.adminCreateCategory({
        name_ru: createForm.name_ru,
        name_tj: createForm.name_tj,
        slug: createForm.slug,
        icon_url: createForm.icon_url || null,
        description_ru: createForm.description_ru || null,
        description_tj: createForm.description_tj || null,
        filter_config: parsed,
        display_order: Number(createForm.display_order),
      })
      setCreateOpen(false)
      setCreateForm(EMPTY_FORM)
      showToast(t('admin.categoryCreated', lang), 'success')
      loadCategories()
    } catch (e) {
      setActionError(extractApiError(e, t('common.errorCreate', lang)))
    }
    setActionLoading(false)
  }

  async function handleUpdate() {
    if (!editData) return
    setActionError('')
    const parsed = parseFilterConfig(editForm.filter_config_raw)
    if (parsed === null) {
      setEditJsonError(t('admin.catalogJsonError', lang))
      return
    }
    setEditJsonError('')
    setActionLoading(true)
    try {
      await catalogApi.adminUpdateCategory(editData.id, {
        name_ru: editForm.name_ru,
        name_tj: editForm.name_tj,
        slug: editForm.slug,
        icon_url: editForm.icon_url || null,
        description_ru: editForm.description_ru || null,
        description_tj: editForm.description_tj || null,
        filter_config: parsed,
        display_order: Number(editForm.display_order),
        is_active: editData.is_active,
      })
      setEditData(null)
      showToast(t('adminForm.dataSaved', lang), 'success')
      loadCategories()
    } catch (e) {
      setActionError(extractApiError(e, t('common.errorSave', lang)))
    }
    setActionLoading(false)
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await catalogApi.adminDeleteCategory(deleteId)
      setDeleteId(null)
      showToast(t('admin.categoryDeleted', lang), 'success')
      loadCategories()
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
            {t('admin.tabCategories', lang)}
          </h1>
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
            <Link href="/admin/catalog/brands" style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none' }}>
              {t('admin.tabBrandsModels', lang)}
            </Link>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', borderBottom: '2px solid var(--accent)', paddingBottom: '2px' }}>
              {t('admin.tabCategories', lang)}
            </span>
          </div>
        </div>
        <button
          onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--accent)', color: 'var(--color-white)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}
        >
          <IconPlus /> {lang === 'ru' ? 'Добавить категорию' : 'Категория илова'}
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
            <thead>
              <tr>
                {[
                  lang === 'ru' ? 'Категория' : 'Категория',
                  lang === 'ru' ? 'Slug' : 'Slug',
                  lang === 'ru' ? 'Порядок' : 'Тартиб',
                  lang === 'ru' ? 'Активна' : 'Фаъол',
                  lang === 'ru' ? 'Действия' : 'Амалхо',
                ].map((h) => <th key={h} style={thStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <LoadingRow colSpan={5} />
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    {lang === 'ru' ? 'Нет категорий' : 'Категорияхо нест'}
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id}>
                    <td style={tdStyle}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '13px' }}>{c.name_ru}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{c.name_tj}</div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>{c.slug}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ background: 'var(--tag-bg)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>
                        #{c.display_order}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {c.is_active !== false ? (
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
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          onClick={() => openEdit(c)}
                          style={{ padding: '4px 10px', background: 'var(--tag-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <IconEdit /> {lang === 'ru' ? 'Изм.' : 'Таҳ.'}
                        </button>
                        <button
                          onClick={() => setDeleteId(c.id)}
                          style={{ padding: '4px 8px', background: 'var(--color-error-dim)', color: 'var(--color-error)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center' }}
                        >
                          <IconX />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      {createOpen && (
        <ModalBackdrop onClose={() => setCreateOpen(false)}>
          <ModalCard maxWidth="500px">
            <ModalTitle>{lang === 'ru' ? 'Новая категория' : 'Категорияи нав'}</ModalTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '4px' }}>
              <FormField label={lang === 'ru' ? 'Название (RU)' : 'Ном (RU)'}>
                <input
                  value={createForm.name_ru}
                  onChange={(e) => {
                    const val = e.target.value
                    setCreateForm((f) => ({ ...f, name_ru: val, slug: slugify(val) }))
                  }}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                />
              </FormField>
              <FormField label={lang === 'ru' ? 'Название (TJ)' : 'Ном (TJ)'}>
                <input
                  value={createForm.name_tj}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name_tj: e.target.value }))}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                />
              </FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', marginBottom: '4px', alignItems: 'end' }}>
              <FormField label="Slug">
                <input
                  value={createForm.slug}
                  onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value }))}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' }}
                />
              </FormField>
              <FormField label={lang === 'ru' ? 'Порядок' : 'Тартиб'}>
                <input
                  type="number"
                  value={createForm.display_order}
                  onChange={(e) => setCreateForm((f) => ({ ...f, display_order: Number(e.target.value) }))}
                  style={{ ...inputStyle, width: '80px', boxSizing: 'border-box' }}
                />
              </FormField>
            </div>
            <FormField label={lang === 'ru' ? 'URL иконки (необяз.)' : 'URL акс (ихтиёрӣ)'}>
              <input
                value={createForm.icon_url}
                onChange={(e) => setCreateForm((f) => ({ ...f, icon_url: e.target.value }))}
                placeholder="https://..."
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </FormField>
            <FormField label={lang === 'ru' ? 'Конфигурация фильтров (JSON)' : 'Конфигуратсияи филтр (JSON)'}>
              <textarea
                value={createForm.filter_config_raw}
                onChange={(e) => { setCreateForm((f) => ({ ...f, filter_config_raw: e.target.value })); setCreateJsonError('') }}
                rows={5}
                spellCheck={false}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: '16px', resize: 'vertical' }}
              />
              {createJsonError && <ErrorText>{createJsonError}</ErrorText>}
            </FormField>
            {actionError && <ErrorText>{actionError}</ErrorText>}
            <ModalActions>
              <BtnSecondary onClick={() => setCreateOpen(false)}>{t('dashboard.cancel', lang)}</BtnSecondary>
              <BtnPrimary onClick={handleCreate} disabled={actionLoading}>{t('admin.create', lang)}</BtnPrimary>
            </ModalActions>
          </ModalCard>
        </ModalBackdrop>
      )}

      {/* Edit modal */}
      {editData && (
        <ModalBackdrop onClose={() => setEditData(null)}>
          <ModalCard maxWidth="500px">
            <ModalTitle>{lang === 'ru' ? 'Редактировать категорию' : 'Таҳрири категория'}</ModalTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '4px' }}>
              <FormField label={lang === 'ru' ? 'Название (RU)' : 'Ном (RU)'}>
                <input
                  value={editForm.name_ru}
                  onChange={(e) => setEditForm((f) => ({ ...f, name_ru: e.target.value }))}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                />
              </FormField>
              <FormField label={lang === 'ru' ? 'Название (TJ)' : 'Ном (TJ)'}>
                <input
                  value={editForm.name_tj}
                  onChange={(e) => setEditForm((f) => ({ ...f, name_tj: e.target.value }))}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                />
              </FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', marginBottom: '4px', alignItems: 'end' }}>
              <FormField label="Slug">
                <input
                  value={editForm.slug}
                  onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' }}
                />
              </FormField>
              <FormField label={lang === 'ru' ? 'Порядок' : 'Тартиб'}>
                <input
                  type="number"
                  value={editForm.display_order}
                  onChange={(e) => setEditForm((f) => ({ ...f, display_order: Number(e.target.value) }))}
                  style={{ ...inputStyle, width: '80px', boxSizing: 'border-box' }}
                />
              </FormField>
            </div>
            <FormField label={lang === 'ru' ? 'URL иконки (необяз.)' : 'URL акс (ихтиёрӣ)'}>
              <input
                value={editForm.icon_url}
                onChange={(e) => setEditForm((f) => ({ ...f, icon_url: e.target.value }))}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </FormField>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <input
                type="checkbox"
                id="edit-cat-active"
                checked={editData.is_active !== false}
                onChange={(e) => setEditData((d) => d ? { ...d, is_active: e.target.checked } : d)}
              />
              <label htmlFor="edit-cat-active" style={{ fontSize: '13px', color: 'var(--text)' }}>
                {lang === 'ru' ? 'Активна' : 'Фаъол'}
              </label>
            </div>
            <FormField label={lang === 'ru' ? 'Конфигурация фильтров (JSON)' : 'Конфигуратсияи филтр (JSON)'}>
              <textarea
                value={editForm.filter_config_raw}
                onChange={(e) => { setEditForm((f) => ({ ...f, filter_config_raw: e.target.value })); setEditJsonError('') }}
                rows={5}
                spellCheck={false}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: '16px', resize: 'vertical' }}
              />
              {editJsonError && <ErrorText>{editJsonError}</ErrorText>}
            </FormField>
            {actionError && <ErrorText>{actionError}</ErrorText>}
            <ModalActions>
              <BtnSecondary onClick={() => setEditData(null)}>{t('dashboard.cancel', lang)}</BtnSecondary>
              <BtnPrimary onClick={handleUpdate} disabled={actionLoading}>{t('dashboard.save', lang)}</BtnPrimary>
            </ModalActions>
          </ModalCard>
        </ModalBackdrop>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <ModalBackdrop onClose={() => setDeleteId(null)}>
          <ModalCard>
            <ModalTitle>{lang === 'ru' ? 'Удалить категорию?' : 'Категорияро ҳазф кунед?'}</ModalTitle>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              {t('admin.irreversible', lang)}
            </p>
            <ModalActions>
              <BtnSecondary onClick={() => setDeleteId(null)}>{t('dashboard.cancel', lang)}</BtnSecondary>
              <BtnDanger onClick={handleDelete}>{t('admin.deleteBtn2', lang)}</BtnDanger>
            </ModalActions>
          </ModalCard>
        </ModalBackdrop>
      )}
    </div>
  )
}

export default function AdminCategoriesPage() {
  return (
    <Suspense fallback={null}>
      <CategoriesPageInner />
    </Suspense>
  )
}
