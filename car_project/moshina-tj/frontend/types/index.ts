export type Lang = 'ru' | 'tj'
export type ListingType = 'sale' | 'rent'
export type Currency = 'USD' | 'TJS'
export type UserRole = 'user' | 'dealer' | 'admin' | 'moderator' | 'manager' | 'support'
export type FuelType = 'Бензин' | 'Дизель' | 'Газ' | 'Электро' | 'Гибрид'
export type TransmissionType = 'Автомат' | 'Механика' | 'Вариатор'

export interface ListingImage {
  id: string
  url: string
  is_primary: boolean
  order_index: number
}

export interface RentalRules {
  min_age?: number
  deposit?: number
  deposit_currency?: string
  fuel_policy?: 'full_to_full' | 'free_tank' | 'same_level'
  delivery_available?: boolean
  delivery_price?: number
  max_km_per_day?: number
  extra_km_price?: number
  insurance_included?: boolean
  notes?: string
}

export type ListingStatus = 'pending' | 'active' | 'rejected' | 'draft'

export interface Listing {
  id: string
  user_id: string
  type: ListingType
  brand: string
  model: string
  year: number
  price: number
  currency: Currency
  mileage: number | null
  fuel: FuelType | null
  transmission: TransmissionType | null
  color: string | null
  city: string
  description: string | null
  installment_available: boolean
  is_dealer_listing: boolean
  is_active: boolean
  status: ListingStatus
  rejection_reason: string | null
  moderator_note: string | null
  moderated_by: string | null
  views: number
  created_at: string
  updated_at: string
  images: ListingImage[]
  rental_rules?: RentalRules
  is_favorited?: boolean
  favorites_count?: number
  user_name?: string | null
}

export interface PaginatedListings {
  items: Listing[]
  total: number
  page: number
  pages: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pages: number
}

export interface User {
  id: string
  phone: string
  name: string | null
  email: string | null
  role: UserRole
  avatar_url: string | null
  is_banned: boolean
  ban_reason?: string | null
  created_at: string
}

export interface UserPublicProfile {
  id: string
  name?: string
  role: UserRole
  avatar_url?: string
  created_at: string
  listing_count: number
  phone?: string
}

export interface Dealer {
  id: string
  user_id: string
  business_name: string
  city: string | null
  address: string | null
  phone: string | null
  logo_url: string | null
  description: string | null
  verified: boolean
  created_at: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
}

export interface AuthToken {
  access_token: string
  token_type: string
}

export interface AuthData {
  token: AuthToken
  user: User
}

export interface AdminStats {
  total_users: number
  total_listings: number
  active_listings: number
  total_dealers: number
  pending_listings: number
}

export interface AuditLog {
  id: string
  actor_id: string | null
  actor_name: string | null
  action: string
  target_type: string | null
  target_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export interface ManagerStatsPeriod {
  new_users: number
  new_listings: number
  approved: number
  rejected: number
}

export interface ManagerStats {
  today: ManagerStatsPeriod
  week: ManagerStatsPeriod
  month: ManagerStatsPeriod
  total: {
    users: number
    listings: number
    active: number
    pending: number
    rejected: number
    dealers: number
  }
}

export interface SupportStats {
  total_users: number
  banned_users: number
  total_listings: number
  active_listings: number
  pending_listings: number
  rejected_listings: number
  total_dealers: number
  verified_dealers: number
  today_new_users: number
  today_new_listings: number
}

export interface SessionHistoryItem {
  session_id: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  posts_approved: number
  posts_rejected: number
  posts_skipped: number
  total: number
  is_active: boolean
  auto_ended: boolean
  timer_minutes: number | null
  filters: {
    date_from: string | null
    date_to: string | null
    type: string | null
    city: string | null
    brand: string | null
  }
}

export interface ListingAnalytics {
  top_brands: { brand: string; count: number }[]
  top_cities: { city: string; count: number }[]
  by_fuel: { fuel: string | null; count: number }[]
  by_type: { type: string | null; count: number }[]
}
