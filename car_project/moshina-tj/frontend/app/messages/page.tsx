'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileBottomNav from '@/components/MobileBottomNav'
import ChatView from '@/components/ChatView'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

export default function MessagesPage() {
  const { user, loading } = useAuth()
  const { lang } = useLang()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login?redirect=/messages')
  }, [loading, user, router])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '20px 16px calc(24px + env(safe-area-inset-bottom, 0px))' }}>
        <h1 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: '0 0 16px' }}>
          {t('chat.messages', lang)}
        </h1>
        {user ? (
          <div className="animate-fade-in">
            <ChatView />
          </div>
        ) : (
          <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            {t('common.loading', lang)}
          </div>
        )}
      </main>
      <MobileBottomNav />
    </div>
  )
}
