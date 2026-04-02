'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CarCard from '@/components/CarCard'
import ImageLightbox from '@/components/ImageLightbox'
import { listingsApi, usersApi, searchApi, favoritesApi, adminApi } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { useAuth } from '@/lib/AuthContext'
import { t } from '@/lib/i18n'
import StaffStatusRibbon from '@/components/StaffStatusRibbon'
import type { Listing, UserPublicProfile, RentalRules } from '@/types'

// ─── Spec Row (no emoji) ─────────────────────────────────────────────────────
interface SpecRowProps {
  icon: React.ReactNode
  label: string
  value: string
}

function SpecRow({ icon, label, value }: SpecRowProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '14px',
    }}>
      <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{value}</span>
    </div>
  )
}

// ─── SVG icons for spec rows ────────────────────────────────────────────────
const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const RoadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 17l3-10 6 5 6-5 3 10" />
  </svg>
)
const FuelIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 22V6a2 2 0 012-2h8a2 2 0 012 2v5" />
    <path d="M16 11h2a2 2 0 012 2v4a2 2 0 01-2 2h-2" />
    <line x1="4" y1="10" x2="14" y2="10" />
  </svg>
)
const GearIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
)
const ColorIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a10 10 0 000 20" fill="currentColor" opacity="0.15" />
  </svg>
)
const PinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
const EngineIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 10h10v4H7zM5 12h2m10 0h2m-11-2V8m10 2V8m-10 6v2m10-2v2" />
  </svg>
)
const DriveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /><path d="M7 17h10M9 17v-4h6v4" />
  </svg>
)
const TurbineIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
  </svg>
)
const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)
const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.5 1.18 2 2 0 012.5 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.75-.75a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.5z" />
  </svg>
)
const WhatsAppIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)
const CreditCardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="1" width="22" height="16" rx="2" />
    <line x1="1" y1="7" x2="23" y2="7" />
    <line x1="5" y1="12" x2="9" y2="12" />
  </svg>
)
const ShareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
)
const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill={filled ? 'var(--color-error)' : 'none'}
    stroke={filled ? 'var(--color-error)' : 'currentColor'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)

// ─── Staff Toolbar ────────────────────────────────────────────────────────────
interface StaffToolbarProps {
  listing: Listing
  onReject: () => void
  onBanUser: () => void
}

function StaffEditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function StaffRejectIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

function StaffBanIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  )
}

