'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { chatApi, BASE_URL } from '@/lib/api'
import type { ConversationItem, ChatMessage } from '@/types'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

function avatarColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0
  const hue = Math.abs(h) % 360
  return `hsl(${hue},55%,45%)`
}

function relativeTime(dateStr: string, lang: 'ru' | 'tj' = 'ru'): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return t('common.justNow', lang)
  if (diff < 3600) return `${Math.floor(diff / 60)}${lang === 'tj' ? 'д' : 'м'}`
  if (diff < 86400) return `${Math.floor(diff / 3600)}${lang === 'tj' ? 'с' : 'ч'}`
  return `${Math.floor(diff / 86400)}${lang === 'tj' ? 'р' : 'д'}`
}

export default function ChatView() {
  const { lang } = useLang()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const initialConvId = searchParams.get('conv')

  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [selectedConvId, setSelectedConvId] = useState<string | null>(initialConvId)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [msgInput, setMsgInput] = useState('')

  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [sending, setSending] = useState(false)
  const [mobileShowChat, setMobileShowChat] = useState(!!initialConvId)

  // Update selected conviction if URL param changes
  useEffect(() => {
    if (initialConvId) {
      setSelectedConvId(initialConvId)
      setMobileShowChat(true)
    }
  }, [initialConvId])

  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<WebSocket | null>(null)

  // ── WebSocket ────────────────────────────────────────────────────────────
  
  const connectSocket = useCallback(() => {
    if (socketRef.current || !user) return

    const wsUrl = BASE_URL.replace(/^http/, 'ws').replace('/api/v1', '/ws/chat')
    const socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      console.log('WS connected')
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'new_message') {
          const newMsg = data.message as ChatMessage
          // If message belongs to current conversation, add it
          if (newMsg.conversation_id === selectedConvId) {
            setMessages((prev) => [...prev, newMsg])
            chatApi.markRead(newMsg.conversation_id).catch(() => {})
          }
          
          // Update conversation list (move to top, update last message)
          setConversations((prev) => {
            const idx = prev.findIndex(c => c.id === newMsg.conversation_id)
            if (idx === -1) {
              // Fetch conversation list again if it's a brand new chat
              chatApi.listConversations().then(res => setConversations(res.data.data))
              return prev
            }
            const updated = [...prev]
            const conv = { ...updated[idx] }
            conv.last_message = {
              content: newMsg.content,
              created_at: newMsg.created_at,
              is_mine: newMsg.sender_id === user.id
            }
            if (newMsg.conversation_id !== selectedConvId) {
              conv.unread_count += 1
            }
            updated.splice(idx, 1)
            updated.unshift(conv)
            return updated
          })
        }
      } catch (err) {
        console.error('WS parse error', err)
      }
    }

    socket.onclose = () => {
      console.log('WS closed, reconnecting...')
      socketRef.current = null
      setTimeout(connectSocket, 3000)
    }

    socketRef.current = socket
  }, [user, selectedConvId])

  useEffect(() => {
    connectSocket()
    return () => {
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [connectSocket])

  // ── API Calls ────────────────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    try {
      const res = await chatApi.listConversations()
      setConversations(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingConvs(false)
    }
  }, [])

  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true)
    try {
      const res = await chatApi.getMessages(convId)
      setMessages(res.data.data.items.reverse()) // items are newest first from API
      await chatApi.markRead(convId)
      // Update local unread count
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c))
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  useEffect(() => {
    if (user) fetchConversations()
  }, [user, fetchConversations])

  useEffect(() => {
    if (selectedConvId) fetchMessages(selectedConvId)
    else setMessages([])
  }, [selectedConvId, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleSend() {
    if (!selectedConvId || !msgInput.trim() || sending) return
    const content = msgInput.trim()
    setMsgInput('')
    setSending(true)
    try {
      const res = await chatApi.sendMessage(selectedConvId, content)
      const newMsg = res.data.data
      setMessages(prev => [...prev, newMsg])
      
      // Update conversation list locally
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === selectedConvId)
        if (idx === -1) return prev
        const updated = [...prev]
        const conv = { ...updated[idx] }
        conv.last_message = { content, created_at: new Date().toISOString(), is_mine: true }
        updated.splice(idx, 1)
        updated.unshift(conv)
        return updated
      })
    } catch (err) {
      console.error(err)
      setMsgInput(content)
    } finally {
      setSending(false)
    }
  }

  function selectConv(id: string) {
    setSelectedConvId(id)
    setMobileShowChat(true)
  }

  const selectedConv = conversations.find(c => c.id === selectedConvId)

  return (
    <div style={{
      display: 'flex', border: '1px solid var(--border)', borderRadius: '16px',
      overflow: 'hidden', height: '600px', background: 'var(--card)'
    }}>
      {/* Sidebar: Conversations List */}
      <div className={`${mobileShowChat ? 'hidden md:flex' : 'flex'}`} style={{
        width: '320px', borderRight: '1px solid var(--border)', flexDirection: 'column', flexShrink: 0
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', fontWeight: 800, fontSize: '18px' }}>
          {t('chat.messages', lang)}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingConvs ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading', lang)}</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('chat.noConversations', lang)}</div>
          ) : (
            conversations.map(conv => {
              const other = conv.other_participant
              const name = other?.name || (lang === 'ru' ? 'Пользователь' : 'Корбар')
              const isSelected = selectedConvId === conv.id
              return (
                <button
                  key={conv.id}
                  onClick={() => selectConv(conv.id)}
                  style={{
                    display: 'flex', gap: '12px', padding: '12px 16px', width: '100%', textAlign: 'left',
                    background: isSelected ? 'var(--accent-dim)' : 'transparent',
                    border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                    background: other ? avatarColor(other.id) : 'var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, color: 'var(--color-white)', overflow: 'hidden'
                  }}>
                    {other?.avatar_url ? (
                      <Image src={other.avatar_url} alt="" width={44} height={44} style={{ objectFit: 'cover' }} />
                    ) : name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                      {conv.last_message && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{relativeTime(conv.last_message.created_at, lang)}</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.last_message?.is_mine ? `${t('chat.you', lang)}: ` : ''}{conv.last_message?.content || '...'}
                      </span>
                      {conv.unread_count > 0 && (
                        <span style={{
                          background: 'var(--accent)', color: 'white', borderRadius: '10px',
                          padding: '2px 6px', fontSize: '10px', fontWeight: 800, minWidth: '18px', textAlign: 'center'
                        }}>{conv.unread_count}</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Main: Messages Pane */}
      <div className={`${!mobileShowChat ? 'hidden md:flex' : 'flex'}`} style={{ flex: 1, flexDirection: 'column', background: 'var(--bg)' }}>
        {selectedConv ? (
          <>
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--card)',
              display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <button onClick={() => setMobileShowChat(false)} className="md:hidden" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>{selectedConv.other_participant?.name || '...'}</div>
                {selectedConv.listing && (
                  <Link href={`/car/${selectedConv.listing.id}`} style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}>
                    {selectedConv.listing.brand} {selectedConv.listing.model} {selectedConv.listing.year}
                  </Link>
                )}
              </div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {loadingMsgs ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>{t('common.loading', lang)}</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>{t('chat.noMessages', lang)}</div>
              ) : (
                messages.map(msg => {
                  const isMine = msg.sender_id === user?.id
                  return (
                    <div key={msg.id} style={{
                      alignSelf: isMine ? 'flex-end' : 'flex-start',
                      maxWidth: '80%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start'
                    }}>
                      <div style={{
                        padding: '8px 14px', borderRadius: isMine ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                        background: isMine ? 'var(--accent)' : 'var(--card)',
                        color: isMine ? 'white' : 'var(--text)',
                        border: isMine ? 'none' : '1px solid var(--border)',
                        fontSize: '14px', lineHeight: 1.4, wordBreak: 'break-word'
                      }}>{msg.content}</div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--card)', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
                placeholder={t('chat.typeMessage', lang)}
                disabled={sending}
                style={{
                  flex: 1, height: '40px', padding: '0 16px', borderRadius: '20px',
                  background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none'
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !msgInput.trim()}
                style={{
                  width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)',
                  color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', opacity: (sending || !msgInput.trim()) ? 0.6 : 1
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: 'translateX(1px)' }}>
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            {t('chat.noConversations', lang)}
          </div>
        )}
      </div>
    </div>
  )
}
