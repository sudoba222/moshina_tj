'use client'
import { useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { adminApi } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { useAuth } from '@/lib/AuthContext'
import { t } from '@/lib/i18n'
import type { User, UserRole } from '@/types'
import {
  thStyle, tdStyle, inputStyle, StatusBadge, RolePill, Pagination,
  LoadingRow, ModalBackdrop, ModalCard, ModalTitle, ModalActions,
  BtnPrimary, BtnSecondary, BtnDanger, FormField, ErrorText,
  formatDate, extractApiError,
} from '../components/shared'
import { IconSearch, IconCheck, IconBan, IconX, IconPlus } from '../components/icons'
import { useToast } from '../components/ToastContext'

const ALL_ROLES: UserRole[] = ['user', 'dealer', 'moderator', 'manager', 'support', 'admin']
const PAGE_SIZE = 20

function UsersPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang } = useLang()
  const { showToast } = useToast()
  const { user: currentUser } = useAuth()
  const isSuperAdmin = currentUser?.role === 'admin'

  const page = Number(searchParams.get('page') ?? '1')
  const search = searchParams.get('search') ?? ''
  const role = searchParams.get('role') ?? ''

  function updateParams(updates: Record<string, string>) {
    const p = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => {
      if (v) p.set(k, v)
      else p.delete(k)
    })
    router.replace(`?${p.toString()}`)
  }

  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  // Modals
  const [banUserId, setBanUserId] = useState<string | null>(null)
  const [banReason, setBanReason] = useState('')
  const [changeRoleUserId, setChangeRoleUserId] = useState<string | null>(null)
  const [newRole, setNewRole] = useState<UserRole>('user')
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [editUserData, setEditUserData] = useState<{ id: string; name: string; phone: string; email: string } | null>(null)
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [createUserForm, setCreateUserForm] = useState({ phone: '', name: '', password: '', role: 'user' as UserRole })
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  // Login history modal
  const [historyUserId, setHistoryUserId] = useState<string | null>(null)
  const [historyItems, setHistoryItems] = useState<Array<{ id: string; method: string | null; ip: string | null; created_at: string }>>([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyPages, setHistoryPages] = useState(1)
  const [historyLoading, setHistoryLoading] = useState(false)

  const loadUsers = useCallback(async (p: number, r: string, s: string) => {
    setLoading(true)
    try {
      const res = await adminApi.getUsers(p, r || undefined, s || undefined)
      setUsers(res.data.data.items)
      setTotal(res.data.data.total)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
    setLoading(false)
  }, [lang, showToast])

  useEffect(() => { loadUsers(page, role, search) }, [page, role, search, loadUsers])

  async function handleBanUser(userId: string) {
    try {
      await adminApi.banUser(userId, banReason || undefined)
      setBanUserId(null)
      setBanReason('')
      showToast(t('adminForm.userBanned', lang), 'success')
      loadUsers(page, role, search)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
  }

  async function handleUnbanUser(userId: string) {
    try {
      await adminApi.unbanUser(userId)
      showToast(t('adminForm.userUnbanned', lang), 'success')
      loadUsers(page, role, search)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
  }

  async function handleChangeRole(userId: string) {
    try {
      await adminApi.updateUserRole(userId, newRole)
      setChangeRoleUserId(null)
      showToast(t('adminForm.roleChanged', lang), 'success')
      loadUsers(page, role, search)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
  }

  async function handleDeleteUser() {
    if (!deleteUserId) return
    try {
      await adminApi.deleteUser(deleteUserId)
      setDeleteUserId(null)
      showToast(t('adminForm.userDeleted', lang), 'success')
      loadUsers(page, role, search)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
  }

  async function handleCreateUser() {
    setActionError('')
    setActionLoading(true)
    try {
      await adminApi.createUser(createUserForm)
      setCreateUserOpen(false)
      setCreateUserForm({ phone: '', name: '', password: '', role: 'user' })
      showToast(t('adminForm.userCreated', lang), 'success')
      loadUsers(page, role, search)
    } catch (e) {
      setActionError(extractApiError(e, t('common.errorCreate', lang)))
    }
    setActionLoading(false)
  }

  async function loadLoginHistory(userId: string, p = 1) {
    setHistoryLoading(true)
    try {
      const res = await adminApi.getLoginHistory(userId, p)
      setHistoryItems(res.data.data.items)
      setHistoryTotal(res.data.data.total)
      setHistoryPages(res.data.data.pages)
      setHistoryPage(p)
    } catch (e) {
      showToast(extractApiError(e, t('common.genericError', lang)), 'error')
    }
    setHistoryLoading(false)
  }

  async function handleEditUser() {
    if (!editUserData) return
    setActionError('')
    setActionLoading(true)
    try {
      await adminApi.editUser(editUserData.id, {
        name: editUserData.name || undefined,
        phone: editUserData.phone || undefined,
        email: editUserData.email || undefined,
      })
      setEditUserData(null)
      showToast(t('adminForm.dataSaved', lang), 'success')
      loadUsers(page, role, search)
    } catch (e) {
      setActionError(extractApiError(e, t('common.errorSave', lang)))
    }
    setActionLoading(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-[10px] mb-4">
        <h1 className="text-[20px] font-bold m-0" style={{ color: 'var(--text)' }}>{t('admin.users', lang)}</h1>
        {isSuperAdmin && (
          <button
            onClick={() => { setCreateUserOpen(true); setActionError('') }}
            className="flex items-center gap-[6px] px-4 py-2 rounded-lg text-[13px] font-bold cursor-pointer border-0"
            style={{ background: 'var(--accent)', color: 'var(--color-white)' }}
          >
            <IconPlus /> {t('adminForm.addUser', lang)}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="flex gap-[10px] flex-wrap mb-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-[10px] top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}><IconSearch /></span>
          <input
            value={search}
            onChange={(e) => updateParams({ search: e.target.value, page: '1' })}
            placeholder={t('admin.searchUsers', lang)}
            style={{ ...inputStyle, width: '100%', paddingLeft: '32px', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Role filter pills */}
      <div className="flex gap-[6px] flex-wrap mb-4">
        {(['', ...ALL_ROLES] as string[]).map((r) => (
          <RolePill
            key={r || 'all'}
            role={r || t('admin.all', lang)}
            active={role === r}
            onClick={() => updateParams({ role: r, page: '1' })}
          />
        ))}
      </div>

      {/* Table */}
      <div className="rounded-[14px] border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {[t('admin.phone', lang), t('admin.name', lang), t('admin.role', lang), t('admin.created', lang), t('admin.status', lang), t('admin.actions', lang)].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <LoadingRow colSpan={6} />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 px-4" style={{ ...tdStyle, color: 'var(--text-muted)' }}>
                    {t('adminForm.noUsers', lang)}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td style={tdStyle}>{u.phone}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>{u.name ?? '—'}</span>
                        {u.user_number !== undefined && (
                          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            #{u.user_number}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span className="px-2 py-0.5 rounded-[100px] text-[11px] font-semibold" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>{u.role}</span>
                    </td>
                    <td className="whitespace-nowrap" style={tdStyle}>{formatDate(u.created_at)}</td>
                    <td style={tdStyle}><StatusBadge status={u.is_banned ? 'banned' : 'active'} /></td>
                    <td className="whitespace-nowrap" style={tdStyle}>
                      <div className="flex gap-[6px] items-center">
                        {u.is_banned ? (
                          <button
                            onClick={() => handleUnbanUser(u.id)}
                            className="flex items-center gap-1 px-[10px] py-1 rounded-[6px] text-[12px] font-semibold cursor-pointer border-0"
                            style={{ background: 'var(--color-success-dim)', color: 'var(--color-success)' }}
                          >
                            <IconCheck /> {t('admin.unban', lang)}
                          </button>
                        ) : (
                          <button
                            onClick={() => setBanUserId(u.id)}
                            className="flex items-center gap-1 px-[10px] py-1 rounded-[6px] text-[12px] font-semibold cursor-pointer border-0"
                            style={{ background: 'var(--color-error-dim)', color: 'var(--color-error)' }}
                          >
                            <IconBan /> {t('admin.ban', lang)}
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            onClick={() => { setChangeRoleUserId(u.id); setNewRole(u.role) }}
                            className="px-[10px] py-1 rounded-[6px] text-[12px] cursor-pointer border"
                            style={{ background: 'var(--tag-bg)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
                          >
                            {t('admin.changeRole', lang)}
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            onClick={() => { setEditUserData({ id: u.id, name: u.name ?? '', phone: u.phone, email: u.email ?? '' }); setActionError('') }}
                            className="px-[10px] py-1 rounded-[6px] text-[12px] cursor-pointer border"
                            style={{ background: 'var(--tag-bg)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
                          >
                            {t('adminForm.editAction', lang)}
                          </button>
                        )}
                        <button
                          onClick={() => { setHistoryUserId(u.id); loadLoginHistory(u.id, 1) }}
                          className="px-[10px] py-1 rounded-[6px] text-[12px] cursor-pointer border"
                          style={{ background: 'var(--tag-bg)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
                        >
                          {t('admin.loginHistoryBtn', lang)}
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => setDeleteUserId(u.id)}
                            className="flex items-center px-2 py-1 rounded-[6px] text-[12px] cursor-pointer border-0"
                            style={{ background: 'var(--color-error-dim)', color: 'var(--color-error)' }}
                          >
                            <IconX />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPage={(p) => updateParams({ page: String(p) })} />
      </div>

      {/* Ban modal */}
      {banUserId && (
        <ModalBackdrop onClose={() => { setBanUserId(null); setBanReason('') }}>
          <ModalCard>
            <ModalTitle>{t('admin.ban', lang)}</ModalTitle>
            <FormField label={t('admin.banReason', lang)}>
              <input value={banReason} onChange={(e) => setBanReason(e.target.value)} className="mb-[14px]" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </FormField>
            <ModalActions>
              <BtnSecondary onClick={() => { setBanUserId(null); setBanReason('') }}>{t('dashboard.cancel', lang)}</BtnSecondary>
              <BtnDanger onClick={() => handleBanUser(banUserId)}>{t('admin.ban', lang)}</BtnDanger>
            </ModalActions>
          </ModalCard>
        </ModalBackdrop>
      )}

      {/* Change role modal */}
      {changeRoleUserId && (
        <ModalBackdrop onClose={() => setChangeRoleUserId(null)}>
          <ModalCard>
            <ModalTitle>{t('admin.changeRole', lang)}</ModalTitle>
            <FormField label={t('admin.role', lang)}>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="mb-[14px]"
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              >
                {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </FormField>
            <ModalActions>
              <BtnSecondary onClick={() => setChangeRoleUserId(null)}>{t('dashboard.cancel', lang)}</BtnSecondary>
              <BtnPrimary onClick={() => handleChangeRole(changeRoleUserId)}>{t('dashboard.save', lang)}</BtnPrimary>
            </ModalActions>
          </ModalCard>
        </ModalBackdrop>
      )}

      {/* Create user modal */}
      {createUserOpen && (
        <ModalBackdrop onClose={() => setCreateUserOpen(false)}>
          <ModalCard maxWidth="420px">
            <ModalTitle>{t('adminForm.newUser', lang)}</ModalTitle>
            {([
              { label: t('adminForm.phoneLabel', lang), key: 'phone', type: 'text', placeholder: '+992...' },
              { label: t('adminForm.nameLabel', lang), key: 'name', type: 'text', placeholder: '' },
              { label: t('adminForm.passwordLabel', lang), key: 'password', type: 'password', placeholder: '' },
            ] as const).map(({ label, key, type, placeholder }) => (
              <FormField key={key} label={label}>
                <input
                  type={type}
                  value={createUserForm[key]}
                  onChange={(e) => setCreateUserForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                />
              </FormField>
            ))}
            <FormField label={t('admin.role', lang)}>
              <select
                value={createUserForm.role}
                onChange={(e) => setCreateUserForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                className="mb-[14px]"
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              >
                {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </FormField>
            {actionError && <ErrorText>{actionError}</ErrorText>}
            <ModalActions>
              <BtnSecondary onClick={() => setCreateUserOpen(false)}>{t('dashboard.cancel', lang)}</BtnSecondary>
              <BtnPrimary onClick={handleCreateUser} disabled={actionLoading}>
                {t('adminForm.createAction', lang)}
              </BtnPrimary>
            </ModalActions>
          </ModalCard>
        </ModalBackdrop>
      )}

      {/* Edit user modal */}
      {editUserData && (
        <ModalBackdrop onClose={() => setEditUserData(null)}>
          <ModalCard maxWidth="420px">
            <ModalTitle>{t('adminForm.editUser', lang)}</ModalTitle>
            {([
              { label: t('adminForm.nameLabel', lang), key: 'name' },
              { label: t('adminForm.phoneLabel', lang), key: 'phone' },
              { label: 'Email', key: 'email' },
            ] as const).map(({ label, key }) => (
              <FormField key={key} label={label}>
                <input
                  value={editUserData[key]}
                  onChange={(e) => setEditUserData((d) => d ? { ...d, [key]: e.target.value } : d)}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                />
              </FormField>
            ))}
            {actionError && <ErrorText>{actionError}</ErrorText>}
            <ModalActions>
              <BtnSecondary onClick={() => setEditUserData(null)}>{t('dashboard.cancel', lang)}</BtnSecondary>
              <BtnPrimary onClick={handleEditUser} disabled={actionLoading}>{t('dashboard.save', lang)}</BtnPrimary>
            </ModalActions>
          </ModalCard>
        </ModalBackdrop>
      )}

      {/* Delete user confirm */}
      {deleteUserId && (
        <ModalBackdrop onClose={() => setDeleteUserId(null)}>
          <ModalCard>
            <ModalTitle>{t('adminForm.deleteUserTitle', lang)}</ModalTitle>
            <p className="text-[13px] mb-[18px]" style={{ color: 'var(--text-muted)' }}>
              {t('admin.irreversible', lang)}
            </p>
            <ModalActions>
              <BtnSecondary onClick={() => setDeleteUserId(null)}>{t('dashboard.cancel', lang)}</BtnSecondary>
              <BtnDanger onClick={handleDeleteUser}>{t('admin.deleteBtn2', lang)}</BtnDanger>
            </ModalActions>
          </ModalCard>
        </ModalBackdrop>
      )}

      {/* Login history modal */}
      {historyUserId && (
        <ModalBackdrop onClose={() => { setHistoryUserId(null); setHistoryItems([]) }}>
          <ModalCard maxWidth="560px">
            <ModalTitle>{t('admin.loginHistory', lang)}</ModalTitle>
            {historyLoading ? (
              <p className="text-[13px] text-center py-4" style={{ color: 'var(--text-muted)' }}>...</p>
            ) : historyItems.length === 0 ? (
              <p className="text-[13px] text-center py-4" style={{ color: 'var(--text-muted)' }}>
                {t('admin.noLoginHistory', lang)}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      {[t('admin.loginMethod', lang), t('admin.loginIp', lang), t('admin.auditTime', lang)].map((h) => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historyItems.map((item) => (
                      <tr key={item.id}>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                            {item.method ?? '—'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {item.ip ?? '—'}
                        </td>
                        <td className="whitespace-nowrap" style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                          {formatDate(item.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {historyPages > 1 && (
              <Pagination page={historyPage} total={historyTotal} pageSize={50} onPage={(p) => loadLoginHistory(historyUserId, p)} />
            )}
            <ModalActions>
              <BtnSecondary onClick={() => { setHistoryUserId(null); setHistoryItems([]) }}>{t('dashboard.cancel', lang)}</BtnSecondary>
            </ModalActions>
          </ModalCard>
        </ModalBackdrop>
      )}
    </div>
  )
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={null}>
      <UsersPageInner />
    </Suspense>
  )
}
