'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Brain,
  Loader2,
  Map,
  Send,
  BookOpen,
  Lightbulb,
  Sparkles,
  User,
  Pencil,
  Trash2,
  Check,
  X,
  Copy,
  Share2,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'
import SpeakButton from '@/components/SpeakButton'
import { onChatMessage, onMapUpdated } from '@/lib/gamification'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { domainTitle as domainTitleI18n, getDictionary } from '@/lib/i18n/dictionaries'
import {
  saveConversationToServer,
  loadConversationFromServer,
  saveMindMapToServer,
  archiveLocalChat,
  recoverConversation,
  recoverEverything,
} from '@/lib/sync'

type Book = { title: string; author: string; reason: string }
type DomainMeta = { title: string; emoji: string; books: Book[]; hooks: string[] }

const domainInfo: Record<string, DomainMeta> = {
  general: {
    title: 'گفت‌وگوی آزاد',
    emoji: '🌐',
    books: [{ title: 'هنر شفاف اندیشیدن', author: 'رولف دوبلی', reason: 'برای نظم ذهنی و دوری از خطاهای رایج.' }],
    hooks: ['موضوع را با یک مثال واقعی بگو.', 'نظر + دلیل کوتاه کافی است.'],
  },
  philosophy: {
    title: 'فلسفه',
    emoji: '🧠',
    books: [{ title: 'دنیای سوفی', author: 'یوستین گوردر', reason: 'آشنایی روایی با پرسش‌های فلسفی.' }],
    hooks: ['تفاوت نظر و دلیل را روشن کن.', 'یک مثال روزمره بزن.'],
  },
  religion: {
    title: 'دین و الهیات',
    emoji: '🕌',
    books: [{ title: 'خدا و انسان', author: 'متون مقدماتی', reason: 'ورود منظم به بحث ایمان و عقل.' }],
    hooks: ['بین باور، دلیل و تجربه تمایز بگذار.'],
  },
  ethics: {
    title: 'اخلاق',
    emoji: '⚖️',
    books: [{ title: 'فلسفه اخلاق', author: 'متون مقدماتی', reason: 'فهم خوب و بد فراتر از سلیقه.' }],
    hooks: ['بگو چرا کاری را درست می‌دانی.'],
  },
  programming: {
    title: 'برنامه‌نویسی',
    emoji: '💻',
    books: [{ title: 'Clean Code', author: 'Robert C. Martin', reason: 'کد تمیز و قابل نگهداری.' }],
    hooks: ['با مثال کد یا مسئله واقعی جواب بده.'],
  },
  math: {
    title: 'ریاضی',
    emoji: '📐',
    books: [{ title: 'آشنایی با استدلال ریاضی', author: 'متون مقدماتی', reason: 'تقویت منطق اثبات.' }],
    hooks: ['تعریف و مثال را با هم بیاور.'],
  },
  physics: {
    title: 'فیزیک',
    emoji: '⚛️',
    books: [{ title: 'شش قطعه آسان', author: 'ریچارد فاینمن', reason: 'درک مفهومی فیزیک.' }],
    hooks: ['مفهوم را به پدیده واقعی وصل کن.'],
  },
  chemistry: {
    title: 'شیمی',
    emoji: '🧪',
    books: [{ title: 'شیمی عمومی مقدماتی', author: 'متون آموزشی', reason: 'پایه واکنش و ساختار ماده.' }],
    hooks: ['از سطح ذره‌ای تا پدیده قابل مشاهده پل بزن.'],
  },
  biology: {
    title: 'زیست‌شناسی',
    emoji: '🧬',
    books: [{ title: 'ژن خودخواه', author: 'ریچارد داوکینز', reason: 'نگاه مفهومی به تکامل و ژن.' }],
    hooks: ['بین توصیف و تبیین علمی فرق بگذار.'],
  },
  history: {
    title: 'تاریخ',
    emoji: '📜',
    books: [{ title: 'چرا ملت‌ها شکست می‌خورند', author: 'عجم‌اوغلو و رابینسون', reason: 'پیوند نهاد و تاریخ.' }],
    hooks: ['علت و زمینه را بگو، نه فقط تاریخ رخداد.'],
  },
  psychology: {
    title: 'روان‌شناسی',
    emoji: '🧩',
    books: [{ title: 'تفکر، سریع و کند', author: 'دنیل کانمن', reason: 'سوگیری‌ها و تصمیم‌گیری.' }],
    hooks: ['نظریه را به رفتار واقعی وصل کن.'],
  },
  literature: {
    title: 'ادبیات',
    emoji: '📚',
    books: [{ title: 'نظریه ادبیات مقدماتی', author: 'متون آموزشی', reason: 'خواندن آگاهانه‌تر متن.' }],
    hooks: ['از احساس صرف به تحلیل فرم و معنا برو.'],
  },
  economics: {
    title: 'اقتصاد',
    emoji: '📈',
    books: [{ title: 'اقتصاد به زبان ساده', author: 'متون مقدماتی', reason: 'مفاهیم پایه انگیزه و مبادله.' }],
    hooks: ['محدودیت و انتخاب را در مثال روشن کن.'],
  },
}

