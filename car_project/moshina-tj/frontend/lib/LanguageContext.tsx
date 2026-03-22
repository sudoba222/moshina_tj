'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { Lang } from '@/types'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'ru',
  setLang: () => {},
})

interface LanguageProviderProps {
  children: ReactNode
  initialLang?: Lang
}

export function LanguageProvider({ children, initialLang = 'ru' }: LanguageProviderProps) {
  // initialLang is read server-side from the lang cookie and passed as a prop,
  // so the initial state matches what the server rendered — no hydration mismatch.
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    // On the client, prefer localStorage (set when user explicitly switches language)
    // over the initial server-read cookie value.
    const saved = localStorage.getItem('lang') as Lang | null
    if (saved === 'ru' || saved === 'tj') setLangState(saved)
  }, [])

  function setLang(next: Lang) {
    setLangState(next)
    localStorage.setItem('lang', next)
    document.cookie = `lang=${next};path=/;max-age=31536000;SameSite=Lax`
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}
