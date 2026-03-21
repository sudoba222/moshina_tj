'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { adminApi, catalogApi, adminListingsApi } from '@/lib/api'
import type { ModeratorActivity, CarBrand, CarModelItem, CarCategory, AdBanner, AdminListingDetail } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { AdminStats, AuditLog, User, Listing, UserRole } from '@/types'

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'users' | 'listings' | 'moderation' | 'brands' | 'categories' | 'banners' | 'system'

const ALLOWED_ROLES: UserRole[] = ['admin', 'moderator', 'manager']
const ALL_ROLES: UserRole[] = ['user', 'dealer', 'moderator', 'manager', 'support', 'admin']

// ── SVG Icons ──────────────────────────────────────────────────────────────────
function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function IconListings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  )
}

function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconBan() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  )
}

function IconExternalLink() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
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

function IconCar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v10a2 2 0 01-2 2h-2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  )
}

function IconTag() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

function IconImage() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function IconEdit() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function IconChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

// ── Shared style helpers ───────────────────────────────────────────────────────
const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: '11px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--border)',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: '13px',
  color: 'var(--text)',
  borderBottom: '1px solid var(--border)',
}

const inputStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '13px',
  color: 'var(--text)',
  outline: 'none',
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active:   { bg: 'var(--color-success-dim)', color: 'var(--color-success)' },
    pending:  { bg: 'var(--color-warning-dim)', color: 'var(--color-warning)' },
    rejected: { bg: 'var(--color-error-dim)',   color: 'var(--color-error)' },
    banned:   { bg: 'var(--color-error-dim)',   color: 'var(--color-error)' },
  }
  const c = map[status] ?? { bg: 'var(--tag-bg)', color: 'var(--text-muted)' }
  return (
    <span style={{ background: c.bg, color: c.color, padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
      {status}
    </span>
  )
}

function RolePill({ role, active, onClick }: { role: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: '5px 14px', borderRadius: '100px', border: '1px solid', borderColor: active ? 'var(--accent)' : 'var(--border)', background: active ? 'var(--accent-dim)' : 'var(--surface)', color: active ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: active ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}
    >
      {role}
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { lang } = useLang()

  const [tab, setTab]               = useState<Tab>('dashboard')

  // Dashboard
  const [stats, setStats]           = useState<AdminStats | null>(null)
  const [moderatorActivity, setModeratorActivity] = useState<ModeratorActivity[]>([])
  const [auditLogs, setAuditLogs]   = useState<AuditLog[]>([])
  const [dashLoading, setDashLoading] = useState(false)

  // Users
  const [users, setUsers]           = useState<User[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersPage, setUsersPage]   = useState(1)
  const [usersSearch, setUsersSearch] = useState('')
  const [usersRole, setUsersRole]   = useState('')
  const [usersLoading, setUsersLoading] = useState(false)
  const [banUserId, setBanUserId]   = useState<string | null>(null)
  const [banReason, setBanReason]   = useState('')
  const [changeRoleUserId, setChangeRoleUserId] = useState<string | null>(null)
  const [newRole, setNewRole]       = useState<UserRole>('user')
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [editUserData, setEditUserData] = useState<{ id: string; name: string; phone: string; email: string } | null>(null)
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [createUserForm, setCreateUserForm] = useState({ phone: '', name: '', password: '', role: 'user' as UserRole })
  const [userActionLoading, setUserActionLoading] = useState(false)
  const [userActionError, setUserActionError] = useState('')

  // Listings
  const [listings, setListings]     = useState<Listing[]>([])
  const [listingsTotal, setListingsTotal] = useState(0)
  const [listingsPage, setListingsPage] = useState(1)
  const [listingsSearch, setListingsSearch] = useState('')
  const [listingsStatus, setListingsStatus] = useState('')
  const [listingsLoading, setListingsLoading] = useState(false)
  const [rejectListingId, setRejectListingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [deleteListingId, setDeleteListingId] = useState<string | null>(null)
  const [editListingData, setEditListingData] = useState<Listing | null>(null)
  const [editListingForm, setEditListingForm] = useState<Record<string, string | number | boolean>>({})
  const [listingActionLoading, setListingActionLoading] = useState(false)
  const [logsListingId, setLogsListingId] = useState<string | null>(null)
  const [logsDetail, setLogsDetail] = useState<AdminListingDetail | null>(null)
  const [logsLoading, setLogsLoading] = useState(false)

  // Brands
  const [brands, setBrands]             = useState<CarBrand[]>([])
  const [brandsTotal, setBrandsTotal]   = useState(0)
  const [brandsPage, setBrandsPage]     = useState(1)
  const [brandsSearch, setBrandsSearch] = useState('')
  const [brandsLoading, setBrandsLoading] = useState(false)
  const [expandedBrandId, setExpandedBrandId] = useState<string | null>(null)
  const [brandModels, setBrandModels]   = useState<Record<string, CarModelItem[]>>({})
  const [brandModelsLoading, setBrandModelsLoading] = useState<string | null>(null)
  const [newModelName, setNewModelName] = useState('')
  const [addModelBrandId, setAddModelBrandId] = useState<string | null>(null)
  const [editBrandData, setEditBrandData] = useState<CarBrand | null>(null)
  const [createBrandOpen, setCreateBrandOpen] = useState(false)
  const [createBrandForm, setCreateBrandForm] = useState({ name: '', slug: '', country: '', logo_url: '', is_popular: false })
  const [brandActionLoading, setBrandActionLoading] = useState(false)
  const [brandActionError, setBrandActionError] = useState('')
  const [deleteBrandId, setDeleteBrandId] = useState<string | null>(null)

  // Categories
  const [categories, setCategories]     = useState<CarCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false)
  const [createCategoryForm, setCreateCategoryForm] = useState({ name_ru: '', name_tj: '', slug: '', icon_url: '', description_ru: '', description_tj: '', filter_config_raw: '{}', display_order: 0 })
  const [editCategoryData, setEditCategoryData] = useState<CarCategory | null>(null)
  const [editCategoryFilterRaw, setEditCategoryFilterRaw] = useState('{}')
  const [categoryActionLoading, setCategoryActionLoading] = useState(false)
  const [categoryActionError, setCategoryActionError] = useState('')
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)

  // Banners
  const [banners, setBanners]           = useState<AdBanner[]>([])
  const [bannersLoading, setBannersLoading] = useState(false)
  const [createBannerOpen, setCreateBannerOpen] = useState(false)
  const [createBannerForm, setCreateBannerForm] = useState({ title_ru: '', title_tj: '', subtitle_ru: '', subtitle_tj: '', image_url: '', link_url: '', display_order: 0 })
  const [editBannerData, setEditBannerData] = useState<AdBanner | null>(null)
  const [deleteBannerId, setDeleteBannerId] = useState<string | null>(null)
  const [bannerActionLoading, setBannerActionLoading] = useState(false)
  const [bannerActionError, setBannerActionError] = useState('')

  // Auth guard
  useEffect(() => {
    if (!user) { router.replace('/auth/login'); return }
    if (!ALLOWED_ROLES.includes(user.role)) { router.replace('/'); return }
  }, [user, router])

  // ── Load dashboard ──────────────────────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    setDashLoading(true)
    try {
      const [sRes, aRes, logsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getModeratorActivity(),
        adminApi.getAuditLogs(1),
      ])
      setStats(sRes.data.data)
      setModeratorActivity(aRes.data.data ?? [])
      setAuditLogs(logsRes.data.data.items ?? [])
    } catch { /* silent */ }
    setDashLoading(false)
  }, [])

  // ── Load users ──────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async (page = 1, role = '', search = '') => {
    setUsersLoading(true)
    try {
      const res = await adminApi.getUsers(page, role || undefined, search || undefined)
      setUsers(res.data.data.items)
      setUsersTotal(res.data.data.total)
    } catch { /* silent */ }
    setUsersLoading(false)
  }, [])

  // ── Load listings ───────────────────────────────────────────────────────────
  const loadListings = useCallback(async (page = 1, status = '', search = '') => {
    setListingsLoading(true)
    try {
      const res = await adminApi.getListings(status || undefined, page, search || undefined)
      setListings(res.data.data.items)
      setListingsTotal(res.data.data.total)
    } catch { /* silent */ }
    setListingsLoading(false)
  }, [])

  // ── Load brands ─────────────────────────────────────────────────────────────
  const loadBrands = useCallback(async (page = 1, search = '') => {
    setBrandsLoading(true)
    try {
      const res = await catalogApi.adminGetBrands(page, search || undefined)
      setBrands(res.data.data.items)
      setBrandsTotal(res.data.data.total)
    } catch { /* silent */ }
    setBrandsLoading(false)
  }, [])

  // ── Load brand models ────────────────────────────────────────────────────────
  const loadBrandModels = useCallback(async (brandId: string) => {
    setBrandModelsLoading(brandId)
    try {
      const res = await catalogApi.getModels(brandId)
      setBrandModels(prev => ({ ...prev, [brandId]: res.data.data }))
    } catch { /* silent */ }
    setBrandModelsLoading(null)
  }, [])

  // ── Load categories ──────────────────────────────────────────────────────────
  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true)
    try {
      const res = await catalogApi.adminGetCategories()
      setCategories(res.data.data)
    } catch { /* silent */ }
    setCategoriesLoading(false)
  }, [])

  // ── Load banners ─────────────────────────────────────────────────────────────
  const loadBanners = useCallback(async () => {
    setBannersLoading(true)
    try {
      const res = await catalogApi.adminGetBanners()
      setBanners(res.data.data ?? [])
    } catch { /* silent */ }
    setBannersLoading(false)
  }, [])

  // ── Tab change triggers ─────────────────────────────────────────────────────
  useEffect(() => {
    if (tab === 'dashboard')  loadDashboard()
    if (tab === 'users')      loadUsers(1, usersRole, usersSearch)
    if (tab === 'listings')   loadListings(1, listingsStatus, listingsSearch)
    if (tab === 'brands')     loadBrands(1, brandsSearch)
    if (tab === 'categories') loadCategories()
    if (tab === 'banners')    loadBanners()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // ── User actions ────────────────────────────────────────────────────────────
  async function handleBanUser(userId: string) {
    await adminApi.banUser(userId, banReason || undefined)
    setBanUserId(null)
    setBanReason('')
    loadUsers(usersPage, usersRole, usersSearch)
  }

  async function handleUnbanUser(userId: string) {
    await adminApi.unbanUser(userId)
    loadUsers(usersPage, usersRole, usersSearch)
  }

  async function handleChangeRole(userId: string) {
    await adminApi.updateUserRole(userId, newRole)
    setChangeRoleUserId(null)
    loadUsers(usersPage, usersRole, usersSearch)
  }

  // ── Listing actions ─────────────────────────────────────────────────────────
  async function handleApproveListing(id: string) {
    await adminApi.approveListing(id)
    loadListings(listingsPage, listingsStatus, listingsSearch)
  }

  async function handleRejectListing(id: string) {
    await adminApi.rejectListing(id, rejectReason.trim() || 'Отклонено')
    setRejectListingId(null)
    setRejectReason('')
    loadListings(listingsPage, listingsStatus, listingsSearch)
  }

  async function handleDeactivateListing(id: string) {
    await adminApi.deactivateListing(id)
    loadListings(listingsPage, listingsStatus, listingsSearch)
  }

  async function handleCreateUser() {
    setUserActionError('')
    setUserActionLoading(true)
    try {
      await adminApi.createUser(createUserForm)
      setCreateUserOpen(false)
      setCreateUserForm({ phone: '', name: '', password: '', role: 'user' })
      loadUsers(usersPage, usersRole, usersSearch)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setUserActionError(msg ?? 'Ошибка создания')
    }
    setUserActionLoading(false)
  }

  async function handleEditUser() {
    if (!editUserData) return
    setUserActionError('')
    setUserActionLoading(true)
    try {
      await adminApi.editUser(editUserData.id, {
        name: editUserData.name || undefined,
        phone: editUserData.phone || undefined,
        email: editUserData.email || undefined,
      })
      setEditUserData(null)
      loadUsers(usersPage, usersRole, usersSearch)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setUserActionError(msg ?? 'Ошибка сохранения')
    }
    setUserActionLoading(false)
  }

  async function handleDeleteUser() {
    if (!deleteUserId) return
    await adminApi.deleteUser(deleteUserId)
    setDeleteUserId(null)
    loadUsers(usersPage, usersRole, usersSearch)
  }

  async function handleEditListing() {
    if (!editListingData) return
    setListingActionLoading(true)
    try {
      await adminApi.editListing(editListingData.id, editListingForm)
      setEditListingData(null)
      loadListings(listingsPage, listingsStatus, listingsSearch)
    } catch { /* silent */ }
    setListingActionLoading(false)
  }

  async function handleDeleteListing() {
    if (!deleteListingId) return
    await adminApi.deleteListing(deleteListingId)
    setDeleteListingId(null)
    loadListings(listingsPage, listingsStatus, listingsSearch)
  }

  // ── Brand actions ────────────────────────────────────────────────────────────
  async function handleCreateBrand() {
    setBrandActionError('')
    setBrandActionLoading(true)
    try {
      await catalogApi.adminCreateBrand({
        name: createBrandForm.name,
        slug: createBrandForm.slug,
        country: createBrandForm.country || undefined,
        logo_url: createBrandForm.logo_url || undefined,
        is_popular: createBrandForm.is_popular,
      })
      setCreateBrandOpen(false)
      setCreateBrandForm({ name: '', slug: '', country: '', logo_url: '', is_popular: false })
      loadBrands(brandsPage, brandsSearch)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setBrandActionError(msg ?? (lang === 'ru' ? 'Ошибка создания' : 'Хатои сохтан'))
    }
    setBrandActionLoading(false)
  }

  async function handleUpdateBrand() {
    if (!editBrandData) return
    setBrandActionError('')
    setBrandActionLoading(true)
    try {
      await catalogApi.adminUpdateBrand(editBrandData.id, {
        name: editBrandData.name,
        slug: editBrandData.slug,
        country: editBrandData.country ?? undefined,
        logo_url: editBrandData.logo_url ?? undefined,
        is_popular: editBrandData.is_popular,
        is_active: editBrandData.is_active,
      })
      setEditBrandData(null)
      loadBrands(brandsPage, brandsSearch)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setBrandActionError(msg ?? (lang === 'ru' ? 'Ошибка сохранения' : 'Хатои нигох доштан'))
    }
    setBrandActionLoading(false)
  }

  async function handleDeleteBrand() {
    if (!deleteBrandId) return
    await catalogApi.adminDeleteBrand(deleteBrandId)
    setDeleteBrandId(null)
    loadBrands(brandsPage, brandsSearch)
  }

  async function handleAddModel(brandId: string) {
    if (!newModelName.trim()) return
    try {
      await catalogApi.adminAddModel(brandId, newModelName.trim())
      setNewModelName('')
      setAddModelBrandId(null)
      await loadBrandModels(brandId)
    } catch { /* silent */ }
  }

  async function handleDeleteModel(brandId: string, modelId: string) {
    await catalogApi.adminDeleteModel(brandId, modelId)
    await loadBrandModels(brandId)
  }

  async function toggleExpandBrand(brandId: string) {
    if (expandedBrandId === brandId) {
      setExpandedBrandId(null)
    } else {
      setExpandedBrandId(brandId)
      if (!brandModels[brandId]) {
        await loadBrandModels(brandId)
      }
    }
  }

  function slugify(str: string) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  // ── Category actions ─────────────────────────────────────────────────────────
  async function handleCreateCategory() {
    setCategoryActionError('')
    setCategoryActionLoading(true)
    try {
      let filterConfig: Record<string, unknown> | null = null
      try { filterConfig = JSON.parse(createCategoryForm.filter_config_raw) } catch { filterConfig = null }
      await catalogApi.adminCreateCategory({
        name_ru: createCategoryForm.name_ru,
        name_tj: createCategoryForm.name_tj,
        slug: createCategoryForm.slug,
        icon_url: createCategoryForm.icon_url || null,
        description_ru: createCategoryForm.description_ru || null,
        description_tj: createCategoryForm.description_tj || null,
        filter_config: filterConfig,
        display_order: createCategoryForm.display_order,
      })
      setCreateCategoryOpen(false)
      setCreateCategoryForm({ name_ru: '', name_tj: '', slug: '', icon_url: '', description_ru: '', description_tj: '', filter_config_raw: '{}', display_order: 0 })
      loadCategories()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setCategoryActionError(msg ?? (lang === 'ru' ? 'Ошибка создания' : 'Хатои сохтан'))
    }
    setCategoryActionLoading(false)
  }

  async function handleUpdateCategory() {
    if (!editCategoryData) return
    setCategoryActionError('')
    setCategoryActionLoading(true)
    try {
      let filterConfig: Record<string, unknown> | null = null
      try { filterConfig = JSON.parse(editCategoryFilterRaw) } catch { filterConfig = null }
      await catalogApi.adminUpdateCategory(editCategoryData.id, {
        name_ru: editCategoryData.name_ru,
        name_tj: editCategoryData.name_tj,
        slug: editCategoryData.slug,
        icon_url: editCategoryData.icon_url,
        description_ru: editCategoryData.description_ru,
        description_tj: editCategoryData.description_tj,
        filter_config: filterConfig,
        display_order: editCategoryData.display_order,
        is_active: editCategoryData.is_active,
      })
      setEditCategoryData(null)
      loadCategories()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setCategoryActionError(msg ?? (lang === 'ru' ? 'Ошибка сохранения' : 'Хатои нигох доштан'))
    }
    setCategoryActionLoading(false)
  }

  async function handleDeleteCategory() {
    if (!deleteCategoryId) return
    await catalogApi.adminDeleteCategory(deleteCategoryId)
    setDeleteCategoryId(null)
    loadCategories()
  }

  function openEditCategory(c: CarCategory) {
    setEditCategoryData(c)
    setEditCategoryFilterRaw(c.filter_config ? JSON.stringify(c.filter_config, null, 2) : '{}')
    setCategoryActionError('')
  }

  function openCreateCategory() {
    setCreateCategoryOpen(true)
    setCreateCategoryForm({ name_ru: '', name_tj: '', slug: '', icon_url: '', description_ru: '', description_tj: '', filter_config_raw: '{}', display_order: 0 })
    setCategoryActionError('')
  }

  async function handleCreateBanner() {
    setBannerActionError('')
    setBannerActionLoading(true)
    try {
      await catalogApi.adminCreateBanner({
        title_ru: createBannerForm.title_ru,
        title_tj: createBannerForm.title_tj,
        subtitle_ru: createBannerForm.subtitle_ru || null,
        subtitle_tj: createBannerForm.subtitle_tj || null,
        image_url: createBannerForm.image_url,
        link_url: createBannerForm.link_url || null,
        display_order: Number(createBannerForm.display_order),
      })
      setCreateBannerOpen(false)
      setCreateBannerForm({ title_ru: '', title_tj: '', subtitle_ru: '', subtitle_tj: '', image_url: '', link_url: '', display_order: 0 })
      loadBanners()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setBannerActionError(msg ?? 'Ошибка')
    }
    setBannerActionLoading(false)
  }

  async function handleEditBanner() {
    if (!editBannerData) return
    setBannerActionLoading(true)
    try {
      await catalogApi.adminUpdateBanner(editBannerData.id, {
        title_ru: editBannerData.title_ru,
        title_tj: editBannerData.title_tj,
        subtitle_ru: editBannerData.subtitle_ru ?? undefined,
        subtitle_tj: editBannerData.subtitle_tj ?? undefined,
        image_url: editBannerData.image_url,
        link_url: editBannerData.link_url ?? undefined,
        display_order: editBannerData.display_order,
        is_active: editBannerData.is_active,
      })
      setEditBannerData(null)
      loadBanners()
    } catch { /* silent */ }
    setBannerActionLoading(false)
  }

  async function handleDeleteBanner() {
    if (!deleteBannerId) return
    await catalogApi.adminDeleteBanner(deleteBannerId)
    setDeleteBannerId(null)
    loadBanners()
  }

  function openCreateBrand() {
    setCreateBrandOpen(true)
    setCreateBrandForm({ name: '', slug: '', country: '', logo_url: '', is_popular: false })
    setBrandActionError('')
  }

  function openEditBrand(b: CarBrand) {
    setEditBrandData({ ...b })
    setBrandActionError('')
  }

  function openDeleteBrand(id: string) {
    setDeleteBrandId(id)
  }

  function openDeleteCategory(id: string) {
    setDeleteCategoryId(id)
  }

  async function openListingLogs(id: string) {
    setLogsListingId(id)
    setLogsDetail(null)
    setLogsLoading(true)
    try {
      const res = await adminListingsApi.getDetail(id)
      setLogsDetail(res.data.data)
    } catch { /* silent */ }
    setLogsLoading(false)
  }

  function openEditListing(l: Listing) {
    setEditListingData(l)
    setEditListingForm({
      brand: l.brand,
      model: l.model,
      year: l.year,
      price: l.price,
      currency: l.currency,
      city: l.city,
      mileage: l.mileage ?? '',
      fuel: l.fuel ?? '',
      transmission: l.transmission ?? '',
      color: l.color ?? '',
      description: l.description ?? '',
      status: l.status,
    })
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  // ── Staff count from stats (all non-user roles) ─────────────────────────────
  // We compute it from total - user count; no direct API. We'll show 0 if unavailable.

  // ── NAV items ───────────────────────────────────────────────────────────────
  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard',  label: t('admin.dashboard', lang),                        icon: <IconDashboard /> },
    { id: 'users',      label: t('admin.users', lang),                            icon: <IconUsers /> },
    { id: 'listings',   label: t('admin.listings', lang),                         icon: <IconListings /> },
    { id: 'moderation', label: t('admin.moderation', lang),                       icon: <IconShield /> },
    { id: 'brands',     label: lang === 'ru' ? 'Марки и модели' : 'Марка ва модел', icon: <IconCar /> },
    { id: 'categories', label: lang === 'ru' ? 'Категории' : 'Категорияхо',       icon: <IconTag /> },
    { id: 'banners',    label: lang === 'ru' ? 'Баннеры' : 'Баннерҳо',           icon: <IconImage /> },
    { id: 'system',     label: t('admin.system', lang),                           icon: <IconSettings /> },
  ]

  // ── Layout ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>
      {/* ── Left sidebar (220px desktop, top tabs mobile) ── */}
      <aside style={{ width: '220px', flexShrink: 0, background: 'var(--card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
        {/* Logo area */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', color: 'var(--text-secondary)', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <IconArrowLeft />
            </Link>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{t('admin.title', lang)}</div>
            </div>
          </div>
          {user && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ background: 'var(--accent-dim)', color: 'var(--accent)', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>{user.role}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name ?? user.phone}</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {navItems.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: 'none', background: tab === id ? 'var(--accent-dim)' : 'none', color: tab === id ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: tab === id ? 600 : 400, textAlign: 'left', marginBottom: '2px', transition: 'all 0.15s' }}
            >
              {icon}
              {label}
              {id === 'moderation' && stats && stats.pending_listings > 0 && (
                <span style={{ marginLeft: 'auto', background: 'var(--color-error)', color: '#fff', borderRadius: '100px', fontSize: '10px', fontWeight: 700, padding: '1px 6px', minWidth: '18px', textAlign: 'center' }}>
                  {stats.pending_listings}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px' }}>

        {/* ════════════════════════════════════════════════
            DASHBOARD tab
        ════════════════════════════════════════════════ */}
        {tab === 'dashboard' && (
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '20px' }}>{t('admin.dashboard', lang)}</h1>

            {dashLoading ? (
              <div style={{ color: 'var(--text-muted)', padding: '40px 0' }}>{t('common.loading', lang)}</div>
            ) : (
              <>
                {/* 4 metric cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                  {[
                    { label: t('admin.totalListings', lang),    value: stats?.total_listings   ?? 0, color: 'var(--accent)' },
                    { label: t('admin.pending', lang),          value: stats?.pending_listings ?? 0, color: 'var(--color-warning)' },
                    { label: t('admin.activeListings', lang),   value: stats?.active_listings  ?? 0, color: 'var(--color-success)' },
                    { label: t('admin.totalUsers', lang),       value: stats?.total_users      ?? 0, color: 'var(--color-info)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: 'var(--card)', borderRadius: '14px', padding: '18px 20px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '28px', fontWeight: 800, color, marginBottom: '4px' }}>{value.toLocaleString()}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Moderator performance table */}
                {moderatorActivity.length > 0 && (
                  <div style={{ background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)', marginBottom: '20px', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>{t('admin.moderatorPerf', lang)}</span>
                      <Link href="/moderator" style={{ fontSize: '12px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {t('admin.goToModerator', lang)} <IconExternalLink />
                      </Link>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            {[t('admin.name', lang), t('admin.phone', lang), t('admin.role', lang), t('admin.listingsToday', lang), 'Online'].map(h => (
                              <th key={h} style={thStyle}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {moderatorActivity.map((m) => (
                            <tr key={m.moderator_id}>
                              <td style={tdStyle}>{m.moderator_name ?? '—'}</td>
                              <td style={tdStyle}>{m.phone}</td>
                              <td style={tdStyle}><span style={{ background: 'var(--accent-dim)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>moderator</span></td>
                              <td style={tdStyle}>{m.posts_today}</td>
                              <td style={tdStyle}>
                                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: m.is_online ? 'var(--color-online)' : 'var(--border-strong)', marginRight: '6px' }} />
                                {m.is_online ? 'Online' : 'Offline'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Recent audit log */}
                {auditLogs.length > 0 && (
                  <div style={{ background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
                      {t('admin.recentActivity', lang)}
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            {[t('admin.auditActor', lang), t('admin.auditAction', lang), t('admin.auditTarget', lang), t('admin.auditTime', lang)].map(h => (
                              <th key={h} style={thStyle}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {auditLogs.slice(0, 10).map((log) => (
                            <tr key={log.id}>
                              <td style={tdStyle}>{log.actor_name ?? log.actor_id ?? '—'}</td>
                              <td style={tdStyle}>
                                <span style={{ background: 'var(--tag-bg)', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace' }}>{log.action}</span>
                              </td>
                              <td style={tdStyle}>{log.target_type ?? '—'} {log.target_id ? `#${log.target_id.slice(0, 6)}` : ''}</td>
                              <td style={tdStyle}>{new Date(log.created_at).toLocaleString('ru-RU')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════
            USERS tab
        ════════════════════════════════════════════════ */}
        {tab === 'users' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>{t('admin.users', lang)}</h1>
              <button
                onClick={() => { setCreateUserOpen(true); setUserActionError('') }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {lang === 'ru' ? 'Добавить' : 'Илова'}
              </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}><IconSearch /></span>
                <input
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setUsersPage(1); loadUsers(1, usersRole, usersSearch) } }}
                  placeholder={t('admin.searchUsers', lang)}
                  style={{ ...inputStyle, width: '100%', paddingLeft: '32px' }}
                />
              </div>
              <button onClick={() => { setUsersPage(1); loadUsers(1, usersRole, usersSearch) }} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                {t('admin.searchUsers', lang).split(' ')[0]}
              </button>
            </div>

            {/* Role filter pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {['', ...ALL_ROLES].map(r => (
                <RolePill key={r || 'all'} role={r || t('admin.all', lang)} active={usersRole === r} onClick={() => { setUsersRole(r); setUsersPage(1); loadUsers(1, r, usersSearch) }} />
              ))}
            </div>

            {/* Table */}
            {usersLoading ? (
              <div style={{ color: 'var(--text-muted)', padding: '20px' }}>{t('common.loading', lang)}</div>
            ) : (
              <div style={{ background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead>
                      <tr>
                        {[t('admin.phone', lang), t('admin.name', lang), t('admin.role', lang), t('admin.created', lang), t('admin.status', lang), t('admin.actions', lang)].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td style={tdStyle}>{u.phone}</td>
                          <td style={tdStyle}>{u.name ?? '—'}</td>
                          <td style={tdStyle}><span style={{ background: 'var(--accent-dim)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>{u.role}</span></td>
                          <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(u.created_at)}</td>
                          <td style={tdStyle}><StatusBadge status={u.is_banned ? 'banned' : 'active'} /></td>
                          <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {u.is_banned ? (
                                <button onClick={() => handleUnbanUser(u.id)} style={{ padding: '4px 10px', background: 'var(--color-success-dim)', color: 'var(--color-success)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <IconCheck /> {t('admin.unban', lang)}
                                </button>
                              ) : (
                                <button onClick={() => setBanUserId(u.id)} style={{ padding: '4px 10px', background: 'var(--color-error-dim)', color: 'var(--color-error)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <IconBan /> {t('admin.ban', lang)}
                                </button>
                              )}
                              <button onClick={() => { setChangeRoleUserId(u.id); setNewRole(u.role) }} style={{ padding: '4px 10px', background: 'var(--tag-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                                {t('admin.changeRole', lang)}
                              </button>
                              <button onClick={() => { setEditUserData({ id: u.id, name: u.name ?? '', phone: u.phone, email: u.email ?? '' }); setUserActionError('') }} style={{ padding: '4px 10px', background: 'var(--tag-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                                {lang === 'ru' ? 'Изменить' : 'Таҳрир'}
                              </button>
                              <button onClick={() => setDeleteUserId(u.id)} style={{ padding: '4px 8px', background: 'var(--color-error-dim)', color: 'var(--color-error)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                                <IconX />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {usersTotal > 20 && (
                  <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', justifyContent: 'center', borderTop: '1px solid var(--border)' }}>
                    <button disabled={usersPage === 1} onClick={() => { const p = usersPage - 1; setUsersPage(p); loadUsers(p, usersRole, usersSearch) }} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', opacity: usersPage === 1 ? 0.4 : 1 }}>
                      ‹
                    </button>
                    <span style={{ padding: '6px 14px', fontSize: '13px', color: 'var(--text-muted)' }}>{usersPage}</span>
                    <button disabled={users.length < 20} onClick={() => { const p = usersPage + 1; setUsersPage(p); loadUsers(p, usersRole, usersSearch) }} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', opacity: users.length < 20 ? 0.4 : 1 }}>
                      ›
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Ban modal */}
            {banUserId && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setBanUserId(null)}>
                <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '360px', margin: '16px' }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: '14px' }}>{t('admin.ban', lang)}</h3>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>{t('admin.banReason', lang)}</label>
                  <input value={banReason} onChange={e => setBanReason(e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: '14px' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setBanUserId(null)} style={{ flex: 1, padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>
                      {t('dashboard.cancel', lang)}
                    </button>
                    <button onClick={() => handleBanUser(banUserId)} style={{ flex: 1, padding: '10px', background: 'var(--color-error)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                      {t('admin.ban', lang)}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Change role modal */}
            {changeRoleUserId && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setChangeRoleUserId(null)}>
                <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '360px', margin: '16px' }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: '14px' }}>{t('admin.changeRole', lang)}</h3>
                  <select value={newRole} onChange={e => setNewRole(e.target.value as UserRole)} style={{ ...inputStyle, width: '100%', marginBottom: '14px' }}>
                    {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setChangeRoleUserId(null)} style={{ flex: 1, padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>
                      {t('dashboard.cancel', lang)}
                    </button>
                    <button onClick={() => handleChangeRole(changeRoleUserId)} style={{ flex: 1, padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                      {t('dashboard.save', lang)}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Create user modal */}
            {createUserOpen && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setCreateUserOpen(false)}>
                <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', margin: '16px' }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: '16px' }}>{lang === 'ru' ? 'Новый пользователь' : 'Корбари нав'}</h3>
                  {[
                    { label: lang === 'ru' ? 'Телефон' : 'Телефон', key: 'phone', type: 'text', placeholder: '+992...' },
                    { label: lang === 'ru' ? 'Имя' : 'Ном', key: 'name', type: 'text', placeholder: '' },
                    { label: lang === 'ru' ? 'Пароль' : 'Парол', key: 'password', type: 'password', placeholder: '' },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key} style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                      <input
                        type={type}
                        value={createUserForm[key as keyof typeof createUserForm] as string}
                        onChange={e => setCreateUserForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        style={{ ...inputStyle, width: '100%' }}
                      />
                    </div>
                  ))}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('admin.role', lang)}</label>
                    <select value={createUserForm.role} onChange={e => setCreateUserForm(f => ({ ...f, role: e.target.value as UserRole }))} style={{ ...inputStyle, width: '100%' }}>
                      {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  {userActionError && <p style={{ fontSize: '13px', color: 'var(--color-error)', marginBottom: '10px' }}>{userActionError}</p>}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setCreateUserOpen(false)} style={{ flex: 1, padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>
                      {t('dashboard.cancel', lang)}
                    </button>
                    <button onClick={handleCreateUser} disabled={userActionLoading} style={{ flex: 1, padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#fff', opacity: userActionLoading ? 0.6 : 1 }}>
                      {lang === 'ru' ? 'Создать' : 'Сохтан'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit user modal */}
            {editUserData && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setEditUserData(null)}>
                <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', margin: '16px' }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: '16px' }}>{lang === 'ru' ? 'Редактировать пользователя' : 'Таҳрири корбар'}</h3>
                  {[
                    { label: lang === 'ru' ? 'Имя' : 'Ном', key: 'name' },
                    { label: lang === 'ru' ? 'Телефон' : 'Телефон', key: 'phone' },
                    { label: 'Email', key: 'email' },
                  ].map(({ label, key }) => (
                    <div key={key} style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                      <input
                        value={editUserData[key as keyof typeof editUserData] as string}
                        onChange={e => setEditUserData(d => d ? { ...d, [key]: e.target.value } : d)}
                        style={{ ...inputStyle, width: '100%' }}
                      />
                    </div>
                  ))}
                  {userActionError && <p style={{ fontSize: '13px', color: 'var(--color-error)', marginBottom: '10px' }}>{userActionError}</p>}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setEditUserData(null)} style={{ flex: 1, padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>
                      {t('dashboard.cancel', lang)}
                    </button>
                    <button onClick={handleEditUser} disabled={userActionLoading} style={{ flex: 1, padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#fff', opacity: userActionLoading ? 0.6 : 1 }}>
                      {t('dashboard.save', lang)}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete user confirm */}
            {deleteUserId && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setDeleteUserId(null)}>
                <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '360px', margin: '16px' }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: '8px' }}>{lang === 'ru' ? 'Удалить пользователя?' : 'Корбарро ҳазф кунед?'}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>{lang === 'ru' ? 'Это действие необратимо.' : 'Ин амал баргашт надорад.'}</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setDeleteUserId(null)} style={{ flex: 1, padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>
                      {t('dashboard.cancel', lang)}
                    </button>
                    <button onClick={handleDeleteUser} style={{ flex: 1, padding: '10px', background: 'var(--color-error)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                      {lang === 'ru' ? 'Удалить' : 'Ҳазф'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════
            LISTINGS tab
        ════════════════════════════════════════════════ */}
        {tab === 'listings' && (
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>{t('admin.listings', lang)}</h1>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}><IconSearch /></span>
                <input
                  value={listingsSearch}
                  onChange={(e) => setListingsSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setListingsPage(1); loadListings(1, listingsStatus, listingsSearch) } }}
                  placeholder={t('admin.searchListings', lang)}
                  style={{ ...inputStyle, width: '100%', paddingLeft: '32px' }}
                />
              </div>
              <button onClick={() => { setListingsPage(1); loadListings(1, listingsStatus, listingsSearch) }} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                {t('admin.searchListings', lang).split(' ')[0]}
              </button>
            </div>

            {/* Status filter pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {[{ v: '', label: t('admin.all', lang) }, { v: 'pending', label: t('admin.pending', lang) }, { v: 'active', label: t('admin.active', lang) }, { v: 'rejected', label: t('dashboard.rejected_badge', lang) }].map(({ v, label }) => (
                <RolePill key={v || 'all'} role={label} active={listingsStatus === v} onClick={() => { setListingsStatus(v); setListingsPage(1); loadListings(1, v, listingsSearch) }} />
              ))}
            </div>

            {listingsLoading ? (
              <div style={{ color: 'var(--text-muted)', padding: '20px' }}>{t('common.loading', lang)}</div>
            ) : (
              <div style={{ background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                    <thead>
                      <tr>
                        {['', t('admin.brand', lang), t('admin.model', lang), t('admin.city', lang), t('admin.created', lang), t('admin.status', lang), t('admin.actions', lang)].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {listings.map(l => (
                        <tr key={l.id}>
                          <td style={{ ...tdStyle, width: '48px', padding: '8px 12px' }}>
                            {l.images?.[0] ? (
                              <div style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '6px', overflow: 'hidden' }}>
                                <Image src={l.images[0].url} alt="" fill style={{ objectFit: 'cover' }} />
                              </div>
                            ) : (
                              <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'var(--surface)' }} />
                            )}
                          </td>
                          <td style={tdStyle}>{l.brand}</td>
                          <td style={tdStyle}>{l.model} {l.year}</td>
                          <td style={tdStyle}>{l.city}</td>
                          <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(l.created_at)}</td>
                          <td style={tdStyle}><StatusBadge status={l.status} /></td>
                          <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              {l.status === 'pending' && (
                                <button onClick={() => handleApproveListing(l.id)} style={{ padding: '4px 8px', background: 'var(--color-success-dim)', color: 'var(--color-success)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <IconCheck /> {t('admin.approveBtn', lang)}
                                </button>
                              )}
                              {l.status !== 'rejected' && (
                                <button onClick={() => setRejectListingId(l.id)} style={{ padding: '4px 8px', background: 'var(--color-error-dim)', color: 'var(--color-error)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <IconX /> {t('admin.rejectBtn', lang)}
                                </button>
                              )}
                              {l.status === 'active' && (
                                <button onClick={() => handleDeactivateListing(l.id)} style={{ padding: '4px 8px', background: 'var(--tag-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>
                                  {t('admin.deactivate', lang)}
                                </button>
                              )}
                              <button onClick={() => openEditListing(l)} style={{ padding: '4px 8px', background: 'var(--tag-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>
                                {lang === 'ru' ? 'Изм.' : 'Таҳ.'}
                              </button>
                              <button onClick={() => openListingLogs(l.id)} style={{ padding: '4px 8px', background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
                                {t('admin.viewLogs', lang)}
                              </button>
                              <button onClick={() => setDeleteListingId(l.id)} style={{ padding: '4px 8px', background: 'var(--color-error-dim)', color: 'var(--color-error)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center' }}>
                                <IconX />
                              </button>
                              <Link href={`/car/${l.id}`} target="_blank" style={{ padding: '4px 8px', background: 'var(--tag-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <IconExternalLink />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {listingsTotal > 20 && (
                  <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', justifyContent: 'center', borderTop: '1px solid var(--border)' }}>
                    <button disabled={listingsPage === 1} onClick={() => { const p = listingsPage - 1; setListingsPage(p); loadListings(p, listingsStatus, listingsSearch) }} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', opacity: listingsPage === 1 ? 0.4 : 1 }}>
                      ‹
                    </button>
                    <span style={{ padding: '6px 14px', fontSize: '13px', color: 'var(--text-muted)' }}>{listingsPage}</span>
                    <button disabled={listings.length < 20} onClick={() => { const p = listingsPage + 1; setListingsPage(p); loadListings(p, listingsStatus, listingsSearch) }} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', opacity: listings.length < 20 ? 0.4 : 1 }}>
                      ›
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Reject listing modal */}
            {rejectListingId && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setRejectListingId(null)}>
                <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '360px', margin: '16px' }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: '14px' }}>{t('admin.rejectBtn', lang)}</h3>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>{t('admin.rejectReason', lang)}</label>
                  <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: '14px' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setRejectListingId(null)} style={{ flex: 1, padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>
                      {t('dashboard.cancel', lang)}
                    </button>
                    <button onClick={() => handleRejectListing(rejectListingId)} style={{ flex: 1, padding: '10px', background: 'var(--color-error)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                      {t('admin.rejectBtn', lang)}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit listing modal */}
            {editListingData && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, overflowY: 'auto', padding: '16px' }} onClick={() => setEditListingData(null)}>
                <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '560px', margin: 'auto' }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: '16px' }}>{lang === 'ru' ? 'Редактировать объявление' : 'Таҳрири эълон'}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    {[
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
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                        <input
                          value={String(editListingForm[key] ?? '')}
                          onChange={e => setEditListingForm(f => ({ ...f, [key]: e.target.value }))}
                          style={{ ...inputStyle, width: '100%' }}
                        />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lang === 'ru' ? 'Описание' : 'Тавсиф'}</label>
                    <textarea
                      value={String(editListingForm.description ?? '')}
                      onChange={e => setEditListingForm(f => ({ ...f, description: e.target.value }))}
                      rows={3}
                      style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
                    />
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('admin.status', lang)}</label>
                    <select value={String(editListingForm.status ?? '')} onChange={e => setEditListingForm(f => ({ ...f, status: e.target.value }))} style={{ ...inputStyle, width: '100%' }}>
                      <option value="pending">pending</option>
                      <option value="active">active</option>
                      <option value="rejected">rejected</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setEditListingData(null)} style={{ flex: 1, padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>
                      {t('dashboard.cancel', lang)}
                    </button>
                    <button onClick={handleEditListing} disabled={listingActionLoading} style={{ flex: 1, padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#fff', opacity: listingActionLoading ? 0.6 : 1 }}>
                      {t('dashboard.save', lang)}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete listing confirm */}
            {deleteListingId && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setDeleteListingId(null)}>
                <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '360px', margin: '16px' }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: '8px' }}>{lang === 'ru' ? 'Удалить объявление?' : 'Эълонро ҳазф кунед?'}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>{lang === 'ru' ? 'Объявление будет удалено безвозвратно.' : 'Эълон барои ҳамеша ҳазф мешавад.'}</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setDeleteListingId(null)} style={{ flex: 1, padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>
                      {t('dashboard.cancel', lang)}
                    </button>
                    <button onClick={handleDeleteListing} style={{ flex: 1, padding: '10px', background: 'var(--color-error)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                      {lang === 'ru' ? 'Удалить' : 'Ҳазф'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Listing logs modal */}
            {logsListingId && (
              <div
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}
                onClick={() => { setLogsListingId(null); setLogsDetail(null) }}
              >
                <div
                  style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '560px', maxHeight: '80vh', overflowY: 'auto' }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)' }}>
                      {t('admin.viewLogs', lang)}
                    </h3>
                    <button
                      onClick={() => { setLogsListingId(null); setLogsDetail(null) }}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px 8px', display: 'flex', alignItems: 'center' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="1" y1="1" x2="13" y2="13" /><line x1="13" y1="1" x2="1" y2="13" />
                      </svg>
                    </button>
                  </div>

                  {logsLoading ? (
                    <div style={{ color: 'var(--text-muted)', padding: '24px 0', textAlign: 'center' }}>{t('common.loading', lang)}</div>
                  ) : logsDetail ? (
                    <>
                      {/* Listing summary */}
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', padding: '14px', background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        {logsDetail.primary_image_url && (
                          <div style={{ position: 'relative', width: '60px', height: '44px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                            <Image src={logsDetail.primary_image_url} alt="" fill style={{ objectFit: 'cover' }} sizes="60px" />
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
                            {logsDetail.brand} {logsDetail.model} {logsDetail.year}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {logsDetail.city} · {logsDetail.user.name ?? logsDetail.user.phone ?? logsDetail.user.email ?? '—'}
                          </div>
                        </div>
                        <StatusBadge status={logsDetail.status} />
                      </div>

                      {/* Log timeline */}
                      {logsDetail.logs.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', padding: '20px 0' }}>
                          {t('admin.noLogs', lang)}
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {logsDetail.logs.map((log, i) => (
                            <div key={log.id ?? i} style={{ padding: '12px', background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                                <span style={{ background: 'var(--tag-bg)', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--text)' }}>
                                  {log.action}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {new Date(log.created_at).toLocaleString('ru-RU')}
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                                <span style={{ fontWeight: 600 }}>{t('admin.logBy', lang)}:</span> {log.actor_name ?? '—'}
                                {log.from_status && log.to_status && (
                                  <span style={{ marginLeft: '8px' }}>
                                    <StatusBadge status={log.from_status} />
                                    <span style={{ margin: '0 4px', color: 'var(--text-muted)' }}>→</span>
                                    <StatusBadge status={log.to_status} />
                                  </span>
                                )}
                              </div>
                              {log.reason && (
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                  <span style={{ fontWeight: 600 }}>{t('admin.logReason', lang)}:</span> {log.reason}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════
            MODERATION tab — links to moderator page
        ════════════════════════════════════════════════ */}
        {tab === 'moderation' && (
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '20px' }}>{t('admin.moderation', lang)}</h1>
            <div style={{ background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', padding: '32px', textAlign: 'center', maxWidth: '480px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--accent)' }}>
                  <IconShield />
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>{t('moderator.queue', lang)}</div>
                {stats && (
                  <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-warning)', marginBottom: '8px' }}>{stats.pending_listings}</div>
                )}
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('admin.pendingAlert', lang)}</div>
              </div>
              <Link
                href="/moderator"
                style={{ display: 'inline-block', padding: '12px 28px', background: 'var(--accent)', color: '#fff', borderRadius: '10px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}
              >
                {t('admin.goToModerator', lang)}
              </Link>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            BRANDS tab
        ════════════════════════════════════════════════ */}
        {tab === 'brands' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>
                {lang === 'ru' ? 'Марки и модели' : 'Марка ва моделхо'}
              </h1>
              <button
                onClick={openCreateBrand}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}
              >
                <IconPlus />
                {lang === 'ru' ? 'Добавить марку' : 'Марка илова'}
              </button>
            </div>

            {/* Search */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '400px' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}><IconSearch /></span>
                <input
                  value={brandsSearch}
                  onChange={e => setBrandsSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { setBrandsPage(1); loadBrands(1, brandsSearch) } }}
                  placeholder={lang === 'ru' ? 'Поиск марки...' : 'Ҷустуҷӯи марка...'}
                  style={{ ...inputStyle, width: '100%', paddingLeft: '32px' }}
                />
              </div>
              <button onClick={() => { setBrandsPage(1); loadBrands(1, brandsSearch) }} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                {lang === 'ru' ? 'Найти' : 'Ёфтан'}
              </button>
            </div>

            {brandsLoading ? (
              <div style={{ color: 'var(--text-muted)', padding: '20px' }}>{t('common.loading', lang)}</div>
            ) : (
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
                        ].map(h => <th key={h} style={thStyle}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {brands.map(b => (
                        <>
                          <tr key={b.id}>
                            <td style={tdStyle}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                  onClick={() => toggleExpandBrand(b.id)}
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
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                              )}
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
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <button
                                  onClick={() => openEditBrand(b)}
                                  style={{ padding: '4px 10px', background: 'var(--tag-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <IconEdit /> {lang === 'ru' ? 'Изм.' : 'Таҳ.'}
                                </button>
                                <button
                                  onClick={() => openDeleteBrand(b.id)}
                                  style={{ padding: '4px 8px', background: 'var(--color-error-dim)', color: 'var(--color-error)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center' }}
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
                                      {(brandModels[b.id] ?? []).map(m => (
                                        <span key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '100px', padding: '3px 10px', fontSize: '12px', color: 'var(--text)' }}>
                                          {m.name}
                                          <button
                                            onClick={() => handleDeleteModel(b.id, m.id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', display: 'flex', alignItems: 'center', padding: '0', marginLeft: '2px' }}
                                          >
                                            <IconX />
                                          </button>
                                        </span>
                                      ))}
                                      {(brandModels[b.id] ?? []).length === 0 && (
                                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{lang === 'ru' ? 'Нет моделей' : 'Моделхо нест'}</span>
                                      )}
                                    </div>
                                  )}
                                  {addModelBrandId === b.id ? (
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                      <input
                                        value={newModelName}
                                        onChange={e => setNewModelName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleAddModel(b.id) }}
                                        placeholder={lang === 'ru' ? 'Название модели' : 'Номи модел'}
                                        style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px' }}
                                        autoFocus
                                      />
                                      <button onClick={() => handleAddModel(b.id)} style={{ padding: '6px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                                        {lang === 'ru' ? 'Добавить' : 'Илова'}
                                      </button>
                                      <button onClick={() => { setAddModelBrandId(null); setNewModelName('') }} style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--text)' }}>
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
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {brandsTotal > 50 && (
                  <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', justifyContent: 'center', borderTop: '1px solid var(--border)' }}>
                    <button disabled={brandsPage === 1} onClick={() => { const p = brandsPage - 1; setBrandsPage(p); loadBrands(p, brandsSearch) }} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', opacity: brandsPage === 1 ? 0.4 : 1 }}>
                      ‹
                    </button>
                    <span style={{ padding: '6px 14px', fontSize: '13px', color: 'var(--text-muted)' }}>{brandsPage} / {Math.ceil(brandsTotal / 50)}</span>
                    <button disabled={brands.length < 50} onClick={() => { const p = brandsPage + 1; setBrandsPage(p); loadBrands(p, brandsSearch) }} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', opacity: brands.length < 50 ? 0.4 : 1 }}>
                      ›
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Create brand modal */}
            {createBrandOpen && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setCreateBrandOpen(false)}>
                <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '420px', margin: '16px' }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: '16px' }}>
                    {lang === 'ru' ? 'Новая марка' : 'Марkai нав'}
                  </h3>
                  {[
                    { label: lang === 'ru' ? 'Название' : 'Ном', key: 'name' },
                    { label: 'Slug', key: 'slug' },
                    { label: lang === 'ru' ? 'Страна' : 'Кишвар', key: 'country' },
                    { label: lang === 'ru' ? 'URL логотипа' : 'URL логотип', key: 'logo_url' },
                  ].map(({ label, key }) => (
                    <div key={key} style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                      <input
                        value={createBrandForm[key as keyof typeof createBrandForm] as string}
                        onChange={e => {
                          const val = e.target.value
                          setCreateBrandForm(f => ({
                            ...f,
                            [key]: val,
                            ...(key === 'name' ? { slug: slugify(val) } : {}),
                          }))
                        }}
                        style={{ ...inputStyle, width: '100%' }}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <input
                      type="checkbox"
                      id="brand-popular"
                      checked={createBrandForm.is_popular}
                      onChange={e => setCreateBrandForm(f => ({ ...f, is_popular: e.target.checked }))}
                    />
                    <label htmlFor="brand-popular" style={{ fontSize: '13px', color: 'var(--text)' }}>
                      {lang === 'ru' ? 'Популярная марка' : 'Маркаи машхур'}
                    </label>
                  </div>
                  {brandActionError && <p style={{ fontSize: '13px', color: 'var(--color-error)', marginBottom: '10px' }}>{brandActionError}</p>}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setCreateBrandOpen(false)} style={{ flex: 1, padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>
                      {t('dashboard.cancel', lang)}
                    </button>
                    <button onClick={handleCreateBrand} disabled={brandActionLoading} style={{ flex: 1, padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#fff', opacity: brandActionLoading ? 0.6 : 1 }}>
                      {lang === 'ru' ? 'Создать' : 'Сохтан'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit brand modal */}
            {editBrandData && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setEditBrandData(null)}>
                <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '420px', margin: '16px' }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: '16px' }}>
                    {lang === 'ru' ? 'Редактировать марку' : 'Таҳрири марка'}
                  </h3>
                  {[
                    { label: lang === 'ru' ? 'Название' : 'Ном', key: 'name' },
                    { label: 'Slug', key: 'slug' },
                    { label: lang === 'ru' ? 'Страна' : 'Кишвар', key: 'country' },
                    { label: lang === 'ru' ? 'URL логотипа' : 'URL логотип', key: 'logo_url' },
                  ].map(({ label, key }) => (
                    <div key={key} style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                      <input
                        value={(editBrandData[key as keyof CarBrand] as string) ?? ''}
                        onChange={e => setEditBrandData(d => d ? { ...d, [key]: e.target.value } : d)}
                        style={{ ...inputStyle, width: '100%' }}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <input
                      type="checkbox"
                      id="edit-brand-popular"
                      checked={editBrandData.is_popular}
                      onChange={e => setEditBrandData(d => d ? { ...d, is_popular: e.target.checked } : d)}
                    />
                    <label htmlFor="edit-brand-popular" style={{ fontSize: '13px', color: 'var(--text)' }}>
                      {lang === 'ru' ? 'Популярная марка' : 'Маркаи машхур'}
                    </label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <input
                      type="checkbox"
                      id="edit-brand-active"
                      checked={editBrandData.is_active ?? true}
                      onChange={e => setEditBrandData(d => d ? { ...d, is_active: e.target.checked } : d)}
                    />
                    <label htmlFor="edit-brand-active" style={{ fontSize: '13px', color: 'var(--text)' }}>
                      {lang === 'ru' ? 'Активна' : 'Фаъол'}
                    </label>
                  </div>
                  {brandActionError && <p style={{ fontSize: '13px', color: 'var(--color-error)', marginBottom: '10px' }}>{brandActionError}</p>}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setEditBrandData(null)} style={{ flex: 1, padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>
                      {t('dashboard.cancel', lang)}
                    </button>
                    <button onClick={handleUpdateBrand} disabled={brandActionLoading} style={{ flex: 1, padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#fff', opacity: brandActionLoading ? 0.6 : 1 }}>
                      {t('dashboard.save', lang)}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete brand confirm */}
            {deleteBrandId && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setDeleteBrandId(null)}>
                <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '360px', margin: '16px' }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: '8px' }}>
                    {lang === 'ru' ? 'Удалить марку?' : 'Маркаро хазф кунед?'}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
                    {lang === 'ru' ? 'Все модели этой марки также будут удалены.' : 'Хамаи моделхои ин марка низ хазф мешаванд.'}
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setDeleteBrandId(null)} style={{ flex: 1, padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>
                      {t('dashboard.cancel', lang)}
                    </button>
                    <button onClick={handleDeleteBrand} style={{ flex: 1, padding: '10px', background: 'var(--color-error)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                      {lang === 'ru' ? 'Удалить' : 'Хазф'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════
            CATEGORIES tab
        ════════════════════════════════════════════════ */}
        {tab === 'categories' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>
                {lang === 'ru' ? 'Категории' : 'Категорияхо'}
              </h1>
              <button
                onClick={openCreateCategory}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}
              >
                <IconPlus />
                {lang === 'ru' ? 'Добавить категорию' : 'Категория илова'}
              </button>
            </div>

            {categoriesLoading ? (
              <div style={{ color: 'var(--text-muted)', padding: '20px' }}>{t('common.loading', lang)}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {categories.map(c => (
                  <div key={c.id} style={{ background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>{lang === 'ru' ? c.name_ru : c.name_tj}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', background: 'var(--tag-bg)', padding: '1px 6px', borderRadius: '4px' }}>{c.slug}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>#{c.display_order}</span>
                        {!c.is_active && (
                          <span style={{ background: 'var(--color-error-dim)', color: 'var(--color-error)', padding: '1px 6px', borderRadius: '100px', fontSize: '10px', fontWeight: 600 }}>
                            {lang === 'ru' ? 'Неактивна' : 'Гайрифаъол'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        {lang === 'ru' ? c.description_ru : c.description_tj}
                      </div>
                      {c.filter_config && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {Object.entries(c.filter_config).map(([k, v]) => (
                            <span key={k} style={{ background: 'var(--accent-dim)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 500 }}>
                              {k}: {String(v)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                      <button
                        onClick={() => openEditCategory(c)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: 'var(--tag-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        <IconEdit /> {lang === 'ru' ? 'Изм.' : 'Таҳ.'}
                      </button>
                      <button
                        onClick={() => openDeleteCategory(c.id)}
                        style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', background: 'var(--color-error-dim)', color: 'var(--color-error)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        <IconX />
                      </button>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <div style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    {lang === 'ru' ? 'Нет категорий' : 'Категорияхо нест'}
                  </div>
                )}
              </div>
            )}

            {/* Create category modal */}
            {createCategoryOpen && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, overflowY: 'auto', padding: '16px' }} onClick={() => setCreateCategoryOpen(false)}>
                <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '500px', margin: 'auto' }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: '16px' }}>
                    {lang === 'ru' ? 'Новая категория' : 'Категорияи нав'}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    {[
                      { label: lang === 'ru' ? 'Название (рус)' : 'Ном (рус)', key: 'name_ru' },
                      { label: lang === 'ru' ? 'Название (тадж)' : 'Ном (точ)', key: 'name_tj' },
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                        <input
                          value={createCategoryForm[key as keyof typeof createCategoryForm] as string}
                          onChange={e => setCreateCategoryForm(f => ({ ...f, [key]: e.target.value, ...(key === 'name_ru' ? { slug: slugify(e.target.value) } : {}) }))}
                          style={{ ...inputStyle, width: '100%' }}
                        />
                      </div>
                    ))}
                  </div>
                  {[
                    { label: 'Slug', key: 'slug' },
                    { label: lang === 'ru' ? 'URL иконки' : 'URL иконка', key: 'icon_url' },
                    { label: lang === 'ru' ? 'Описание (рус)' : 'Тавсиф (рус)', key: 'description_ru' },
                    { label: lang === 'ru' ? 'Описание (тадж)' : 'Тавсиф (точ)', key: 'description_tj' },
                  ].map(({ label, key }) => (
                    <div key={key} style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                      <input
                        value={createCategoryForm[key as keyof typeof createCategoryForm] as string}
                        onChange={e => setCreateCategoryForm(f => ({ ...f, [key]: e.target.value }))}
                        style={{ ...inputStyle, width: '100%' }}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lang === 'ru' ? 'Порядок' : 'Тартиб'}</label>
                      <input
                        type="number"
                        value={createCategoryForm.display_order}
                        onChange={e => setCreateCategoryForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))}
                        style={{ ...inputStyle, width: '100%' }}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {lang === 'ru' ? 'Фильтр (JSON)' : 'Филтр (JSON)'}
                    </label>
                    <textarea
                      value={createCategoryForm.filter_config_raw}
                      onChange={e => setCreateCategoryForm(f => ({ ...f, filter_config_raw: e.target.value }))}
                      rows={3}
                      style={{ ...inputStyle, width: '100%', fontFamily: 'monospace', fontSize: '12px', resize: 'vertical' }}
                      placeholder='{"type": "sale"}'
                    />
                  </div>
                  {categoryActionError && <p style={{ fontSize: '13px', color: 'var(--color-error)', marginBottom: '10px' }}>{categoryActionError}</p>}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setCreateCategoryOpen(false)} style={{ flex: 1, padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>
                      {t('dashboard.cancel', lang)}
                    </button>
                    <button onClick={handleCreateCategory} disabled={categoryActionLoading} style={{ flex: 1, padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#fff', opacity: categoryActionLoading ? 0.6 : 1 }}>
                      {lang === 'ru' ? 'Создать' : 'Сохтан'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit category modal */}
            {editCategoryData && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, overflowY: 'auto', padding: '16px' }} onClick={() => setEditCategoryData(null)}>
                <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '500px', margin: 'auto' }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: '16px' }}>
                    {lang === 'ru' ? 'Редактировать категорию' : 'Таҳрири категория'}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    {[
                      { label: lang === 'ru' ? 'Название (рус)' : 'Ном (рус)', key: 'name_ru' },
                      { label: lang === 'ru' ? 'Название (тадж)' : 'Ном (точ)', key: 'name_tj' },
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                        <input
                          value={(editCategoryData[key as keyof CarCategory] as string) ?? ''}
                          onChange={e => setEditCategoryData(d => d ? { ...d, [key]: e.target.value } : d)}
                          style={{ ...inputStyle, width: '100%' }}
                        />
                      </div>
                    ))}
                  </div>
                  {[
                    { label: 'Slug', key: 'slug' },
                    { label: lang === 'ru' ? 'URL иконки' : 'URL иконка', key: 'icon_url' },
                    { label: lang === 'ru' ? 'Описание (рус)' : 'Тавсиф (рус)', key: 'description_ru' },
                    { label: lang === 'ru' ? 'Описание (тадж)' : 'Тавсиф (точ)', key: 'description_tj' },
                  ].map(({ label, key }) => (
                    <div key={key} style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                      <input
                        value={(editCategoryData[key as keyof CarCategory] as string) ?? ''}
                        onChange={e => setEditCategoryData(d => d ? { ...d, [key]: e.target.value } : d)}
                        style={{ ...inputStyle, width: '100%' }}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lang === 'ru' ? 'Порядок' : 'Тартиб'}</label>
                      <input
                        type="number"
                        value={editCategoryData.display_order}
                        onChange={e => setEditCategoryData(d => d ? { ...d, display_order: parseInt(e.target.value) || 0 } : d)}
                        style={{ ...inputStyle, width: '100%' }}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {lang === 'ru' ? 'Фильтр (JSON)' : 'Филтр (JSON)'}
                    </label>
                    <textarea
                      value={editCategoryFilterRaw}
                      onChange={e => setEditCategoryFilterRaw(e.target.value)}
                      rows={3}
                      style={{ ...inputStyle, width: '100%', fontFamily: 'monospace', fontSize: '12px', resize: 'vertical' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <input
                      type="checkbox"
                      id="edit-cat-active"
                      checked={editCategoryData.is_active ?? true}
                      onChange={e => setEditCategoryData(d => d ? { ...d, is_active: e.target.checked } : d)}
                    />
                    <label htmlFor="edit-cat-active" style={{ fontSize: '13px', color: 'var(--text)' }}>
                      {lang === 'ru' ? 'Активна' : 'Фаъол'}
                    </label>
                  </div>
                  {categoryActionError && <p style={{ fontSize: '13px', color: 'var(--color-error)', marginBottom: '10px' }}>{categoryActionError}</p>}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setEditCategoryData(null)} style={{ flex: 1, padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>
                      {t('dashboard.cancel', lang)}
                    </button>
                    <button onClick={handleUpdateCategory} disabled={categoryActionLoading} style={{ flex: 1, padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#fff', opacity: categoryActionLoading ? 0.6 : 1 }}>
                      {t('dashboard.save', lang)}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete category confirm */}
            {deleteCategoryId && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setDeleteCategoryId(null)}>
                <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '360px', margin: '16px' }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: '8px' }}>
                    {lang === 'ru' ? 'Удалить категорию?' : 'Категорияро хазф кунед?'}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
                    {lang === 'ru' ? 'Это действие необратимо.' : 'Ин амал баргашт надорад.'}
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setDeleteCategoryId(null)} style={{ flex: 1, padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>
                      {t('dashboard.cancel', lang)}
                    </button>
                    <button onClick={handleDeleteCategory} style={{ flex: 1, padding: '10px', background: 'var(--color-error)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                      {lang === 'ru' ? 'Удалить' : 'Хазф'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════
            BANNERS tab
        ════════════════════════════════════════════════ */}
        {tab === 'banners' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>{lang === 'ru' ? 'Баннеры' : 'Баннерҳо'}</h1>
              <button onClick={() => { setCreateBannerOpen(true); setBannerActionError('') }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
                <IconPlus /> {lang === 'ru' ? 'Добавить баннер' : 'Банер илова'}
              </button>
            </div>

            {bannersLoading ? (
              <div style={{ color: 'var(--text-muted)', padding: '20px' }}>{t('common.loading', lang)}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {banners.length === 0 && (
                  <div style={{ background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)', padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                    {lang === 'ru' ? 'Нет баннеров. Добавьте первый.' : 'Банер нест. Аввалинро илова кунед.'}
                  </div>
                )}
                {banners.map(b => (
                  <div key={b.id} style={{ background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '0' }}>
                    {/* Image preview */}
                    <div style={{ flexShrink: 0, width: '120px', height: '72px', position: 'relative', background: 'var(--surface)' }}>
                      {b.image_url ? (
                        <Image src={b.image_url} alt={b.title_ru} fill style={{ objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                          <IconImage />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0, padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title_ru}</div>
                      {b.subtitle_ru && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{b.subtitle_ru}</div>}
                      {b.link_url && <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.link_url}</div>}
                    </div>
                    {/* Status + order */}
                    <div style={{ flexShrink: 0, padding: '0 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', background: b.is_active ? 'var(--color-success-dim)' : 'var(--tag-bg)', color: b.is_active ? 'var(--color-success)' : 'var(--text-muted)' }}>
                        {b.is_active ? (lang === 'ru' ? 'Активен' : 'Фаъол') : (lang === 'ru' ? 'Скрыт' : 'Пинҳон')}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>#{b.display_order}</span>
                    </div>
                    {/* Actions */}
                    <div style={{ flexShrink: 0, display: 'flex', gap: '6px', padding: '0 14px' }}>
                      <button onClick={() => setEditBannerData({ ...b })} style={{ padding: '6px 12px', background: 'var(--tag-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                        {lang === 'ru' ? 'Изм.' : 'Таҳр.'}
                      </button>
                      <button onClick={() => setDeleteBannerId(b.id)} style={{ padding: '6px 10px', background: 'var(--color-error-dim)', color: 'var(--color-error)', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <IconX />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create banner modal */}
            {createBannerOpen && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }} onClick={() => setCreateBannerOpen(false)}>
                <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: '16px' }}>{lang === 'ru' ? 'Новый баннер' : 'Банери нав'}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    {[
                      { label: lang === 'ru' ? 'Заголовок (RU)' : 'Сарлавҳа (RU)', key: 'title_ru' },
                      { label: lang === 'ru' ? 'Заголовок (TJ)' : 'Сарлавҳа (TJ)', key: 'title_tj' },
                      { label: lang === 'ru' ? 'Подзаголовок (RU)' : 'Зерсарлавҳа (RU)', key: 'subtitle_ru' },
                      { label: lang === 'ru' ? 'Подзаголовок (TJ)' : 'Зерсарлавҳа (TJ)', key: 'subtitle_tj' },
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                        <input value={createBannerForm[key as keyof typeof createBannerForm] as string} onChange={e => setCreateBannerForm(f => ({ ...f, [key]: e.target.value }))} style={{ ...inputStyle, width: '100%' }} />
                      </div>
                    ))}
                  </div>
                  {[
                    { label: lang === 'ru' ? 'URL изображения' : 'URL акс', key: 'image_url', placeholder: 'https://...' },
                    { label: lang === 'ru' ? 'Ссылка (необяз.)' : 'Истинод (ихтиёрӣ)', key: 'link_url', placeholder: '/catalog или https://...' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key} style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                      <input value={createBannerForm[key as keyof typeof createBannerForm] as string} onChange={e => setCreateBannerForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} style={{ ...inputStyle, width: '100%' }} />
                    </div>
                  ))}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lang === 'ru' ? 'Порядок' : 'Тартиб'}</label>
                    <input type="number" value={createBannerForm.display_order} onChange={e => setCreateBannerForm(f => ({ ...f, display_order: Number(e.target.value) }))} style={{ ...inputStyle, width: '100%' }} />
                  </div>
                  {bannerActionError && <p style={{ fontSize: '13px', color: 'var(--color-error)', marginBottom: '10px' }}>{bannerActionError}</p>}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setCreateBannerOpen(false)} style={{ flex: 1, padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>{t('dashboard.cancel', lang)}</button>
                    <button onClick={handleCreateBanner} disabled={bannerActionLoading} style={{ flex: 1, padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#fff', opacity: bannerActionLoading ? 0.6 : 1 }}>{lang === 'ru' ? 'Создать' : 'Сохтан'}</button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit banner modal */}
            {editBannerData && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }} onClick={() => setEditBannerData(null)}>
                <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: '16px' }}>{lang === 'ru' ? 'Редактировать баннер' : 'Таҳрири баннер'}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    {[
                      { label: lang === 'ru' ? 'Заголовок (RU)' : 'Сарлавҳа (RU)', key: 'title_ru' },
                      { label: lang === 'ru' ? 'Заголовок (TJ)' : 'Сарлавҳа (TJ)', key: 'title_tj' },
                      { label: lang === 'ru' ? 'Подзаголовок (RU)' : 'Зерсарлавҳа (RU)', key: 'subtitle_ru' },
                      { label: lang === 'ru' ? 'Подзаголовок (TJ)' : 'Зерсарлавҳа (TJ)', key: 'subtitle_tj' },
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                        <input value={(editBannerData[key as keyof AdBanner] as string) ?? ''} onChange={e => setEditBannerData(d => d ? { ...d, [key]: e.target.value } : d)} style={{ ...inputStyle, width: '100%' }} />
                      </div>
                    ))}
                  </div>
                  {[
                    { label: lang === 'ru' ? 'URL изображения' : 'URL акс', key: 'image_url' },
                    { label: lang === 'ru' ? 'Ссылка (необяз.)' : 'Истинод (ихтиёрӣ)', key: 'link_url' },
                  ].map(({ label, key }) => (
                    <div key={key} style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                      <input value={(editBannerData[key as keyof AdBanner] as string) ?? ''} onChange={e => setEditBannerData(d => d ? { ...d, [key]: e.target.value } : d)} style={{ ...inputStyle, width: '100%' }} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lang === 'ru' ? 'Порядок' : 'Тартиб'}</label>
                      <input type="number" value={editBannerData.display_order} onChange={e => setEditBannerData(d => d ? { ...d, display_order: Number(e.target.value) } : d)} style={{ ...inputStyle, width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lang === 'ru' ? 'Активен' : 'Фаъол'}</label>
                      <input type="checkbox" checked={editBannerData.is_active ?? true} onChange={e => setEditBannerData(d => d ? { ...d, is_active: e.target.checked } : d)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setEditBannerData(null)} style={{ flex: 1, padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>{t('dashboard.cancel', lang)}</button>
                    <button onClick={handleEditBanner} disabled={bannerActionLoading} style={{ flex: 1, padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#fff', opacity: bannerActionLoading ? 0.6 : 1 }}>{t('dashboard.save', lang)}</button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete banner confirm */}
            {deleteBannerId && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setDeleteBannerId(null)}>
                <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '360px', margin: '16px' }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: '8px' }}>{lang === 'ru' ? 'Удалить баннер?' : 'Баннерро ҳазф кунед?'}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>{lang === 'ru' ? 'Это действие необратимо.' : 'Ин амал баргашт надорад.'}</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setDeleteBannerId(null)} style={{ flex: 1, padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>{t('dashboard.cancel', lang)}</button>
                    <button onClick={handleDeleteBanner} style={{ flex: 1, padding: '10px', background: 'var(--color-error)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#fff' }}>{lang === 'ru' ? 'Удалить' : 'Ҳазф'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════
            SYSTEM tab
        ════════════════════════════════════════════════ */}
        {tab === 'system' && (
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '20px' }}>{t('admin.system', lang)}</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              {[
                { label: t('admin.apiUrl', lang), value: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1' },
                { label: t('admin.environment', lang), value: process.env.NODE_ENV ?? 'development' },
                { label: t('admin.version', lang), value: '1.0.0' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--card)', borderRadius: '12px', padding: '18px 20px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</div>
                  <div style={{ fontSize: '13px', fontFamily: 'monospace', color: 'var(--text)', wordBreak: 'break-all' }}>{value}</div>
                </div>
              ))}
              {/* Stats overview */}
              {stats && (
                <>
                  {[
                    { label: t('admin.totalUsers', lang),    value: stats.total_users },
                    { label: t('admin.totalListings', lang), value: stats.total_listings },
                    { label: t('admin.totalDealers', lang),  value: stats.total_dealers },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: 'var(--card)', borderRadius: '12px', padding: '18px 20px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)' }}>{value.toLocaleString()}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mobile top nav (visible below 768px) */}
      <style>{`
        @media (max-width: 767px) {
          aside { width: 100% !important; height: auto !important; position: relative !important; flex-direction: row !important; overflow-x: auto !important; border-right: none !important; border-bottom: 1px solid var(--border) !important; }
          nav { display: flex !important; flex-direction: row !important; padding: 8px !important; overflow-x: auto !important; gap: 4px !important; }
          nav button { white-space: nowrap !important; flex-shrink: 0 !important; }
        }
        @media (max-width: 767px) {
          div[style*="flex: 1"][style*="overflowY: auto"][style*="padding: 24px"] { padding: 16px !important; }
        }
      `}</style>
    </div>
  )
}
