'use client'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { chatApi, uploadApi, BASE_URL } from '@/lib/api'
import type { ConversationItem, ChatMessage, Lang } from '@/types'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

// Static file URLs from the backend are origin-relative in dev (/uploads/…)
const API_ORIGIN = BASE_URL.replace('/api/v1', '')

function resolveAttachmentUrl(url: string): string {
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/* Deterministic pseudo-waveform bars from the message id — purely decorative */
function waveformHeights(seed: string, bars = 24): number[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) }
  const out: number[] = []
  for (let i = 0; i < bars; i++) {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5
    out.push(6 + (Math.abs(h) % 14))
  }
  return out
}

function VoiceMessageBubble({ msg, isMine, lang }: { msg: ChatMessage; isMine: boolean; lang: Lang }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0..1
  const duration = msg.duration_seconds ?? 0
  const bars = waveformHeights(msg.id)
  const fg = isMine ? 'var(--color-white)' : 'var(--accent)'
  const dim = isMine ? 'rgba(255,255,255,0.4)' : 'var(--border-strong)'

  function toggle() {
    if (!audioRef.current) {
      const audio = new Audio(resolveAttachmentUrl(msg.attachment_url ?? ''))
      audio.ontimeupdate = () => {
        if (audio.duration) setProgress(audio.currentTime / audio.duration)
      }
      audio.onended = () => { setPlaying(false); setProgress(0) }
      audioRef.current = audio
    }
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play().catch(() => {})
      setPlaying(true)
    }
  }

  useEffect(() => () => { audioRef.current?.pause() }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '190px' }}>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t('chat.pause', lang) : t('chat.play', lang)}
        style={{
          width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
          background: isMine ? 'rgba(255,255,255,0.22)' : 'var(--accent-dim)',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: fg, padding: 0,
        }}
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
            <rect x="2" y="1.5" width="3.4" height="11" rx="1" /><rect x="8.6" y="1.5" width="3.4" height="11" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
            <path d="M3.5 1.8a1 1 0 011.5-.86l8 5.2a1 1 0 010 1.72l-8 5.2a1 1 0 01-1.5-.86V1.8z" />
          </svg>
        )}
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '20px' }} aria-hidden="true">
          {bars.map((barHeight, i) => (
            <span
              key={i}
              style={{
                width: '3px', height: `${barHeight}px`, borderRadius: '2px', flexShrink: 0,
                background: i / bars.length <= progress ? fg : dim,
                transition: 'background 0.12s linear',
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: '11px', color: isMine ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)' }}>
          {formatDuration(duration)}
        </span>
      </div>
    </div>
  )
}

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

function dayLabel(dateStr: string, lang: 'ru' | 'tj'): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (sameDay(date, today)) return t('common.today', lang)
  if (sameDay(date, yesterday)) return t('common.yesterday', lang)
  return date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'tg-TJ', { day: 'numeric', month: 'long' })
}

/* Read receipt: single check = delivered, double = read */
function ReadCheckIcon({ read }: { read: boolean }) {
  return (
    <svg width="14" height="10" viewBox="0 0 18 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M1 5l3.5 3.5L11 2" />
      {read && <path d="M7.5 8L14.5 2" transform="translate(2.5, 0)" />}
    </svg>
  )
}

function ConversationSkeleton() {
  return (
    <div style={{ display: 'flex', gap: '12px', padding: '12px 16px', alignItems: 'center' }} aria-hidden="true">
      <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div className="skeleton" style={{ width: '55%', height: '12px', borderRadius: '4px' }} />
        <div className="skeleton" style={{ width: '85%', height: '10px', borderRadius: '4px' }} />
      </div>
    </div>
  )
}

function EmptyChatIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      <path d="M8 9h8M8 12h5" />
    </svg>
  )
}

