'use client'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { Listing } from '@/types'

const STAFF_ROLES = new Set(['admin', 'moderator', 'manager', 'support'])

interface StaffStatusRibbonProps {
  listing: Pick<Listing, 'status' | 'rejection_reason' | 'moderator_note'>
  moderatorName?: string | null
  size?: 'sm' | 'md'
}

const STATUS_BG: Record<string, string> = {
  active:   'rgba(34, 197, 94, 0.85)',
  pending:  'rgba(234, 179, 8, 0.85)',
  rejected: 'rgba(239, 68, 68, 0.85)',
  draft:    'rgba(100, 116, 139, 0.85)',
}

function ActiveIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function PendingIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function RejectedIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function DraftIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  active:   <ActiveIcon />,
  pending:  <PendingIcon />,
  rejected: <RejectedIcon />,
  draft:    <DraftIcon />,
}

export default function StaffStatusRibbon({ listing, moderatorName, size = 'sm' }: StaffStatusRibbonProps) {
  const { user } = useAuth()
  const { lang } = useLang()

  if (!user || !STAFF_ROLES.has(user.role)) return null

  const status = listing.status ?? 'pending'
  const bg = STATUS_BG[status] ?? STATUS_BG.pending
  const pad = size === 'sm' ? '3px 7px' : '5px 10px'
  const fontSize = size === 'sm' ? '10px' : '12px'

  const label = (() => {
    switch (status) {
      case 'active':   return t('staff.statusActive', lang)
      case 'pending':  return t('staff.statusPending', lang)
      case 'rejected': return t('staff.statusRejected', lang)
      case 'draft':    return t('staff.statusDraft', lang)
      default:         return status
    }
  })()

  return (
    <div style={{
      position: 'absolute',
      top: 8,
      right: 8,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 2,
      pointerEvents: 'none',
    }}>
      {/* Status pill */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: bg,
        color: 'var(--color-white)',
        borderRadius: 4,
        padding: pad,
        fontSize,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}>
        {STATUS_ICON[status]}
        {label}
      </div>

      {/* Moderator name (active) */}
      {status === 'active' && moderatorName && (
        <div style={{
          background: 'rgba(0,0,0,0.55)',
          color: 'var(--color-white)',
          borderRadius: 3,
          padding: '2px 6px',
          fontSize: '9px',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}>
          {t('staff.moderatedBy', lang)}: {moderatorName}
        </div>
      )}

      {/* Rejection reason (rejected) */}
      {status === 'rejected' && listing.rejection_reason && (
        <div
          style={{
            background: 'rgba(0,0,0,0.55)',
            color: 'var(--color-white)',
            borderRadius: 3,
            padding: '2px 6px',
            fontSize: '9px',
            maxWidth: 140,
            textAlign: 'right',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={listing.rejection_reason}
        >
          {listing.rejection_reason}
        </div>
      )}
    </div>
  )
}
