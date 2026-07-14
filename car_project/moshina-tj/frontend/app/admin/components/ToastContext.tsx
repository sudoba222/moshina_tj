'use client'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const colorMap: Record<ToastType, { bg: string; color: string; border: string }> = {
    success: { bg: 'var(--color-success-dim)', color: 'var(--color-success)', border: 'var(--color-success)' },
    error:   { bg: 'var(--color-error-dim)',   color: 'var(--color-error)',   border: 'var(--color-error)' },
    info:    { bg: 'var(--accent-dim)',         color: 'var(--accent)',        border: 'var(--accent)' },
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 500,
            maxWidth: '360px',
            width: 'calc(100vw - 48px)',
          }}
          role="status"
          aria-live="polite"
          aria-atomic="false"
        >
          {toasts.map((toast) => {
            const c = colorMap[toast.type]
            return (
              <div
                key={toast.id}
                style={{
                  background: c.bg,
                  color: c.color,
                  border: `1px solid ${c.border}`,
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  lineHeight: 1.4,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  animation: 'admin-toast-in 0.2s ease',
                }}
              >
                {toast.message}
              </div>
            )
          })}
        </div>
      )}
      <style>{`
        @keyframes admin-toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
