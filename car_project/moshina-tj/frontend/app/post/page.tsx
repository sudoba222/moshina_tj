'use client'
import { useState, useEffect, useRef, ChangeEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Cookies from 'js-cookie'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { listingsApi, uploadApi, authApi } from '@/lib/api'
import api from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { ListingType, Currency, FuelType, TransmissionType, RentalRules } from '@/types'

const CITIES = ['Душанбе', 'Хуҷанд', 'Бохтар', 'Кӯлоб', 'Истаравшан', 'Пенджикент', 'Вахш', 'Хорог', 'Турсунзода']
const FUELS: FuelType[] = ['Бензин', 'Дизель', 'Газ', 'Электро', 'Гибрид']
const TRANSMISSIONS: TransmissionType[] = ['Автомат', 'Механика', 'Вариатор']

interface FormState {
  brand: string
  model: string
  year: string
  price: string
  currency: Currency
  mileage: string
  fuel: FuelType | ''
  transmission: TransmissionType | ''
  color: string
  city: string
  type: ListingType
  description: string
  installment_available: boolean
}

interface RentalRulesForm {
  min_age: string
  deposit: string
  deposit_currency: 'USD' | 'TJS'
  fuel_policy: 'full_to_full' | 'free_tank' | 'same_level' | ''
  delivery_available: boolean
  delivery_price: string
  max_km_per_day: string
  extra_km_price: string
  insurance_included: boolean
  notes: string
}

const initialForm: FormState = {
  brand: '', model: '', year: String(new Date().getFullYear()),
  price: '', currency: 'USD', mileage: '', fuel: '', transmission: '',
  color: '', city: '', type: 'sale', description: '', installment_available: false,
}

const initialRentalRules: RentalRulesForm = {
  min_age: '', deposit: '', deposit_currency: 'USD',
  fuel_policy: '', delivery_available: false, delivery_price: '',
  max_km_per_day: '', extra_km_price: '', insurance_included: false, notes: '',
}

// ─── Skeleton for edit mode loading ──────────────────────────────────────────
function FormSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <div className="max-w-3xl mx-auto px-4 md:px-6" style={{ paddingTop: '36px', paddingBottom: '60px' }}>
          <div style={{ height: '38px', width: '280px', borderRadius: '10px', background: 'var(--border)', marginBottom: '28px' }} />
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: 'clamp(20px, 4vw, 36px)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ height: '46px', borderRadius: '10px', background: 'var(--border)' }} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────
function PostPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const isEditMode = Boolean(editId)

  const { lang } = useLang()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormState>(initialForm)
  const [rentalRules, setRentalRules] = useState<RentalRulesForm>(initialRentalRules)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(isEditMode)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const { logout } = useAuth()

  // Auth guard — verify token is still valid server-side, not just present
  useEffect(() => {
    const token = Cookies.get('token')
    if (!token) { router.replace('/auth/login'); return }
    authApi.me().catch(() => { logout(); router.replace('/auth/login') })
  }, [router, logout])

  // Pre-populate form in edit mode
  useEffect(() => {
    if (!editId) return
    setLoadingEdit(true)
    listingsApi
      .get(editId)
      .then((res) => {
        const listing = res.data.data
        setForm({
          brand: listing.brand,
          model: listing.model,
          year: String(listing.year),
          price: String(listing.price),
          currency: listing.currency,
          mileage: listing.mileage != null ? String(listing.mileage) : '',
          fuel: listing.fuel ?? '',
          transmission: listing.transmission ?? '',
          color: listing.color ?? '',
          city: listing.city,
          type: listing.type,
          description: listing.description ?? '',
          installment_available: listing.installment_available,
        })

        // Pre-populate rental rules
        if (listing.type === 'rent' && listing.rental_rules) {
          const r = listing.rental_rules
          setRentalRules({
            min_age: r.min_age != null ? String(r.min_age) : '',
            deposit: r.deposit != null ? String(r.deposit) : '',
            deposit_currency: (r.deposit_currency as 'USD' | 'TJS') ?? 'USD',
            fuel_policy: r.fuel_policy ?? '',
            delivery_available: r.delivery_available ?? false,
            delivery_price: r.delivery_price != null ? String(r.delivery_price) : '',
            max_km_per_day: r.max_km_per_day != null ? String(r.max_km_per_day) : '',
            extra_km_price: r.extra_km_price != null ? String(r.extra_km_price) : '',
            insurance_included: r.insurance_included ?? false,
            notes: r.notes ?? '',
          })
        }

        // Existing images — already uploaded, don't re-upload
        setExistingImageUrls(listing.images.map((i) => i.url))
      })
      .catch(() => {
        setError(lang === 'ru' ? 'Не удалось загрузить объявление' : 'Эълонро бор кардан мумкин набуд')
      })
      .finally(() => setLoadingEdit(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId])

  function handleField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleRentalField<K extends keyof RentalRulesForm>(key: K, value: RentalRulesForm[K]) {
    setRentalRules((prev) => ({ ...prev, [key]: value }))
  }

  function handleImageFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const totalExisting = existingImageUrls.length + imageFiles.length
    const remaining = 8 - totalExisting
    const toAdd = files.slice(0, remaining)
    setImageFiles((prev) => [...prev, ...toAdd])
    toAdd.forEach((file) => {
      const url = URL.createObjectURL(file)
      setImagePreviews((prev) => [...prev, url])
    })
  }

  function removeNewImage(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }

  function removeExistingImage(index: number) {
    setExistingImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.brand || !form.model || !form.price || !form.city) {
      setError(lang === 'ru' ? 'Заполните все обязательные поля' : 'Ҳама майдонҳои зарурӣро пур кунед')
      return
    }

    try {
      // Upload only new image files
      setUploading(true)
      const newlyUploadedUrls: string[] = []
      for (const file of imageFiles) {
        const res = await uploadApi.image(file)
        newlyUploadedUrls.push(res.data.data.url)
      }
      setUploading(false)

      // Combine existing + newly uploaded
      const imageUrls = [...existingImageUrls, ...newlyUploadedUrls]

      // Build rental_rules if type is rent
      let rentalRulesPayload: Partial<RentalRules> | undefined
      if (form.type === 'rent') {
        const r: Partial<RentalRules> = {}
        if (rentalRules.min_age) r.min_age = Number(rentalRules.min_age)
        if (rentalRules.deposit) {
          r.deposit = Number(rentalRules.deposit)
          r.deposit_currency = rentalRules.deposit_currency
        }
        if (rentalRules.fuel_policy) r.fuel_policy = rentalRules.fuel_policy
        r.delivery_available = rentalRules.delivery_available
        if (rentalRules.delivery_available && rentalRules.delivery_price) {
          r.delivery_price = Number(rentalRules.delivery_price)
        }
        if (rentalRules.max_km_per_day) r.max_km_per_day = Number(rentalRules.max_km_per_day)
        if (rentalRules.extra_km_price) r.extra_km_price = Number(rentalRules.extra_km_price)
        r.insurance_included = rentalRules.insurance_included
        if (rentalRules.notes.trim()) r.notes = rentalRules.notes.trim()
        rentalRulesPayload = r
      }

      const payload = {
        type: form.type,
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: Number(form.year),
        price: Number(form.price),
        currency: form.currency,
        mileage: form.mileage ? Number(form.mileage) : undefined,
        fuel: form.fuel || undefined,
        transmission: form.transmission || undefined,
        color: form.color.trim() || undefined,
        city: form.city,
        description: form.description.trim() || undefined,
        installment_available: form.installment_available,
        image_urls: imageUrls,
        ...(rentalRulesPayload ? { rental_rules: rentalRulesPayload } : {}),
      }

      setSubmitting(true)
      if (isEditMode && editId) {
        await listingsApi.update(editId, payload)
        setSuccess(true)
        setTimeout(() => router.push('/dashboard'), 2000)
      } else {
        await listingsApi.create(payload)
        setSuccess(true)
        setTimeout(() => router.push('/catalog'), 2000)
      }
    } catch (err) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? (lang === 'ru' ? 'Произошла ошибка' : 'Хато рух дод'))
    } finally {
      setUploading(false)
      setSubmitting(false)
    }
  }

  async function handleAiRefine() {
    setAiError('')
    setAiLoading(true)
    try {
      const body = {
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: Number(form.year),
        price: Number(form.price) || undefined,
        currency: form.currency,
        mileage: form.mileage ? Number(form.mileage) : undefined,
        fuel: form.fuel || undefined,
        transmission: form.transmission || undefined,
        color: form.color.trim() || undefined,
        city: form.city || undefined,
        type: form.type,
        description: form.description.trim(),
        language: lang,
      }
      const res = await api.post<{ data: string }>('/ai/refine-description', body)
      const refined = res.data.data
      if (refined) {
        handleField('description', refined)
      }
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 503) {
        setAiError(
          lang === 'ru'
            ? 'AI недоступен — добавьте ANTHROPIC_API_KEY в .env'
            : 'AI дастрас нест — ANTHROPIC_API_KEY -ро ба .env илова кунед'
        )
      } else {
        setAiError(
          lang === 'ru' ? 'Не удалось улучшить описание' : 'Тавсифро беҳтар кардан мумкин набуд'
        )
      }
    } finally {
      setAiLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '11px 14px',
    fontSize: '15px',
    color: 'var(--text)',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: '6px',
    display: 'block',
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: 'clamp(20px, 4vw, 36px)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  }

  // Show skeleton while loading edit data
  if (loadingEdit) {
    return <FormSkeleton />
  }

  if (success) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="animate-scale-in" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(22,163,74,0.1)', border: '2px solid #16a34a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>
              {isEditMode
                ? (lang === 'ru' ? 'Изменения сохранены' : 'Тағйирот нигоҳ дошта шуд')
                : t('post.success', lang)
              }
            </p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const totalImageCount = existingImageUrls.length + imageFiles.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1 }} className="pb-mobile">
        <div className="max-w-3xl mx-auto px-4 md:px-6" style={{ paddingTop: '36px', paddingBottom: '60px' }}>
          <h1 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: 'var(--text)', marginBottom: '28px' }}>
            {isEditMode
              ? (lang === 'ru' ? 'Редактировать объявление' : 'Эълонро таҳрир кунед')
              : t('post.title', lang)
            }
          </h1>

          {/* Edit mode notice */}
          {isEditMode && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(37,99,235,0.07)',
              border: '1px solid rgba(37,99,235,0.25)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {lang === 'ru'
                ? 'Объявление будет отправлено на повторную проверку'
                : 'Эълон барои тасдиқи дубора фиристода мешавад'
              }
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* ── Main card ── */}
            <div style={cardStyle}>
              {/* Type */}
              <div>
                <label style={labelStyle}>{t('post.type', lang)}</label>
                <div className="flex gap-3">
                  {(['sale', 'rent'] as ListingType[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleField('type', v)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '10px',
                        fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                        background: form.type === v ? 'var(--accent)' : 'var(--surface)',
                        color: form.type === v ? '#fff' : 'var(--text-muted)',
                        border: form.type === v ? '1px solid var(--accent)' : '1px solid var(--border)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {v === 'sale' ? t('filters.sale', lang) : t('filters.rent', lang)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand + Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="brand" style={labelStyle}>{t('post.brand', lang)} *</label>
                  <input id="brand" type="text" required value={form.brand} onChange={(e) => handleField('brand', e.target.value)} placeholder="Toyota" style={inputStyle} />
                </div>
                <div>
                  <label htmlFor="model" style={labelStyle}>{t('post.model', lang)} *</label>
                  <input id="model" type="text" required value={form.model} onChange={(e) => handleField('model', e.target.value)} placeholder="Camry" style={inputStyle} />
                </div>
              </div>

              {/* Year + Mileage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="year" style={labelStyle}>{t('post.year', lang)} *</label>
                  <input id="year" type="number" required min={1900} max={2100} value={form.year} onChange={(e) => handleField('year', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label htmlFor="mileage" style={labelStyle}>{t('post.mileage', lang)}</label>
                  <input id="mileage" type="number" min={0} value={form.mileage} onChange={(e) => handleField('mileage', e.target.value)} placeholder="85000" style={inputStyle} />
                </div>
              </div>

              {/* Price + Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="price" style={labelStyle}>{t('post.price', lang)} *</label>
                  <input id="price" type="number" required min={1} value={form.price} onChange={(e) => handleField('price', e.target.value)} placeholder="15000" style={inputStyle} />
                </div>
                <div>
                  <label htmlFor="currency" style={labelStyle}>{t('post.currency', lang)}</label>
                  <select id="currency" value={form.currency} onChange={(e) => handleField('currency', e.target.value as Currency)} style={inputStyle}>
                    <option value="USD">USD ($)</option>
                    <option value="TJS">TJS (сомони)</option>
                  </select>
                </div>
              </div>

              {/* Fuel + Transmission */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fuel" style={labelStyle}>{t('post.fuel', lang)}</label>
                  <select id="fuel" value={form.fuel} onChange={(e) => handleField('fuel', e.target.value as FuelType | '')} style={inputStyle}>
                    <option value="">—</option>
                    {FUELS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="transmission" style={labelStyle}>{t('post.transmission', lang)}</label>
                  <select id="transmission" value={form.transmission} onChange={(e) => handleField('transmission', e.target.value as TransmissionType | '')} style={inputStyle}>
                    <option value="">—</option>
                    {TRANSMISSIONS.map((tr) => <option key={tr} value={tr}>{tr}</option>)}
                  </select>
                </div>
              </div>

              {/* Color + City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="color" style={labelStyle}>{t('post.color', lang)}</label>
                  <input id="color" type="text" value={form.color} onChange={(e) => handleField('color', e.target.value)} placeholder={lang === 'ru' ? 'Белый' : 'Сафед'} style={inputStyle} />
                </div>
                <div>
                  <label htmlFor="city" style={labelStyle}>{t('post.city', lang)} *</label>
                  <select id="city" required value={form.city} onChange={(e) => handleField('city', e.target.value)} style={inputStyle}>
                    <option value="">—</option>
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label htmlFor="description" style={{ ...labelStyle, marginBottom: 0 }}>
                    {t('post.description', lang)}
                  </label>
                  {form.brand.trim() && form.model.trim() && (
                    <button
                      type="button"
                      onClick={handleAiRefine}
                      disabled={aiLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: aiLoading ? 'var(--surface)' : 'var(--accent-dim)',
                        border: '1px solid var(--accent)',
                        borderRadius: '8px',
                        padding: '5px 11px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: aiLoading ? 'var(--text-muted)' : 'var(--accent)',
                        cursor: aiLoading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s',
                        fontFamily: 'var(--font)',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={(e) => {
                        if (!aiLoading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'
                        if (!aiLoading) (e.currentTarget as HTMLButtonElement).style.color = '#fff'
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = aiLoading ? 'var(--surface)' : 'var(--accent-dim)'
                        if (!aiLoading) (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'
                      }}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 3l1.5 3 3.5.5-2.5 2.5.5 3.5L12 11l-3 1.5.5-3.5L7 6.5 10.5 6z" />
                        <path d="M5 19l1 2 2-1-1-2z" />
                        <path d="M19 5l1 2 2-1-1-2z" />
                        <line x1="8" y1="16" x2="16" y2="8" />
                      </svg>
                      {aiLoading
                        ? (lang === 'ru' ? 'Генерация...' : 'Тавлид...')
                        : (lang === 'ru' ? 'Улучшить с ИИ' : 'Бо ИИ беҳтар кунед')
                      }
                    </button>
                  )}
                </div>
                <textarea
                  id="description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => handleField('description', e.target.value)}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
                {aiError && (
                  <p style={{ marginTop: '6px', fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                    {aiError}
                  </p>
                )}
              </div>

              {/* Installment */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                <input type="checkbox" checked={form.installment_available} onChange={(e) => handleField('installment_available', e.target.checked)} style={{ accentColor: 'var(--accent)', width: '18px', height: '18px' }} />
                {t('post.installment', lang)}
              </label>

              {/* Images */}
              <div>
                <label style={labelStyle}>{t('post.images', lang)}</label>
                <input ref={fileInputRef} id="photo-upload-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageFiles} style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }} />

                {/* Existing images (edit mode) */}
                {existingImageUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {existingImageUrls.map((src, i) => (
                      <div key={`existing-${i}`} style={{ position: 'relative', width: '80px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <Image src={src} alt={`Existing image ${i + 1}`} fill sizes="80px" style={{ objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(i)}
                          aria-label={`Remove existing image ${i + 1}`}
                          style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* New image previews */}
                {imagePreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {imagePreviews.map((src, i) => (
                      <div key={`new-${i}`} style={{ position: 'relative', width: '80px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '2px solid var(--accent)' }}>
                        <Image src={src} alt={`New image ${i + 1}`} fill sizes="80px" style={{ objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => removeNewImage(i)}
                          aria-label={`Remove new image ${i + 1}`}
                          style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {totalImageCount < 8 && (
                  <label
                    htmlFor="photo-upload-input"
                    style={{ background: 'var(--surface)', border: '2px dashed var(--border)', borderRadius: '10px', padding: '16px', width: '100%', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxSizing: 'border-box' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                    {lang === 'ru' ? 'Добавить фото' : 'Акс илова кунед'} ({totalImageCount}/8)
                  </label>
                )}
              </div>

              {error && (
                <div style={{ background: 'rgba(200,56,8,0.08)', border: '1px solid var(--accent)', borderRadius: '10px', padding: '12px 16px', fontSize: '14px', color: 'var(--accent)', fontWeight: 600 }}>
                  {error}
                </div>
              )}
            </div>

            {/* ── Rental rules card ── */}
            {form.type === 'rent' && (
              <div style={{ ...cardStyle, marginTop: '20px' }} className="animate-fade-in-up">
                <div style={{ paddingBottom: '4px', borderBottom: '1px solid var(--border)' }}>
                  <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>
                    {t('post.rentalRulesTitle', lang)}
                  </h2>
                </div>

                {/* Min age + Deposit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="rr-min-age" style={labelStyle}>{t('rentalRules.minAge', lang)}</label>
                    <input id="rr-min-age" type="number" min={18} max={99} value={rentalRules.min_age} onChange={(e) => handleRentalField('min_age', e.target.value)} placeholder="21" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('rentalRules.deposit', lang)}</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input type="number" min={0} value={rentalRules.deposit} onChange={(e) => handleRentalField('deposit', e.target.value)} placeholder="500" style={{ ...inputStyle, flex: 1 }} />
                      <select value={rentalRules.deposit_currency} onChange={(e) => handleRentalField('deposit_currency', e.target.value as 'USD' | 'TJS')} style={{ ...inputStyle, width: 'auto' }}>
                        <option value="USD">USD</option>
                        <option value="TJS">TJS</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Fuel policy */}
                <div>
                  <label htmlFor="rr-fuel-policy" style={labelStyle}>{t('rentalRules.fuelPolicy', lang)}</label>
                  <select id="rr-fuel-policy" value={rentalRules.fuel_policy} onChange={(e) => handleRentalField('fuel_policy', e.target.value as RentalRulesForm['fuel_policy'])} style={inputStyle}>
                    <option value="">—</option>
                    <option value="full_to_full">{t('rentalRules.fullToFull', lang)}</option>
                    <option value="free_tank">{t('rentalRules.freeTank', lang)}</option>
                    <option value="same_level">{t('rentalRules.sameLevel', lang)}</option>
                  </select>
                </div>

                {/* Delivery */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: rentalRules.delivery_available ? '10px' : '0' }}>
                    <input type="checkbox" checked={rentalRules.delivery_available} onChange={(e) => handleRentalField('delivery_available', e.target.checked)} style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }} />
                    {t('rentalRules.delivery', lang)}
                  </label>
                  {rentalRules.delivery_available && (
                    <div>
                      <label style={labelStyle}>{lang === 'ru' ? 'Стоимость доставки (USD)' : 'Нархи расонидан (USD)'}</label>
                      <input type="number" min={0} value={rentalRules.delivery_price} onChange={(e) => handleRentalField('delivery_price', e.target.value)} placeholder="10" style={inputStyle} />
                    </div>
                  )}
                </div>

                {/* Max km + Extra km */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>{t('rentalRules.maxKm', lang)}</label>
                    <input type="number" min={0} value={rentalRules.max_km_per_day} onChange={(e) => handleRentalField('max_km_per_day', e.target.value)} placeholder="300" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('rentalRules.extraKm', lang)} (USD)</label>
                    <input type="number" min={0} step={0.1} value={rentalRules.extra_km_price} onChange={(e) => handleRentalField('extra_km_price', e.target.value)} placeholder="0.5" style={inputStyle} />
                  </div>
                </div>

                {/* Insurance */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                  <input type="checkbox" checked={rentalRules.insurance_included} onChange={(e) => handleRentalField('insurance_included', e.target.checked)} style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }} />
                  {t('rentalRules.insurance', lang)}
                </label>

                {/* Notes */}
                <div>
                  <label style={labelStyle}>{t('rentalRules.notes', lang)}</label>
                  <textarea rows={3} value={rentalRules.notes} onChange={(e) => handleRentalField('notes', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} placeholder={lang === 'ru' ? 'Дополнительные условия...' : 'Шартҳои иловагӣ...'} />
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || uploading}
              style={{
                marginTop: '20px',
                width: '100%',
                background: submitting || uploading ? 'var(--text-muted)' : 'var(--accent)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '16px',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                cursor: submitting || uploading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s ease',
              }}
            >
              {uploading
                ? t('post.uploading', lang)
                : submitting
                  ? t('common.loading', lang)
                  : isEditMode
                    ? (lang === 'ru' ? 'Сохранить изменения' : 'Тағйиротро нигоҳ доред')
                    : t('post.submit', lang)
              }
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  )
}

// ─── Wrapper with Suspense (required for useSearchParams in Next.js 14) ───────
export default function PostPageWrapper() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <PostPage />
    </Suspense>
  )
}
