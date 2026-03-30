'use client'
import { useState, useEffect, useRef, ChangeEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { listingsApi, uploadApi, authApi } from '@/lib/api'
import api from '@/lib/api'
import { SORTED_BRANDS } from '@/lib/vehicleData'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { ListingType, Currency, FuelType, TransmissionType, BodyType, RentalRules } from '@/types'

// ─── Static data ──────────────────────────────────────────────────────────────
const VEHICLE_CATEGORIES = [
  { id: 'car',         labelRu: 'Легковые',       labelTj: 'Мошинаҳои сабук' },
  { id: 'suv',         labelRu: 'Внедорожники',   labelTj: 'Внедорожник / SUV' },
  { id: 'minivan',     labelRu: 'Минивэны',        labelTj: 'Минивэн' },
  { id: 'pickup',      labelRu: 'Пикапы',          labelTj: 'Пикап' },
  { id: 'truck',       labelRu: 'Грузовики',       labelTj: 'Боркаш' },
  { id: 'bus',         labelRu: 'Автобусы',        labelTj: 'Автобус' },
  { id: 'motorcycle',  labelRu: 'Мотоциклы',       labelTj: 'Мотосикл' },
  { id: 'special',     labelRu: 'Спецтехника',     labelTj: 'Техникаи махсус' },
  { id: 'parts',       labelRu: 'Запчасти',        labelTj: 'Эҳтиёткорӣ' },
  { id: 'commercial',  labelRu: 'Коммерческий',    labelTj: 'Тиҷоратӣ' },
  { id: 'electric',    labelRu: 'Электромобили',   labelTj: 'Автомобили барқӣ' },
  { id: 'other',       labelRu: 'Другое',          labelTj: 'Дигар' },
]

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

const FUELS: { value: FuelType; ru: string; tj: string }[] = [
  { value: 'Бензин',  ru: 'Бензин',   tj: 'Бензин' },
  { value: 'Дизель',  ru: 'Дизель',   tj: 'Дизел' },
  { value: 'Газ',     ru: 'Газ',      tj: 'Газ' },
  { value: 'Электро', ru: 'Электро',  tj: 'Барқӣ' },
  { value: 'Гибрид',  ru: 'Гибрид',   tj: 'Гибрид' },
]

const TRANSMISSIONS: { value: TransmissionType; ru: string; tj: string }[] = [
  { value: 'Автомат',  ru: 'Автомат',   tj: 'Автомат' },
  { value: 'Механика', ru: 'Механика',  tj: 'Механика' },
  { value: 'Вариатор', ru: 'Вариатор',  tj: 'Вариатор' },
]

const BODY_TYPES: { value: BodyType; ru: string; tj: string }[] = [
  { value: 'sedan',       ru: 'Седан',       tj: 'Седан' },
  { value: 'suv',         ru: 'Внедорожник', tj: 'SUV' },
  { value: 'hatchback',   ru: 'Хэтчбек',     tj: 'Хэтчбек' },
  { value: 'minivan',     ru: 'Минивэн',     tj: 'Минивэн' },
  { value: 'pickup',      ru: 'Пикап',       tj: 'Пикап' },
  { value: 'coupe',       ru: 'Купе',        tj: 'Купе' },
  { value: 'wagon',       ru: 'Универсал',   tj: 'Универсал' },
  { value: 'crossover',   ru: 'Кроссовер',   tj: 'Кроссовер' },
  { value: 'convertible', ru: 'Кабриолет',   tj: 'Кабриолет' },
  { value: 'van',         ru: 'Фургон',      tj: 'Фургон' },
  { value: 'bus',         ru: 'Автобус',     tj: 'Автобус' },
  { value: 'other',       ru: 'Другое',      tj: 'Дигар' },
]

const DRAFT_KEY = 'post_draft_v2'

interface FormState {
  category_slug: string
  brand: string
  model: string
  year: string
  price: string
  currency: Currency
  is_negotiable: boolean
  mileage: string
  fuel: FuelType | ''
  transmission: TransmissionType | ''
  body_type: BodyType | ''
  drive_type: string
  engine_volume: string
  condition: string
  is_customs_cleared: boolean
  color: string
  city: string
  type: ListingType
  description: string
  contact_name: string
  contact_phone: string
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
  insurance_included: boolean
  notes: string
}

const initialForm: FormState = {
  category_slug: '',
  brand: '', model: '', year: String(new Date().getFullYear()),
  price: '', currency: 'USD', is_negotiable: false,
  mileage: '', fuel: '', transmission: '',
  body_type: '', drive_type: '', engine_volume: '',
  condition: '', is_customs_cleared: true,
  color: '', city: '', type: 'sale', description: '',
  contact_name: '', contact_phone: '', whatsapp_number: '',
  installment_available: false,
}

const initialRental: RentalRulesForm = {
  min_age: '', deposit: '', deposit_currency: 'USD',
  fuel_policy: '', delivery_available: false, delivery_price: '',
  insurance_included: false, notes: '',
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      {children}
    </h2>
  )
}