type Message = { id: number; role: 'assistant' | 'user'; content: string }
type SessionInsight = {
  level: 'مقدماتی' | 'متوسط' | 'پیشرفته'
  strengths: string[]
  gaps: string[]
  lessonTitle: string
  lessonText: string
  lessonExample: string
  question: string
  book: Book | null
}

const USER_KEY = 'wai_user_name'
const STAGE_KEY = 'wai_assessment_stage'
const MAP_KEY = 'wai_map_unified'

function welcomeByLocale(locale: string, name: string, domainTitle: string) {
  if (locale === 'en') return `Hi ${name}. We'll talk about "${domainTitle}". Answer in your own words — short is fine.`
  if (locale === 'ar') return `مرحباً ${name}. سنتحدث عن «${domainTitle}». أجب بكلماتك.`
  return `سلام ${name}. دربارهٔ «${domainTitle}» حرف می‌زنیم. کوتاه و با زبان خودت جواب بده.`
}


function chatKey(domain: string) {
  return `wai_chat_${domain}`
}

function parseAsJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function pickBook(_domain: string, _used: string[], _force = false) {
  // کتاب ثابت حذف شد؛ پیشنهاد فقط از پاسخ هوش مصنوعی می‌آید
  return null
}

function parseBookFromText(content: string): Book | null {
  if (!content) return null
  const title = content.match(/کتاب پیشنهادی\s*[:：]\s*(.+)/i)?.[1]?.trim()
  if (!title) return null
  const author = content.match(/نویسنده\s*[:：]\s*(.+)/i)?.[1]?.trim() || 'نامشخص'
  const reason =
    content.match(/چرا این کتاب\s*[:：]\s*(.+)/i)?.[1]?.trim() ||
    content.match(/دلیل\s*[:：]\s*(.+)/i)?.[1]?.trim() ||
    'مرتبط با گفتگوی جاری'
  return {
    title: title.replace(/\*+/g, '').trim(),
    author: author.replace(/\*+/g, '').trim(),
    reason: reason.replace(/\*+/g, '').trim(),
  }
}

function buildLocalInsight(domain: string, messages: Message[]): SessionInsight {
  const info = domainInfo[domain] || domainInfo.general
  const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content.trim()).filter(Boolean)
  const last = userMessages[userMessages.length - 1] || ''
  const words = last.split(/\s+/).filter(Boolean).length
  const hasExample = /مثال|مثلاً|example/i.test(last)
  const hasReason = /چون|زیرا|دلیل|because/i.test(last)
  const level: SessionInsight['level'] = words < 12 ? 'مقدماتی' : hasExample && hasReason ? 'پیشرفته' : 'متوسط'
  const strengths: string[] = []
  const gaps: string[] = []
  if (hasReason) strengths.push('به دلیل توجه کرده‌ای.')
  else gaps.push('یک دلیل کوتاه اضافه کن.')
  if (hasExample) strengths.push('از مثال استفاده کرده‌ای.')
  else gaps.push('یک مثال واقعی بزن.')
  if (words > 18) strengths.push('پاسخ نسبتاً کامل است.')
  else gaps.push('کمی بیشتر توضیح بده.')
  const hook = info.hooks[(messages.length + userMessages.length) % info.hooks.length]
  return {
    level,
    strengths,
    gaps,
    lessonTitle: 'نکته کوتاه',
    lessonText: hook,
    lessonExample: 'نظر + دلیل + مثال.',
    question: 'همین ایده را با یک مثال تازه می‌گویی؟',
    book: pickBook(domain, [], false),
  }
}

