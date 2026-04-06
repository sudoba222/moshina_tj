'use client'
import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  useEffect(() => {
    const error = searchParams.get('error')

    if (error) {
      router.replace(`/auth/login?error=${error}`)
      return
    }

    const ROLE_REDIRECT: Record<string, string> = {
      admin: '/admin',
      moderator: '/moderator',
      manager: '/manager',
      support: '/support',
    }

    // The backend sets an HttpOnly cookie during the OAuth redirect —
    // there is no token in the URL (intentional: tokens in URLs leak via logs/Referer).
    // Call /auth/me without a token; the cookie is sent automatically by the browser.
    authApi.me()
      .then((res) => {
        const { token: freshToken, user } = res.data.data!
        login(freshToken.access_token, user)
        router.replace(ROLE_REDIRECT[user.role] ?? '/')
      })
      .catch(() => {
        router.replace('/auth/login?error=oauth_failed')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </svg>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackInner />
    </Suspense>
  )
}