function ChatViewContent({ initialConvId }: { initialConvId: string | null }) {
  const { lang } = useLang()
  const { user } = useAuth()

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
  // Refs so the long-lived socket handler always sees current values
  // without tearing the connection down on every conversation switch
  const selectedConvIdRef = useRef<string | null>(selectedConvId)
  selectedConvIdRef.current = selectedConvId
  const closedIntentionallyRef = useRef(false)

  // ── WebSocket — one connection per session, auto-reconnect ──────────────

  const connectSocket = useCallback(() => {
    if (socketRef.current || !user) return

    const wsUrl = BASE_URL.replace(/^http/, 'ws').replace('/api/v1', '/ws/chat')
    const socket = new WebSocket(wsUrl)

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.event === 'new_message') {
          const convId: string = data.conversation_id
          const newMsg = { ...data.message, conversation_id: convId } as ChatMessage
          const isMine = newMsg.sender_id === user.id
          const isOpen = convId === selectedConvIdRef.current

          if (isOpen) {
            // De-dup: my own REST-sent message is appended by handleSend already
            setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]))
            if (!isMine) chatApi.markRead(convId).catch(() => {})
          }

          // Update conversation list (move to top, update last message)
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === convId)
            if (idx === -1) {
              // Brand-new conversation — refetch the list
              chatApi.listConversations().then((res) => setConversations(res.data.data)).catch(() => {})
              return prev
            }
            const updated = [...prev]
            const conv = { ...updated[idx] }
            conv.last_message = {
              content: newMsg.content,
              created_at: newMsg.created_at,
              is_mine: isMine,
            }
            if (!isOpen && !isMine) conv.unread_count += 1
            updated.splice(idx, 1)
            updated.unshift(conv)
            return updated
          })
        }

        if (data.event === 'messages_read' && data.conversation_id === selectedConvIdRef.current) {
          // The other side read the conversation — flip my ✓ to ✓✓ live
          setMessages((prev) =>
            prev.map((m) => (m.sender_id === user.id && !m.is_read ? { ...m, is_read: true } : m))
          )
        }
      } catch (err) {
        console.error('WS parse error', err)
      }
    }

    socket.onclose = () => {
      socketRef.current = null
      if (!closedIntentionallyRef.current) setTimeout(connectSocket, 3000)
    }

    socketRef.current = socket
  }, [user])

  useEffect(() => {
    closedIntentionallyRef.current = false
    connectSocket()
    return () => {
      closedIntentionallyRef.current = true
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

  // ── Voice recording ──────────────────────────────────────────────────────

  const [recording, setRecording] = useState(false)
  const [recordSecs, setRecordSecs] = useState(0)
  const [micError, setMicError] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recordSecsRef = useRef(0)
  const recordCancelledRef = useRef(false)

  function stopRecordTimer() {
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null }
  }

  async function startRecording() {
    if (recording || !selectedConvId) return
    setMicError(false)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setMicError(true)
      return
    }
    const mime = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/mp4'
    const recorder = new MediaRecorder(stream, { mimeType: mime })
    chunksRef.current = []
    recordCancelledRef.current = false
    recordSecsRef.current = 0

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop())
      stopRecordTimer()
      setRecording(false)
      const durationSeconds = Math.max(1, recordSecsRef.current)
      const convId = selectedConvIdRef.current
      if (recordCancelledRef.current || !convId || chunksRef.current.length === 0) return
      const blob = new Blob(chunksRef.current, { type: mime })
      setSending(true)
      try {
        const up = await uploadApi.audio(blob, mime === 'audio/webm' ? 'voice.webm' : 'voice.m4a')
        const res = await chatApi.sendVoiceMessage(convId, up.data.data.url, durationSeconds)
        const newMsg = res.data.data
        setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]))
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === convId)
          if (idx === -1) return prev
          const updated = [...prev]
          const conv = { ...updated[idx] }
          conv.last_message = { content: '', message_type: 'voice', created_at: new Date().toISOString(), is_mine: true }
          updated.splice(idx, 1)
          updated.unshift(conv)
          return updated
        })
      } catch (err) {
        console.error('voice send failed', err)
      } finally {
        setSending(false)
      }
    }

    recorder.start()
    mediaRecorderRef.current = recorder
    setRecording(true)
    setRecordSecs(0)
    recordTimerRef.current = setInterval(() => {
      recordSecsRef.current += 1
      setRecordSecs(recordSecsRef.current)
      if (recordSecsRef.current >= 120) mediaRecorderRef.current?.stop() // hard cap 2 min
    }, 1000)
  }

  function finishRecording(cancel: boolean) {
    recordCancelledRef.current = cancel
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
  }

  useEffect(() => () => { stopRecordTimer(); mediaRecorderRef.current?.stop() }, [])

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
            <>
              <ConversationSkeleton />
              <ConversationSkeleton />
              <ConversationSkeleton />
              <ConversationSkeleton />
            </>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <EmptyChatIcon />
              <span style={{ fontSize: '14px' }}>{t('chat.noConversations', lang)}</span>
            </div>
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
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                        {conv.last_message?.is_mine ? `${t('chat.you', lang)}: ` : ''}
                        {conv.last_message?.message_type === 'voice' ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
                              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
                            </svg>
                            {t('chat.voiceMessage', lang)}
                          </>
                        ) : (
                          conv.last_message?.content || '...'
                        )}
                      </span>
                      {conv.unread_count > 0 && (
                        <span style={{
                          background: 'var(--accent)', color: 'var(--color-white)', borderRadius: '12px',
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} aria-hidden="true">
                  {[64, 45, 72, 38].map((w, i) => (
                    <div
                      key={i}
                      className="skeleton"
                      style={{
                        alignSelf: i % 2 ? 'flex-end' : 'flex-start',
                        width: `${w}%`,
                        height: '38px',
                        borderRadius: '16px',
                      }}
                    />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', margin: 'auto' }}>
                  <EmptyChatIcon />
                  <span style={{ fontSize: '14px' }}>{t('chat.noMessages', lang)}</span>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMine = msg.sender_id === user?.id
                  const prev = messages[i - 1]
                  const showDay =
                    !prev || new Date(prev.created_at).toDateString() !== new Date(msg.created_at).toDateString()
                  return (
                    <div key={msg.id} style={{ display: 'contents' }}>
                      {showDay && (
                        <div style={{ alignSelf: 'center', margin: '8px 0 2px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--tag-bg)', padding: '3px 10px', borderRadius: '20px' }}>
                            {dayLabel(msg.created_at, lang)}
                          </span>
                        </div>
                      )}
                      <div style={{
                        alignSelf: isMine ? 'flex-end' : 'flex-start',
                        maxWidth: '80%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start'
                      }}>
                        <div style={{
                          padding: msg.message_type === 'voice' ? '8px 12px' : '8px 14px',
                          borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: isMine ? 'var(--accent)' : 'var(--card)',
                          color: isMine ? 'var(--color-white)' : 'var(--text)',
                          border: isMine ? 'none' : '1px solid var(--border)',
                          boxShadow: 'var(--sh-card)',
                          fontSize: '14px', lineHeight: 1.45, wordBreak: 'break-word', whiteSpace: 'pre-wrap'
                        }}>
                          {msg.message_type === 'voice' && msg.attachment_url
                            ? <VoiceMessageBubble msg={msg} isMine={isMine} lang={lang} />
                            : msg.content}
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isMine && (
                            <span style={{ color: msg.is_read ? 'var(--accent)' : 'var(--text-muted)', display: 'inline-flex' }} aria-label={msg.is_read ? t('chat.read', lang) : t('chat.sent', lang)}>
                              <ReadCheckIcon read={msg.is_read} />
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--card)', display: 'flex', gap: '8px', alignItems: 'center' }}>
              {recording ? (
                <>
                  {/* Recording bar — pulsing dot + timer + cancel/send */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', height: '44px', padding: '0 16px', borderRadius: '22px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <span className="animate-fade-in" style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-error)', animation: 'recordPulse 1s ease-in-out infinite' }} aria-hidden="true" />
                    <style>{`@keyframes recordPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.25 } }`}</style>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatDuration(recordSecs)}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('chat.voiceMessage', lang)}</span>
                  </div>
                  <button
                    onClick={() => finishRecording(true)}
                    aria-label={t('chat.cancelRecording', lang)}
                    style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--tag-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => finishRecording(false)}
                    aria-label={t('chat.sendRecording', lang)}
                    style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--accent)', color: 'var(--color-white)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: 'translateX(1px)' }} aria-hidden="true">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={msgInput}
                    onChange={e => setMsgInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
                    placeholder={micError ? t('chat.micDenied', lang) : t('chat.typeMessage', lang)}
                    disabled={sending}
                    style={{
                      flex: 1, height: '44px', padding: '0 16px', borderRadius: '22px',
                      background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none',
                      fontSize: '15px', fontFamily: 'var(--font)', minWidth: 0
                    }}
                  />
                  {msgInput.trim() ? (
                    <button
                      onClick={handleSend}
                      disabled={sending}
                      aria-label={t('chat.send', lang)}
                      style={{
                        width: '44px', height: '44px', borderRadius: '50%', background: 'var(--accent)',
                        color: 'var(--color-white)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', opacity: sending ? 0.6 : 1, flexShrink: 0,
                        transition: 'opacity 0.15s ease, background 0.15s ease'
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: 'translateX(1px)' }} aria-hidden="true">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={startRecording}
                      disabled={sending}
                      aria-label={t('chat.recordVoice', lang)}
                      style={{
                        width: '44px', height: '44px', borderRadius: '50%',
                        background: 'var(--accent-dim)', color: 'var(--accent)', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', opacity: sending ? 0.6 : 1, flexShrink: 0,
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
                      </svg>
                    </button>
                  )}
                </>
              )}
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

function ChatViewWithParams() {
  const searchParams = useSearchParams()
  return <ChatViewContent initialConvId={searchParams.get('conv')} />
}

export default function ChatView() {
  return (
    <Suspense fallback={null}>
      <ChatViewWithParams />
    </Suspense>
  )
}
