'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { adminApi, type ActivityLogEntry } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

const STAFF_ROLES = new Set(['admin', 'moderator', 'manager', 'support'])

const ACTION_COLOR: Record<string, string> = {
  approved:    'var(--color-online)',
  rejected:    'var(--color-error)',
  staff_edit:  'var(--accent)',
  deactivated: 'var(--color-warning-alt)',
  reactivated: 'var(--color-online)',
  created:     'var(--text-muted)',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}


export default function MyActivityPage() {
  const { user } = useAuth()
  const { lang } = useLang()
  const router = useRouter()
  const [items, setItems] = useState<ActivityLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    if (!STAFF_ROLES.has(user.role)) { router.replace('/'); return }
    loadActivity(1)
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadActivity(p: number) {
    setLoading(true)
    try {
      const res = await adminApi.myActivity(p, 50)
      const data = res.data.data
      setItems(data.items)
      setTotal(data.total)
      setPage(data.page)
      setPages(data.pages)
    } catch {
      // ignore
    }
    setLoading(false)
  }

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            {t('staff.myActivity', lang)}
          </h1>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            {total} {t('activity.found', lang)}
          </div>
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 48 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 010 20" />
            </svg>
          </div>
        ) : items.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 48 }}>
            {t('staff.noActivity', lang)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item) => (
              <div key={item.log_id} style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}>
                {/* Thumbnail */}
                <div style={{ width: 64, height: 48, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--surface)' }}>
                  {item.listing?.primary_image_url ? (
                    <Image
                      src={item.listing.primary_image_url}
                      alt=""
                      width={64}
                      height={48}
                      style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'var(--border)' }} />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {item.listing ? (
                    <Link
                      href={`/car/${item.listing.id}`}
                      style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}
                    >
                      {item.listing.brand} {item.listing.model} {item.listing.year}
                    </Link>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {t('activity.noResults', lang)}
                    </span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{
                      position: 'relative',
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      color: ACTION_COLOR[item.action] ?? 'var(--text-muted)',
                      borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                    }}>
                      <span style={{
                        position: 'absolute', inset: 0, borderRadius: 4,
                        background: ACTION_COLOR[item.action] ?? 'var(--surface)',
                        opacity: ACTION_COLOR[item.action] ? 0.12 : 1,
                      }} />
                      <span style={{ position: 'relative' }}>{item.action}</span>
                    </span>
                    {item.reason && (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }} title={item.reason}>
                        — {item.reason.length > 40 ? item.reason.slice(0, 40) + '\u2026' : item.reason}
                      </span>
                    )}
                  </div>
                </div>

                {/* Date */}
                <div style={{ color: 'var(--text-muted)', fontSize: 12, flexShrink: 0, textAlign: 'right' }}>
                  {formatDate(item.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => loadActivity(p)}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: p === page ? 'var(--accent)' : 'var(--surface)',
                  color: p === page ? 'var(--color-white)' : 'var(--text)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}
