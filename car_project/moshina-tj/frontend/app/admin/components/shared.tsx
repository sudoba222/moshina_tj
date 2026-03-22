// Shared style constants and micro-components used across all admin tab pages

export const thStyle: React.CSSProperties = {
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

export const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: '13px',
  color: 'var(--text)',
  borderBottom: '1px solid var(--border)',
}

export const inputStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '13px',
  color: 'var(--text)',
  outline: 'none',
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active:   { bg: 'var(--color-success-dim)', color: 'var(--color-success)' },
    pending:  { bg: 'var(--color-warning-dim)', color: 'var(--color-warning)' },
    rejected: { bg: 'var(--color-error-dim)',   color: 'var(--color-error)' },
    banned:   { bg: 'var(--color-error-dim)',   color: 'var(--color-error)' },
  }
  const c = map[status] ?? { bg: 'var(--tag-bg)', color: 'var(--text-muted)' }
  return (
    <span
      className="px-2 py-0.5 rounded-[100px] text-[11px] font-semibold uppercase tracking-[0.04em] whitespace-nowrap"
      style={{ background: c.bg, color: c.color }}
    >
      {status}
    </span>
  )
}

export function RolePill({
  role,
  active,
  onClick,
}: {
  role: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="px-[14px] py-[5px] rounded-[100px] border text-[12px] cursor-pointer"
      style={{
        borderColor: active ? 'var(--accent)' : 'var(--border)',
        background: active ? 'var(--accent-dim)' : 'var(--surface)',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        fontWeight: active ? 700 : 400,
        transition: 'all 0.15s',
      }}
    >
      {role}
    </button>
  )
}

export function Pagination({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number
  total: number
  pageSize: number
  onPage: (p: number) => void
}) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  return (
    <div
      className="flex gap-2 px-4 py-3 justify-center items-center border-t"
      style={{ borderColor: 'var(--border)' }}
    >
      <button
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
        className="px-[14px] py-[6px] rounded-lg border"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--surface)',
          color: 'var(--text)',
          cursor: page === 1 ? 'default' : 'pointer',
          opacity: page === 1 ? 0.4 : 1,
        }}
      >
        &#8249;
      </button>
      <span className="px-[14px] py-[6px] text-[13px]" style={{ color: 'var(--text-muted)' }}>
        {page} / {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className="px-[14px] py-[6px] rounded-lg border"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--surface)',
          color: 'var(--text)',
          cursor: page >= totalPages ? 'default' : 'pointer',
          opacity: page >= totalPages ? 0.4 : 1,
        }}
      >
        &#8250;
      </button>
    </div>
  )
}

export function LoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="text-center py-8 px-4"
        style={{ ...tdStyle, color: 'var(--text-muted)' }}
      >
        <div
          className="inline-block w-5 h-5 rounded-full border-2"
          style={{
            borderColor: 'var(--border)',
            borderTopColor: 'var(--accent)',
            animation: 'admin-spin 0.7s linear infinite',
          }}
          role="status"
          aria-label="Loading"
        />
        <style>{`@keyframes admin-spin { to { transform: rotate(360deg); } }`}</style>
      </td>
    </tr>
  )
}

export function ModalBackdrop({
  onClose,
  children,
}: {
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[200] overflow-y-auto p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  )
}

export function ModalCard({
  children,
  maxWidth = '400px',
}: {
  children: React.ReactNode
  maxWidth?: string
}) {
  return (
    <div
      className="w-full rounded-2xl p-6 mx-auto"
      style={{ background: 'var(--card)', maxWidth }}
    >
      {children}
    </div>
  )
}

export function ModalTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="font-bold text-[16px] m-0 mb-[14px]"
      style={{ color: 'var(--text)' }}
    >
      {children}
    </h3>
  )
}

export function ModalActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 mt-1">{children}</div>
  )
}

export function BtnPrimary({
  children,
  onClick,
  disabled,
  type = 'button',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="flex-1 py-[10px] rounded-lg border-0 text-[13px] font-bold"
      style={{
        background: 'var(--accent)',
        color: 'var(--color-white)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  )
}

export function BtnSecondary({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 py-[10px] rounded-lg border text-[13px] cursor-pointer"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        color: 'var(--text)',
      }}
    >
      {children}
    </button>
  )
}

export function BtnDanger({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex-1 py-[10px] rounded-lg border-0 text-[13px] font-bold"
      style={{
        background: 'var(--color-error)',
        color: 'var(--color-white)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  )
}

export function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-3">
      <label
        className="block text-[12px] font-semibold uppercase tracking-[0.05em] mb-1"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] mb-[10px]" style={{ color: 'var(--color-error)' }}>
      {children}
    </p>
  )
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

export function extractApiError(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string; detail?: string } } })
    ?.response?.data
  return msg?.message ?? msg?.detail ?? fallback
}
