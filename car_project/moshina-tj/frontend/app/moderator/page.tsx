'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { adminApi, listingsApi } from '@/lib/api'
import type { ModerationSession } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { Listing, UserRole, SessionHistoryItem, User } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ModeratorStats {
  total_sessions: number
  avg_posts_per_session: number
  today: { total: number } | null
  this_week: { total: number } | null
}

// ── Constants ─────────────────────────────────────────────────────────────────
const ALLOWED_ROLES: UserRole[] = ['moderator', 'admin']
const SESSION_LIMIT = 10
type FuelOption = { value: string; labelKey: string }
type TransmissionOption = { value: string; labelKey: string }
const FUEL_OPTIONS: FuelOption[] = [
  { value: '', labelKey: '' },
  { value: 'Бензин',  labelKey: 'options.fuelBenzin' },
  { value: 'Дизель',  labelKey: 'options.fuelDiesel' },
  { value: 'Газ',     labelKey: 'options.fuelGas' },
  { value: 'Электро', labelKey: 'options.fuelElectric' },
  { value: 'Гибрид',  labelKey: 'options.fuelHybrid' },
]
const TRANSMISSION_OPTIONS: TransmissionOption[] = [
  { value: '', labelKey: '' },
  { value: 'Автомат',  labelKey: 'options.transAutomatic' },
  { value: 'Механика', labelKey: 'options.transMechanical' },
  { value: 'Вариатор', labelKey: 'options.transCvt' },
]
const CURRENCY_OPTIONS = ['USD', 'TJS']

// ── SVG Icons ─────────────────────────────────────────────────────────────────
function IconCheck({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconX({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconSkip() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
      <line x1="20" y1="6" x2="20" y2="18" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function IconChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconPhone() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.82a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
  )
}

function IconEye() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconEyeOff() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function IconCar() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h10l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2h-2" />
      <circle cx="7.5" cy="17" r="2.5" />
      <circle cx="16.5" cy="17" r="2.5" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  )
}

function IconArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatPrice(price: number, currency: string) {
  return currency === 'USD'
    ? `$${price.toLocaleString('en-US')}`
    : `${price.toLocaleString()} сом.`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    active:   { bg: 'var(--color-success-dim)', color: 'var(--color-success)' },
    pending:  { bg: 'var(--color-warning-dim)', color: 'var(--color-warning)' },
    rejected: { bg: 'var(--color-error-dim)',   color: 'var(--color-error)' },
  }
  const c = colors[status] ?? { bg: 'var(--tag-bg)', color: 'var(--text-muted)' }
  return (
    <span style={{
      background: c.bg, color: c.color,
      padding: '2px 8px', borderRadius: '100px',
      fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {status}
    </span>
  )
}

// ── Role badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  return (
    <span style={{
      background: 'var(--accent-dim)', color: 'var(--accent)',
      padding: '2px 8px', borderRadius: '100px',
      fontSize: '11px', fontWeight: 600,
    }}>
      {role}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ModeratorPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { lang } = useLang()

  type Screen = 'loading' | 'start' | 'workspace' | 'summary' | 'stats'

  const [screen, setScreen]                     = useState<Screen>('loading')
  const [session, setSession]                   = useState<ModerationSession | null>(null)
  const [pendingTotal, setPendingTotal]          = useState(0)
  const [listing, setListing]                   = useState<Listing | null>(null)
  const [listingLoading, setListingLoading]      = useState(false)
  const [similarListings, setSimilarListings]    = useState<Listing[]>([])
  const [authorListings, setAuthorListings]      = useState<Listing[]>([])
  const [authorUser, setAuthorUser]              = useState<User | null>(null)
  const [showPhone, setShowPhone]                = useState(false)

  // Session filters
  const [filterTimer, setFilterTimer]           = useState<number | null>(null)
  const [filterDateFrom, setFilterDateFrom]     = useState('')
  const [filterDateTo, setFilterDateTo]         = useState('')
  const [filterType, setFilterType]             = useState<'sale' | 'rent' | null>(null)
  const [filterCity, setFilterCity]             = useState('')
  const [filterBrand, setFilterBrand]           = useState('')

  // Stats / history
  const [statsData, setStatsData]               = useState<ModeratorStats | null>(null)
  const [historyData, setHistoryData]           = useState<SessionHistoryItem[]>([])
  const [statsLoading, setStatsLoading]         = useState(false)

  // Timer
  const [elapsed, setElapsed]                   = useState(0)
  const timerRef                                = useRef<ReturnType<typeof setInterval> | null>(null)
  const [timerMinutes, setTimerMinutes]         = useState<number | null>(null)
  const autoEndedRef                            = useRef(false)

  // Photo carousel
  const [photoIdx, setPhotoIdx]                 = useState(0)

  // Rejection reasons (multi-select)
  const [selectedReasons, setSelectedReasons]   = useState<string[]>([])
  const [rejectLoading, setRejectLoading]       = useState(false)

  // Action loading
  const [actionLoading, setActionLoading]       = useState(false)

  // Inline edit
  const [editBrand, setEditBrand]               = useState('')
  const [editModel, setEditModel]               = useState('')
  const [editDescription, setEditDescription]   = useState('')
  const [editPrice, setEditPrice]               = useState(0)
  const [editCurrency, setEditCurrency]         = useState('USD')
  const [editYear, setEditYear]                 = useState(0)
  const [editCity, setEditCity]                 = useState('')
  const [editMileage, setEditMileage]           = useState<number | ''>('')
  const [editFuel, setEditFuel]                 = useState('')
  const [editTransmission, setEditTransmission] = useState('')
  const [editColor, setEditColor]               = useState('')
  const [savedFlash, setSavedFlash]             = useState(false)
  const editDebounceRef                         = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedFlashRef                           = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Skip panel
  const [skipOpen, setSkipOpen]                 = useState(false)
  const [skipReason, setSkipReason]             = useState('')
  const [skipLoading, setSkipLoading]           = useState(false)

  // Moderator note
  const [noteText, setNoteText]                 = useState('')
  const [noteSaving, setNoteSaving]             = useState(false)
  const [noteSaved, setNoteSaved]               = useState(false)

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { router.replace('/auth/login'); return }
    if (!ALLOWED_ROLES.includes(user.role)) { router.replace('/'); return }
  }, [user, router])

  // ── On mount: check for active session ─────────────────────────────────────
  useEffect(() => {
    if (!user || !ALLOWED_ROLES.includes(user.role)) return
    async function init() {
      try {
        const res = await adminApi.getActiveSession()
        const active = res.data.data
        if (active && active.is_active) {
          setSession(active)
          setScreen('workspace')
          startTimer(active.started_at)
          fetchNextListing()
        } else {
          try {
            const pendRes = await adminApi.getPendingListings(1, 1)
            setPendingTotal(pendRes.data.data.total)
          } catch { /* silent */ }
          setScreen('start')
        }
      } catch {
        setScreen('start')
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // ── Timer ───────────────────────────────────────────────────────────────────
  function startTimer(startedAt: string, minutes?: number | null) {
    const startMs = new Date(startedAt).getTime()
    if (timerRef.current) clearInterval(timerRef.current)
    autoEndedRef.current = false
    if (minutes) setTimerMinutes(minutes)
    timerRef.current = setInterval(() => {
      const e = Math.floor((Date.now() - startMs) / 1000)
      setElapsed(e)
      if (minutes && !autoEndedRef.current && e >= minutes * 60) {
        autoEndedRef.current = true
        clearInterval(timerRef.current!)
        adminApi.endSession(true)
          .then((res) => { setSession(res.data.data); setScreen('summary') })
          .catch(() => setScreen('summary'))
      }
    }, 1000)
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'workspace') return
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (!listing || actionLoading) return
      const imgCount = listing.images?.length ?? 0
      switch (e.key) {
        case 'a': case 'A': e.preventDefault(); handleApprove(); break
        case 'r': case 'R': e.preventDefault(); break
        case 's': case 'S': e.preventDefault(); setSkipOpen(v => !v); break
        case 'Escape': setSkipOpen(false); break
        case 'ArrowLeft':
          if (imgCount > 1) { e.preventDefault(); setPhotoIdx(p => (p - 1 + imgCount) % imgCount) }
          break
        case 'ArrowRight':
          if (imgCount > 1) { e.preventDefault(); setPhotoIdx(p => (p + 1) % imgCount) }
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, listing, actionLoading, skipOpen])

  // Sync editable fields when listing changes
  useEffect(() => {
    if (listing) {
      setEditBrand(listing.brand)
      setEditModel(listing.model)
      setEditDescription(listing.description ?? '')
      setEditPrice(Number(listing.price))
      setEditCurrency(listing.currency)
      setEditYear(listing.year)
      setEditCity(listing.city)
      setEditMileage(listing.mileage ?? '')
      setEditFuel(listing.fuel ?? '')
      setEditTransmission(listing.transmission ?? '')
      setEditColor(listing.color ?? '')
      setNoteText('')
      setNoteSaved(false)
      setSavedFlash(false)
      setSelectedReasons([])
      setShowPhone(false)
      if (editDebounceRef.current) clearTimeout(editDebounceRef.current)
      if (savedFlashRef.current) clearTimeout(savedFlashRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.id])

  // ── Debounced field save ────────────────────────────────────────────────────
  function triggerFieldSave(patch: Parameters<typeof adminApi.moderatorEditListing>[1]) {
    if (!listing) return
    if (editDebounceRef.current) clearTimeout(editDebounceRef.current)
    editDebounceRef.current = setTimeout(async () => {
      try {
        await adminApi.moderatorEditListing(listing.id, patch)
        setSavedFlash(true)
        if (savedFlashRef.current) clearTimeout(savedFlashRef.current)
        savedFlashRef.current = setTimeout(() => setSavedFlash(false), 2000)
      } catch { /* silent */ }
    }, 800)
  }

  async function handleSaveNote() {
    if (!listing || !noteText.trim()) return
    setNoteSaving(true)
    try {
      await adminApi.addModeratorNote(listing.id, noteText.trim())
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 3000)
    } catch { /* silent */ }
    setNoteSaving(false)
  }

  // ── Fetch next listing ──────────────────────────────────────────────────────
  const fetchNextListing = useCallback(async () => {
    setListingLoading(true)
    setSelectedReasons([])
    setSkipOpen(false)
    setSkipReason('')
    setPhotoIdx(0)
    if (editDebounceRef.current) clearTimeout(editDebounceRef.current)
    try {
      const res = await adminApi.getPendingListings(1, 1, true)
      const items = res.data.data.items
      if (items.length > 0) {
        const next = items[0]
        setListing(next)
        setPendingTotal(res.data.data.total)
        fetchSimilar(next)
        fetchAuthorData(next.user_id)
      } else {
        setListing(null)
        setPendingTotal(0)
      }
    } catch {
      setListing(null)
    } finally {
      setListingLoading(false)
    }
  }, [])

  function fetchSimilar(l: Listing) {
    listingsApi.list({ brand: l.brand, limit: 5 })
      .then((res) => {
        setSimilarListings(res.data.data.items.filter(i => i.id !== l.id).slice(0, 3))
      })
      .catch(() => setSimilarListings([]))
  }

  function fetchAuthorData(userId: string) {
    setAuthorUser(null)
    setAuthorListings([])
    // Fetch author listings via user listings API
    import('@/lib/api').then(({ usersApi }) => {
      usersApi.getListings(userId, 1)
        .then((res) => setAuthorListings(res.data.data.items.slice(0, 5)))
        .catch(() => { /* silent */ })
    })
  }

  // ── Session start ───────────────────────────────────────────────────────────
  async function handleStartSession() {
    try {
      const res = await adminApi.startSession({
        timer_minutes: filterTimer,
        filter_date_from: filterDateFrom ? new Date(filterDateFrom).toISOString() : null,
        filter_date_to:   filterDateTo   ? new Date(filterDateTo).toISOString()   : null,
        filter_type:      filterType,
        filter_city:      filterCity  || null,
        filter_brand:     filterBrand || null,
      })
      const newSession = res.data.data
      setSession(newSession)
      setScreen('workspace')
      startTimer(newSession.started_at, filterTimer)
      fetchNextListing()
    } catch { /* silent */ }
  }

  // ── Load stats ──────────────────────────────────────────────────────────────
  async function loadStats() {
    setStatsLoading(true)
    try {
      const [sRes, hRes] = await Promise.all([
        adminApi.getModeratorStats(),
        adminApi.getSessionHistory(),
      ])
      setStatsData(sRes.data.data as unknown as ModeratorStats)
      setHistoryData(hRes.data.data ?? [])
    } catch { /* silent */ }
    setStatsLoading(false)
  }

  // ── Session end ─────────────────────────────────────────────────────────────
  async function handleEndSession() {
    try {
      const res = await adminApi.endSession()
      if (timerRef.current) clearInterval(timerRef.current)
      setSession(res.data.data)
      setScreen('summary')
    } catch {
      if (timerRef.current) clearInterval(timerRef.current)
      setScreen('summary')
    }
  }

  // ── Advance session counters ────────────────────────────────────────────────
  function advanceSession(type: 'approve' | 'reject' | 'skip') {
    setSession((prev) => {
      if (!prev) return prev
      const done = prev.approved_count + prev.rejected_count + prev.skipped_count + 1
      const updated = {
        ...prev,
        approved_count: type === 'approve' ? prev.approved_count + 1 : prev.approved_count,
        rejected_count: type === 'reject'  ? prev.rejected_count + 1 : prev.rejected_count,
        skipped_count:  type === 'skip'    ? prev.skipped_count  + 1 : prev.skipped_count,
      }
      if (done >= SESSION_LIMIT) {
        setTimeout(() => handleEndSession(), 0)
      }
      return updated
    })
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function handleApprove() {
    if (!listing) return
    setActionLoading(true)
    try {
      await adminApi.approveListing(listing.id)
      advanceSession('approve')
      await fetchNextListing()
    } catch { /* silent */ }
    setActionLoading(false)
  }

  async function handleReject() {
    if (!listing || selectedReasons.length === 0) return
    setRejectLoading(true)
    try {
      await adminApi.rejectListing(listing.id, selectedReasons.join('; '))
      advanceSession('reject')
      await fetchNextListing()
    } catch { /* silent */ }
    setRejectLoading(false)
  }

  async function handleSkip(reason?: string) {
    if (!listing) return
    setSkipLoading(true)
    setActionLoading(true)
    try {
      await adminApi.skipListing(listing.id, reason || undefined)
      advanceSession('skip')
      await fetchNextListing()
    } catch { /* silent */ }
    setSkipLoading(false)
    setActionLoading(false)
  }

  function toggleReason(reason: string) {
    setSelectedReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    )
  }

  // ── Shared style tokens ─────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '7px 10px',
    fontSize: '13px',
    color: 'var(--text)',
    outline: 'none',
    width: '100%',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '4px',
    display: 'block',
  }

  // ── LOADING screen ──────────────────────────────────────────────────────────
  if (screen === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{t('common.loading', lang)}</div>
      </div>
    )
  }

  // ── START screen ────────────────────────────────────────────────────────────
  if (screen === 'start' || screen === 'stats') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <IconArrowLeft />
            </Link>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>{t('moderator.title', lang)}</h1>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {pendingTotal} {t('moderator.pending', lang)}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { if (screen !== 'stats') { loadStats(); setScreen('stats') } else setScreen('start') }}
                style={{ padding: '8px 16px', borderRadius: '8px', background: screen === 'stats' ? 'var(--accent)' : 'var(--card)', color: screen === 'stats' ? 'var(--color-white)' : 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
              >
                {t('moderator.stats', lang)}
              </button>
            </div>
          </div>

          {screen === 'stats' ? (
            /* Stats view */
            <div>
              {statsLoading ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>{t('common.loading', lang)}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Summary cards */}
                  {statsData && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '8px' }}>
                      {[
                        { label: t('moderator.totalSessions', lang), value: statsData.total_sessions },
                        { label: t('moderator.avgPerSession', lang), value: statsData.avg_posts_per_session?.toFixed(1) ?? '0' },
                        { label: t('moderator.todayTotal', lang), value: statsData.today?.total ?? 0 },
                        { label: t('moderator.weekTotal', lang), value: statsData.this_week?.total ?? 0 },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ background: 'var(--card)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>{value}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Session history */}
                  <div style={{ background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>
                      {t('moderator.sessionHistory', lang)}
                    </div>
                    {historyData.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>{t('common.noData', lang)}</div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              {['#', t('moderator.approved', lang), t('moderator.rejected', lang), t('moderator.skipped', lang), t('moderator.duration', lang)].map((h) => (
                                <th key={h} style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {historyData.map((row, i) => (
                              <tr key={row.session_id}>
                                <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--text-muted)' }}>{i + 1}</td>
                                <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--color-success)', fontWeight: 600 }}>{row.posts_approved}</td>
                                <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--color-error)', fontWeight: 600 }}>{row.posts_rejected}</td>
                                <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--text)' }}>{row.posts_skipped}</td>
                                <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--text)' }}>
                                  {row.duration_seconds != null ? formatElapsed(row.duration_seconds) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Start session form */
            <div style={{ background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '20px' }}>
                {t('moderator.startSession', lang)}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={labelStyle}>{t('moderator.filterTimer', lang)}</label>
                  <input
                    type="number" placeholder="—" value={filterTimer ?? ''}
                    onChange={(e) => setFilterTimer(e.target.value ? Number(e.target.value) : null)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t('moderator.filterType', lang)}</label>
                  <select value={filterType ?? ''} onChange={(e) => setFilterType((e.target.value as 'sale' | 'rent') || null)} style={inputStyle}>
                    <option value="">{t('moderator.allTypes', lang)}</option>
                    <option value="sale">{t('moderator.sale', lang)}</option>
                    <option value="rent">{t('moderator.rent', lang)}</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t('moderator.filterDateFrom', lang)}</label>
                  <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{t('moderator.filterDateTo', lang)}</label>
                  <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{t('moderator.filterCity', lang)}</label>
                  <input value={filterCity} onChange={(e) => setFilterCity(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{t('moderator.filterBrand', lang)}</label>
                  <input value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <button
                onClick={handleStartSession}
                style={{ width: '100%', height: '52px', background: 'var(--color-success)', color: 'var(--color-white)', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em' }}
              >
                {t('moderator.startSession', lang)}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── SUMMARY screen ──────────────────────────────────────────────────────────
  if (screen === 'summary') {
    const totalDone = (session?.approved_count ?? 0) + (session?.rejected_count ?? 0) + (session?.skipped_count ?? 0)
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: 'var(--card)', borderRadius: '20px', border: '1px solid var(--border)', padding: '40px', maxWidth: '480px', width: '100%', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-success-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <IconCheck size={28} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>{t('moderator.sessionSummary', lang)}</h2>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '28px' }}>{formatElapsed(elapsed)}</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
            {[
              { label: t('moderator.approved', lang), value: session?.approved_count ?? 0, color: 'var(--color-success)' },
              { label: t('moderator.rejected', lang), value: session?.rejected_count ?? 0, color: 'var(--color-error)' },
              { label: t('moderator.skipped', lang),  value: session?.skipped_count  ?? 0, color: 'var(--text-muted)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'var(--surface)', borderRadius: '12px', padding: '16px 12px' }}>
                <div style={{ fontSize: '26px', fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</div>
              </div>
            ))}
          </div>

          {totalDone > 0 && (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              {t('moderator.avgTime', lang)}: {formatElapsed(Math.round(elapsed / totalDone))}
            </div>
          )}

          <button
            onClick={() => { setScreen('start'); setSession(null); setElapsed(0); setTimerMinutes(null) }}
            style={{ width: '100%', height: '48px', background: 'var(--accent)', color: 'var(--color-white)', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
          >
            {t('moderator.newSession', lang)}
          </button>
        </div>
      </div>
    )
  }

  // ── WORKSPACE screen (3-column layout) ─────────────────────────────────────
  const rejectionReasonsList = [
    t('moderator.reasonGrammar',   lang),
    t('moderator.reasonWrongCat',  lang),
    t('moderator.reasonDuplicate', lang),
    t('moderator.reasonFraud',     lang),
    t('moderator.reasonForbidden', lang),
    t('moderator.reasonWrongPhoto',lang),
    t('moderator.reasonHighPrice', lang),
    t('moderator.reasonIncomplete',lang),
  ]

  const done = (session?.approved_count ?? 0) + (session?.rejected_count ?? 0) + (session?.skipped_count ?? 0)
  const isCountdown = timerMinutes != null
  const timerDisplay = isCountdown
    ? formatElapsed(Math.max(0, timerMinutes! * 60 - elapsed))
    : formatElapsed(elapsed)
  const timerWarning = isCountdown && elapsed > 0 && (timerMinutes! * 60 - elapsed) < 60

  return (
    <div style={{ height: '100vh', overflow: 'hidden', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ height: '48px', background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px', flexShrink: 0 }}>
        <button
          onClick={() => setScreen('start')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', padding: '4px 8px', borderRadius: '6px' }}
        >
          <IconArrowLeft />
          {t('moderator.back', lang)}
        </button>
        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>{t('moderator.queue', lang)}</span>
        <span style={{ background: 'var(--accent-dim)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '100px', fontSize: '12px', fontWeight: 600 }}>
          {done + 1} {t('moderator.queueCounter', lang)} {Math.min(SESSION_LIMIT, done + pendingTotal)}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {savedFlash && (
            <span style={{ fontSize: '12px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IconCheck size={12} /> {t('moderator.saved', lang)}
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: timerWarning ? 'var(--color-error-dim)' : 'var(--surface)', border: `1px solid ${timerWarning ? 'var(--color-error)' : 'var(--border)'}`, padding: '4px 10px', borderRadius: '8px' }}>
            <IconClock />
            <span style={{ fontSize: '13px', fontWeight: 700, color: timerWarning ? 'var(--color-error)' : 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{timerDisplay}</span>
          </div>
          <button
            onClick={handleEndSession}
            style={{ padding: '5px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            {t('moderator.endSession', lang)}
          </button>
        </div>
      </div>

      {/* 3-column body */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* ── Column 1: Action console (280px) ── */}
        <div style={{ width: '280px', flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--card)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {/* APPROVE button */}
            <button
              onClick={handleApprove}
              disabled={!listing || actionLoading}
              style={{ width: '100%', height: '52px', background: listing && !actionLoading ? 'var(--color-success)' : 'var(--border)', color: listing && !actionLoading ? 'var(--color-white)' : 'var(--text-muted)', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: listing && !actionLoading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px', letterSpacing: '0.02em' }}
            >
              <IconCheck size={18} />
              {t('moderator.approve', lang)}
              <span style={{ fontSize: '11px', opacity: 0.75, fontWeight: 400, marginLeft: '2px' }}>A</span>
            </button>

            {/* Rejection reasons */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                {t('moderator.rejectionReasons', lang)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {rejectionReasonsList.map((reason) => {
                  const selected = selectedReasons.includes(reason)
                  return (
                    <button
                      key={reason}
                      onClick={() => toggleReason(reason)}
                      style={{ textAlign: 'left', background: selected ? 'var(--accent-dim)' : 'var(--surface)', border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '8px', padding: '8px 10px', fontSize: '12px', color: selected ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', fontWeight: selected ? 600 : 400, display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      {selected && <IconCheck size={11} />}
                      {reason}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Bottom action buttons */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={handleReject}
              disabled={!listing || selectedReasons.length === 0 || rejectLoading}
              style={{ height: '42px', background: selectedReasons.length > 0 && listing ? 'var(--color-error)' : 'var(--surface)', color: selectedReasons.length > 0 && listing ? 'var(--color-white)' : 'var(--text-muted)', border: `1px solid ${selectedReasons.length > 0 && listing ? 'var(--color-error)' : 'var(--border)'}`, borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: selectedReasons.length > 0 && listing ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <IconX size={14} />
              {t('moderator.reject', lang)}
              {selectedReasons.length > 0 && <span style={{ fontSize: '11px', opacity: 0.8 }}>({selectedReasons.length})</span>}
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setSkipOpen(v => !v)}
                disabled={!listing || actionLoading}
                style={{ flex: 1, height: '36px', background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                <IconSkip />
                {t('moderator.skip', lang)}
              </button>
              <button
                onClick={() => listing && adminApi.rejectListing(listing.id, 'Deleted').then(() => { advanceSession('reject'); fetchNextListing() })}
                disabled={!listing || actionLoading}
                style={{ flex: 1, height: '36px', background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                <IconTrash />
                {t('moderator.delete', lang)}
              </button>
            </div>
            {/* Skip panel */}
            {skipOpen && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{t('moderator.skipReason', lang)}</div>
                <input
                  value={skipReason} onChange={(e) => setSkipReason(e.target.value)}
                  placeholder="..."
                  style={{ ...inputStyle, marginBottom: '8px' }}
                />
                <button
                  onClick={() => handleSkip(skipReason || undefined)}
                  disabled={skipLoading}
                  style={{ width: '100%', height: '34px', background: 'var(--color-warning-alt)', color: 'var(--color-white)', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {t('moderator.confirmSkip', lang)}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Column 2: Center panel (flex:1) ── */}
        <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          {listingLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ color: 'var(--text-muted)' }}>{t('common.loading', lang)}</div>
            </div>
          ) : !listing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
              <div style={{ color: 'var(--text-muted)' }}><IconCar /></div>
              <div style={{ fontWeight: 600, color: 'var(--text)' }}>{t('moderator.noQueue', lang)}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('moderator.noQueueDesc', lang)}</div>
              <button onClick={handleEndSession} style={{ marginTop: '8px', padding: '10px 20px', background: 'var(--accent)', color: 'var(--color-white)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                {t('moderator.endSession', lang)}
              </button>
            </div>
          ) : (
            <div style={{ padding: '16px', maxWidth: '720px', margin: '0 auto' }}>
              {/* Sticky header */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('moderator.adId', lang)}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text)' }}>{listing.id}</span>
                <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{formatDate(listing.created_at)}</span>
                {listing.city && (
                  <>
                    <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{listing.city}</span>
                  </>
                )}
                <div style={{ marginLeft: 'auto' }}>
                  <StatusBadge status={listing.status} />
                </div>
              </div>

              {/* Editable title */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  value={editBrand}
                  onChange={(e) => { setEditBrand(e.target.value); triggerFieldSave({ brand: e.target.value }) }}
                  style={{ ...inputStyle, flex: 1, fontSize: '17px', fontWeight: 700 }}
                />
                <input
                  value={editModel}
                  onChange={(e) => { setEditModel(e.target.value); triggerFieldSave({ model: e.target.value }) }}
                  style={{ ...inputStyle, flex: 1, fontSize: '17px', fontWeight: 700 }}
                />
                <input
                  type="number"
                  value={editYear}
                  onChange={(e) => { setEditYear(Number(e.target.value)); triggerFieldSave({ year: Number(e.target.value) }) }}
                  style={{ ...inputStyle, width: '90px', flex: 'none', fontSize: '17px', fontWeight: 700 }}
                />
              </div>

              {/* Images + Specs */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {/* Images (40%) */}
                <div style={{ width: '240px', flexShrink: 0 }}>
                  {listing.images && listing.images.length > 0 ? (
                    <div>
                      {/* Primary large */}
                      <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface)', height: '180px', marginBottom: '8px' }}>
                        <Image
                          src={listing.images[photoIdx]?.url ?? listing.images[0].url}
                          alt={`${listing.brand} ${listing.model}`}
                          fill style={{ objectFit: 'cover' }}
                        />
                        {listing.images.length > 1 && (
                          <>
                            <button onClick={() => setPhotoIdx(p => (p - 1 + listing.images.length) % listing.images.length)} style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'var(--color-white)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <IconChevronLeft />
                            </button>
                            <button onClick={() => setPhotoIdx(p => (p + 1) % listing.images.length)} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'var(--color-white)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <IconChevronRight />
                            </button>
                            <div style={{ position: 'absolute', bottom: '6px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'var(--color-white)', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '100px' }}>
                              {photoIdx + 1}/{listing.images.length}
                            </div>
                          </>
                        )}
                      </div>
                      {/* Thumbnails */}
                      {listing.images.length > 1 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {listing.images.map((img, i) => (
                            <button key={img.id} onClick={() => setPhotoIdx(i)} style={{ position: 'relative', width: '46px', height: '46px', borderRadius: '8px', overflow: 'hidden', border: `2px solid ${i === photoIdx ? 'var(--accent)' : 'var(--border)'}`, background: 'var(--surface)', cursor: 'pointer', padding: 0 }}>
                              <Image src={img.url} alt="" fill style={{ objectFit: 'cover' }} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ height: '180px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <IconCar />
                    </div>
                  )}
                </div>

                {/* Specs form (60%) */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {/* Price */}
                    <div>
                      <label style={labelStyle}>{t('options.price', lang)}</label>
                      <input type="number" value={editPrice} onChange={(e) => { setEditPrice(Number(e.target.value)); triggerFieldSave({ price: Number(e.target.value) }) }} style={inputStyle} />
                    </div>
                    {/* Currency */}
                    <div>
                      <label style={labelStyle}>{t('post.currency', lang)}</label>
                      <select value={editCurrency} onChange={(e) => { setEditCurrency(e.target.value); triggerFieldSave({ currency: e.target.value }) }} style={inputStyle}>
                        {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    {/* Mileage */}
                    <div>
                      <label style={labelStyle}>{t('catalog.mileage', lang)}</label>
                      <input type="number" value={editMileage} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : ''; setEditMileage(v); triggerFieldSave({ mileage: v === '' ? undefined : Number(v) }) }} style={inputStyle} />
                    </div>
                    {/* Fuel */}
                    <div>
                      <label style={labelStyle}>{t('catalog.fuel', lang)}</label>
                      <select value={editFuel} onChange={(e) => { setEditFuel(e.target.value); triggerFieldSave({ fuel: e.target.value || undefined }) }} style={inputStyle}>
                        {FUEL_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.value ? t(f.labelKey, lang) : '—'}</option>)}
                      </select>
                    </div>
                    {/* Transmission */}
                    <div>
                      <label style={labelStyle}>{t('catalog.transmission', lang)}</label>
                      <select value={editTransmission} onChange={(e) => { setEditTransmission(e.target.value); triggerFieldSave({ transmission: e.target.value || undefined }) }} style={inputStyle}>
                        {TRANSMISSION_OPTIONS.map(tx => <option key={tx.value} value={tx.value}>{tx.value ? t(tx.labelKey, lang) : '—'}</option>)}
                      </select>
                    </div>
                    {/* Color */}
                    <div>
                      <label style={labelStyle}>{t('catalog.color', lang)}</label>
                      <input value={editColor} onChange={(e) => { setEditColor(e.target.value); triggerFieldSave({ color: e.target.value }) }} style={inputStyle} />
                    </div>
                    {/* City */}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>{t('catalog.city', lang)}</label>
                      <input value={editCity} onChange={(e) => { setEditCity(e.target.value); triggerFieldSave({ city: e.target.value }) }} style={inputStyle} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>{t('moderator.descriptionLabel', lang)}</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => { setEditDescription(e.target.value); triggerFieldSave({ description: e.target.value }) }}
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {/* Moderator note */}
              <div style={{ background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border)', padding: '12px' }}>
                <label style={labelStyle}>{t('moderator.moderatorNote', lang)}</label>
                <textarea
                  value={noteText} onChange={(e) => setNoteText(e.target.value)}
                  placeholder={t('moderator.notePlaceholder', lang)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', marginBottom: '8px' }}
                />
                <button
                  onClick={handleSaveNote}
                  disabled={noteSaving || !noteText.trim()}
                  style={{ padding: '6px 16px', background: noteSaved ? 'var(--color-success)' : 'var(--accent)', color: 'var(--color-white)', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {noteSaved ? t('moderator.noteSaved', lang) : t('moderator.saveNote', lang)}
                </button>
              </div>

              {/* Similar listings (dupe detection) */}
              {similarListings.length > 0 && (
                <div style={{ marginTop: '16px', background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-warning-text)', marginBottom: '8px' }}>
                    {t('moderator.duplicateWarning', lang)} — {similarListings.length} {t('moderator.authorOtherAds', lang)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {similarListings.map(sim => (
                      <div key={sim.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.5)', borderRadius: '8px', padding: '6px 10px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--color-warning-text)', flex: 1 }}>{sim.brand} {sim.model} {sim.year} — {formatPrice(sim.price, sim.currency)}</span>
                        <StatusBadge status={sim.status} />
                        <Link href={`/car/${sim.id}`} target="_blank" style={{ fontSize: '11px', color: 'var(--accent)' }}>→</Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Column 3: Right sidebar (260px) ── */}
        <div style={{ width: '260px', flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--card)', overflowY: 'auto' }}>
          {listing ? (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Author card */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>{t('moderator.authorCard', lang)}</div>
                <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                      <IconUser />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {authorUser?.name ?? listing.user_id.slice(0, 8) + '…'}
                      </div>
                      <RoleBadge role={authorUser?.role ?? 'user'} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <IconPhone />
                    {showPhone ? (
                      <span>{authorUser?.phone ?? '—'}</span>
                    ) : (
                      <span style={{ letterSpacing: '0.08em' }}>••• •• ••</span>
                    )}
                    <button onClick={() => setShowPhone(v => !v)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      {showPhone ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                  {authorUser?.created_at && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      {t('moderator.regDate', lang)}: {new Date(authorUser.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  )}
                </div>
              </div>

              {/* Author's other listings */}
              {authorListings.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                    {t('moderator.authorOtherAds', lang)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {authorListings.filter(l => l.id !== listing.id).map(l => (
                      <Link
                        key={l.id}
                        href={`/car/${l.id}`}
                        target="_blank"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', textDecoration: 'none' }}
                      >
                        {l.images?.[0] && (
                          <div style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                            <Image src={l.images[0].url} alt="" fill style={{ objectFit: 'cover' }} />
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {l.brand} {l.model}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatPrice(l.price, l.currency)}</div>
                        </div>
                        <StatusBadge status={l.status} />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Session mini stats */}
              {session && (
                <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{t('moderator.sessionTimer', lang)}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-success)' }}>{t('moderator.approved', lang)}: {session.approved_count}</span>
                    <span style={{ fontSize: '12px', color: 'var(--color-error)' }}>{t('moderator.rejected', lang)}: {session.rejected_count}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('moderator.skipped', lang)}: {session.skipped_count}</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '13px', padding: '20px', textAlign: 'center' }}>
              {t('moderator.noQueue', lang)}
            </div>
          )}
        </div>
      </div>

      {/* Mobile sticky action bar (shown below 1024px via media) */}
      <style>{`
        @media (max-width: 1023px) {
          .mod-cols { flex-direction: column !important; }
          .mod-left  { width: 100% !important; border-right: none !important; border-bottom: 1px solid var(--border) !important; }
          .mod-right { display: none !important; }
          .mod-center { overflow-y: visible !important; }
        }
      `}</style>
    </div>
  )
}
