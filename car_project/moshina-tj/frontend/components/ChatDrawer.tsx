'use client'
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  KeyboardEvent,
} from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { chatApi } from '@/lib/api'
import type { ConversationItem, ChatMessage } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useSocket } from '@/lib/SocketContext'
import { useChatDrawer } from '@/lib/ChatDrawerContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

// ─── SVG Icons ───────────────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(iso: string, lang: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffSec = Math.floor((now - then) / 1000)
  if (diffSec < 60) return lang === 'ru' ? 'сейчас' : 'ҳозир'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}м`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}ч`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return lang === 'ru' ? 'вчера' : 'дирӯз'
  const d = new Date(iso)
  return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'tg-TJ', { day: 'numeric', month: 'short' })
}

function getInitial(name: string | null | undefined): string {
  if (!name) return '?'
  return name.trim().charAt(0).toUpperCase()
}

// Deterministic accent color from name for avatar circles
const AVATAR_COLORS = [
  '#e63946', '#2a9d8f', '#e9c46a', '#f4a261', '#264653',
  '#6d6875', '#457b9d', '#2ec4b6', '#ff9f1c', '#8338ec',
]
function avatarColor(name: string | null | undefined): string {
  if (!name) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface AvatarProps {
  name: string | null | undefined
  size?: number
}
function Avatar({ name, size = 36 }: AvatarProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: avatarColor(name),
        color: 'var(--color-white)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.42),
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {getInitial(name)}
    </div>
  )
}

// ─── Conversation List ────────────────────────────────────────────────────────

interface ConvListProps {
  conversations: ConversationItem[]
  loading: boolean
  onSelect: (convId: string) => void
  activeConvId: string | null
  lang: string
}

