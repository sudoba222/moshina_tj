'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { chatApi } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'

type DrawerMode = 'chat' | 'support'

interface ChatDrawerContextValue {
  isOpen: boolean
  activeConvId: string | null
  mode: DrawerMode
  openChat: (participantId: string, listingId?: string) => Promise<void>
  openSupport: () => Promise<void>
  openConversation: (convId: string) => void
  close: () => void
}

const ChatDrawerContext = createContext<ChatDrawerContextValue>({
  isOpen: false,
  activeConvId: null,
  mode: 'chat',
  openChat: async () => {},
  openSupport: async () => {},
  openConversation: () => {},
  close: () => {},
})

export function ChatDrawerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [mode, setMode] = useState<DrawerMode>('chat')

  const openChat = useCallback(async (participantId: string, listingId?: string) => {
    if (!user) return
    try {
      const res = await chatApi.createOrGet({
        participant_id: participantId,
        listing_id: listingId,
      })
      setActiveConvId(res.data.data.id)
      setMode('chat')
      setIsOpen(true)
    } catch {
      // Open drawer anyway at list view
      setActiveConvId(null)
      setMode('chat')
      setIsOpen(true)
    }
  }, [user])

  const openSupport = useCallback(async () => {
    if (!user) return
    try {
      const res = await chatApi.createOrGet({ type: 'support' })
      setActiveConvId(res.data.data.id)
      setMode('support')
      setIsOpen(true)
    } catch {
      setActiveConvId(null)
      setMode('support')
      setIsOpen(true)
    }
  }, [user])

  const openConversation = useCallback((convId: string) => {
    setActiveConvId(convId)
    setMode('chat')
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <ChatDrawerContext.Provider
      value={{ isOpen, activeConvId, mode, openChat, openSupport, openConversation, close }}
    >
      {children}
    </ChatDrawerContext.Provider>
  )
}

export function useChatDrawer() {
  return useContext(ChatDrawerContext)
}
