'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { adminApi } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { AdminStats, UserRole } from '@/types'

const ALLOWED_ROLES: UserRole[] = ['support', 'manager', 'admin']

export default function SupportPage() {
  const router = useRouter()
  const { lang } = useLang()
  const { user } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)

  useEffect(() => {
    if (!user) { router.replace('/auth/login'); return }
    if (!ALLOWED_ROLES.includes(user.role)) { router.replace('/'); return }
  }, [user, router])

  useEffect(() => {
    if (!user || !ALLOWED_ROLES.includes(user.role)) return
    adminApi.getStats()
      .then((res) => setStats(res.data.data))
      .catch(() => {})
  }, [user])

  if (!user || !ALLOWED_ROLES.includes(user.role)) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        <div className="max-w-4xl mx-auto px-4 md:px-6" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
          <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
            {t('support.title', lang)}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '40px' }}>
            {user.name ?? user.phone} · {user.role}
          </p>

          {/* Stats summary */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-40">
              {[
                { label: lang === 'ru' ? 'Пользователей' : 'Корбарон', value: stats.total_users },
                { label: lang === 'ru' ? 'Объявлений' : 'Эълонҳо', value: stats.total_listings },
                { label: lang === 'ru' ? 'Активных' : 'Фаъол', value: stats.active_listings },
                { label: lang === 'ru' ? 'Дилеров' : 'Намоишгоҳ', value: stats.total_dealers },
              ].map((s) => (
                <div key={s.label} className="animate-fade-in-up" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent)' }}>{s.value.toLocaleString()}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Coming soon */}
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '24px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '10px' }}>
              {t('support.comingSoon', lang)}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '360px', margin: '0 auto' }}>
              {t('support.description', lang)}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
