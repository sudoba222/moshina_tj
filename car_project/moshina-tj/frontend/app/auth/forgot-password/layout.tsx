import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Восстановление пароля | TAJCAR.TJ',
  alternates: { canonical: '/auth/forgot-password' },
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
