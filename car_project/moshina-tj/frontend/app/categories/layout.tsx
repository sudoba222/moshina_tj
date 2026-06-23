import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Категории автомобилей — TAJCAR.TJ | Мошинҳо аз рӯи навъ',
  description:
    'Найдите автомобиль по категории: седаны, внедорожники, грузовики и другие. | Мошинро аз рӯи навъ ёбед: седан, джип, мошинҳои боркаш ва дигарон.',
  alternates: { canonical: '/categories' },
  openGraph: {
    title: 'Категории автомобилей — TAJCAR.TJ | Мошинҳо аз рӯи навъ',
    description:
      'Найдите автомобиль по категории: седаны, внедорожники, грузовики и другие. | Мошинро аз рӯи навъ ёбед: седан, джип, мошинҳои боркаш ва дигарон.',
    type: 'website',
  },
}

export default function CategoriesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