function ConversationList({ conversations, loading, onSelect, lang }: ConvListProps) {
  if (loading) {
    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="skeleton" style={{ height: 12, width: '60%', borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 11, width: '85%', borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: '14px',
        padding: '32px 16px',
        textAlign: 'center',
      }}>
        {t('chat.noConversations', lang as 'ru' | 'tj')}
      </div>
    )
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, overflowY: 'auto', flex: 1 }} role="list">
      {conversations.map((conv) => {
        const name = conv.other_participant?.name ?? t('chat.support', lang as 'ru' | 'tj')
        const lastMsg = conv.last_message
        const preview = lastMsg
          ? (lastMsg.is_mine ? `${t('chat.you', lang as 'ru' | 'tj')}: ` : '') + lastMsg.content
          : ''
        const time = lastMsg ? relativeTime(lastMsg.created_at, lang) : ''

        return (
          <li key={conv.id}>
            <button
              onClick={() => onSelect(conv.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <Avatar name={name} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '160px',
                  }}>
                    {name}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{time}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}>
                    {conv.listing ? `${conv.listing.brand} ${conv.listing.model} · ` : ''}{preview}
                  </span>
                  {conv.unread_count > 0 && (
                    <span style={{
                      background: 'var(--accent)',
                      color: 'var(--color-white)',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      minWidth: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 5px',
                      flexShrink: 0,
                    }}>
                      {conv.unread_count > 9 ? '9+' : conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// ─── Chat View ────────────────────────────────────────────────────────────────

interface ChatViewProps {
  convId: string
  lang: string
  otherName: string | null
  listing: ConversationItem['listing']
}

function ChatView({ convId, lang, otherName, listing }: ChatViewProps) {
  const { user } = useAuth()
  const { sendMessage: sendViaSocket } = useSocket()
  const { onMessage } = useSocket()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    setLoading(true)
    setMessages([])
    chatApi
      .getMessages(convId)
      .then((res) => {
        const items = res.data.data.items ?? []
        setMessages([...items].reverse())
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    chatApi.markRead(convId).catch(() => {})
  }, [convId])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    const unsub = onMessage((msg) => {
      if (msg.conversation_id !== convId) return
      setMessages((prev) => {
        // Deduplicate by id
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    })
    return unsub
  }, [convId, onMessage])

  async function handleSend() {
    const content = input.trim()
    if (!content || sending) return
    setInput('')
    setSending(true)
    try {
      const res = await chatApi.sendMessage(convId, content)
      const msg = res.data.data
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      // Also push via WebSocket for real-time delivery to recipient
      sendViaSocket(convId, content)
    } catch {
      // Restore input on failure
      setInput(content)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* Pinned listing card */}
      {listing && (
        <Link
          href={`/car/${listing.id}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface)',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          {/* Thumbnail */}
          {listing.image_url ? (
            <Image
              src={listing.image_url}
              alt=""
              width={52}
              height={40}
              style={{ objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 52, height: 40, borderRadius: '6px', flexShrink: 0,
              background: 'var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="2"/>
                <path d="M16 8h4l3 5v3h-7V8z"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
          )}
          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {listing.brand} {listing.model} · {listing.year}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700, marginTop: '2px' }}>
              {listing.price.toLocaleString()} USD
            </div>
          </div>
          {/* Pin icon */}
          <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            <PinIcon />
          </span>
        </Link>
      )}

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ display: 'flex', justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start' }}>
                <div className="skeleton" style={{ height: 36, width: '55%', borderRadius: 12 }} />
              </div>
            ))}
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: '13px',
            textAlign: 'center',
            padding: '32px 0',
          }}>
            {t('chat.noMessages', lang as 'ru' | 'tj')}
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{
                maxWidth: '75%',
                padding: '8px 12px',
                borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: isMe ? 'var(--accent)' : 'var(--surface)',
                color: isMe ? 'var(--color-white)' : 'var(--text)',
                fontSize: '14px',
                lineHeight: 1.4,
                wordBreak: 'break-word',
              }}>
                {msg.content}
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', padding: '0 4px' }}>
                {relativeTime(msg.created_at, lang)}
              </span>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
        background: 'var(--card)',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={t('chat.typeMessage', lang as 'ru' | 'tj')}
          disabled={sending}
          aria-label={t('chat.typeMessage', lang as 'ru' | 'tj')}
          style={{
            flex: 1,
            resize: 'none',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '8px 12px',
            fontSize: '14px',
            background: 'var(--surface)',
            color: 'var(--text)',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.4,
            maxHeight: '100px',
            overflowY: 'auto',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          aria-label={t('chat.send', lang as 'ru' | 'tj')}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: input.trim() && !sending ? 'var(--accent)' : 'var(--border)',
            color: input.trim() && !sending ? 'var(--color-white)' : 'var(--text-muted)',
            border: 'none',
            cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s ease',
          }}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  )
}

// ─── Main ChatDrawer ──────────────────────────────────────────────────────────

export default function ChatDrawer() {
  const { isOpen, activeConvId, mode, lastCreatedConv, close, openSupport } = useChatDrawer()
  const { user } = useAuth()
  const { onMessage } = useSocket()
  const { lang } = useLang()
  const [localConvId, setLocalConvId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'chats' | 'support'>('chats')
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [convsLoading, setConvsLoading] = useState(false)

  // Sync activeConvId from context into local state
  useEffect(() => {
    setLocalConvId(activeConvId)
  }, [activeConvId])

  // Sync mode → tab
  useEffect(() => {
    if (mode === 'support') setActiveTab('support')
    else setActiveTab('chats')
  }, [mode])

  // Fetch conversation list when drawer opens
  useEffect(() => {
    if (!isOpen || !user) return
    setConvsLoading(true)
    chatApi
      .listConversations()
      .then((res) => setConversations(res.data.data))
      .catch(() => {})
      .finally(() => setConvsLoading(false))
  }, [isOpen, user])

  // Prepend lastCreatedConv if it's not already in the list (fixes "Write to Seller" race condition)
  useEffect(() => {
    if (!lastCreatedConv) return
    setConversations((prev) => {
      if (prev.some((c) => c.id === lastCreatedConv.id)) return prev
      return [lastCreatedConv, ...prev]
    })
  }, [lastCreatedConv])

  // Update conversation list last message + unread on incoming socket messages
  useEffect(() => {
    if (!isOpen) return
    const unsub = onMessage((msg) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== msg.conversation_id) return conv
          const isFromMe = msg.sender_id === user?.id
          return {
            ...conv,
            last_message: {
              content: msg.content,
              created_at: msg.created_at,
              is_mine: isFromMe,
            },
            unread_count: isFromMe || localConvId === conv.id ? 0 : conv.unread_count + 1,
            updated_at: msg.created_at,
          }
        })
      )
    })
    return unsub
  }, [isOpen, onMessage, user, localConvId])

  // When support tab is selected and no convId yet, trigger openSupport
  useEffect(() => {
    if (activeTab === 'support' && isOpen && !localConvId && user) {
      openSupport()
    }
  }, [activeTab, isOpen, localConvId, user, openSupport])

  // Reset localConvId when switching to chats tab
  function handleTabChange(tab: 'chats' | 'support') {
    setActiveTab(tab)
    if (tab === 'chats') {
      setLocalConvId(null)
    }
  }

  // Find name for chat view header
  const activeConv = conversations.find((c) => c.id === localConvId)
  const otherName = activeConv?.other_participant?.name ?? null

  if (!user) return null

  return (
    <>
      {/* Backdrop — mobile only */}
      {isOpen && (
        <div
          onClick={close}
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 199,
            display: 'none',
          }}
          className="chat-drawer-backdrop"
        />
      )}

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('chat.messages', lang)}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100dvh',
          width: '380px',
          zIndex: 200,
          background: 'var(--card)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease',
          willChange: 'transform',
        }}
        className="chat-drawer-panel"
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          borderBottom: '2px solid var(--accent)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {localConvId && (
              <button
                onClick={() => setLocalConvId(null)}
                aria-label={t('chat.back', lang)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  borderRadius: '6px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <BackIcon />
              </button>
            )}
            {localConvId && otherName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Avatar name={otherName} size={28} />
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{otherName}</span>
              </div>
            ) : (
              <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>
                {t('chat.messages', lang)}
              </span>
            )}
          </div>
          <button
            onClick={close}
            aria-label="Close chat"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
              borderRadius: '6px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Tabs — only show when not in a conversation */}
        {!localConvId && (
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            {(['chats', 'support'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: activeTab === tab ? 700 : 500,
                  color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                  transition: 'color 0.15s ease, border-color 0.15s ease',
                }}
              >
                {tab === 'chats' ? t('chat.allChats', lang) : t('chat.support', lang)}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {localConvId ? (
            <ChatView
              convId={localConvId}
              lang={lang}
              otherName={otherName}
              listing={activeConv?.listing ?? null}
            />
          ) : (
            <ConversationList
              conversations={activeTab === 'chats'
                ? conversations.filter((c) => c.type === 'direct')
                : conversations.filter((c) => c.type === 'support')}
              loading={convsLoading}
              onSelect={(id) => setLocalConvId(id)}
              activeConvId={localConvId}
              lang={lang}
            />
          )}
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 640px) {
          .chat-drawer-panel {
            width: 100vw !important;
          }
          .chat-drawer-backdrop {
            display: block !important;
          }
        }
      `}</style>
    </>
  )
}
