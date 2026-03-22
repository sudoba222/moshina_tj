'use client'
import { useEffect, useRef } from 'react'
import { IconCheck, IconX, IconSkip } from './icons'

export type ToastVariant = 'approve' | 'reject' | 'skip' | 'error'

interface ToastProps {
  message: string
  variant: ToastVariant
  /** Duration in ms before the toast fades out. Default: 2000 */
  duration?: number
  onDismiss: () => void
}

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; color: string }> = {
  approve: {
    bg: 'var(--color-success-dim)',
    border: 'var(--color-success)',
    color: 'var(--color-success)',
  },
  reject: {
    bg: 'var(--color-error-dim)',
    border: 'var(--color-error)',
    color: 'var(--color-error)',
  },
  skip: {
    bg: 'var(--surface)',
    border: 'var(--border)',
    color: 'var(--text-secondary)',
  },
  error: {
    bg: 'var(--color-error-dim)',
    border: 'var(--color-error)',
    color: 'var(--color-error)',
  },
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  switch (variant) {
    case 'approve': return <IconCheck size={14} />
    case 'reject':  return <IconX size={14} />
    case 'skip':    return <IconSkip size={14} />
    case 'error':   return <IconX size={14} />
  }
}

export default function Toast({ message, variant, duration = 2000, onDismiss }: ToastProps) {
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss

  useEffect(() => {
    const timer = setTimeout(() => dismissRef.current(), duration)
    return () => clearTimeout(timer)
  }, [duration])

  const styles = VARIANT_STYLES[variant]

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        borderRadius: '10px',
        padding: '10px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        fontWeight: 600,
        color: styles.color,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        animation: 'toast-in 0.15s ease',
      }}
    >
      <ToastIcon variant={variant} />
      {message}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
