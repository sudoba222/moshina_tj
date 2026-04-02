import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TAJCAR.TJ — Авторынок Таджикистана',
    short_name: 'TAJCAR.TJ',
    description: 'Покупка, аренда и рассрочка автомобилей по всему Таджикистану',
    start_url: '/',
    display: 'standalone',
    background_color: '#111318',
    theme_color: '#c83808',
    orientation: 'portrait',
    icons: [
      { src: '/logo-icon.png', sizes: '192x192', type: 'image/png' },
      { src: '/logo-icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/logo-icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    categories: ['auto', 'shopping', 'lifestyle'],
    lang: 'ru',
  }
}