export default function AssessmentPage() {
  const { dict, dir, locale } = useLocale()
  const params = useParams()
  const domain = (params.domain as string) || 'general'
  const domainLabel = domainTitleI18n(locale, domain)
  const info = domainInfo[domain] || domainInfo.general

  const [userName, setUserName] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [needsName, setNeedsName] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [reactions, setReactions] = useState<Record<number, 'like' | 'dislike' | null>>({})
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [ready, setReady] = useState(false)
  const [mapUpdating, setMapUpdating] = useState(false)
  const [insight, setInsight] = useState<SessionInsight | null>(null)
  const [usedBooks, setUsedBooks] = useState<string[]>([])
  const [lastBook, setLastBook] = useState<Book | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)
  const forceClearRef = useRef(false)

  useEffect(() => {
    const savedName = localStorage.getItem(USER_KEY)?.trim() || ''
    const savedChat = localStorage.getItem(chatKey(domain))
    const savedStage = localStorage.getItem(STAGE_KEY)

    if (savedName) {
      setUserName(savedName)
      setNeedsName(false)
    }
    if (savedStage) {
      const parsed = parseAsJson<{ usedBooks?: string[] }>(savedStage)
      if (parsed?.usedBooks) setUsedBooks(safeArray<string>(parsed.usedBooks))
    }
    // اول محلی (سریع) — بعد در پس‌زمینه سرور
    if (savedChat) {
      const parsed = parseAsJson<Message[]>(savedChat)
      if (parsed?.length) {
        setMessages(parsed)
        startedRef.current = true
        setReady(true)
        void recoverConversation(domain).then((recovered) => {
          if (forceClearRef.current) return
          if (recovered?.length && recovered.length > parsed.length) {
            setMessages(recovered as Message[])
          }
        })
        return
      }
    }
    void (async () => {
      const recovered = await recoverConversation(domain)
      if (forceClearRef.current) {
        setReady(true)
        return
      }
      if (recovered?.length) {
        setMessages(recovered as Message[])
        startedRef.current = true
        setReady(true)
        return
      }
      if (savedName) {
        setMessages([
          {
            id: 1,
            role: 'assistant',
            content: welcomeByLocale(locale, savedName, domainLabel || info.title),
          },
        ])
      }
      setReady(true)
    })()
  }, [domain, info.title, locale, domainLabel])

  useEffect(() => {
    if (!ready || messages.length === 0) return
    try {
      // گفتگوی جدید: اجازه بده تاریخچه کوتاه جایگزین بلند شود
      if (!forceClearRef.current) {
        const prevRaw = localStorage.getItem(chatKey(domain))
        const prev = prevRaw ? JSON.parse(prevRaw) : []
        if (Array.isArray(prev) && prev.length > messages.length) return
      }
      localStorage.setItem(chatKey(domain), JSON.stringify(messages))
      // کمی نگه دار تا recover پس‌زمینه دوباره پیام‌های قدیمی را نیاورد
      window.setTimeout(() => {
        forceClearRef.current = false
      }, 2500)
    } catch {
      localStorage.setItem(chatKey(domain), JSON.stringify(messages))
      window.setTimeout(() => {
        forceClearRef.current = false
      }, 2500)
    }
    void saveConversationToServer(domain, messages, info.title)
  }, [messages, domain, ready, info.title])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem(STAGE_KEY, JSON.stringify({ usedBooks }))
  }, [usedBooks, ready])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
  }, [messages, isTyping, insight])

  const saveName = () => {
    const n = nameInput.trim()
    if (!n) return
    localStorage.setItem(USER_KEY, n)
    setUserName(n)
    setNeedsName(false)
    startedRef.current = false
    setMessages([
      {
        id: Date.now(),
        role: 'assistant',
        content: welcomeByLocale(locale, n, domainLabel || info.title),
      },
    ])
  }

  const callAI = async (allMessages: Message[], suggestBook = false) => {
    const res = await fetch('/api/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain,
        suggestBook,
        lastBook,
        messages: [
          { role: 'user', content: `نام کاربر: ${userName || nameInput || 'کاربر'}` },
          ...allMessages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success || typeof data.content !== 'string' || !data.content.trim()) {
      const detail =
        (typeof data?.details === 'string' && data.details.slice(0, 180)) ||
        (typeof data?.error === 'string' && data.error) ||
        `HTTP ${res.status}`
      throw new Error(detail)
    }
    return data.content as string
  }

  const updateMapFromChat = async (allMessages: Message[]) => {
    const hasUser = allMessages.some((m) => m.role === 'user' && m.content.trim())
    if (!hasUser) return
    setMapUpdating(true)
    try {
      let previousMap = null
      try {
        const raw = localStorage.getItem(MAP_KEY)
        if (raw) previousMap = JSON.parse(raw)
      } catch {
        previousMap = null
      }
      const res = await fetch('/api/analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          userName: userName || nameInput || 'کاربر',
          messages: allMessages,
          previousMap,
        }),
      })
      const data = await res.json().catch(() => null)
      if (data?.success && data.map) {
        localStorage.setItem(MAP_KEY, JSON.stringify(data.map))
        window.dispatchEvent(new Event('wai-map-updated'))
        try { onMapUpdated() } catch {}
        void saveMindMapToServer(data.map)
      }
    } catch {
    } finally {
      setMapUpdating(false)
    }
  }

  const computeInsight = (allMessages: Message[]) => {
    const local = buildLocalInsight(domain, allMessages)
    setInsight(local)
    if (local.book) {
      const key = `${local.book.title}::${local.book.author}`
      if (!usedBooks.includes(key)) setUsedBooks((prev) => Array.from(new Set([...prev, key])))
    }
    return local
  }

  useEffect(() => {
    if (!ready || needsName || !userName || startedRef.current) return
    if (messages.length === 0) return
    const onlyWelcome = messages.length === 1 && messages[0].role === 'assistant'
    if (!onlyWelcome) {
      startedRef.current = true
      return
    }
    const timer = setTimeout(async () => {
      startedRef.current = true
      setIsTyping(true)
      try {
        const reply = await callAI(messages)
        const withReply: Message[] = [...messages, { id: Date.now(), role: 'assistant', content: reply }]
        setMessages(withReply)
        computeInsight(withReply)
      } catch {
        const fallback = buildLocalInsight(domain, messages)
        setInsight(fallback)
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: 'assistant',
            content: `فعلاً وصل نشدم. این سؤال را جواب بده:\n\n${fallback.question}`,
          },
        ])
      } finally {
        setIsTyping(false)
      }
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, needsName, userName, messages.length])


  /** آخرین پیام کاربر (فقط همان قابل ویرایش است) */
  const lastUserMessageId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i].id
    }
    return null as number | null
  })()

  const persistMessages = (list: Message[]) => {
    setMessages(list)
    try {
      localStorage.setItem(chatKey(domain), JSON.stringify(list))
    } catch {
      /* ignore */
    }
    try {
      void saveConversationToServer(domain, list)
    } catch {
      /* ignore */
    }
  }

  /** ویرایش آخرین پیام کاربر → مثل پیام جدید؛ AI دوباره جواب می‌دهد */
  const saveEditUserMessage = async () => {
    if (editingId == null || isTyping || needsName) return
    const text = editText.trim()
    if (!text) return
    if (editingId !== lastUserMessageId) {
      setEditingId(null)
      setEditText('')
      return
    }
    const idx = messages.findIndex((m) => m.id === editingId && m.role === 'user')
    if (idx < 0) return

    // همه پیام‌های بعد از این پیام کاربر حذف (از جمله جواب AI)
    const base = messages.slice(0, idx)
    const edited: Message = { id: Date.now(), role: 'user', content: text }
    const next = [...base, edited]
    setEditingId(null)
    setEditText('')
    persistMessages(next)
    setIsTyping(true)
    try {
      const userCount = next.filter((m) => m.role === 'user').length
      const suggestBook = userCount > 0 && userCount % 5 === 0
      const reply = await callAI(next, suggestBook)
      const withReply: Message[] = [...next, { id: Date.now() + 1, role: 'assistant', content: reply }]
      persistMessages(withReply)
      try {
        onChatMessage(domain)
      } catch {
        /* ignore */
      }
      computeInsight(withReply)
    } catch {
      persistMessages([
        ...next,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'خطا در پاسخ. دوباره تلاش کن.',
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }


  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = content
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      } catch {
        /* ignore */
      }
    }
  }

  const shareMessage = async (content: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ text: content })
        return
      }
    } catch {
      /* user cancel or fail → copy */
    }
    await copyMessage(content)
  }

  const toggleReaction = (id: number, kind: 'like' | 'dislike') => {
    setReactions((prev) => {
      const cur = prev[id]
      if (cur === kind) return { ...prev, [id]: null }
      return { ...prev, [id]: kind }
    })
  }

  /** حذف پیام؛ اگر پیام کاربر بود، جواب AI بلافاصله بعدش هم حذف می‌شود */
  const deleteMessage = (id: number) => {
    if (isTyping) return
    const idx = messages.findIndex((m) => m.id === id)
    if (idx < 0) return
    const msg = messages[idx]
    if (!window.confirm(msg.role === 'user' ? 'این پیام و پاسخ هوش مصنوعی مربوط حذف شود؟' : 'این پیام حذف شود؟')) {
      return
    }
    const next = [...messages]
    if (msg.role === 'user') {
      // حذف پیام کاربر
      next.splice(idx, 1)
      // اگر پیام بعدی assistant بود، آن را هم حذف کن
      if (next[idx] && next[idx].role === 'assistant') {
        next.splice(idx, 1)
      }
    } else {
      next.splice(idx, 1)
    }
    // حداقل پیام خوش‌آمد بماند
    if (next.length === 0) {
      next.push({
        id: Date.now(),
        role: 'assistant',
        content: welcomeByLocale(locale, userName || nameInput || 'کاربر', domainLabel || info.title),
      })
    }
    persistMessages(next)
    if (editingId === id) {
      setEditingId(null)
      setEditText('')
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isTyping || needsName) return
    const userMessage: Message = { id: Date.now(), role: 'user', content: input.trim() }
    const next = [...messages, userMessage]
    setMessages(next)
    setInput('')
    setIsTyping(true)
    try {
      const userCount = next.filter((m) => m.role === 'user').length
      // حدود هر ۵ پیام کاربر یک کتاب مرتبط
      const suggestBook = userCount > 0 && userCount % 5 === 0
      const reply = await callAI(next, suggestBook)
      const withReply: Message[] = [...next, { id: Date.now() + 1, role: 'assistant', content: reply }]
      setMessages(withReply)
      const parsedBook = parseBookFromText(reply)
      if (parsedBook) {
        setLastBook(parsedBook)
        setInsight((prev) =>
          prev
            ? { ...prev, book: parsedBook }
            : {
                level: 'متوسط',
                strengths: [],
                gaps: [],
                lessonTitle: 'کتاب پیشنهادی',
                lessonText: parsedBook.reason,
                lessonExample: '',
                question: '',
                book: parsedBook,
              }
        )
      } else {
        computeInsight(withReply)
      }
      try { onChatMessage(domain) } catch {}
      setIsTyping(false)
      // نقشه فقط هر ۵ پیام کاربر (کاهش فشار + اطلاع به کاربر)
      if (userCount > 0 && userCount % 5 === 0) {
        void updateMapFromChat(withReply)
      }
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : ''
      const localInsight = computeInsight(next)
      const hint =
        detail && detail.length < 220
          ? `

(جزئیات: ${detail})`
          : ''
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content:
            `الان نتوانستم از هوش مصنوعی پاسخ بگیرم. یک‌بار دیگر بفرست.` +
            hint +
            (localInsight?.question ? `

${localInsight.question}` : ''),
        },
      ])
      setIsTyping(false)
    }
  }

  const clearChat = () => {
    // قبل از پاک شدن UI، یک‌بار روی نقشه ذهنی اثر بگذارد (خود پیام‌ها آرشیو/ذخیره نمی‌شوند)
    const snapshot = messages
    if (snapshot.some((m) => m.role === 'user' && m.content.trim())) {
      void updateMapFromChat(snapshot)
    }
    forceClearRef.current = true
    startedRef.current = false
    setLastBook(null)
    setInsight(null)
    try {
      localStorage.removeItem(chatKey(domain))
    } catch {
      /* ignore */
    }
    const welcome: Message = {
      id: Date.now(),
      role: 'assistant',
      content:
        locale === 'en'
          ? `Alright ${userName || 'friend'}. Fresh chat on "${domainLabel}". Previous messages are cleared here; your mind map stays.`
          : locale === 'ar'
            ? `حسنًا ${userName || 'صديقي'}. محادثة جديدة عن «${domainLabel}». الرسائل هنا مُسحت والخريطة الذهنية تبقى.`
            : `باشه ${userName || 'رفیق'}. گفتگوی «${domainLabel || info.title}» از نو شروع شد. پیام‌های قبلی از این صفحه پاک شدند؛ نقشه ذهنی‌ات می‌ماند.`,
    }
    setMessages([welcome])
    try {
      localStorage.setItem(chatKey(domain), JSON.stringify([welcome]))
    } catch {
      /* ignore */
    }
    void saveConversationToServer(domain, [welcome], info.title)
  }

  const currentBook = useMemo(() => lastBook || insight?.book || null, [lastBook, insight])

  if (!ready) {
    return (
      <main dir={dir} className="min-h-screen flex items-center justify-center" style={{ color: 'var(--text)' }}>
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
      </main>
    )
  }

  if (needsName) {
    return (
      <main dir={dir} className="min-h-screen flex items-center justify-center px-4" style={{ color: 'var(--text)' }}>
        <div className="w-full max-w-md card space-y-5">
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <User className="w-5 h-5" />
            <h1 className="text-lg font-semibold">{dict.welcomeTitle}</h1>
          </div>
          <p className="text-sm text-[var(--muted)] leading-relaxed">
            {dict.welcomeHint}
          </p>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            placeholder={dict.namePlaceholder}
            className="w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--card)] focus:outline-none"
            style={{ color: 'var(--text)' }}
          />
          <button onClick={saveName} disabled={!nameInput.trim()} className="btn-primary w-full py-3 disabled:opacity-40">
            {dict.letsStart}
          </button>
          <Link href="/start" className="block text-center text-sm text-[var(--muted)]">
            {dict.back}
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main dir={dir} className="min-h-screen flex flex-col" style={{ color: 'var(--text)' }}>
      <header className="sticky top-0 z-50 backdrop-blur-lg border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg0)_78%,transparent)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">{info.emoji}</span>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-semibold truncate">{dict.assessment} {domainLabel}</h1>
              <p className="text-[10px] sm:text-xs text-[var(--accent)] truncate">
                {userName} {mapUpdating ? ` · ${dict.mapUpdating}` : ` · ${dict.unifiedMap}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button onClick={clearChat} className="text-[10px] sm:text-xs text-[var(--muted)]">
              {dict.newChat}
            </button>
            <Link href="/play" className="text-[10px] sm:text-xs text-[var(--muted)]">
              {dict.games}
            </Link>
            <Link href="/map" className="text-[10px] sm:text-xs text-[var(--accent)] inline-flex items-center gap-1">
              <Map className="w-3.5 h-3.5" />
              {dict.mindMap}
            </Link>
            <Link href="/start" className="text-xs text-[var(--muted)] inline-flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              <span className="hidden sm:inline">{dict.back}</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isLastUser = msg.role === 'user' && msg.id === lastUserMessageId
              const isEditing = editingId === msg.id
              return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm sm:text-base leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[var(--btn-from)] text-white rounded-br-md'
                      : 'bg-[var(--card)] border border-[var(--border)] rounded-bl-md'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center justify-between gap-2 mb-1.5 text-[var(--accent)]">
                      <div className="flex items-center gap-1.5">
                        <Brain className="w-3.5 h-3.5" />
                        <span className="text-[10px] sm:text-xs">{dict.evaluator}</span>
                      </div>
                      <SpeakButton text={msg.content} />
                    </div>
                  )}

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl px-3 py-2 text-sm border border-white/30 bg-black/20 resize-none"
                        style={{ color: 'inherit' }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isTyping || !editText.trim()}
                          onClick={() => void saveEditUserMessage()}
                          className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg bg-white/20"
                        >
                          <Check className="w-3.5 h-3.5" />
                          ذخیره و ارسال دوباره
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null)
                            setEditText('')
                          }}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-white/10"
                        >
                          <X className="w-3.5 h-3.5" />
                          انصراف
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}

                  {!isEditing && !isTyping && (
                    <div
                      className={`flex items-center gap-1 mt-2 pt-1.5 border-t ${
                        msg.role === 'user' ? 'border-white/25' : 'border-[var(--border)]'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <>
                          <button
                            type="button"
                            onClick={() => void shareMessage(msg.content)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--accent)] transition"
                            title="اشتراک‌گذاری"
                            aria-label="اشتراک‌گذاری"
                          >
                            <Share2 className="w-3.5 h-3.5" strokeWidth={2.25} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void copyMessage(msg.content)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--accent)] transition"
                            title="کپی"
                            aria-label="کپی"
                          >
                            <Copy className="w-3.5 h-3.5" strokeWidth={2.25} />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleReaction(msg.id, 'like')}
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition ${
                              reactions[msg.id] === 'like'
                                ? 'text-emerald-400 bg-emerald-500/15'
                                : 'text-[var(--muted)] hover:text-emerald-400'
                            }`}
                            title="لایک"
                            aria-label="لایک"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" strokeWidth={2.25} />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleReaction(msg.id, 'dislike')}
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition ${
                              reactions[msg.id] === 'dislike'
                                ? 'text-rose-400 bg-rose-500/15'
                                : 'text-[var(--muted)] hover:text-rose-400'
                            }`}
                            title="دیس‌لایک"
                            aria-label="دیس‌لایک"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" strokeWidth={2.25} />
                          </button>
                        </>
                      )}
                      {isLastUser && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(msg.id)
                            setEditText(msg.content)
                          }}
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition ${
                            msg.role === 'user' ? 'text-white/95 hover:bg-white/10' : 'text-[var(--muted)] hover:text-[var(--accent)]'
                          }`}
                          title="ویرایش"
                          aria-label="ویرایش"
                        >
                          <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteMessage(msg.id)}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition ${
                          msg.role === 'user' ? 'text-white/95 hover:bg-white/10' : 'text-[var(--muted)] hover:text-rose-400'
                        }`}
                        title="حذف"
                        aria-label="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
              )
            })}
          </AnimatePresence>

          {insight && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3"
            >
              <div className="flex items-center gap-2 text-[var(--accent)]">
                <Sparkles className="w-4 h-4" />
                <h2 className="text-sm font-semibold">{dict.shortSummary}</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="rounded-xl border border-[var(--border)] p-3">
                  <div className="text-[var(--muted)] text-xs mb-1">{dict.level}</div>
                  <div className="font-semibold">{insight.level}</div>
                </div>
                {currentBook && (
                  <div className="rounded-xl border border-[var(--border)] p-3">
                    <div className="text-[var(--muted)] text-xs mb-1">{dict.book}</div>
                    <div className="font-semibold">{currentBook.title}</div>
                  </div>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2 text-sm">
                <div className="rounded-xl border border-[var(--border)] p-3">
                  <div className="flex items-center gap-2 text-[var(--accent)] mb-2">
                    <Lightbulb className="w-4 h-4" />
                    قوت
                  </div>
                  <ul className="space-y-1 text-[var(--muted)]">
                    {insight.strengths.map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-[var(--border)] p-3">
                  <div className="flex items-center gap-2 text-[var(--accent)] mb-2">
                    <BookOpen className="w-4 h-4" />
                    رشد
                  </div>
                  <ul className="space-y-1 text-[var(--muted)]">
                    {insight.gaps.map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {isTyping && (
            <div className="flex justify-end">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-[var(--muted)] text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                {dict.thinking}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--bg0)_88%,transparent)] backdrop-blur-lg">
        <div className="max-w-3xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex gap-2 sm:gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder={dict.typeAnswer}
              rows={1}
              className="flex-1 rounded-xl px-4 py-3 text-sm sm:text-base border border-[var(--border)] bg-[var(--card)] focus:outline-none resize-none max-h-32"
              style={{ color: 'var(--text)' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              className="btn-primary p-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