// ─── Chip button ─────────────────────────────────────────────────────────────
function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '9px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
        cursor: 'pointer', whiteSpace: 'nowrap',
        background: selected ? 'var(--accent)' : 'var(--surface)',
        color: selected ? 'var(--color-white)' : 'var(--text-muted)',
        border: selected ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
        transition: 'all 0.13s', minHeight: '38px',
      }}
    >
      {label}
    </button>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function FormSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '36px 16px 60px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ height: '36px', width: '240px', borderRadius: '8px', background: 'var(--border)' }} />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: '56px', borderRadius: '12px', background: 'var(--border)' }} />
          ))}
        </div>
      </main>
    </div>
  )
}

// ─── Inner page ───────────────────────────────────────────────────────────────
function PostPage() {
  const router = useRouter()
  const params = useSearchParams()
  const editId = params.get('edit')
  const isEdit = Boolean(editId)

  const { lang } = useLang()
  const { logout } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormState>(initialForm)
  const [rental, setRental] = useState<RentalRulesForm>(initialRental)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [existingUrls, setExistingUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(isEdit)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  // Local brands/models from static data
  const selectedBrandData = SORTED_BRANDS.find((b) => b.name === form.brand) ?? null
  const localModels = selectedBrandData?.models ?? []

  const [customBrand, setCustomBrand] = useState('')
  const [customModel, setCustomModel] = useState('')

  // Auth guard
  useEffect(() => {
    authApi.me().catch(() => { logout(); router.replace('/auth/login') })
  }, [router, logout])

  // Reset model when brand changes
  useEffect(() => {
    setForm((prev) => ({ ...prev, model: '' }))
    setCustomModel('')
  }, [form.brand])

  // Load draft (new mode only)
  useEffect(() => {
    if (isEdit) return
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as FormState & { _savedAt?: number }
        const savedAt = parsed._savedAt
        const sevenDays = 7 * 24 * 60 * 60 * 1000
        if (savedAt && Date.now() - savedAt > sevenDays) {
          localStorage.removeItem(DRAFT_KEY)
        } else {
          const { _savedAt: _ts, ...formData } = parsed
          setForm(formData as FormState)
        }
      }
    } catch { localStorage.removeItem(DRAFT_KEY) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save draft
  useEffect(() => {
    if (isEdit) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, _savedAt: Date.now() }))
  }, [form, isEdit])

  // Load listing in edit mode
  useEffect(() => {
    if (!editId) return
    listingsApi.get(editId)
      .then((res) => {
        const l = res.data.data
        setForm({
          category_slug: '',
          brand: l.brand, model: l.model, year: String(l.year),
          price: String(l.price), currency: l.currency,
          is_negotiable: false,
          mileage: l.mileage != null ? String(l.mileage) : '',
          fuel: l.fuel ?? '', transmission: l.transmission ?? '',
          body_type: l.body_type ?? '',
          drive_type: '', engine_volume: '',
          condition: '', is_customs_cleared: true,
          color: l.color ?? '', city: l.city, type: l.type,
          description: l.description ?? '',
          contact_name: '', contact_phone: '', whatsapp_number: '',
          installment_available: l.installment_available,
        })
        if (l.type === 'rent' && l.rental_rules) {
          const r = l.rental_rules
          setRental({
            min_age: r.min_age != null ? String(r.min_age) : '',
            deposit: r.deposit != null ? String(r.deposit) : '',
            deposit_currency: (r.deposit_currency as 'USD' | 'TJS') ?? 'USD',
            fuel_policy: r.fuel_policy ?? '',
            delivery_available: r.delivery_available ?? false,
            delivery_price: r.delivery_price != null ? String(r.delivery_price) : '',
            insurance_included: r.insurance_included ?? false,
            notes: r.notes ?? '',
          })
        }
        setExistingUrls(l.images.map((i) => i.url))
      })
      .catch(() => setError(lang === 'ru' ? 'Не удалось загрузить объявление' : 'Эълонро бор кардан мумкин набуд'))
      .finally(() => setLoadingEdit(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setError('')
    setForm((p) => ({ ...p, [key]: value }))
  }

  function addImages(e: ChangeEvent<HTMLInputElement>) {
    setError('')
    const files = Array.from(e.target.files ?? [])
    const remaining = 8 - existingUrls.length - imageFiles.length
    const toAdd = files.slice(0, remaining)
    setImageFiles((p) => [...p, ...toAdd])
    toAdd.forEach((f) => setImagePreviews((p) => [...p, URL.createObjectURL(f)]))
  }

  function removeNew(i: number) {
    setImageFiles((p) => p.filter((_, idx) => idx !== i))
    setImagePreviews((p) => { URL.revokeObjectURL(p[i]); return p.filter((_, idx) => idx !== i) })
  }

  async function handleAiRefine() {
    setAiError('')
    setAiLoading(true)
    try {
      const res = await api.post<{ data: string }>('/ai/refine-description', {
        brand: form.brand, model: form.model, year: Number(form.year),
        price: Number(form.price) || undefined, currency: form.currency,
        mileage: form.mileage ? Number(form.mileage) : undefined,
        fuel: form.fuel || undefined, transmission: form.transmission || undefined,
        color: form.color || undefined, city: form.city || undefined,
        type: form.type, description: form.description, language: lang,
      })
      if (res.data.data) setField('description', res.data.data)
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      setAiError(status === 503
        ? (lang === 'ru' ? 'AI недоступен' : 'AI дастрас нест')
        : (lang === 'ru' ? 'Не удалось улучшить описание' : 'Тавсифро беҳтар кардан мумкин набуд'))
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const finalBrand = form.brand === 'Другое' ? customBrand.trim() : form.brand.trim()
    const finalModel = form.model === 'Другое' ? customModel.trim() : form.model.trim()
    if (!finalBrand || !finalModel || !form.price || !form.city) {
      setError(lang === 'ru' ? 'Заполните обязательные поля: марка, модель, цена, город' : 'Майдонҳои ҳатмӣ: марка, модел, нарх, шаҳр')
      return
    }
    try {
      setUploading(true)
      const newUrls: string[] = []
      for (const f of imageFiles) {
        const r = await uploadApi.image(f)
        newUrls.push(r.data.data.url)
      }
      setUploading(false)
      const imageUrls = [...existingUrls, ...newUrls]

      let rentalPayload: Partial<RentalRules> | undefined
      if (form.type === 'rent') {
        const r: Partial<RentalRules> = {}
        if (rental.min_age) r.min_age = Number(rental.min_age)
        if (rental.deposit) { r.deposit = Number(rental.deposit); r.deposit_currency = rental.deposit_currency }
        if (rental.fuel_policy) r.fuel_policy = rental.fuel_policy
        r.delivery_available = rental.delivery_available
        if (rental.delivery_available && rental.delivery_price) r.delivery_price = Number(rental.delivery_price)
        r.insurance_included = rental.insurance_included
        if (rental.notes.trim()) r.notes = rental.notes.trim()
        rentalPayload = r
      }

      const payload = {
        type: form.type,
        brand: finalBrand, model: finalModel, year: Number(form.year),
        price: Number(form.price), currency: form.currency,
        is_negotiable: form.is_negotiable,
        mileage: form.mileage ? Number(form.mileage) : undefined,
        fuel: form.fuel || undefined, transmission: form.transmission || undefined,
        body_type: form.body_type || undefined,
        drive_type: form.drive_type || undefined,
        engine_volume: form.engine_volume || undefined,
        condition: form.condition || undefined,
        is_customs_cleared: form.is_customs_cleared,
        color: form.color.trim() || undefined,
        city: form.city,
        description: form.description.trim() || undefined,
        contact_name: form.contact_name.trim() || undefined,
        contact_phone: form.contact_phone.trim() || undefined,
        whatsapp_number: form.whatsapp_number.trim() || undefined,
        installment_available: form.installment_available,
        image_urls: imageUrls,
        ...(rentalPayload ? { rental_rules: rentalPayload } : {}),
      }

      setSubmitting(true)
      if (isEdit && editId) {
        await listingsApi.update(editId, payload)
      } else {
        await listingsApi.create(payload)
      }
      localStorage.removeItem(DRAFT_KEY)
      setSuccess(true)
      setTimeout(() => router.push(isEdit ? '/dashboard' : '/catalog'), 2000)
    } catch (err) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? (lang === 'ru' ? 'Произошла ошибка' : 'Хато рух дод'))
    } finally {
      setUploading(false)
      setSubmitting(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--bg)', border: '1.5px solid var(--border)',
    borderRadius: '12px', padding: '13px 14px', fontSize: '16px',
    color: 'var(--text)', outline: 'none', appearance: 'none',
    WebkitAppearance: 'none',
  }
  const lbl: React.CSSProperties = {
    fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)',
    marginBottom: '7px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em',
  }
  const card: React.CSSProperties = {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: '18px', padding: 'clamp(16px, 4vw, 28px)',
    marginBottom: '16px',
  }

  if (loadingEdit) return <FormSkeleton />

  if (success) return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '40px 20px', maxWidth: '420px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-success-dim)', border: '2px solid var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <p style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '10px' }}>
            {isEdit ? (lang === 'ru' ? 'Сохранено!' : 'Нигоҳ дошта шуд!') : (lang === 'ru' ? 'Объявление отправлено!' : 'Эълон фиристода шуд!')}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {lang === 'ru' ? 'Ваше объявление проходит модерацию и появится в каталоге в течение нескольких часов.' : 'Эълони шумо баррасӣ мешавад ва дар муддати чанд соат дар каталог намоиш дода мешавад.'}
          </p>
        </div>
      </main>
    </div>
  )

  const totalImages = existingUrls.length + imageFiles.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: 'clamp(24px,4vw,48px) clamp(14px,4vw,24px) 80px' }}>

          <h1 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, color: 'var(--text)', marginBottom: '24px' }}>
            {isEdit
              ? (lang === 'ru' ? 'Редактировать объявление' : 'Таҳрири эълон')
              : (lang === 'ru' ? 'Подать объявление' : 'Додани эълон')}
          </h1>

          <form onSubmit={handleSubmit}>

            {/* ── Тип объявления ── */}
            <div style={card}>
              <SectionTitle>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                {t('postForm.typeLabel', lang)}
              </SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { v: 'sale' as const, labelKey: 'postForm.typeSale' },
                  { v: 'rent' as const, labelKey: 'postForm.typeRent' },
                ].map(({ v, labelKey }) => (
                  <button key={v} type="button"
                    onClick={() => setField('type', v)}
                    style={{
                      padding: '16px', borderRadius: '14px', fontWeight: 700, fontSize: '15px',
                      cursor: 'pointer', border: '2px solid',
                      borderColor: form.type === v ? 'var(--accent)' : 'var(--border)',
                      background: form.type === v ? 'var(--accent)' : 'var(--surface)',
                      color: form.type === v ? 'var(--color-white)' : 'var(--text)',
                      transition: 'all 0.13s',
                    }}
                  >
                    {t(labelKey, lang)}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Категория транспорта ── */}
            <div style={card}>
              <SectionTitle>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                {t('postForm.categoryLabel', lang)}
              </SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {VEHICLE_CATEGORIES.map((cat) => {
                  const selected = form.category_slug === cat.id
                  return (
                    <button key={cat.id} type="button"
                      onClick={() => setField('category_slug', selected ? '' : cat.id)}
                      style={{
                        padding: '12px 8px', borderRadius: '12px', fontWeight: 600, fontSize: '13px',
                        cursor: 'pointer', textAlign: 'center', border: '1.5px solid',
                        borderColor: selected ? 'var(--accent)' : 'var(--border)',
                        background: selected ? 'var(--accent)' : 'var(--surface)',
                        color: selected ? 'var(--color-white)' : 'var(--text)',
                        transition: 'all 0.13s', minHeight: '48px',
                        lineHeight: 1.2,
                      }}
                    >
                      {lang === 'ru' ? cat.labelRu : cat.labelTj}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Марка, модель, год ── */}
            <div style={card}>
              <SectionTitle>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                {t('postForm.brandModelYear', lang)}
              </SectionTitle>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Brand */}
                <div>
                  <label style={lbl}>{t('postForm.brandLabel', lang)}</label>
                  <select
                    required={form.brand !== 'Другое'}
                    value={form.brand}
                    onChange={(e) => { setField('brand', e.target.value); setCustomBrand('') }}
                    style={inp}
                  >
                    <option value="">{t('postForm.brandPlaceholder', lang)}</option>
                    {SORTED_BRANDS.map((b) => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                  {form.brand === 'Другое' && (
                    <input
                      type="text"
                      required
                      value={customBrand}
                      onChange={(e) => setCustomBrand(e.target.value)}
                      placeholder={lang === 'ru' ? 'Введите название марки' : 'Номи маркаро ворид кунед'}
                      style={{ ...inp, marginTop: '8px' }}
                      autoFocus
                    />
                  )}
                </div>

                {/* Model */}
                <div>
                  <label style={lbl}>{lang === 'ru' ? 'Модель *' : 'Модел *'}</label>
                  {localModels.length > 0 ? (
                    <>
                      <select
                        required={form.model !== 'Другое'}
                        value={form.model}
                        onChange={(e) => { setField('model', e.target.value); setCustomModel('') }}
                        style={inp}
                        disabled={!form.brand}
                      >
                        <option value="">{lang === 'ru' ? '— Выберите модель —' : '— Моделро интихоб кунед —'}</option>
                        {localModels.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                        <option value="Другое">{lang === 'ru' ? 'Другое (ввести вручную)' : 'Дигар (дастӣ ворид кунед)'}</option>
                      </select>
                      {form.model === 'Другое' && (
                        <input
                          type="text"
                          required
                          value={customModel}
                          onChange={(e) => setCustomModel(e.target.value)}
                          placeholder={lang === 'ru' ? 'Введите название модели' : 'Номи моделро ворид кунед'}
                          style={{ ...inp, marginTop: '8px' }}
                          autoFocus
                        />
                      )}
                    </>
                  ) : (
                    <input
                      type="text"
                      required
                      value={form.model}
                      onChange={(e) => setField('model', e.target.value)}
                      disabled={!form.brand}
                      placeholder={
                        !form.brand
                          ? (lang === 'ru' ? 'Сначала выберите марку' : 'Аввал маркаро интихоб кунед')
                          : (lang === 'ru' ? 'Введите модель' : 'Моделро ворид кунед')
                      }
                      style={{ ...inp, opacity: !form.brand ? 0.5 : 1 }}
                    />
                  )}
                </div>

                {/* Year */}
                <div>
                  <label style={lbl}>{lang === 'ru' ? 'Год выпуска *' : 'Соли истеҳсол *'}</label>
                  <input
                    type="number" min={1960} max={2100} required
                    value={form.year}
                    onChange={(e) => setField('year', e.target.value)}
                    style={inp}
                  />
                </div>
              </div>
            </div>

            {/* ── Цена и город ── */}
            <div style={card}>
              <SectionTitle>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                {lang === 'ru' ? 'Цена и город' : 'Нарх ва шаҳр'}
              </SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Price */}
                <div>
                  <label style={lbl}>{lang === 'ru' ? 'Цена *' : 'Нарх *'}</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="number" required min={1} value={form.price}
                      onChange={(e) => setField('price', e.target.value)}
                      placeholder="15000" style={{ ...inp, flex: 1 }} />
                    <select value={form.currency}
                      onChange={(e) => setField('currency', e.target.value as Currency)}
                      style={{ ...inp, width: '90px', flexShrink: 0 }}>
                      <option value="USD">USD</option>
                      <option value="TJS">TJS</option>
                    </select>
                  </div>
                </div>
                {/* Negotiable */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                  <input type="checkbox" checked={form.is_negotiable}
                    onChange={(e) => setField('is_negotiable', e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', flexShrink: 0 }} />
                  {lang === 'ru' ? 'Торг уместен' : 'Муомила мумкин аст'}
                </label>
                {/* City */}
                <div>
                  <label style={lbl}>{lang === 'ru' ? 'Город *' : 'Шаҳр *'}</label>
                  <select required value={form.city} onChange={(e) => setField('city', e.target.value)} style={inp}>
                    <option value="">{lang === 'ru' ? '— Выберите город —' : '— Шаҳрро интихоб кунед —'}</option>
                    {CITIES_OPTIONS.map((c) => <option key={c.value} value={c.value}>{t(c.labelKey, lang)}</option>)}
                  </select>
                </div>
                {/* Installment */}
                {form.type === 'sale' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                    <input type="checkbox" checked={form.installment_available}
                      onChange={(e) => setField('installment_available', e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', flexShrink: 0 }} />
                    {t('post.installment', lang)}
                  </label>
                )}
              </div>
            </div>

            {/* ── Характеристики ── */}
            <div style={card}>
              <SectionTitle>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                {t('postForm.specsLabel', lang)}
              </SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Fuel */}
                <div>
                  <label style={lbl}>{t('postForm.fuelLabel', lang)}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {FUELS.map((f) => (
                      <Chip key={f.value} label={lang === 'ru' ? f.ru : f.tj} selected={form.fuel === f.value}
                        onClick={() => setField('fuel', form.fuel === f.value ? '' : f.value)} />
                    ))}
                  </div>
                </div>
                {/* Transmission */}
                <div>
                  <label style={lbl}>{t('postForm.transLabel', lang)}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {TRANSMISSIONS.map((tr) => (
                      <Chip key={tr.value} label={lang === 'ru' ? tr.ru : tr.tj} selected={form.transmission === tr.value}
                        onClick={() => setField('transmission', form.transmission === tr.value ? '' : tr.value)} />
                    ))}
                  </div>
                </div>
                {/* Body type */}
                <div>
                  <label style={lbl}>{t('postForm.bodyLabel', lang)}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {BODY_TYPES.map((bt) => (
                      <Chip key={bt.value} label={lang === 'ru' ? bt.ru : bt.tj} selected={form.body_type === bt.value}
                        onClick={() => setField('body_type', form.body_type === bt.value ? '' : bt.value)} />
                    ))}
                  </div>
                </div>
                {/* Condition + Drive + Engine */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={lbl}>{t('postForm.conditionLabel', lang)}</label>
                    <select value={form.condition} onChange={(e) => setField('condition', e.target.value)} style={inp}>
                      <option value="">—</option>
                      <option value="Новый">{t('postForm.conditionNew', lang)}</option>
                      <option value="С пробегом">{t('postForm.conditionUsed', lang)}</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>{t('postForm.driveLabel', lang)}</label>
                    <select value={form.drive_type} onChange={(e) => setField('drive_type', e.target.value)} style={inp}>
                      <option value="">—</option>
                      <option value="Передний">{t('postForm.driveFront', lang)}</option>
                      <option value="Задний">{t('postForm.driveRear', lang)}</option>
                      <option value="Полный">{t('postForm.driveAll', lang)}</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={lbl}>{t('postForm.mileageLabel', lang)}</label>
                    <input type="number" min={0} value={form.mileage}
                      onChange={(e) => setField('mileage', e.target.value)}
                      placeholder="85000" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>{t('postForm.engineLabel', lang)}</label>
                    <input type="text" value={form.engine_volume}
                      onChange={(e) => setField('engine_volume', e.target.value)}
                      placeholder="2.0" style={inp} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>{t('postForm.colorLabel', lang)}</label>
                  <input type="text" value={form.color}
                    onChange={(e) => setField('color', e.target.value)}
                    placeholder={t('postForm.colorPlaceholder', lang)}
                    style={inp} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                    <input type="checkbox" checked={form.is_customs_cleared}
                      onChange={(e) => setField('is_customs_cleared', e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', flexShrink: 0 }} />
                    {t('postForm.customsCleared', lang)}
                  </label>
                </div>
              </div>
            </div>

            {/* ── Фотографии ── */}
            <div style={card}>
              <SectionTitle>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                {lang === 'ru' ? `Фотографии (${totalImages}/8)` : `Аксҳо (${totalImages}/8)`}
              </SectionTitle>

              <input ref={fileInputRef} id="photo-input" type="file" accept="image/jpeg,image/png,image/webp" multiple
                onChange={addImages}
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />

              {totalImages < 8 && (
                <label htmlFor="photo-input" style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '8px', background: 'var(--surface)', border: '2px dashed var(--border)',
                  borderRadius: '14px', padding: '28px 16px', cursor: 'pointer',
                  color: 'var(--text-muted)', marginBottom: totalImages > 0 ? '14px' : 0,
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span style={{ fontSize: '15px', fontWeight: 700 }}>
                    {lang === 'ru' ? 'Добавить фото' : 'Акс илова кунед'}
                  </span>
                  <span style={{ fontSize: '12px' }}>
                    {lang === 'ru' ? `Осталось ${8 - totalImages} из 8` : `${8 - totalImages} аз 8 боқист`}
                  </span>
                </label>
              )}

              {(existingUrls.length > 0 || imagePreviews.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
                  {existingUrls.map((src, i) => (
                    <div key={`ex-${i}`} style={{ position: 'relative', aspectRatio: '4/3', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <Image src={src} alt="" fill sizes="120px" style={{ objectFit: 'cover' }} />
                      {i === 0 && <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'var(--accent)', color: 'var(--color-white)', fontSize: '9px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>1</div>}
                      <button type="button" onClick={() => setExistingUrls((p) => p.filter((_, idx) => idx !== i))}
                        style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="8" y2="8"/><line x1="8" y1="1" x2="1" y2="8"/></svg>
                      </button>
                    </div>
                  ))}
                  {imagePreviews.map((src, i) => (
                    <div key={`new-${i}`} style={{ position: 'relative', aspectRatio: '4/3', borderRadius: '10px', overflow: 'hidden', border: '2px solid var(--accent)' }}>
                      <Image src={src} alt="" fill sizes="120px" style={{ objectFit: 'cover' }} />
                      <button type="button" onClick={() => removeNew(i)}
                        style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="8" y2="8"/><line x1="8" y1="1" x2="1" y2="8"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Описание ── */}
            <div style={card}>
              <SectionTitle>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                {t('postForm.descriptionLabel', lang)}
              </SectionTitle>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                {form.brand && form.model && (
                  <button type="button" onClick={handleAiRefine} disabled={aiLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: 'var(--accent)', cursor: aiLoading ? 'not-allowed' : 'pointer', opacity: aiLoading ? 0.6 : 1 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 3 3.5.5-2.5 2.5.5 3.5L12 11l-3 1.5.5-3.5L7 6.5 10.5 6z"/><path d="M5 19l1 2 2-1-1-2z"/><path d="M19 5l1 2 2-1-1-2z"/><line x1="8" y1="16" x2="16" y2="8"/></svg>
                    {aiLoading ? t('postForm.aiGenerating', lang) : t('postForm.aiImprove', lang)}
                  </button>
                )}
              </div>
              <textarea rows={5} value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder={t('postForm.descriptionPlaceholder', lang)}
                style={{ ...inp, resize: 'vertical', lineHeight: 1.6, fontSize: '15px' }} />
              {aiError && <p style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-error)', fontWeight: 600 }}>{aiError}</p>}
            </div>

            {/* ── Контакты ── */}
            <div style={card}>
              <SectionTitle>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.28 19 19.5 19.5 0 0 1 5 12.72 19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                {t('postForm.contactsLabel', lang)}
              </SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={lbl}>{t('postForm.yourName', lang)}</label>
                  <input type="text" value={form.contact_name}
                    onChange={(e) => setField('contact_name', e.target.value)}
                    placeholder={t('postForm.sellerNamePlaceholder', lang)}
                    style={inp} />
                </div>
                <div>
                  <label style={lbl}>{t('postForm.phoneLabelContact', lang)}</label>
                  <input type="tel" value={form.contact_phone}
                    onChange={(e) => setField('contact_phone', e.target.value)}
                    placeholder="+992 XX XXX XXXX" style={inp} />
                </div>
                <div>
                  <label style={lbl}>WhatsApp</label>
                  <input type="tel" value={form.whatsapp_number}
                    onChange={(e) => setField('whatsapp_number', e.target.value)}
                    placeholder="+992 XX XXX XXXX" style={inp} />
                </div>
              </div>
            </div>

            {/* ── Условия аренды (rent only) ── */}
            {form.type === 'rent' && (
              <div style={card}>
                <SectionTitle>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  {t('post.rentalRulesTitle', lang)}
                </SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={lbl}>{t('rentalRules.minAge', lang)}</label>
                      <input type="number" min={18} max={99} value={rental.min_age}
                        onChange={(e) => setRental((p) => ({ ...p, min_age: e.target.value }))}
                        placeholder="21" style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>{t('rentalRules.deposit', lang)}</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input type="number" min={0} value={rental.deposit}
                          onChange={(e) => setRental((p) => ({ ...p, deposit: e.target.value }))}
                          placeholder="500" style={{ ...inp, flex: 1 }} />
                        <select value={rental.deposit_currency}
                          onChange={(e) => setRental((p) => ({ ...p, deposit_currency: e.target.value as 'USD' | 'TJS' }))}
                          style={{ ...inp, width: '80px', flexShrink: 0 }}>
                          <option value="USD">USD</option>
                          <option value="TJS">TJS</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>{t('rentalRules.fuelPolicy', lang)}</label>
                    <select value={rental.fuel_policy}
                      onChange={(e) => setRental((p) => ({ ...p, fuel_policy: e.target.value as RentalRulesForm['fuel_policy'] }))}
                      style={inp}>
                      <option value="">—</option>
                      <option value="full_to_full">{t('rentalRules.fullToFull', lang)}</option>
                      <option value="free_tank">{t('rentalRules.freeTank', lang)}</option>
                      <option value="same_level">{t('rentalRules.sameLevel', lang)}</option>
                    </select>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                    <input type="checkbox" checked={rental.insurance_included}
                      onChange={(e) => setRental((p) => ({ ...p, insurance_included: e.target.checked }))}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }} />
                    {t('rentalRules.insurance', lang)}
                  </label>
                  <div>
                    <label style={lbl}>{t('rentalRules.notes', lang)}</label>
                    <textarea rows={3} value={rental.notes}
                      onChange={(e) => setRental((p) => ({ ...p, notes: e.target.value }))}
                      style={{ ...inp, resize: 'vertical' }}
                      placeholder={t('postForm.notesPlaceholder', lang)} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Error ── */}
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '12px', padding: '14px 16px', fontSize: '14px', color: 'var(--color-error)', fontWeight: 600, marginBottom: '16px' }}>
                {error}
              </div>
            )}

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={submitting || uploading}
              style={{
                width: '100%', padding: '16px', borderRadius: '14px',
                background: submitting || uploading ? 'var(--text-muted)' : 'var(--accent)',
                color: 'var(--color-white)', fontWeight: 800, fontSize: '16px',
                border: 'none', cursor: submitting || uploading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s', minHeight: '54px',
              }}
            >
              {uploading
                ? t('postForm.uploading', lang)
                : submitting
                  ? t('postForm.sending', lang)
                  : isEdit
                    ? t('postForm.saveChanges', lang)
                    : t('postForm.submitListing', lang)}
            </button>

          </form>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function Page() {
  return (
    <Suspense>
      <PostPage />
    </Suspense>
  )
}
