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
} from 'lucide-react'
import SpeakButton from '@/components/SpeakButton'
import GamificationBar from '@/components/GamificationBar'
import { onChatMessage, onMapUpdated } from '@/lib/gamification'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { domainTitle as domainTitleI18n, getDictionary } from '@/lib/i18n/dictionaries'
import {
  saveConversationToServer,
  loadConversationFromServer,
  saveMindMapToServer,
  archiveLocalChat,
  recoverConversation,
  recoverAllLocalDataToServer,
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
  const domainLabel = domainTitleI18n(locale, domain)

  const params = useParams()
  const domain = (params.domain as string) || 'general'
  const info = domainInfo[domain] || domainInfo.general

  const [userName, setUserName] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [needsName, setNeedsName] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [ready, setReady] = useState(false)
  const [mapUpdating, setMapUpdating] = useState(false)
  const [insight, setInsight] = useState<SessionInsight | null>(null)
  const [usedBooks, setUsedBooks] = useState<string[]>([])
  const [lastBook, setLastBook] = useState<Book | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)

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
    // بازیابی کامل: محلی + آرشیو + سرور (هرگز از دست نده)
    void (async () => {
      const recovered = await recoverConversation(domain)
      if (recovered?.length) {
        setMessages(recovered as Message[])
        startedRef.current = true
        setReady(true)
        return
      }
      if (savedChat) {
        const parsed = parseAsJson<Message[]>(savedChat)
        if (parsed?.length) {
          setMessages(parsed)
          startedRef.current = true
          setReady(true)
          return
        }
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
      const prevRaw = localStorage.getItem(chatKey(domain))
      const prev = prevRaw ? JSON.parse(prevRaw) : []
      // هرگز تاریخچهٔ بلندتر را با نسخهٔ کوتاه‌تر عوض نکن
      if (Array.isArray(prev) && prev.length > messages.length) return
      localStorage.setItem(chatKey(domain), JSON.stringify(messages))
    } catch {
      localStorage.setItem(chatKey(domain), JSON.stringify(messages))
    }
    void saveConversationToServer(domain, messages, info.title)
  }, [messages, domain, ready, info.title])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem(STAGE_KEY, JSON.stringify({ usedBooks }))
  }, [usedBooks, ready])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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
    if (!res.ok || !data?.success || typeof data.content !== 'string') {
      throw new Error(data?.error || 'خطا در ارتباط با هوش مصنوعی')
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
    } catch {
      const localInsight = computeInsight(next)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: `خطا در پاسخ. ادامه بده:\n\n${localInsight.question}`,
        },
      ])
      setIsTyping(false)
    }
  }

  const clearChat = () => {
    // آرشیو کن — پاک نکن
    if (messages.length) archiveLocalChat(domain, messages)
    startedRef.current = false
    setLastBook(null)
    setInsight(null)
    setMessages([
      {
        id: Date.now(),
        role: 'assistant',
        content:
          locale === 'en'
            ? `Okay ${userName}. New chat on "${domainLabel}". Previous chat was archived.`
            : locale === 'ar'
              ? `حسناً ${userName}. محادثة جديدة عن «${domainLabel}». تم حفظ السابقة.`
              : `باشه ${userName}. گفت‌وگوی «${domainLabel}» از نو شروع شد. گفتگوی قبلی آرشیو شد.`,
      },
    ])
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
          <GamificationBar compact />
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm sm:text-base leading-relaxed whitespace-pre-wrap ${
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
                  {msg.content}
                </div>
              </motion.div>
            ))}
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
