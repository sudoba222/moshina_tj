import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Премиум автомобили — TAJCAR.TJ | Беҳтарин мошинҳо',
  description:
    'Лучшие и проверенные автомобили от надёжных продавцов Таджикистана. Беҳтарин мошинҳои тасдиқшуда аз фурӯшандагони боэътимоди Тоҷикистон.',
  alternates: {
    canonical: '/auction',
  },
  openGraph: {
    title: 'Премиум автомобили — TAJCAR.TJ',
    description:
      'Отборные автомобили от проверенных продавцов Таджикистана. Беҳтарин мошинҳои тасдиқшуда.',
    type: 'website',
    url: 'https://tajcar.tj/auction',
    siteName: 'TAJCAR.TJ',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Премиум автомобили — TAJCAR.TJ',
    description: 'Лучшие и проверенные автомобили от надёжных продавцов Таджикистана.',
  },
}

export default function AuctionLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
