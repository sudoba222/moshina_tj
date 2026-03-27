'use client'
import { useState, useEffect, useRef, ChangeEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { listingsApi, uploadApi, authApi, catalogApi } from '@/lib/api'
import api from '@/lib/api'
import type { CarCategory } from '@/lib/api'
import { useBrands, useModels } from '@/hooks/useCatalogData'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { ListingType, Currency, FuelType, TransmissionType, BodyType, RentalRules } from '@/types'

const CITIES_OPTIONS = [
  { value: 'Душанбе',    labelKey: 'options.cityDushanbe' },
  { value: 'Хуҷанд',     labelKey: 'options.cityKhujand' },
  { value: 'Бохтар',     labelKey: 'options.cityBokhtar' },
  { value: 'Кӯлоб',      labelKey: 'options.cityCulob' },
  { value: 'Истаравшан', labelKey: 'options.cityIstaravshan' },
  { value: 'Пенджикент', labelKey: 'options.cityPenjikent' },
  { value: 'Вахш',       labelKey: 'options.cityVakhsh' },
  { value: 'Хорог',      labelKey: 'options.cityKhorog' },
  { value: 'Турсунзода', labelKey: 'options.cityTursunzoda' },
]
const FUELS_OPTIONS: { value: FuelType; labelKey: string }[] = [
  { value: 'Бензин',  labelKey: 'options.fuelBenzin' },
  { value: 'Дизель',  labelKey: 'options.fuelDiesel' },
  { value: 'Газ',     labelKey: 'options.fuelGas' },
  { value: 'Электро', labelKey: 'options.fuelElectric' },
  { value: 'Гибрид',  labelKey: 'options.fuelHybrid' },
]
const TRANSMISSIONS_OPTIONS: { value: TransmissionType; labelKey: string }[] = [
  { value: 'Автомат',  labelKey: 'options.transAutomatic' },
  { value: 'Механика', labelKey: 'options.transMechanical' },
  { value: 'Вариатор', labelKey: 'options.transCvt' },
]
const BODY_TYPES_OPTIONS: { value: BodyType; labelKey: string }[] = [
  { value: 'sedan',       labelKey: 'options.bodySedan' },
  { value: 'suv',         labelKey: 'options.bodySuv' },
  { value: 'hatchback',   labelKey: 'options.bodyHatchback' },
  { value: 'minivan',     labelKey: 'options.bodyMinivan' },
  { value: 'pickup',      labelKey: 'options.bodyPickup' },
  { value: 'coupe',       labelKey: 'options.bodyCoupe' },
  { value: 'wagon',       labelKey: 'options.bodyWagon' },
  { value: 'crossover',   labelKey: 'options.bodyCrossover' },
  { value: 'convertible', labelKey: 'options.bodyConvertible' },
  { value: 'van',         labelKey: 'options.bodyVan' },
  { value: 'bus',         labelKey: 'options.bodyBus' },
  { value: 'other',       labelKey: 'options.bodyOther' },
]

const DRAFT_KEY = 'post_draft'

interface FormState {
  category_id: string
  brand: string
  model: string
  year: string
  price: string
  currency: Currency
  is_negotiable: boolean
  prepayment_amount: string
  mileage: string
  fuel: FuelType | ''
  transmission: TransmissionType | ''
  body_type: BodyType | ''
  drive_type: string
  engine_volume: string
  has_turbine: boolean | null
  condition: string
  is_customs_cleared: boolean
  taxi_license: boolean
  color: string
  city: string
  type: ListingType
  description: string
  youtube_link: string
  tiktok_link: string
  contact_name: string
  contact_email: string
  contact_phone: string
  contact_method: 'phone_and_chat' | 'phone_only'
  whatsapp_number: string
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
  category_id: '',
  brand: '', model: '', year: String(new Date().getFullYear()),
  price: '', currency: 'USD', is_negotiable: false,
  prepayment_amount: '',
  mileage: '', fuel: '', transmission: '',
  body_type: '', drive_type: '', engine_volume: '',
  has_turbine: null, condition: '', is_customs_cleared: true,
  taxi_license: false,
  color: '', city: '', type: 'sale', description: '',
  youtube_link: '', tiktok_link: '',
  contact_name: '', contact_email: '', contact_phone: '',
  contact_method: 'phone_and_chat', whatsapp_number: '',
  installment_available: false,
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

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px', gap: 0 }}>
      {labels.map((label, idx) => {
        const num = idx + 1
        const isActive = num === step
        const isDone = num < step
        return (
          <div key={num} style={{ display: 'flex', alignItems: 'center', flex: idx < labels.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 800,
                background: isDone ? 'var(--accent)' : isActive ? 'var(--accent)' : 'var(--surface)',
                color: isDone || isActive ? 'var(--color-white)' : 'var(--text-muted)',
                border: isDone || isActive ? '2px solid var(--accent)' : '2px solid var(--border)',
                transition: 'all 0.2s',
              }}>
                {isDone ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1.5 6 4.5 9 10.5 3" />
                  </svg>
                ) : num}
              </div>
              <span style={{ fontSize: '10px', fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {idx < labels.length - 1 && (
              <div style={{
                flex: 1,
                height: '2px',
                background: isDone ? 'var(--accent)' : 'var(--border)',
                margin: '0 6px',
                marginBottom: '14px',
                transition: 'background 0.2s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Chip pill (used for fuel/transmission selectors) ────────────────────────
function ChipPill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '7px 14px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        background: selected ? 'var(--accent)' : 'var(--surface)',
        color: selected ? 'var(--color-white)' : 'var(--text-muted)',
        border: selected ? '1px solid var(--accent)' : '1px solid var(--border)',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
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

  const [step, setStep] = useState(0)

  const [form, setForm] = useState<FormState>(initialForm)
  const [categories, setCategories] = useState<CarCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
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

  // Draft state
  const [hasDraft, setHasDraft] = useState(false)

  const [brandSearch, setBrandSearch] = useState('')
  const [brandOpen, setBrandOpen] = useState(false)
  const [modelSearch, setModelSearch] = useState('')
  const [modelOpen, setModelOpen] = useState(false)

  // Dynamic brands/models from API
  const { brands, loading: brandsLoading } = useBrands()
  const selectedBrandId = brands.find((b) => b.name === form.brand)?.id ?? null
  const { models, loading: modelsLoading } = useModels(selectedBrandId)

  const { logout } = useAuth()

  // Auth guard — verify session is still valid via HttpOnly cookie
  useEffect(() => {
    authApi.me().catch(() => { logout(); router.replace('/auth/login') })
  }, [router, logout])

  // Fetch categories
  useEffect(() => {
    setCategoriesLoading(true)
    catalogApi.getCategories()
      .then((res) => setCategories(res.data.data))
      .catch((err) => console.error('Failed to fetch categories:', err))
      .finally(() => setCategoriesLoading(false))
  }, [])

  // Reset model combobox state whenever brand changes
  useEffect(() => {
    setModelSearch('')
    setModelOpen(false)
  }, [form.brand])

  // Load draft on mount (only if not in edit mode)
  useEffect(() => {
    if (isEditMode) return
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return
    try {
      const draft = JSON.parse(raw) as FormState
      setForm(draft)
      setHasDraft(true)
    } catch {
      localStorage.removeItem(DRAFT_KEY)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save draft whenever form changes (not in edit mode)
  useEffect(() => {
    if (isEditMode) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
    setHasDraft(true)
  }, [form, isEditMode])

  // Pre-populate form in edit mode
  useEffect(() => {
    if (!editId) return
    setLoadingEdit(true)
    listingsApi
      .get(editId)
      .then((res) => {
        const listing = res.data.data
        setForm({
          category_id: '',
          brand: listing.brand,
          model: listing.model,
          year: String(listing.year),
          price: String(listing.price),
          currency: listing.currency,
          is_negotiable: false,
          prepayment_amount: '',
          mileage: listing.mileage != null ? String(listing.mileage) : '',
          fuel: listing.fuel ?? '',
          transmission: listing.transmission ?? '',
          body_type: listing.body_type ?? '',
          drive_type: '',
          engine_volume: '',
          has_turbine: null,
          condition: '',
          is_customs_cleared: false,
          taxi_license: false,
          color: listing.color ?? '',
          city: listing.city,
          type: listing.type,
          description: listing.description ?? '',
          youtube_link: '',
          tiktok_link: '',
          contact_name: '',
          contact_email: '',
          contact_phone: '',
          contact_method: 'phone_and_chat',
          whatsapp_number: '',
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
    setError('')
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleRentalField<K extends keyof RentalRulesForm>(key: K, value: RentalRulesForm[K]) {
    setRentalRules((prev) => ({ ...prev, [key]: value }))
  }

  function handleImageFiles(e: ChangeEvent<HTMLInputElement>) {
    setError('')
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

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY)
    setForm(initialForm)
    setHasDraft(false)
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
        category_id: form.category_id || undefined,
        type: form.type,
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: Number(form.year),
        price: Number(form.price),
        currency: form.currency,
        is_negotiable: form.is_negotiable,
        prepayment_amount: form.prepayment_amount ? Number(form.prepayment_amount) : undefined,
        mileage: form.mileage ? Number(form.mileage) : undefined,
        fuel: form.fuel || undefined,
        transmission: form.transmission || undefined,
        body_type: form.body_type || undefined,
        drive_type: form.drive_type || undefined,
        engine_volume: form.engine_volume || undefined,
        has_turbine: form.has_turbine,
        condition: form.condition || undefined,
        is_customs_cleared: form.is_customs_cleared,
        taxi_license: form.taxi_license,
        color: form.color.trim() || undefined,
        city: form.city,
        description: form.description.trim() || undefined,
        
        youtube_link: form.youtube_link.trim() || undefined,
        tiktok_link: form.tiktok_link.trim() || undefined,
        
        contact_name: form.contact_name.trim() || undefined,
        contact_email: form.contact_email.trim() || undefined,
        contact_phone: form.contact_phone.trim() || undefined,
        contact_method: form.contact_method,
        whatsapp_number: form.whatsapp_number.trim() || undefined,

        installment_available: form.installment_available,
        image_urls: imageUrls,
        ...(rentalRulesPayload ? { rental_rules: rentalRulesPayload } : {}),
      }

      setSubmitting(true)
      if (isEditMode && editId) {
        await listingsApi.update(editId, payload)
        localStorage.removeItem(DRAFT_KEY)
        setSuccess(true)
        setTimeout(() => router.push('/dashboard'), 2000)
      } else {
        await listingsApi.create(payload)
        localStorage.removeItem(DRAFT_KEY)
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

  // ── Per-step validation before advancing ────────────────────────────────────
  // Steps: 0=Type, 1=Category, 2=Brand/Model/Year, 3=Details, 4=Photos, 5=Contact
  function goNext() {
    setError('')
    if (step === 2) {
      if (!form.brand.trim()) {
        setError(lang === 'ru' ? 'Выберите марку автомобиля' : 'Маркаи мошинаро интихоб кунед')
        return
      }
      if (!form.model.trim()) {
        setError(lang === 'ru' ? 'Укажите модель' : 'Моделро нишон диҳед')
        return
      }
      if (!form.year || Number(form.year) < 1900 || Number(form.year) > 2100) {
        setError(lang === 'ru' ? 'Укажите корректный год' : 'Солро дуруст нишон диҳед')
        return
      }
    }
    if (step === 4) {
      const totalImages = existingImageUrls.length + imageFiles.length
      if (totalImages === 0) {
        setError(lang === 'ru' ? 'Добавьте хотя бы одно фото' : 'Ҳадди ақал як акс илова кунед')
        return
      }
    }
    setStep((s) => s + 1)
  }

  // Filtered brands for combobox
  const filteredBrands = brandSearch.trim()
    ? brands.filter((b) => b.name.toLowerCase().includes(brandSearch.toLowerCase()))
    : brands

  // Show skeleton while loading edit data
  if (loadingEdit) {
    return <FormSkeleton />
  }

  if (success) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="animate-scale-in" style={{ textAlign: 'center', padding: '40px 20px', maxWidth: '460px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'var(--color-success-dim)', border: '2px solid var(--color-success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>
              {isEditMode
                ? (lang === 'ru' ? 'Изменения сохранены' : 'Тағйирот нигоҳ дошта шуд')
                : t('post.success', lang)
              }
            </p>
            {!isEditMode && (
              <div style={{
                background: 'var(--color-warning-dim)',
                border: '1px solid var(--color-warning)',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                textAlign: 'left',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p style={{ fontSize: '13px', lineHeight: '1.55', color: 'var(--text)', margin: 0 }}>
                  {t('post.successSub', lang)}
                </p>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const totalImageCount = existingImageUrls.length + imageFiles.length

  const stepLabels = [
    lang === 'ru' ? 'Тип' : 'Навъ',
    lang === 'ru' ? 'Категория' : 'Категория',
    t('post.wizard_step1', lang),
    t('post.wizard_step2', lang),
    t('post.wizard_step3', lang),
    t('post.wizard_step4', lang),
  ]

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
              background: 'var(--color-info-dim)',
              border: '1px solid var(--color-info)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

          {/* Draft notice */}
          {!isEditMode && hasDraft && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '10px 14px', marginBottom: '20px',
              fontSize: '13px', color: 'var(--text-muted)',
            }}>
              <span style={{ fontWeight: 600 }}>{t('post.draft_saved', lang)}</span>
              <button
                type="button"
                onClick={clearDraft}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--accent)', fontWeight: 700, padding: 0 }}
              >
                {t('post.clear_draft', lang)}
              </button>
            </div>
          )}

          {/* Step indicator */}
          <StepIndicator step={step + 1} labels={stepLabels} />

          <form onSubmit={handleSubmit}>

            {/* ── STEP 0: Listing Type ── */}
            {step === 0 && (
              <div style={cardStyle} className="animate-fade-in">
                <div style={{ marginBottom: '4px' }}>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                    {lang === 'ru' ? 'Что вы хотите сделать?' : 'Шумо чӣ мехоҳед?'}
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {lang === 'ru' ? 'Выберите тип объявления' : 'Навъи эълонро интихоб кунед'}
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '12px' }}>
                  {([
                    {
                      value: 'sale' as const,
                      labelRu: 'Продажа',
                      labelTj: 'Фурӯш',
                      descRu: 'Продайте свой автомобиль',
                      descTj: 'Мошинаи худро фурӯшед',
                      icon: (
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l3-4h8l3 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2m-7 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0m-4 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0" />
                        </svg>
                      ),
                    },
                    {
                      value: 'rent' as const,
                      labelRu: 'Аренда',
                      labelTj: 'Иҷора',
                      descRu: 'Сдайте авто в аренду',
                      descTj: 'Мошинаро ба иҷора диҳед',
                      icon: (
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="1" y="3" width="15" height="13" rx="2" />
                          <path d="M16 8h4l3 3v5h-7V8z" />
                          <circle cx="5.5" cy="18.5" r="2.5" />
                          <circle cx="18.5" cy="18.5" r="2.5" />
                        </svg>
                      ),
                    },
                  ] as const).map(({ value, labelRu, labelTj, descRu, descTj, icon }) => {
                    const isSelected = form.type === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => { handleField('type', value); setStep(1) }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          padding: '20px',
                          borderRadius: '16px',
                          background: isSelected ? 'var(--accent)' : 'var(--surface)',
                          color: isSelected ? 'var(--color-white)' : 'var(--text)',
                          border: isSelected ? '2px solid var(--accent)' : '2px solid var(--border)',
                          fontWeight: 700,
                          fontSize: '16px',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          textAlign: 'left',
                          minHeight: '80px',
                        }}
                      >
                        <span style={{ flexShrink: 0, opacity: isSelected ? 1 : 0.6 }}>{icon}</span>
                        <span>
                          <span style={{ display: 'block', fontSize: '17px', fontWeight: 800 }}>
                            {lang === 'ru' ? labelRu : labelTj}
                          </span>
                          <span style={{ display: 'block', fontSize: '13px', fontWeight: 500, opacity: 0.75, marginTop: '2px' }}>
                            {lang === 'ru' ? descRu : descTj}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 1: Category ── */}
            {step === 1 && (
              <div style={cardStyle} className="animate-fade-in">
                <div>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                    {lang === 'ru' ? 'Выберите категорию' : 'Категорияро интихоб кунед'}
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    {lang === 'ru' ? 'К какому типу относится ваш автомобиль?' : 'Мошинаи шумо ба кадом навъ тааллуқ дорад?'}
                  </p>
                </div>
                {categoriesLoading ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} style={{ height: '64px', borderRadius: '12px', background: 'var(--border)' }} className="skeleton" />
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {categories.map((cat) => {
                      const isSelected = form.category_id === cat.id
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            handleField('category_id', cat.id)
                            setStep(2)
                          }}
                          style={{
                            padding: '16px 12px',
                            borderRadius: '14px',
                            background: isSelected ? 'var(--accent)' : 'var(--surface)',
                            color: isSelected ? 'var(--color-white)' : 'var(--text)',
                            border: isSelected ? '2px solid var(--accent)' : '2px solid var(--border)',
                            fontWeight: 700,
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            textAlign: 'center',
                            minHeight: '64px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {lang === 'ru' ? cat.name_ru : cat.name_tj}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 2: Brand / Model / Year ── */}
            {step === 2 && (
              <div style={cardStyle} className="animate-fade-in">
                {/* Brand combobox */}
                <div style={{ position: 'relative' }}>
                  <label htmlFor="brand-input" style={labelStyle}>{t('post.brand', lang)} *</label>
                  <input
                    id="brand-input"
                    type="text"
                    autoComplete="off"
                    disabled={brandsLoading}
                    value={brandsLoading ? '' : (brandOpen ? brandSearch : form.brand)}
                    onChange={(e) => {
                      setBrandSearch(e.target.value)
                      setBrandOpen(true)
                      if (!e.target.value) handleField('brand', '')
                    }}
                    onFocus={() => { setBrandOpen(true); setBrandSearch('') }}
                    onBlur={() => setTimeout(() => setBrandOpen(false), 150)}
                    placeholder={brandsLoading ? t('common.loading', lang) : 'Toyota, BMW...'}
                    style={{ ...inputStyle, opacity: brandsLoading ? 0.5 : 1 }}
                  />
                  {brandOpen && filteredBrands.length > 0 && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                      background: 'var(--card)', border: '1px solid var(--border)',
                      borderRadius: '10px', maxHeight: '200px', overflowY: 'auto',
                      zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    }}>
                      {filteredBrands.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onMouseDown={() => {
                            handleField('brand', b.name)
                            handleField('model', '')
                            setBrandSearch('')
                            setBrandOpen(false)
                          }}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '9px 14px', background: 'none', border: 'none',
                            cursor: 'pointer', fontSize: '14px', color: 'var(--text)',
                            fontWeight: form.brand === b.name ? 700 : 400,
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
                        >
                          {b.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Model */}
                <div style={{ position: 'relative' }}>
                  <label htmlFor="model-input" style={labelStyle}>{t('post.model', lang)} *</label>
                  <input
                    id="model-input"
                    type="text"
                    autoComplete="off"
                    disabled={modelsLoading || !form.brand}
                    value={modelsLoading ? '' : (modelOpen ? modelSearch : form.model)}
                    onChange={(e) => {
                      setModelSearch(e.target.value)
                      setModelOpen(true)
                      if (!e.target.value) handleField('model', '')
                    }}
                    onFocus={() => { setModelOpen(true); setModelSearch('') }}
                    onBlur={() => setTimeout(() => setModelOpen(false), 150)}
                    placeholder={
                      !form.brand
                        ? (lang === 'ru' ? 'Сначала выберите марку' : 'Аввал маркаро интихоб кунед')
                        : modelsLoading
                          ? t('common.loading', lang)
                          : 'Camry, Nexia...'
                    }
                    style={{ ...inputStyle, opacity: (!form.brand || modelsLoading) ? 0.5 : 1 }}
                  />
                  {modelOpen && form.brand && (
                    (() => {
                      const filtered = modelSearch.trim()
                        ? models.filter((m) => m.name.toLowerCase().includes(modelSearch.toLowerCase()))
                        : models
                      const showFreeText = modelSearch.trim() && !filtered.find((m) => m.name.toLowerCase() === modelSearch.toLowerCase())
                      return (filtered.length > 0 || showFreeText) ? (
                        <div style={{
                          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                          background: 'var(--card)', border: '1px solid var(--border)',
                          borderRadius: '10px', maxHeight: '220px', overflowY: 'auto',
                          zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        }}>
                          {filtered.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onMouseDown={() => {
                                handleField('model', m.name)
                                setModelSearch('')
                                setModelOpen(false)
                              }}
                              style={{
                                display: 'block', width: '100%', textAlign: 'left',
                                padding: '9px 14px', background: 'none', border: 'none',
                                cursor: 'pointer', fontSize: '14px', color: 'var(--text)',
                                fontWeight: form.model === m.name ? 700 : 400,
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)' }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
                            >
                              {m.name}
                            </button>
                          ))}
                          {showFreeText && (
                            <button
                              type="button"
                              onMouseDown={() => {
                                handleField('model', modelSearch.trim())
                                setModelSearch('')
                                setModelOpen(false)
                              }}
                              style={{
                                display: 'block', width: '100%', textAlign: 'left',
                                padding: '9px 14px', background: 'none', border: 'none',
                                borderTop: filtered.length > 0 ? '1px solid var(--border)' : 'none',
                                cursor: 'pointer', fontSize: '14px', color: 'var(--accent)', fontWeight: 600,
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)' }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
                            >
                              {lang === 'ru' ? `Добавить "${modelSearch.trim()}"` : `Илова кардан "${modelSearch.trim()}"`}
                            </button>
                          )}
                        </div>
                      ) : null
                    })()
                  )}
                </div>

                {/* Year */}
                <div>
                  <label htmlFor="year" style={labelStyle}>{t('post.year', lang)} *</label>
                  <input
                    id="year"
                    type="number"
                    min={1900}
                    max={2100}
                    value={form.year}
                    onChange={(e) => handleField('year', e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {/* Body type chips */}
                <div>
                  <label style={labelStyle}>{t('post.bodyType', lang)}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {BODY_TYPES_OPTIONS.map((bt) => (
                      <button
                        key={bt.value}
                        type="button"
                        onClick={() => handleField('body_type', form.body_type === bt.value ? '' : bt.value)}
                        style={{
                          padding: '7px 6px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'center',
                          background: form.body_type === bt.value ? 'var(--accent)' : 'var(--surface)',
                          color: form.body_type === bt.value ? 'var(--color-white)' : 'var(--text-muted)',
                          border: form.body_type === bt.value ? '1px solid var(--accent)' : '1px solid var(--border)',
                          transition: 'all 0.15s',
                        }}
                      >
                        {t(bt.labelKey, lang)}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div style={{ background: 'rgba(200,56,8,0.08)', border: '1px solid var(--accent)', borderRadius: '10px', padding: '12px 16px', fontSize: '14px', color: 'var(--accent)', fontWeight: 600 }}>
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 3: Details (Specs) ── */}
            {step === 3 && (
              <div style={cardStyle} className="animate-fade-in">
                {/* Fuel chips */}
                <div>
                  <label style={labelStyle}>{t('post.fuel', lang)}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {FUELS_OPTIONS.map((f) => (
                      <ChipPill
                        key={f.value}
                        label={t(f.labelKey, lang)}
                        selected={form.fuel === f.value}
                        onClick={() => handleField('fuel', form.fuel === f.value ? '' : f.value)}
                      />
                    ))}
                  </div>
                </div>

                {/* Transmission chips */}
                <div>
                  <label style={labelStyle}>{t('post.transmission', lang)}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {TRANSMISSIONS_OPTIONS.map((tr) => (
                      <ChipPill
                        key={tr.value}
                        label={t(tr.labelKey, lang)}
                        selected={form.transmission === tr.value}
                        onClick={() => handleField('transmission', form.transmission === tr.value ? '' : tr.value)}
                      />
                    ))}
                  </div>
                </div>

                {/* Drive Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="drive_type" style={labelStyle}>{lang === 'ru' ? 'Привод' : 'Привод'}</label>
                    <select id="drive_type" value={form.drive_type} onChange={(e) => handleField('drive_type', e.target.value)} style={inputStyle}>
                      <option value="">—</option>
                      <option value="Передний">{lang === 'ru' ? 'Передний' : 'Пеш'}</option>
                      <option value="Задний">{lang === 'ru' ? 'Задний' : 'Қафо'}</option>
                      <option value="Полный">{lang === 'ru' ? 'Полный' : 'Ҳамааш'}</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="engine_volume" style={labelStyle}>{lang === 'ru' ? 'Объем двигателя' : 'Ҳаҷми муҳаррик'}</label>
                    <input id="engine_volume" type="text" value={form.engine_volume} onChange={(e) => handleField('engine_volume', e.target.value)} placeholder="2.0 / Электрический" style={inputStyle} />
                  </div>
                </div>

                {/* Turbine, Condition */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="condition" style={labelStyle}>{lang === 'ru' ? 'Состояние' : 'Ҳолат'}</label>
                    <select id="condition" value={form.condition} onChange={(e) => handleField('condition', e.target.value)} style={inputStyle}>
                      <option value="">—</option>
                      <option value="С пробегом">{lang === 'ru' ? 'С пробегом' : 'Бо масофа'}</option>
                      <option value="Новый">{lang === 'ru' ? 'Новый' : 'Нав'}</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingTop: '28px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.has_turbine === true} onChange={(e) => handleField('has_turbine', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }} />
                      {lang === 'ru' ? 'Турбина' : 'Турбина'}
                    </label>
                  </div>
                </div>

                {/* Customs, Taxi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.is_customs_cleared} onChange={(e) => handleField('is_customs_cleared', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }} />
                      {lang === 'ru' ? 'Растаможен в РТ' : 'Боҷхонашуда дар ҶТ'}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.taxi_license} onChange={(e) => handleField('taxi_license', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }} />
                      {lang === 'ru' ? 'Лицензия на такси' : 'Иҷозатномаи таксӣ'}
                    </label>
                </div>

                {/* Mileage + Color */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="mileage" style={labelStyle}>{t('post.mileage', lang)}</label>
                    <input id="mileage" type="number" min={0} value={form.mileage} onChange={(e) => handleField('mileage', e.target.value)} placeholder="85000" style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="color" style={labelStyle}>{t('post.color', lang)}</label>
                    <input id="color" type="text" value={form.color} onChange={(e) => handleField('color', e.target.value)} placeholder={lang === 'ru' ? 'Белый' : 'Сафед'} style={inputStyle} />
                  </div>
                </div>

              </div>
            )}

            {/* ── STEP 4: Description & Photos ── */}
            {step === 4 && (
              <div style={cardStyle} className="animate-fade-in">

                {/* Description + AI */}
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
                          display: 'flex', alignItems: 'center', gap: '6px',
                          background: aiLoading ? 'var(--surface)' : 'var(--accent-dim)',
                          border: '1px solid var(--accent)', borderRadius: '8px',
                          padding: '5px 11px', fontSize: '12px', fontWeight: 700,
                          color: aiLoading ? 'var(--text-muted)' : 'var(--accent)',
                          cursor: aiLoading ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                          fontFamily: 'var(--font)', whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                          if (!aiLoading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'
                          if (!aiLoading) (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-white)'
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background = aiLoading ? 'var(--surface)' : 'var(--accent-dim)'
                          if (!aiLoading) (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>{t('post.add_photos', lang)}</label>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('post.photos_hint', lang)}</span>
                  </div>

                  <input
                    ref={fileInputRef}
                    id="photo-upload-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageFiles}
                    style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
                  />

                  {/* Upload zone */}
                  {totalImageCount < 8 && (
                    <label
                      htmlFor="photo-upload-input"
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: '8px', background: 'var(--surface)', border: '2px dashed var(--border)',
                        borderRadius: '12px', padding: '28px 16px', cursor: 'pointer',
                        color: 'var(--text-muted)', marginBottom: '16px',
                        transition: 'border-color 0.15s',
                      }}
                      onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--accent)' }}
                      onDragLeave={(e) => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--border)' }}
                      onDrop={(e) => {
                        e.preventDefault();
                        (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--border)'
                        const dt = e.dataTransfer
                        const synth = { target: { files: dt.files } } as unknown as ChangeEvent<HTMLInputElement>
                        handleImageFiles(synth)
                      }}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{t('post.add_photos', lang)}</span>
                      <span style={{ fontSize: '12px' }}>{totalImageCount}/8</span>
                    </label>
                  )}

                  {/* Image grid */}
                  {(existingImageUrls.length > 0 || imagePreviews.length > 0) && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
                      {existingImageUrls.map((src, i) => (
                        <div key={`existing-${i}`} style={{ position: 'relative', aspectRatio: '4/3', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                          <Image src={src} alt={`Image ${i + 1}`} fill sizes="120px" style={{ objectFit: 'cover' }} />
                          {i === 0 && existingImageUrls.length + imagePreviews.length > 0 && (
                            <div style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'var(--accent)', color: 'var(--color-white)', fontSize: '9px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                              {t('post.cover_photo', lang)}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeExistingImage(i)}
                            aria-label={`Remove image ${i + 1}`}
                            style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.65)', color: 'var(--color-white)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="7" y2="7" /><line x1="7" y1="1" x2="1" y2="7" /></svg>
                          </button>
                        </div>
                      ))}
                      {imagePreviews.map((src, i) => {
                        const globalIdx = existingImageUrls.length + i
                        return (
                          <div key={`new-${i}`} style={{ position: 'relative', aspectRatio: '4/3', borderRadius: '10px', overflow: 'hidden', border: '2px solid var(--accent)' }}>
                            <Image src={src} alt={`New image ${i + 1}`} fill sizes="120px" style={{ objectFit: 'cover' }} />
                            {globalIdx === 0 && (
                              <div style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'var(--accent)', color: 'var(--color-white)', fontSize: '9px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                                {t('post.cover_photo', lang)}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeNewImage(i)}
                              aria-label={`Remove new image ${i + 1}`}
                              style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.65)', color: 'var(--color-white)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="7" y2="7" /><line x1="7" y1="1" x2="1" y2="7" /></svg>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Video Links */}
                  <div style={{ marginTop: '20px' }}>
                    <label style={labelStyle}>{lang === 'ru' ? 'Ссылки на видео (YouTube / TikTok)' : 'Пайвандҳои видео (YouTube / TikTok)'}</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input type="text" value={form.youtube_link} onChange={(e) => handleField('youtube_link', e.target.value)} placeholder="YouTube link" style={inputStyle} />
                      <input type="text" value={form.tiktok_link} onChange={(e) => handleField('tiktok_link', e.target.value)} placeholder="TikTok link" style={inputStyle} />
                    </div>
                  </div>

                  {error && (
                    <div style={{ background: 'rgba(200,56,8,0.08)', border: '1px solid var(--accent)', borderRadius: '10px', padding: '12px 16px', fontSize: '14px', color: 'var(--accent)', fontWeight: 600, marginTop: '8px' }}>
                      {error}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 5: Deal & Contact ── */}
            {step === 5 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">
                <div style={cardStyle}>
                  {/* Price + Currency */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label style={labelStyle}>{t('post.price', lang)} *</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="number"
                          required
                          min={1}
                          value={form.price}
                          onChange={(e) => handleField('price', e.target.value)}
                          placeholder="15000"
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <select value={form.currency} onChange={(e) => handleField('currency', e.target.value as Currency)} style={{ ...inputStyle, width: 'auto' }}>
                          <option value="USD">USD</option>
                          <option value="TJS">TJS</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '28px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.is_negotiable} onChange={(e) => handleField('is_negotiable', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }} />
                        {lang === 'ru' ? 'Торг' : 'Муомила'}
                      </label>
                    </div>
                  </div>

                  {/* Prepayment */}
                  <div>
                    <label htmlFor="prepayment" style={labelStyle}>{lang === 'ru' ? 'Размер предоплаты (c.)' : 'Размер предоплаты (c.)'}</label>
                    <input id="prepayment" type="number" value={form.prepayment_amount} onChange={(e) => handleField('prepayment_amount', e.target.value)} placeholder="22000" style={inputStyle} />
                  </div>

                  {/* City */}
                  <div>
                    <label htmlFor="city" style={labelStyle}>{t('post.city', lang)} *</label>
                    <select id="city" required value={form.city} onChange={(e) => handleField('city', e.target.value)} style={inputStyle}>
                      <option value="">—</option>
                      {CITIES_OPTIONS.map((c) => <option key={c.value} value={c.value}>{t(c.labelKey, lang)}</option>)}
                    </select>
                  </div>

                  {/* Installment (sale only) */}
                  {form.type === 'sale' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                      <input type="checkbox" checked={form.installment_available} onChange={(e) => handleField('installment_available', e.target.checked)} style={{ accentColor: 'var(--accent)', width: '18px', height: '18px' }} />
                      {t('post.installment', lang)}
                    </label>
                  )}
                </div>

                {/* Contact Info */}
                <div style={cardStyle}>
                  <div style={{ paddingBottom: '4px', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>
                      {lang === 'ru' ? 'Контактная информация' : 'Маълумот барои тамос'}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label style={labelStyle}>{lang === 'ru' ? 'Имя' : 'Ном'}</label>
                      <input type="text" value={form.contact_name} onChange={(e) => handleField('contact_name', e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>{lang === 'ru' ? 'Телефон' : 'Телефон'}</label>
                      <input type="text" value={form.contact_phone} onChange={(e) => handleField('contact_phone', e.target.value)} placeholder="+992..." style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>{lang === 'ru' ? 'Email' : 'Email'}</label>
                    <input type="email" value={form.contact_email} onChange={(e) => handleField('contact_email', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{lang === 'ru' ? 'Способ связи' : 'Тарзи тамос'}</label>
                    <select value={form.contact_method} onChange={(e) => handleField('contact_method', e.target.value as 'phone_and_chat' | 'phone_only')} style={inputStyle}>
                      <option value="phone_and_chat">{lang === 'ru' ? 'Телефон и чат' : 'Телефон ва чат'}</option>
                      <option value="phone_only">{lang === 'ru' ? 'Только телефон' : 'Танҳо телефон'}</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>WhatsApp</label>
                    <input type="text" value={form.whatsapp_number} onChange={(e) => handleField('whatsapp_number', e.target.value)} placeholder="+992..." style={inputStyle} />
                  </div>
                </div>

                {/* Rental rules (rent only) */}
                {form.type === 'rent' && (
                  <div style={cardStyle} className="animate-fade-in-up">
                    <div style={{ paddingBottom: '4px', borderBottom: '1px solid var(--border)' }}>
                      <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>
                        {t('post.rentalRulesTitle', lang)}
                      </h2>
                    </div>

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

                    <div>
                      <label htmlFor="rr-fuel-policy" style={labelStyle}>{t('rentalRules.fuelPolicy', lang)}</label>
                      <select id="rr-fuel-policy" value={rentalRules.fuel_policy} onChange={(e) => handleRentalField('fuel_policy', e.target.value as RentalRulesForm['fuel_policy'])} style={inputStyle}>
                        <option value="">—</option>
                        <option value="full_to_full">{t('rentalRules.fullToFull', lang)}</option>
                        <option value="free_tank">{t('rentalRules.freeTank', lang)}</option>
                        <option value="same_level">{t('rentalRules.sameLevel', lang)}</option>
                      </select>
                    </div>

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

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                      <input type="checkbox" checked={rentalRules.insurance_included} onChange={(e) => handleRentalField('insurance_included', e.target.checked)} style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }} />
                      {t('rentalRules.insurance', lang)}
                    </label>

                    <div>
                      <label style={labelStyle}>{t('rentalRules.notes', lang)}</label>
                      <textarea rows={3} value={rentalRules.notes} onChange={(e) => handleRentalField('notes', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} placeholder={lang === 'ru' ? 'Дополнительные условия...' : 'Шартҳои иловагӣ...'} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Navigation buttons ── */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => { setError(''); setStep((s) => Math.max(0, s - 1)) }}
                  style={{
                    flex: 1, padding: '13px', borderRadius: '12px', fontWeight: 700,
                    fontSize: '15px', cursor: 'pointer',
                    background: 'var(--surface)', color: 'var(--text)',
                    border: '1px solid var(--border)', transition: 'all 0.15s',
                  }}
                >
                  {t('post.back', lang)}
                </button>
              )}
              {step < 5 ? (
                step > 0 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    style={{
                      flex: 1, padding: '13px', borderRadius: '12px', fontWeight: 700,
                      fontSize: '15px', cursor: 'pointer',
                      background: 'var(--accent)', color: 'var(--color-white)',
                      border: '1px solid var(--accent)', transition: 'all 0.15s',
                    }}
                  >
                    {t('post.next', lang)}
                  </button>
                ) : null
              ) : (
                <button
                  type="submit"
                  disabled={submitting || uploading}
                  style={{
                    flex: 1, padding: '13px', borderRadius: '12px', fontWeight: 700,
                    fontSize: '15px', cursor: submitting || uploading ? 'not-allowed' : 'pointer',
                    background: submitting || uploading ? 'var(--text-muted)' : 'var(--accent)',
                    color: 'var(--color-white)', border: 'none', transition: 'background 0.15s',
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
              )}
            </div>
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
