'use client'
import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { catalogApi } from '@/lib/api'
import type { AdBanner } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import {
  inputStyle, ModalBackdrop, ModalCard, ModalTitle, ModalActions,
  BtnPrimary, BtnSecondary, BtnDanger, FormField, ErrorText, extractApiError,
} from '../components/shared'
import { IconPlus, IconImage, IconX } from '../components/icons'
import { useToast } from '../components/ToastContext'

type BannerForm = {
  title_ru: string; title_tj: string
  subtitle_ru: string; subtitle_tj: string
  image_url: string; link_url: string; display_order: number
}

const EMPTY_FORM: BannerForm = {
  title_ru: '', title_tj: '', subtitle_ru: '', subtitle_tj: '',
  image_url: '', link_url: '', display_order: 0,
}

export default function AdminBannersPage() {
  const { lang } = useLang()
  const { showToast } = useToast()

  const [banners, setBanners] = useState<AdBanner[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<BannerForm>(EMPTY_FORM)
  const [editData, setEditData] = useState<AdBanner | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const loadBanners = useCallback(async () => {
    setLoading(true)
    try {
      const res = await catalogApi.adminGetBanners()
      setBanners(res.data.data ?? [])
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
    setLoading(false)
  }, [lang, showToast])

  useEffect(() => { loadBanners() }, [loadBanners])

  async function handleCreate() {
    setActionError('')
    setActionLoading(true)
    try {
      await catalogApi.adminCreateBanner({
        title_ru: createForm.title_ru,
        title_tj: createForm.title_tj,
        subtitle_ru: createForm.subtitle_ru || null,
        subtitle_tj: createForm.subtitle_tj || null,
        image_url: createForm.image_url,
        link_url: createForm.link_url || null,
        display_order: Number(createForm.display_order),
      })
      setCreateOpen(false)
      setCreateForm(EMPTY_FORM)
      showToast(lang === 'ru' ? 'Баннер создан' : 'Баннер сохта шуд', 'success')
      loadBanners()
    } catch (e) {
      setActionError(extractApiError(e, t('common.errorCreate', lang)))
    }
    setActionLoading(false)
  }

  async function handleEdit() {
    if (!editData) return
    setActionLoading(true)
    try {
      await catalogApi.adminUpdateBanner(editData.id, {
        title_ru: editData.title_ru,
        title_tj: editData.title_tj,
        subtitle_ru: editData.subtitle_ru ?? undefined,
        subtitle_tj: editData.subtitle_tj ?? undefined,
        image_url: editData.image_url,
        link_url: editData.link_url ?? undefined,
        display_order: editData.display_order,
        is_active: editData.is_active,
      })
      setEditData(null)
      showToast(lang === 'ru' ? 'Данные сохранены' : 'Маълумот нигоҳ дошта шуд', 'success')
      loadBanners()
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
    setActionLoading(false)
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await catalogApi.adminDeleteBanner(deleteId)
      setDeleteId(null)
      showToast(lang === 'ru' ? 'Баннер удалён' : 'Баннер ҳазф шуд', 'success')
      loadBanners()
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
  }

  const labelPairs = [
    { label: lang === 'ru' ? 'Заголовок (RU)' : 'Сарлавҳа (RU)', key: 'title_ru' as const },
    { label: lang === 'ru' ? 'Заголовок (TJ)' : 'Сарлавҳа (TJ)', key: 'title_tj' as const },
    { label: lang === 'ru' ? 'Подзаголовок (RU)' : 'Зерсарлавҳа (RU)', key: 'subtitle_ru' as const },
    { label: lang === 'ru' ? 'Подзаголовок (TJ)' : 'Зерсарлавҳа (TJ)', key: 'subtitle_tj' as const },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          {lang === 'ru' ? 'Баннеры' : 'Баннерҳо'}
        </h1>
        <button
          onClick={() => { setCreateOpen(true); setActionError('') }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--accent)', color: 'var(--color-white)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}
        >
          <IconPlus /> {lang === 'ru' ? 'Добавить баннер' : 'Банер илова'}
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: '20px' }}>{t('common.loading', lang)}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {banners.length === 0 && (
            <div style={{ background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)', padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              {lang === 'ru' ? 'Нет баннеров. Добавьте первый.' : 'Банер нест. Аввалинро илова кунед.'}
            </div>
          )}
          {banners.map((b) => (
            <div key={b.id} style={{ background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
              <div style={{ flexShrink: 0, width: '120px', height: '72px', position: 'relative', background: 'var(--surface)' }}>
                {b.image_url ? (
                  <Image src={b.image_url} alt={b.title_ru} fill style={{ objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <IconImage />
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0, padding: '12px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title_ru}</div>
                {b.subtitle_ru && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{b.subtitle_ru}</div>}
                {b.link_url && <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.link_url}</div>}
              </div>
              <div style={{ flexShrink: 0, padding: '0 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', background: b.is_active ? 'var(--color-success-dim)' : 'var(--tag-bg)', color: b.is_active ? 'var(--color-success)' : 'var(--text-muted)' }}>
                  {b.is_active ? (lang === 'ru' ? 'Активен' : 'Фаъол') : (lang === 'ru' ? 'Скрыт' : 'Пинҳон')}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>#{b.display_order}</span>
              </div>
              <div style={{ flexShrink: 0, display: 'flex', gap: '6px', padding: '0 14px' }}>
                <button
                  onClick={() => setEditData({ ...b })}
                  style={{ padding: '6px 12px', background: 'var(--tag-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                >
                  {lang === 'ru' ? 'Изм.' : 'Таҳр.'}
                </button>
                <button
                  onClick={() => setDeleteId(b.id)}
                  style={{ padding: '6px 10px', background: 'var(--color-error-dim)', color: 'var(--color-error)', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <IconX />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {createOpen && (
        <ModalBackdrop onClose={() => setCreateOpen(false)}>
          <ModalCard maxWidth="500px">
            <ModalTitle>{lang === 'ru' ? 'Новый баннер' : 'Банери нав'}</ModalTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              {labelPairs.map(({ label, key }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                  <input
                    value={createForm[key]}
                    onChange={(e) => setCreateForm((f) => ({ ...f, [key]: e.target.value }))}
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
            <FormField label={lang === 'ru' ? 'URL изображения' : 'URL акс'}>
              <input
                value={createForm.image_url}
                onChange={(e) => setCreateForm((f) => ({ ...f, image_url: e.target.value }))}
                placeholder="https://..."
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </FormField>
            <FormField label={lang === 'ru' ? 'Ссылка (необяз.)' : 'Истинод (ихтиёрӣ)'}>
              <input
                value={createForm.link_url}
                onChange={(e) => setCreateForm((f) => ({ ...f, link_url: e.target.value }))}
                placeholder="/catalog"
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </FormField>
            <FormField label={t('admin.orderLabel', lang)}>
              <input
                type="number"
                value={createForm.display_order}
                onChange={(e) => setCreateForm((f) => ({ ...f, display_order: Number(e.target.value) }))}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: '4px' }}
              />
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
            <ModalTitle>{lang === 'ru' ? 'Редактировать баннер' : 'Таҳрири баннер'}</ModalTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              {labelPairs.map(({ label, key }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                  <input
                    value={(editData[key as keyof AdBanner] as string) ?? ''}
                    onChange={(e) => setEditData((d) => d ? { ...d, [key]: e.target.value } : d)}
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
            <FormField label={lang === 'ru' ? 'URL изображения' : 'URL акс'}>
              <input
                value={editData.image_url}
                onChange={(e) => setEditData((d) => d ? { ...d, image_url: e.target.value } : d)}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </FormField>
            <FormField label={lang === 'ru' ? 'Ссылка (необяз.)' : 'Истинод (ихтиёрӣ)'}>
              <input
                value={editData.link_url ?? ''}
                onChange={(e) => setEditData((d) => d ? { ...d, link_url: e.target.value } : d)}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </FormField>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'flex-end' }}>
              <FormField label={t('admin.orderLabel', lang)}>
                <input
                  type="number"
                  value={editData.display_order}
                  onChange={(e) => setEditData((d) => d ? { ...d, display_order: Number(e.target.value) } : d)}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                />
              </FormField>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {lang === 'ru' ? 'Активен' : 'Фаъол'}
                </label>
                <input
                  type="checkbox"
                  checked={editData.is_active ?? true}
                  onChange={(e) => setEditData((d) => d ? { ...d, is_active: e.target.checked } : d)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>
            </div>
            <ModalActions>
              <BtnSecondary onClick={() => setEditData(null)}>{t('dashboard.cancel', lang)}</BtnSecondary>
              <BtnPrimary onClick={handleEdit} disabled={actionLoading}>{t('dashboard.save', lang)}</BtnPrimary>
            </ModalActions>
          </ModalCard>
        </ModalBackdrop>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <ModalBackdrop onClose={() => setDeleteId(null)}>
          <ModalCard>
            <ModalTitle>{t('admin.deleteBanner', lang)}</ModalTitle>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>{t('admin.irreversible', lang)}</p>
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