function StaffToolbar({ listing, onReject, onBanUser }: StaffToolbarProps) {
  const { lang } = useLang()
  return (
    <div style={{
      position: 'fixed',
      bottom: 'max(80px, calc(80px + env(safe-area-inset-bottom, 0px)))',
      right: 16,
      zIndex: 500,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      alignItems: 'flex-end',
    }}>
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 11,
        color: 'var(--text-muted)',
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}>
        {t('staff.staffActions', lang)}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <a
          href={`/admin/listings?id=${listing.id}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10,
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: 13, fontWeight: 600,
            textDecoration: 'none', cursor: 'pointer',
          }}
        >
          <StaffEditIcon />
          {t('staff.editListing', lang)}
        </a>
        {listing.status !== 'rejected' && (
          <button
            onClick={onReject}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              background: 'var(--color-error-dim)', border: '1px solid var(--color-error-border, rgba(239,68,68,0.3))',
              color: 'var(--color-error)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <StaffRejectIcon />
            {t('staff.rejectListing', lang)}
          </button>
        )}
        <button
          onClick={onBanUser}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10,
            background: 'var(--color-error-dim)', border: '1px solid var(--color-error-border, rgba(239,68,68,0.2))',
            color: 'var(--color-error)', fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <StaffBanIcon />
          {t('staff.banUser', lang)}
        </button>
      </div>
    </div>
  )
}

// ─── Rental Rules Card ───────────────────────────────────────────────────────
function RentalRulesCard({ rules, lang }: { rules: RentalRules; lang: 'ru' | 'tj' }) {
  function fuelPolicyLabel(policy: string) {
    if (policy === 'full_to_full') return t('rentalRules.fullToFull', lang)
    if (policy === 'free_tank') return t('rentalRules.freeTank', lang)
    return t('rentalRules.sameLevel', lang)
  }

  const items = [
    rules.min_age != null && {
      label: t('rentalRules.minAge', lang),
      value: `${rules.min_age} ${t('rentalRules.years', lang)}`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0116 0v2" />
        </svg>
      ),
    },
    rules.deposit != null && {
      label: t('rentalRules.deposit', lang),
      value: `${rules.deposit} ${rules.deposit_currency ?? 'USD'}`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    },
    rules.fuel_policy && {
      label: t('rentalRules.fuelPolicy', lang),
      value: fuelPolicyLabel(rules.fuel_policy),
      icon: <FuelIcon />,
    },
    rules.delivery_available != null && {
      label: t('rentalRules.delivery', lang),
      value: rules.delivery_available
        ? `${t('rentalRules.yes', lang)}${rules.delivery_price ? ` (${rules.delivery_price} USD)` : ''}`
        : t('rentalRules.no', lang),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 5v3h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
    },
    rules.max_km_per_day != null && {
      label: t('rentalRules.maxKm', lang),
      value: `${rules.max_km_per_day} ${t('rentalRules.kmPerDay', lang)}`,
      icon: <RoadIcon />,
    },
    rules.extra_km_price != null && {
      label: t('rentalRules.extraKm', lang),
      value: `$${rules.extra_km_price} ${t('rentalRules.perKm', lang)}`,
      icon: <RoadIcon />,
    },
    rules.insurance_included != null && {
      label: t('rentalRules.insurance', lang),
      value: rules.insurance_included ? t('rentalRules.yes', lang) : t('rentalRules.no', lang),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 2L3 7v6c0 5.25 3.75 10.15 9 11.25C17.25 23.15 21 18.25 21 13V7L12 2z" />
        </svg>
      ),
    },
  ].filter(Boolean) as Array<{ label: string; value: string; icon: React.ReactNode }>

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', marginTop: '28px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>
        {t('rentalRules.title', lang)}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item) => (
          <div key={item.label} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                {item.label}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>
      {rules.notes && (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '14px', padding: '12px', background: 'var(--surface)', borderRadius: '8px', lineHeight: 1.6, border: '1px solid var(--border)' }}>
          {rules.notes}
        </p>
      )}
    </div>
  )
}

// ─── Contact Modal ───────────────────────────────────────────────────────────
function ContactModal({
  listing,
  profile,
  lang,
  onClose,
}: {
  listing: Listing
  profile: UserPublicProfile
  lang: 'ru' | 'tj'
  onClose: () => void
}) {
  const contactName = listing.contact_name || profile.name || t('carDetailForm.seller', lang)
  const phone = listing.contact_phone || profile.phone
  const safeTelPhone = (phone ?? '').replace(/[^\d+\-() ]/g, '')
  const whatsapp = listing.whatsapp_number || profile.whatsapp_number || (listing.contact_phone ? listing.contact_phone : profile.phone)
  const waPhone = whatsapp?.replace(/\D/g, '')

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 400,
          animation: 'fadeIn 0.2s ease',
        }}
      />
      <div
        className="contact-modal-wrapper"
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 401,
          pointerEvents: 'none',
        }}
      >
      <div
        className="contact-modal"
        style={{
          pointerEvents: 'auto',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
            {t('contact.title', lang)}
          </h2>
          <button
            onClick={onClose}
            aria-label={t('contact.close', lang)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px 8px', display: 'flex', alignItems: 'center' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="13" y2="13" />
              <line x1="13" y1="1" x2="1" y2="13" />
            </svg>
          </button>
        </div>

        {/* Seller info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent)',
            color: 'var(--color-white)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: 800, flexShrink: 0,
          }}>
            {contactName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
              {contactName}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {profile.role}
            </div>
          </div>
        </div>

        {phone ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <a
              href={`tel:${safeTelPhone}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'var(--accent)',
                color: 'var(--color-white)',
                fontWeight: 700,
                fontSize: '15px',
                padding: '13px',
                borderRadius: '12px',
                textDecoration: 'none',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)' }}
            >
              <PhoneIcon />
              {phone}
            </a>

            {waPhone && (
              <a
                href={`https://wa.me/${waPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'var(--color-whatsapp)',
                  color: 'var(--color-white)',
                  fontWeight: 700,
                  fontSize: '15px',
                  padding: '13px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                }}
              >
                <WhatsAppIcon />
                {t('contact.whatsapp', lang)}
              </a>
            )}

            <Link
              href={`/users/${profile.id}/listings`}
              onClick={onClose}
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '11px',
                borderRadius: '12px',
                border: '1.5px solid var(--border)',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
            >
              {t('contact.allListings', lang)}
            </Link>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', padding: '20px 0' }}>
            {t('carDetail.phoneHidden', lang)}
          </p>
        )}
      </div>
      </div>
    </>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────
export default function CarDetailClient() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { lang } = useLang()
  const { user } = useAuth()
  const isStaff = user ? ['admin', 'moderator', 'manager', 'support'].includes(user.role) : false

  const [listing, setListing] = useState<Listing | null>(null)
  const [related, setRelated] = useState<Listing[]>([])
  const [sellerListings, setSellerListings] = useState<Listing[]>([])
  const [sellerProfile, setSellerProfile] = useState<UserPublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const [contactOpen, setContactOpen] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [favLoading, setFavLoading] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [shareCopied, setShareCopied] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const [staffRejectOpen, setStaffRejectOpen] = useState(false)
  const [staffRejectReason, setStaffRejectReason] = useState('')
  const [staffActionLoading, setStaffActionLoading] = useState(false)
  // Swipe tracking for the main gallery on mobile
  const touchStartX = useRef<number | null>(null)

  const fetchSellerData = useCallback(async (userId: string, currentId: string) => {
    try {
      const [profileRes, listingsRes] = await Promise.all([
        usersApi.getProfile(userId),
        usersApi.getListings(userId, 1),
      ])
      setSellerProfile(profileRes.data.data)
      setSellerListings(
        listingsRes.data.data.items.filter((l) => l.id !== currentId).slice(0, 4)
      )
    } catch {
      // non-fatal
    }
  }, [])

  async function handleFavoriteToggle() {
    if (!user) {
      router.push('/auth/login')
      return
    }
    if (!id || favLoading) return
    setFavLoading(true)
    try {
      const res = await favoritesApi.toggle(id)
      setFavorited(res.data.data.favorited)
    } catch {
      // silently ignore
    } finally {
      setFavLoading(false)
    }
  }

  async function handleShare() {
    const url = window.location.href
    const title = listing
      ? `${listing.brand} ${listing.model} ${listing.year}`
      : 'TAJCAR.TJ'
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {
        // user cancelled — ignore
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2500)
      } catch {
        // clipboard unavailable — silently ignore
      }
    }
  }

  const handleStaffReject = async () => {
    if (!listing || !staffRejectReason.trim()) return
    setStaffActionLoading(true)
    try {
      await adminApi.rejectListing(listing.id, staffRejectReason)
      setListing((prev: Listing | null) => prev ? { ...prev, status: 'rejected', rejection_reason: staffRejectReason } : prev)
      setStaffRejectOpen(false)
      setStaffRejectReason('')
    } catch {
      // ignore
    }
    setStaffActionLoading(false)
  }

  const handleStaffBanUser = async () => {
    if (!listing) return
    if (!window.confirm(t('staff.confirmBan', lang))) return
    setStaffActionLoading(true)
    try {
      await adminApi.banUser(listing.user_id, 'Banned by staff')
    } catch {
      // ignore
    }
    setStaffActionLoading(false)
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    listingsApi
      .get(id)
      .then((res) => {
        const data = res.data.data
        setListing(data)
        setFavorited(data.is_favorited ?? false)
        fetchSellerData(data.user_id, id)
        // Load recommendations separately — a failure here must not mark the listing as not found
        searchApi
          .recommendations(id)
          .then((recRes) => {
            const items = recRes.data.data.filter((l) => l.id !== id).slice(0, 4)
            setRelated(items)
          })
          .catch(() => {
            // Non-critical — recommendations unavailable
          })
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id, fetchSellerData])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>{t('common.loading', lang)}</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (notFound || !listing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '18px' }}>{t('carDetail.notFound', lang)}</p>
          <button onClick={() => router.back()} style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
            {t('common.back', lang)}
          </button>
        </main>
        <Footer />
      </div>
    )
  }

  const images = listing.images.length > 0
    ? [...listing.images].sort((a, b) => a.order_index - b.order_index)
    : null

  const formatPrice = (price: number, currency: string) => {
    const formatted = currency === 'USD' ? `$${Number(price).toLocaleString('ru-RU')}` : `${Number(price).toLocaleString('ru-RU')} ${t('common.tjs', lang)}`
    return listing.is_negotiable ? `${formatted} (${t('carDetail.negotiable', lang)})` : formatted
  }

  const specs: SpecRowProps[] = [
    { icon: <CalendarIcon />, label: t('carDetail.year', lang), value: String(listing.year) },
    ...(listing.mileage != null ? [{ icon: <RoadIcon />, label: t('carDetail.mileage', lang), value: `${listing.mileage.toLocaleString('ru-RU')} ${t('carDetail.km', lang)}` }] : []),
    ...(listing.fuel ? [{ icon: <FuelIcon />, label: t('carDetail.fuel', lang), value: listing.fuel }] : []),
    ...(listing.transmission ? [{ icon: <GearIcon />, label: t('carDetail.transmission', lang), value: listing.transmission }] : []),
    ...(listing.drive_type ? [{ icon: <DriveIcon />, label: t('carDetail.driveLabel', lang), value: listing.drive_type }] : []),
    ...(listing.engine_volume ? [{ icon: <EngineIcon />, label: t('carDetail.engineLabel', lang), value: listing.engine_volume }] : []),
    ...(listing.has_turbine !== null ? [{ icon: <TurbineIcon />, label: t('carDetail.turbineLabel', lang), value: listing.has_turbine ? t('carDetail.yesLabel', lang) : t('carDetail.noLabel', lang) }] : []),
    ...(listing.condition ? [{ icon: <RoadIcon />, label: t('carDetail.conditionLabel', lang), value: listing.condition }] : []),
    ...(listing.is_customs_cleared ? [{ icon: <ShieldIcon />, label: t('carDetail.customsCleared', lang), value: t('carDetail.yesLabel', lang) }] : []),
    ...(listing.taxi_license ? [{ icon: <RoadIcon />, label: t('carDetail.taxiLabel', lang), value: t('carDetail.yesLabel', lang) }] : []),
    ...(listing.color ? [{ icon: <ColorIcon />, label: t('carDetail.color', lang), value: listing.color }] : []),
    { icon: <PinIcon />, label: t('carDetail.city', lang), value: listing.city },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1, paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }} className="md:pb-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6" style={{ paddingTop: '28px', paddingBottom: '60px' }}>
          {/* Back */}
          <button
            onClick={() => router.back()}
            style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {t('common.back', lang)}
          </button>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left: images + specs */}
            <div style={{ flex: '1 1 60%', minWidth: 0 }}>
              {/* Main image — supports swipe on mobile */}
              <div
                style={{ position: 'relative', height: 'clamp(220px, 50vw, 400px)', borderRadius: '16px', overflow: 'hidden', background: 'var(--card)', border: '1px solid var(--border)', cursor: images ? 'zoom-in' : 'default', touchAction: 'pan-y' }}
                onClick={() => {
                  if (images) {
                    setLightboxIndex(activeImage)
                    setLightboxOpen(true)
                  }
                }}
                onTouchStart={(e) => {
                  touchStartX.current = e.touches[0].clientX
                }}
                onTouchEnd={(e) => {
                  if (touchStartX.current === null || !images) return
                  const dx = e.changedTouches[0].clientX - touchStartX.current
                  touchStartX.current = null
                  if (Math.abs(dx) < 40) return
                  if (dx < 0) {
                    // swipe left — next
                    setActiveImage((prev) => (prev + 1) % images.length)
                  } else {
                    // swipe right — previous
                    setActiveImage((prev) => (prev - 1 + images.length) % images.length)
                  }
                }}
              >
                {images ? (
                  <Image
                    src={images[activeImage].url}
                    alt={`${listing.brand} ${listing.model}`}
                    fill priority
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="gallery-img"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="1">
                      <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h10l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2h-2" />
                      <circle cx="7.5" cy="17" r="2.5" />
                      <circle cx="16.5" cy="17" r="2.5" />
                    </svg>
                  </div>
                )}

                {/* Staff status ribbon */}
                {isStaff && (
                  <StaffStatusRibbon listing={listing} size="md" />
                )}

                {/* Views badge */}
                <div style={{ position: 'absolute', bottom: '12px', right: '14px', background: 'rgba(0,0,0,0.6)', color: 'var(--color-white)', fontSize: '12px', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <EyeIcon />
                  {listing.views} {t('carDetail.views', lang)}
                </div>

                {/* Image counter dot indicator — mobile only */}
                {images && images.length > 1 && (
                  <div
                    className="md:hidden"
                    style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '5px', alignItems: 'center' }}
                  >
                    {images.map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: i === activeImage ? '16px' : '6px',
                          height: '6px',
                          borderRadius: '3px',
                          background: i === activeImage ? 'var(--color-white)' : 'rgba(255,255,255,0.45)',
                          transition: 'width 0.2s ease, background 0.2s ease',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {images && images.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide" style={{ paddingBottom: '4px' }}>
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      onClick={() => { setActiveImage(i); setLightboxIndex(i); setLightboxOpen(true) }}
                      aria-label={`Image ${i + 1}`}
                      aria-pressed={activeImage === i}
                      style={{
                        position: 'relative', width: '72px', height: '54px', borderRadius: '8px',
                        overflow: 'hidden', flexShrink: 0,
                        border: activeImage === i ? '2px solid var(--accent)' : '2px solid var(--border)',
                        cursor: 'pointer', background: 'var(--card)', padding: 0,
                        transition: 'border-color 0.15s ease',
                      }}
                    >
                      <Image src={img.url} alt={`Thumbnail ${i + 1}`} fill sizes="72px" style={{ objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
              )}

              {/* Specs grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ marginTop: '28px' }}>
                {specs.map((spec) => (
                  <SpecRow key={spec.label} {...spec} />
                ))}
              </div>

              {/* Rental rules */}
              {listing.type === 'rent' && listing.rental_rules && (
                <RentalRulesCard rules={listing.rental_rules} lang={lang} />
              )}

              {/* Description — collapsible on mobile (3-line preview) */}
              {listing.description && (
                <div style={{ marginTop: '28px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>
                    {t('carDetail.description', lang)}
                  </h3>
                  <div style={{ position: 'relative', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                    <p style={{
                      fontSize: '15px',
                      color: 'var(--text-muted)',
                      lineHeight: 1.7,
                      overflow: descExpanded ? 'visible' : 'hidden',
                      display: descExpanded ? 'block' : '-webkit-box',
                      WebkitLineClamp: descExpanded ? 'unset' : 3,
                      WebkitBoxOrient: 'vertical',
                    } as React.CSSProperties}>
                      {listing.description}
                    </p>
                    {listing.description.length > 180 && (
                      <button
                        onClick={() => setDescExpanded((v) => !v)}
                        style={{
                          marginTop: '8px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--accent)',
                          fontSize: '13px',
                          fontWeight: 700,
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {descExpanded ? t('carDetail.readLess', lang) : t('carDetail.readMore', lang)}
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          style={{ transition: 'transform 0.2s ease', transform: descExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        >
                          <path d="M2 4l4 4 4-4" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Video links */}
              {(listing.youtube_link || listing.tiktok_link) && (
                <div style={{ marginTop: '28px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>
                    {t('carDetailForm.video', lang)}
                  </h3>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {listing.youtube_link && (
                      <a href={listing.youtube_link} target="_blank" rel="noopener noreferrer" style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 16px', borderRadius: '10px',
                        background: 'var(--color-youtube, #FF0000)', color: 'var(--color-white)',
                        fontSize: '14px', fontWeight: 700, textDecoration: 'none',
                      }}>
                        YouTube
                      </a>
                    )}
                    {listing.tiktok_link && (
                      <a href={listing.tiktok_link} target="_blank" rel="noopener noreferrer" style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 16px', borderRadius: '10px',
                        background: 'var(--color-tiktok, #000000)', color: 'var(--color-white)',
                        fontSize: '14px', fontWeight: 700, textDecoration: 'none',
                      }}>
                        TikTok
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right: price + actions */}
            <div style={{ flex: '0 0 320px', maxWidth: '100%' }}>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', position: 'sticky', top: '110px' }}>
                {/* Badges */}
                <div className="flex gap-2 flex-wrap mb-4">
                  <span style={{
                    background: listing.type === 'sale' ? 'var(--accent)' : 'var(--color-info)',
                    color: 'var(--color-white)', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '4px', letterSpacing: '0.06em',
                  }}>
                    {listing.type === 'sale' ? t('badges.sale', lang) : t('badges.rent', lang)}
                  </span>
                  {listing.is_dealer_listing && (
                    <span style={{ background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '4px' }}>
                      {t('badges.dealer', lang)}
                    </span>
                  )}
                  {listing.availability === 'on_order' && (
                    <span style={{ background: 'var(--color-warning-dim)', color: 'var(--color-warning)', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '4px' }}>
                      {t('post.availability_on_order', lang)}
                    </span>
                  )}
                  {listing.availability === 'abroad' && (
                    <span style={{ background: 'var(--color-info-dim)', color: 'var(--color-info)', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '4px' }}>
                      {t('post.availability_abroad', lang)}
                    </span>
                  )}
                </div>

                <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px', lineHeight: 1.2 }}>
                  {listing.brand} {listing.model}
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  {listing.year}{listing.city ? ` · ${listing.city}` : ''}
                </p>

                <p style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent)', marginBottom: listing.prepayment_amount ? '4px' : '24px' }}>
                  {formatPrice(listing.price, listing.currency)}
                </p>

                {listing.prepayment_amount && (
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '24px' }}>
                    {t('carDetailForm.prepayment', lang)}: {listing.prepayment_amount.toLocaleString('ru-RU')} TJS
                  </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Contact seller */}
                  <button
                    onClick={() => setContactOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: 'var(--accent)',
                      color: 'var(--color-white)',
                      fontWeight: 700,
                      fontSize: '15px',
                      padding: '13px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-hover)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)' }}
                  >
                    <PhoneIcon />
                    {t('carDetail.contact', lang)}
                  </button>

                  {/* Favorite */}
                  <button
                    onClick={handleFavoriteToggle}
                    disabled={favLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: favorited ? 'var(--color-error-dim, rgba(239,68,68,0.1))' : 'var(--surface)',
                      color: favorited ? 'var(--color-error)' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '15px',
                      padding: '13px',
                      borderRadius: '12px',
                      border: favorited ? '1px solid rgba(239,68,68,0.35)' : '1px solid var(--border)',
                      cursor: favLoading ? 'not-allowed' : 'pointer',
                      opacity: favLoading ? 0.6 : 1,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <HeartIcon filled={favorited} />
                    {favorited ? t('favorites.remove', lang) : t('favorites.add', lang)}
                  </button>

                  {/* Share */}
                  <button
                    onClick={handleShare}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: shareCopied ? 'var(--color-success-dim)' : 'var(--surface)',
                      color: shareCopied ? 'var(--color-success)' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '15px',
                      padding: '13px',
                      borderRadius: '12px',
                      border: shareCopied ? '1px solid var(--color-success-border, rgba(22,163,74,0.35))' : '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!shareCopied) {
                        e.currentTarget.style.background = 'var(--card)'
                        e.currentTarget.style.borderColor = 'var(--border-strong)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!shareCopied) {
                        e.currentTarget.style.background = 'var(--surface)'
                        e.currentTarget.style.borderColor = 'var(--border)'
                      }
                    }}
                  >
                    <ShareIcon />
                    {shareCopied ? t('share.copied', lang) : t('share.btn', lang)}
                  </button>

                  {/* Installment */}
                  {listing.installment_available && (
                    <Link
                      href="/installment"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: 'var(--accent-dim)',
                        color: 'var(--accent)',
                        fontWeight: 700,
                        fontSize: '15px',
                        padding: '13px',
                        borderRadius: '12px',
                        border: '1px solid var(--accent)',
                        textDecoration: 'none',
                      }}
                    >
                      <CreditCardIcon />
                      {t('carDetail.installment', lang)}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Seller's other listings */}
          {sellerListings.length > 0 && (
            <section style={{ marginTop: '52px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                  {t('carDetail.sellerListings', lang)}
                </h2>
                <Link
                  href={`/users/${listing.user_id}/listings`}
                  style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {t('contact.allListings', lang)}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M2 6h8M6 2l4 4-4 4" />
                  </svg>
                </Link>
              </div>
              {/* Mobile: horizontal scroll; Desktop: grid */}
              <div
                className="scrollbar-hide sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4"
                style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}
              >
                {sellerListings.map((sl, i) => (
                  <div key={sl.id} style={{ flexShrink: 0, width: 'min(260px, 70vw)' }} className="sm:w-auto">
                    <CarCard listing={sl} lang={lang} className={`delay-${Math.min(i + 1, 8) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Related listings */}
          {related.length > 0 && (
            <section style={{ marginTop: '52px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '20px' }}>
                {t('carDetail.related', lang)}
              </h2>
              {/* Mobile: horizontal scroll; Desktop: grid */}
              <div
                className="scrollbar-hide sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4"
                style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}
              >
                {related.map((rel, i) => (
                  <div key={rel.id} style={{ flexShrink: 0, width: 'min(260px, 70vw)' }} className="sm:w-auto">
                    <CarCard listing={rel} lang={lang} className={`delay-${Math.min(i + 1, 8) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Mobile sticky CTA bar — replaces bottom nav on car detail (hidden for staff who use StaffToolbar) */}
      {listing && !isStaff && (
        <div
          className="md:hidden"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 200,
            background: 'var(--card)',
            borderTop: '1px solid var(--border)',
            padding: '10px 12px',
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
          }}
        >
          {/* Call button */}
          {(listing.contact_phone || sellerProfile?.phone) && (
            <a
              href={`tel:${(listing.contact_phone || sellerProfile?.phone || '').replace(/[^\d+\-() ]/g, '')}`}
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                background: 'var(--accent)',
                color: 'var(--color-white)',
                fontWeight: 700,
                fontSize: '14px',
                padding: '13px 10px',
                borderRadius: '12px',
                textDecoration: 'none',
                minHeight: '48px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              <PhoneIcon />
              {t('contact.call', lang)}
            </a>
          )}
          {/* WhatsApp button */}
          {(() => {
            const wa = listing.whatsapp_number || listing.contact_phone || sellerProfile?.phone
            const waNum = wa?.replace(/\D/g, '')
            if (!waNum) return null
            return (
              <a
                href={`https://wa.me/${waNum}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                  background: 'var(--color-whatsapp)',
                  color: 'var(--color-white)',
                  fontWeight: 700,
                  fontSize: '14px',
                  padding: '13px 10px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  minHeight: '48px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                <WhatsAppIcon />
                WhatsApp
              </a>
            )
          })()}
          {/* Fallback: if no phone at all, show modal button */}
          {!listing.contact_phone && !sellerProfile?.phone && (
            <button
              onClick={() => setContactOpen(true)}
              style={{
                flex: 1,
                background: 'var(--accent)',
                color: 'var(--color-white)',
                fontWeight: 700,
                fontSize: '14px',
                padding: '13px 10px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                minHeight: '48px',
              }}
            >
              {t('carDetail.contact', lang)}
            </button>
          )}
        </div>
      )}

      <Footer />

      {/* Staff toolbar */}
      {isStaff && listing && (
        <StaffToolbar
          listing={listing}
          onReject={() => setStaffRejectOpen(true)}
          onBanUser={handleStaffBanUser}
        />
      )}

      {/* Staff reject modal */}
      {staffRejectOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setStaffRejectOpen(false)}
        >
          <div
            style={{
              background: 'var(--card)', borderRadius: 16,
              padding: 24, width: '100%', maxWidth: 400,
              display: 'flex', flexDirection: 'column', gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
              {t('staff.rejectReason', lang)}
            </div>
            <textarea
              value={staffRejectReason}
              onChange={(e) => setStaffRejectReason(e.target.value)}
              rows={3}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 14px',
                color: 'var(--text)', fontSize: 14, resize: 'vertical',
                width: '100%',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setStaffRejectOpen(false)}
                style={{
                  padding: '8px 16px', borderRadius: 8,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {t('common.cancel', lang)}
              </button>
              <button
                onClick={handleStaffReject}
                disabled={staffActionLoading || !staffRejectReason.trim()}
                style={{
                  padding: '8px 16px', borderRadius: 8,
                  background: 'var(--color-error)', border: 'none',
                  color: 'var(--color-white)', fontSize: 13, fontWeight: 700,
                  cursor: staffActionLoading ? 'not-allowed' : 'pointer',
                  opacity: staffActionLoading || !staffRejectReason.trim() ? 0.6 : 1,
                }}
              >
                {t('staff.rejectListing', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image lightbox */}
      {images && (
        <ImageLightbox
          images={images.map((img) => img.url)}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* Contact modal */}
      {contactOpen && sellerProfile && (
        <ContactModal
          listing={listing}
          profile={sellerProfile}
          lang={lang}
          onClose={() => setContactOpen(false)}
        />
      )}
      {contactOpen && !sellerProfile && (
        <>
          <div onClick={() => setContactOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 400 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--card)', borderRadius: '20px', padding: '40px', zIndex: 401, color: 'var(--text-muted)' }}>
            {t('common.loading', lang)}
          </div>
        </>
      )}
    </div>
  )
}
