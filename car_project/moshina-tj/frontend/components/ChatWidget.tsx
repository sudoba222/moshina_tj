'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { chatApi } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

function ChatBubbleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export default function ChatWidget() {
  const { user } = useAuth()
  const { lang } = useLang()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (!user) return null

  async function handleClick() {
    if (loading) return
    setLoading(true)
    try {
      const res = await chatApi.createOrGet({ type: 'support' })
      const convId = res.data.data.id
      router.push(`/dashboard?tab=messages&conv=${convId}`)
    } catch {
      // Fallback: just navigate to messages tab
      router.push('/dashboard?tab=messages')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      aria-label={t('chat.supportChat', lang)}
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        zIndex: 50,
        width: '52px',
        height: '52px',
        borderRadius: '50%',
        background: 'var(--accent)',
        color: '#fff',
        border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        opacity: loading ? 0.7 : 1,
        transition: 'transform 0.15s ease, opacity 0.15s ease',
      }}
      onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(1.08)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      <ChatBubbleIcon />
    </button>
  )
}
