import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Подать объявление | TAJCAR.TJ',
  robots: { index: false, follow: false },
}

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
