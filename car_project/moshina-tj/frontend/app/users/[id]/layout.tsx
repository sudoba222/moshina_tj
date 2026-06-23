import type { Metadata } from 'next'
import type { ReactNode } from 'react'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tajcar.tj'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Продавец на TAJCAR.TJ | Фурӯшанда дар TAJCAR.TJ`,
    description: `Просмотрите объявления продавца на TAJCAR.TJ. | Эълонҳои фурӯшандаро дар TAJCAR.TJ бинед.`,
    openGraph: {
      title: `Продавец на TAJCAR.TJ | Фурӯшанда дар TAJCAR.TJ`,
      description: `Просмотрите объявления продавца на TAJCAR.TJ.`,
    },
    alternates: { canonical: `/users/${id}` },
  }
}

export default function UserLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
