'use client'
import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react'
import { getInMemoryToken } from '@/lib/api'
import type { ChatMessage } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'

type MessageCallback = (msg: ChatMessage) => void

interface SocketContextValue {
  sendMessage: (conversationId: string, content: string) => void
  isConnected: boolean
  onMessage: (cb: MessageCallback) => () => void
}

const SocketContext = createContext<SocketContextValue>({
  sendMessage: () => {},
  isConnected: false,
  onMessage: () => () => {},
})

function deriveWsUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
  return apiUrl.replace(/^http/, 'ws') + '/ws/chat'
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelayRef = useRef(1000)
  const listenersRef = useRef<Set<MessageCallback>>(new Set())
  const [isConnected, setIsConnected] = useState(false)
  const intentionalClose = useRef(false)

  const connect = useCallback(() => {
    const token = getInMemoryToken()
    if (!token || !user) return

    const url = `${deriveWsUrl()}?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      reconnectDelayRef.current = 1000
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as Record<string, unknown>
        // The server may send a ping or other event types — only dispatch chat messages
        if (data.type === 'message' && data.payload) {
          const msg = data.payload as ChatMessage
          listenersRef.current.forEach((cb) => cb(msg))
        } else if (data.id && data.conversation_id && data.content) {
          // Direct message shape (no type wrapper)
          listenersRef.current.forEach((cb) => cb(data as unknown as ChatMessage))
        }
      } catch {
        // Ignore non-JSON frames (e.g. ping)
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      wsRef.current = null
      if (!intentionalClose.current) {
        const delay = Math.min(reconnectDelayRef.current, 30000)
        reconnectDelayRef.current = delay * 2
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, delay)
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      // Disconnect on logout
      intentionalClose.current = true
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      wsRef.current?.close()
      wsRef.current = null
      setIsConnected(false)
      return
    }

    intentionalClose.current = false
    // Small delay to allow AuthContext to populate the in-memory token
    const t = setTimeout(() => connect(), 200)
    return () => {
      clearTimeout(t)
      intentionalClose.current = true
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      wsRef.current?.close()
    }
  }, [user, connect])

  const sendMessage = useCallback((conversationId: string, content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', conversation_id: conversationId, content }))
    }
  }, [])

  const onMessage = useCallback((cb: MessageCallback) => {
    listenersRef.current.add(cb)
    return () => {
      listenersRef.current.delete(cb)
    }
  }, [])

  return (
    <SocketContext.Provider value={{ sendMessage, isConnected, onMessage }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}
