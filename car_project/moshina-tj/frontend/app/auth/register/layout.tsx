import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Регистрация | TAJCAR.TJ',
  alternates: { canonical: '/auth/register' },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
