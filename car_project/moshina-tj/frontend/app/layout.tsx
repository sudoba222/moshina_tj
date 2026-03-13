import type { Metadata } from 'next'
import { Syne } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/lib/LanguageContext'
import { AuthProvider } from '@/lib/AuthContext'

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '700', '800'],
  display: 'swap',
  variable: '--font-syne',
})

export const metadata: Metadata = {
  title: 'MOSHINA.TJ — Авторынок Таджикистана',
  description: 'Покупка, аренда и рассрочка автомобилей по всему Таджикистану',
  keywords: 'авто, машина, Таджикистан, купить машину, аренда, рассрочка, Душанбе',
  openGraph: {
    title: 'MOSHINA.TJ — Авторынок Таджикистана',
    description: 'Покупка, аренда и рассрочка автомобилей по всему Таджикистану',
    type: 'website',
    locale: 'ru_TJ',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={syne.className}>
        <AuthProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
