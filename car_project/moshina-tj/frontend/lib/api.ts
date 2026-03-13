import axios from 'axios'
import Cookies from 'js-cookie'
import type {
  ApiResponse,
  AuthData,
  PaginatedListings,
  Listing,
  User,
  Dealer,
  UserPublicProfile,
  AdminStats,
} from '@/types'

export interface ModerationSession {
  id: string
  moderator_id: string
  started_at: string
  ended_at: string | null
  approved_count: number
  rejected_count: number
  skipped_count: number
  limit: number
  is_active: boolean
}

export interface ModeratorActivity {
  user_id: string
  name: string | null
  phone: string
  posts_today: number
  posts_last_30min: number
  sessions_today: number
  has_active_session: boolean
  active_since: string | null
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  const token = Cookies.get('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export interface ListingFilters {
  type?: string
  city?: string
  brand?: string
  model?: string
  min_price?: number
  max_price?: number
  min_year?: number
  max_year?: number
  fuel?: string
  transmission?: string
  color?: string
  max_mileage?: number
  installment?: boolean
  sort?: string
  page?: number
  limit?: number
}

export const listingsApi = {
  list: (filters: ListingFilters) =>
    api.get<ApiResponse<PaginatedListings>>('/listings', { params: filters }),
  featured: () =>
    api.get<ApiResponse<Listing[]>>('/listings/featured'),
  get: (id: string) =>
    api.get<ApiResponse<Listing>>(`/listings/${id}`),
  create: (data: object) =>
    api.post<ApiResponse<Listing>>('/listings', data),
  update: (id: string, data: Partial<Listing>) =>
    api.put<ApiResponse<Listing>>(`/listings/${id}`, data),
  remove: (id: string) =>
    api.delete<ApiResponse<null>>(`/listings/${id}`),
  deactivate: (id: string) =>
    api.put<ApiResponse<Listing>>(`/listings/${id}/deactivate`),
  activate: (id: string) =>
    api.put<ApiResponse<Listing>>(`/listings/${id}/activate`),
}

export const authApi = {
  login: (phone: string, password: string) =>
    api.post<ApiResponse<AuthData>>('/auth/login', { phone, password }),
  register: (phone: string, name: string, password: string) =>
    api.post<ApiResponse<AuthData>>('/auth/register', { phone, name, password }),
  me: () =>
    api.get<ApiResponse<User>>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put<ApiResponse<null>>('/auth/change-password', { current_password: currentPassword, new_password: newPassword }),
  updateProfile: (data: { name?: string; phone?: string; email?: string }) =>
    api.put<ApiResponse<User>>('/auth/profile', data),
}

export const dealersApi = {
  list: () =>
    api.get<ApiResponse<Dealer[]>>('/dealers'),
  get: (id: string) =>
    api.get<ApiResponse<{ dealer: Dealer; listings: Listing[] }>>(`/dealers/${id}`),
}

export const searchApi = {
  query: (q: string) =>
    api.get<ApiResponse<Listing[]>>('/search', { params: { q } }),
  suggestions: (q: string) =>
    api.get<ApiResponse<string[]>>('/search/suggestions', { params: { q } }),
  didYouMean: (q: string) =>
    api.get<ApiResponse<string | null>>('/search/did-you-mean', { params: { q } }),
  recommendations: (listingId?: string) =>
    api.get<ApiResponse<Listing[]>>('/search/recommendations', {
      params: listingId ? { listing_id: listingId } : {},
    }),
}

export const uploadApi = {
  image: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<ApiResponse<{ url: string; cloudinary_id: string }>>(
      '/upload/image',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  },
}

export const usersApi = {
  getProfile: (userId: string) =>
    api.get<ApiResponse<UserPublicProfile>>(`/users/${userId}/profile`),
  getListings: (userId: string, page = 1) =>
    api.get<ApiResponse<PaginatedListings>>(`/users/${userId}/listings`, { params: { page } }),
}

export const adminApi = {
  // Stats
  getStats: () =>
    api.get<ApiResponse<AdminStats>>('/admin/stats'),

  // Users
  getUsers: (page = 1, role?: string, search?: string, is_banned?: boolean) =>
    api.get<ApiResponse<{ items: User[]; total: number; page: number; pages: number }>>(
      '/admin/users',
      { params: { page, role: role || undefined, search: search || undefined, is_banned } }
    ),
  getUserDetail: (userId: string) =>
    api.get<ApiResponse<{ user: User; listing_counts: Record<string, number>; dealer: Dealer | null }>>(`/admin/users/${userId}`),
  updateUserRole: (userId: string, role: string) =>
    api.put<ApiResponse<User>>(`/admin/users/${userId}/role`, { role }),
  banUser: (userId: string, reason?: string) =>
    api.put<ApiResponse<User>>(`/admin/users/${userId}/ban`, { reason }),
  unbanUser: (userId: string) =>
    api.put<ApiResponse<User>>(`/admin/users/${userId}/unban`),
  deleteUser: (userId: string) =>
    api.delete<ApiResponse<null>>(`/admin/users/${userId}`),

  // Listings
  getListings: (listing_status?: string, page = 1, search?: string) =>
    api.get<ApiResponse<PaginatedListings>>('/admin/listings', { params: { listing_status: listing_status || undefined, page, search: search || undefined } }),
  activateListing: (id: string) =>
    api.put<ApiResponse<Listing>>(`/admin/listings/${id}/activate`),
  deactivateListing: (id: string) =>
    api.put<ApiResponse<Listing>>(`/admin/listings/${id}/deactivate`),

  // Moderation
  getPendingListings: (page = 1, limit = 10, claim = false) =>
    api.get<ApiResponse<PaginatedListings>>('/admin/moderation/pending', { params: { page, limit, claim } }),
  approveListing: (id: string) =>
    api.put<ApiResponse<Listing>>(`/admin/moderation/${id}/approve`),
  rejectListing: (id: string, reason: string) =>
    api.put<ApiResponse<Listing>>(`/admin/moderation/${id}/reject`, { reason }),
  skipListing: (id: string) =>
    api.post<ApiResponse<null>>(`/admin/moderation/${id}/skip`),

  // Moderation sessions
  startSession: (filters?: { timer_minutes?: number | null; filter_date_from?: string | null; filter_date_to?: string | null; filter_type?: string | null; filter_city?: string | null; filter_brand?: string | null }) =>
    api.post<ApiResponse<ModerationSession>>('/admin/moderation/session/start', filters ?? {}),
  endSession: (autoEnded = false) =>
    api.post<ApiResponse<ModerationSession>>(`/admin/moderation/session/end?auto_ended=${autoEnded}`),
  getModeratorStats: () =>
    api.get<ApiResponse<any>>('/admin/moderation/stats'),
  getSessionHistory: () =>
    api.get<ApiResponse<any[]>>('/admin/moderation/session/history'),
  getActiveSession: () =>
    api.get<ApiResponse<ModerationSession | null>>('/admin/moderation/session/active'),

  // Moderator inline edit
  moderatorEditListing: async (id: string, patch: { brand?: string; model?: string; description?: string }) => {
    const token = Cookies.get('token')
    const res = await fetch(`${BASE_URL}/admin/moderation/${id}/edit`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(patch),
    })
    return res.json()
  },

  // Moderator activity
  getModeratorActivity: () =>
    api.get<ApiResponse<ModeratorActivity[]>>('/admin/moderator-activity'),

  // Dealers
  getDealers: (page = 1, verified?: boolean) =>
    api.get<ApiResponse<{ items: Dealer[]; total: number; page: number; pages: number }>>(
      '/admin/dealers',
      { params: { page, verified } }
    ),
  verifyDealer: (dealerId: string) =>
    api.put<ApiResponse<Dealer>>(`/admin/dealers/${dealerId}/verify`),
  unverifyDealer: (dealerId: string) =>
    api.put<ApiResponse<Dealer>>(`/admin/dealers/${dealerId}/unverify`),
}

export default api
