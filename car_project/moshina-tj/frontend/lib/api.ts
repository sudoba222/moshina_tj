import axios from 'axios'
import type {
  ApiResponse,
  AuditLog,
  AuthData,
  ListingAnalytics,
  ManagerStats,
  PaginatedListings,
  Listing,
  SessionHistoryItem,
  SupportStats,
  User,
  Dealer,
  UserPublicProfile,
  AdminStats,
  PaginatedResponse,
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
  timer_minutes: number | null
  is_active: boolean
}

export interface ModeratorActivity {
  moderator_id: string
  moderator_name: string | null
  phone: string
  is_online: boolean
  posts_today: number
  posts_last_30min: number
  sessions_today: number
  active_session_started_at: string | null
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

// In-memory token store — avoids reading from js-cookie on every request
let _inMemoryToken: string | null = null
export function setInMemoryToken(t: string | null) { _inMemoryToken = t }
export function getInMemoryToken() { return _inMemoryToken }

const api = axios.create({ baseURL: BASE_URL, withCredentials: true })

api.interceptors.request.use((config) => {
  if (_inMemoryToken) config.headers.Authorization = `Bearer ${_inMemoryToken}`
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
  // ── Phone (OTP) ────────────────────────────────────────────────────────────
  login: (phone: string, password: string) =>
    api.post<ApiResponse<AuthData>>('/auth/login', { phone, password }),
  register: (phone: string, name: string, password: string) =>
    api.post<ApiResponse<AuthData>>('/auth/register', { phone, name, password }),
  sendOtp: (phone: string) =>
    api.post<ApiResponse<{ dev_code?: string }>>('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, code: string, name?: string, password?: string) =>
    api.post<ApiResponse<AuthData>>('/auth/verify-otp', { phone, code, name, password }),

  // ── Email ──────────────────────────────────────────────────────────────────
  registerEmail: (email: string, name: string, password: string) =>
    api.post<ApiResponse<{ dev_code?: string }>>('/auth/register-email', { email, name, password }),
  loginEmail: (email: string, password: string) =>
    api.post<ApiResponse<AuthData>>('/auth/login-email', { email, password }),
  verifyEmailOtp: (email: string, code: string) =>
    api.post<ApiResponse<AuthData>>('/auth/verify-email-otp', { email, code }),
  resendEmailOtp: (email: string) =>
    api.post<ApiResponse<{ dev_code?: string }>>('/auth/resend-email-otp', { email }),

  // ── Social / OAuth ─────────────────────────────────────────────────────────
  googleLogin: (idToken: string) =>
    api.post<ApiResponse<AuthData>>('/auth/google', { id_token: idToken }),
  appleLogin: (identityToken: string, name?: string) =>
    api.post<ApiResponse<AuthData>>('/auth/apple', { identity_token: identityToken, name }),
  sendOtpTelegram: (phone: string) =>
    api.post<ApiResponse<{ deep_link: string }>>('/auth/send-otp-telegram', { phone }),

  // ── Profile ────────────────────────────────────────────────────────────────
  me: (token?: string) =>
    token
      ? api.get<ApiResponse<User>>('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      : api.get<ApiResponse<User>>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put<ApiResponse<null>>('/auth/change-password', { current_password: currentPassword, new_password: newPassword }),
  updateProfile: (data: { name?: string; phone?: string; email?: string; whatsapp_number?: string | null }, token?: string) =>
    token
      ? api.put<ApiResponse<User>>('/auth/profile', data, { headers: { Authorization: `Bearer ${token}` } })
      : api.put<ApiResponse<User>>('/auth/profile', data),
  forgotPassword: (identifier: string) =>
    api.post<ApiResponse<{ dev_code?: string }>>('/auth/forgot-password', { identifier }),
  forgotPasswordTelegram: (identifier: string) =>
    api.post<ApiResponse<{ available: boolean; dev_code?: string }>>('/auth/forgot-password-telegram', { identifier }),
  resetPassword: (identifier: string, code: string, newPassword: string) =>
    api.post<ApiResponse<null>>('/auth/reset-password', { identifier, code, new_password: newPassword }),
  logout: () =>
    api.post<ApiResponse<null>>('/auth/logout'),
}

export const dealersApi = {
  list: () =>
    api.get<ApiResponse<Dealer[]>>('/dealers'),
  get: (id: string) =>
    api.get<ApiResponse<{ dealer: Dealer; listings: Listing[] }>>(`/dealers/${id}`),
}

export interface SuggestionItem {
  term: string
  type: 'brand' | 'model' | 'city'
  count: number
}

export interface TrendingData {
  brands: { term: string; count: number }[]
  cities: { term: string; count: number }[]
}

export const searchApi = {
  query: (q: string) =>
    api.get<ApiResponse<Listing[]>>('/search', { params: { q } }),
  suggestions: (q: string) =>
    api.get<ApiResponse<SuggestionItem[]>>('/search/suggestions', { params: { q } }),
  didYouMean: (q: string) =>
    api.get<ApiResponse<string | null>>('/search/did-you-mean', { params: { q } }),
  recommendations: (listingId?: string) =>
    api.get<ApiResponse<Listing[]>>('/search/recommendations', {
      params: listingId ? { listing_id: listingId } : {},
    }),
  popular: () =>
    api.get<ApiResponse<string[]>>('/search/popular'),
  trending: () =>
    api.get<ApiResponse<TrendingData>>('/search/trending'),
  logSearch: (query: string, results_count: number) =>
    api.post<ApiResponse<null>>('/search/log', { query, results_count }).catch(() => {}),
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
  createUser: (data: { phone: string; name?: string; password: string; role: string }) =>
    api.post<ApiResponse<User>>('/admin/users', data),
  editUser: (userId: string, data: { name?: string; phone?: string; email?: string }) =>
    api.put<ApiResponse<User>>(`/admin/users/${userId}`, data),

  // Listings
  getListings: (listing_status?: string, page = 1, search?: string) =>
    api.get<ApiResponse<PaginatedListings>>('/admin/listings', { params: { listing_status: listing_status || undefined, page, search: search || undefined } }),
  activateListing: (id: string) =>
    api.put<ApiResponse<Listing>>(`/admin/listings/${id}/activate`),
  deactivateListing: (id: string) =>
    api.put<ApiResponse<Listing>>(`/admin/listings/${id}/deactivate`),
  editListing: (id: string, data: {
    brand?: string; model?: string; year?: number; price?: number; currency?: string;
    city?: string; mileage?: number; fuel?: string; transmission?: string;
    color?: string; description?: string; installment_available?: boolean; status?: string;
  }) =>
    api.put<ApiResponse<Listing>>(`/admin/listings/${id}`, data),
  deleteListing: (id: string) =>
    api.delete<ApiResponse<null>>(`/admin/listings/${id}`),

  // Moderation
  getPendingListings: (page = 1, limit = 10, claim = false) =>
    api.get<ApiResponse<PaginatedListings>>('/admin/moderation/pending', { params: { page, limit, claim } }),
  approveListing: (id: string) =>
    api.put<ApiResponse<Listing>>(`/admin/moderation/${id}/approve`),
  rejectListing: (id: string, reason: string) =>
    api.put<ApiResponse<Listing>>(`/admin/moderation/${id}/reject`, { reason }),
  // Moderation sessions
  startSession: (filters?: { timer_minutes?: number | null; filter_date_from?: string | null; filter_date_to?: string | null; filter_type?: string | null; filter_city?: string | null; filter_brand?: string | null }) =>
    api.post<ApiResponse<ModerationSession>>('/admin/moderation/session/start', filters ?? {}),
  endSession: (autoEnded = false) =>
    api.post<ApiResponse<ModerationSession>>(`/admin/moderation/session/end?auto_ended=${autoEnded}`),
  getModeratorStats: () =>
    api.get<ApiResponse<Record<string, unknown>>>('/admin/moderation/stats'),
  getActiveSession: () =>
    api.get<ApiResponse<ModerationSession | null>>('/admin/moderation/session/active'),

  // Moderator inline edit (expanded fields)
  moderatorEditListing: async (id: string, patch: {
    brand?: string; model?: string; description?: string;
    price?: number; currency?: string; year?: number; city?: string;
    mileage?: number; fuel?: string; transmission?: string; color?: string;
  }) => {
    const res = await fetch(`${BASE_URL}/admin/moderation/${id}/edit`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(_inMemoryToken ? { Authorization: `Bearer ${_inMemoryToken}` } : {}),
      },
      body: JSON.stringify(patch),
    })
    return res.json()
  },

  // Skip with reason
  skipListing: (id: string, reason?: string) =>
    api.post<ApiResponse<null>>(`/admin/moderation/${id}/skip`, { reason }),

  // Moderator note
  addModeratorNote: (id: string, note: string) =>
    api.post<ApiResponse<{ listing_id: string; note: string }>>(`/admin/moderation/${id}/note`, { note }),

  // Bulk moderation
  bulkApproveListings: (listing_ids: string[]) =>
    api.post<ApiResponse<{ approved: number }>>('/admin/moderation/bulk-approve', { listing_ids }),
  bulkRejectListings: (listing_ids: string[], reason: string) =>
    api.post<ApiResponse<{ rejected: number }>>('/admin/moderation/bulk-reject', { listing_ids, reason }),

  // Audit logs
  getAuditLogs: (page = 1, action?: string, target_type?: string) =>
    api.get<ApiResponse<{ items: AuditLog[]; total: number; page: number; pages: number }>>(
      '/admin/audit-logs',
      { params: { page, action: action || undefined, target_type: target_type || undefined } }
    ),

  // Manager trend stats
  getManagerStats: () =>
    api.get<ApiResponse<ManagerStats>>('/admin/manager/stats'),

  // Support stats
  getSupportStats: () =>
    api.get<ApiResponse<SupportStats>>('/admin/support/stats'),

  // Listing analytics
  getListingStats: () =>
    api.get<ApiResponse<ListingAnalytics>>('/admin/listings/stats'),

  // Moderator activity
  getModeratorActivity: () =>
    api.get<ApiResponse<ModeratorActivity[]>>('/admin/moderator-activity'),

  // Session history (typed)
  getSessionHistory: () =>
    api.get<ApiResponse<SessionHistoryItem[]>>('/admin/moderation/session/history'),

  // Last N listings by a given user (for author context panel)
  getUserListings: (userId: string, limit = 5) =>
    api.get<ApiResponse<PaginatedListings>>('/admin/listings', { params: { user_id: userId, limit } }),

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
  updateDealer: (dealerId: string, data: { max_ads_allowed?: number }) =>
    api.patch<ApiResponse<Dealer>>(`/admin/dealers/${dealerId}`, data),
}

// ─── Chat / Conversations ────────────────────────────────────────────────────
export interface ConversationItem {
  id: string
  type: 'direct' | 'support'
  other_participant: { id: string; name: string | null; avatar_url: string | null } | null
  listing: { id: string; brand: string; model: string; year: number; price: number; image_url: string | null } | null
  last_message: { content: string; created_at: string; is_mine: boolean } | null
  unread_count: number
  updated_at: string
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string | null
  content: string
  is_read: boolean
  created_at: string
}

export interface NotificationItem {
  id: string
  type: 'message' | 'price_drop' | 'dealer_post' | 'system'
  title: string
  body: string
  link: string | null
  is_read: boolean
  created_at: string
}

export const chatApi = {
  listConversations: () =>
    api.get<ApiResponse<ConversationItem[]>>('/conversations'),
  createOrGet: (data: { participant_id?: string; listing_id?: string; type?: string }) =>
    api.post<ApiResponse<ConversationItem>>('/conversations', data),
  getMessages: (convId: string, page = 1) =>
    api.get<ApiResponse<PaginatedResponse<ChatMessage>>>(`/conversations/${convId}/messages`, { params: { page, limit: 30 } }),
  sendMessage: (convId: string, content: string) =>
    api.post<ApiResponse<ChatMessage>>(`/conversations/${convId}/messages`, { content }),
  markRead: (convId: string) =>
    api.put<ApiResponse<null>>(`/conversations/${convId}/read`),
}

export const notificationsApi = {
  list: (page = 1) =>
    api.get<ApiResponse<PaginatedResponse<NotificationItem>>>('/notifications', { params: { page, limit: 20 } }),
  unreadCount: () =>
    api.get<ApiResponse<{ count: number }>>('/notifications/unread-count'),
  markRead: (id: string) =>
    api.put<ApiResponse<null>>(`/notifications/${id}/read`),
  markAllRead: () =>
    api.put<ApiResponse<null>>('/notifications/read-all'),
}

export const subscriptionsApi = {
  toggle: (dealerId: string) =>
    api.post<ApiResponse<{ subscribed: boolean; count: number }>>(`/dealers/${dealerId}/subscribe`),
  check: (dealerId: string) =>
    api.get<ApiResponse<{ subscribed: boolean }>>(`/dealers/${dealerId}/subscription`),
  feed: (page = 1) =>
    api.get<ApiResponse<PaginatedListings>>('/subscriptions/feed', { params: { page } }),
}

export const favoritesApi = {
  toggle: (listingId: string) =>
    api.post<ApiResponse<{ favorited: boolean }>>(`/listings/${listingId}/favorite`),
  list: (page = 1) =>
    api.get<ApiResponse<PaginatedResponse<Listing>>>(`/users/me/favorites?page=${page}`),
}

export interface CarBrand {
  id: string
  name: string
  slug: string
  logo_url: string | null
  country: string | null
  is_popular: boolean
  is_active?: boolean
  model_count?: number
}

export interface CarModelItem {
  id: string
  name: string
  brand_id?: string
  generation_count?: number
}

export interface CarCategory {
  id: string
  name_ru: string
  name_tj: string
  slug: string
  icon_url: string | null
  description_ru: string | null
  description_tj: string | null
  filter_config: Record<string, unknown> | null
  display_order: number
  is_active?: boolean
}

export interface AdBanner {
  id: string
  title_ru: string
  title_tj: string
  subtitle_ru: string | null
  subtitle_tj: string | null
  image_url: string
  link_url: string | null
  is_active?: boolean
  display_order: number
}

export const catalogApi = {
  getBrands: (popular_only = false, search?: string) =>
    api.get<ApiResponse<CarBrand[]>>('/catalog/brands', { params: { popular_only, search: search || undefined } }),
  getModels: (brandId: string) =>
    api.get<ApiResponse<CarModelItem[]>>(`/catalog/brands/${brandId}/models`),
  getCategories: () =>
    api.get<ApiResponse<CarCategory[]>>('/catalog/categories'),

  // Admin
  adminGetBrands: (page = 1, search?: string) =>
    api.get<ApiResponse<{ items: CarBrand[]; total: number; page: number; pages: number }>>('/catalog/admin/brands', { params: { page, search: search || undefined } }),
  adminCreateBrand: (data: { name: string; slug: string; country?: string; logo_url?: string; is_popular?: boolean }) =>
    api.post<ApiResponse<CarBrand>>('/catalog/admin/brands', data),
  adminUpdateBrand: (id: string, data: Partial<CarBrand>) =>
    api.put<ApiResponse<CarBrand>>(`/catalog/admin/brands/${id}`, data),
  adminDeleteBrand: (id: string) =>
    api.delete<ApiResponse<null>>(`/catalog/admin/brands/${id}`),
  adminGetModels: (brandId: string, page = 1, search?: string) =>
    api.get<ApiResponse<{ items: CarModelItem[]; total: number; page: number; pages: number }>>(
      `/catalog/admin/brands/${brandId}/models`,
      { params: { page, search: search || undefined } }
    ),
  adminAddModel: (brandId: string, name: string) =>
    api.post<ApiResponse<CarModelItem>>(`/catalog/admin/brands/${brandId}/models`, { name }),
  adminUpdateModel: (brandId: string, modelId: string, name: string) =>
    api.put<ApiResponse<CarModelItem>>(`/catalog/admin/brands/${brandId}/models/${modelId}`, { name }),
  adminDeleteModel: (brandId: string, modelId: string) =>
    api.delete<ApiResponse<null>>(`/catalog/admin/brands/${brandId}/models/${modelId}`),

  adminGetCategories: () =>
    api.get<ApiResponse<CarCategory[]>>('/catalog/admin/categories'),
  adminCreateCategory: (data: Partial<CarCategory>) =>
    api.post<ApiResponse<CarCategory>>('/catalog/admin/categories', data),
  adminUpdateCategory: (id: string, data: Partial<CarCategory>) =>
    api.put<ApiResponse<CarCategory>>(`/catalog/admin/categories/${id}`, data),
  adminDeleteCategory: (id: string) =>
    api.delete<ApiResponse<null>>(`/catalog/admin/categories/${id}`),

  // Banners
  getBanners: () =>
    api.get<ApiResponse<AdBanner[]>>('/catalog/banners'),
  adminGetBanners: () =>
    api.get<ApiResponse<AdBanner[]>>('/catalog/admin/banners'),
  adminCreateBanner: (data: Omit<AdBanner, 'id' | 'is_active'>) =>
    api.post<ApiResponse<AdBanner>>('/catalog/admin/banners', data),
  adminUpdateBanner: (id: string, data: Partial<AdBanner>) =>
    api.put<ApiResponse<AdBanner>>(`/catalog/admin/banners/${id}`, data),
  adminDeleteBanner: (id: string) =>
    api.delete<ApiResponse<null>>(`/catalog/admin/banners/${id}`),
}

// ─── Admin Listings (detail view with logs) ──────────────────────────────────
export interface AdminListingItem {
  id: string
  brand: string
  model: string
  year: number
  price: number
  city: string
  status: string
  is_active: boolean
  created_at: string
  updated_at: string
  user: { id: string; name: string | null; phone: string | null; email: string | null }
  primary_image_url: string | null
  last_log: { action: string; actor_name: string | null; reason: string | null; created_at: string } | null
}

export interface AdminListingLog {
  id: string
  action: string
  actor_name: string | null
  from_status: string | null
  to_status: string | null
  reason: string | null
  created_at: string
}

export interface AdminListingDetail extends AdminListingItem {
  logs: AdminListingLog[]
}

export const adminListingsApi = {
  list: (params: { status?: string; search?: string; brand?: string; city?: string; page?: number }) =>
    api.get<ApiResponse<PaginatedResponse<AdminListingItem>>>('/admin/listings', { params }),
  getDetail: (id: string) =>
    api.get<ApiResponse<AdminListingDetail>>('/admin/listings/' + id),
}

export default api
