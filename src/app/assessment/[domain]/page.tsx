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

const domainInfo: Record<
  string,
  {
    title: string
    emoji: string
    books: { title: string; author: string; reason: string }[]
    hooks: string[]
  }
> = {
  philosophy: {
    title: 'فلسفه',
    emoji: '🧠',
    books: [
      {
        title: 'دنیای سوفی',
        author: 'یوستین گوردر',
        reason: 'برای آشنایی روایی و جذاب با تاریخ و پرسش‌های فلسفی مناسب است.',
      },
      {
        title: 'تاریخ فلسفه غرب',
        author: 'برتراند راسل',
        reason: 'برای دیدن جریان‌های اصلی و آشنایی ساختاری با فیلسوفان مهم مفید است.',
      },
      {
        title: 'انسان در جست‌وجوی معنا',
        author: 'ویکتور فرانکل',
        reason: 'برای پیوند دادن فلسفه، معنا و تجربه زیسته کتابی خواندنی است.',
      },
    ],
    hooks: [
      'از پاسخ تو می‌فهمم بیشتر به استدلال، معنا یا اخلاق نزدیک هستی.',
      'اگر یک مثال روزمره بزنی، می‌توانم عمق فهمت را دقیق‌تر بسنجـم.',
      'در فلسفه، تفاوت «نظر» و «دلیل» خیلی مهم است؛ سعی کن هر دو را بیاوری.',
    ],
  },
  programming: {
    title: 'برنامه‌نویسی',
    emoji: '💻',
    books: [
      {
        title: 'Clean Code',
        author: 'Robert C. Martin',
        reason: 'برای یادگیری کد تمیز، نام‌گذاری و ساختار مناسب بسیار معروف است.',
      },
      {
        title: 'You Don’t Know JS',
        author: 'Kyle Simpson',
        reason: 'برای درک عمیق جاوااسکریپت و مفاهیم پایهٔ آن عالی است.',
      },
      {
        title: 'Automate the Boring Stuff with Python',
        author: 'Al Sweigart',
        reason: 'برای شروع عملی و پروژه‌محور در پایتون بسیار کاربردی است.',
      },
    ],
    hooks: [
      'اگر مثال کد یا الگوریتم بدهی، می‌توانم سطح فنی تو را دقیق‌تر تشخیص بدهم.',
      'پاسخ خوب در برنامه‌نویسی فقط حفظ اصطلاحات نیست؛ توان حل مسئله مهم‌تر است.',
      'سعی کن همیشه از تجربهٔ واقعی، خطا یا پروژهٔ شخصی هم مثال بزنی.',
    ],
  },
  history: {
    title: 'تاریخ',
    emoji: '📜',
    books: [
      {
        title: 'تاریخ تمدن',
        author: 'ویل دورانت',
        reason: 'برای آشنایی روایی و گسترده با دوره‌های تمدنی کتابی محبوب است.',
      },
      {
        title: 'چرا ملت‌ها شکست می‌خورند',
        author: 'دارون عجم‌اوغلو و جیمز رابینسون',
        reason: 'برای پیوند تاریخ، نهادها و توسعه اقتصادی بسیار مفید است.',
      },
      {
        title: 'قرن بیستم',
        author: 'نایل فرگوسن',
        reason: 'برای نگاه تحلیلی به تحولات بزرگ جهان معاصر خواندنی است.',
      },
    ],
    hooks: [
      'در تاریخ، ترتیب رویدادها مهم است اما علت‌ها مهم‌ترند.',
      'اگر رابطهٔ میان یک رخداد و پیامدهایش را توضیح دهی، ارزیابی دقیق‌تر می‌شود.',
      'جزئیات بدون زمینه تاریخی، معمولاً فقط حفظیات هستند.',
    ],
  },
  psychology: {
    title: 'روان‌شناسی',
    emoji: '🧩',
    books: [
      {
        title: 'تفکر، سریع و کند',
        author: 'دنیل کانمن',
        reason: 'برای فهم سوگیری‌های ذهن و تصمیم‌گیری بسیار اثرگذار است.',
      },
      {
        title: 'انسان موجودی اجتماعی',
        author: 'آبراهام مزلو',
        reason: 'برای نگاه پایه‌ای به نیازها و انگیزه‌ها مفید است.',
      },
      {
        title: 'نیمهٔ تاریک وجود',
        author: 'دبی فورد',
        reason: 'برای شروع گفت‌وگو دربارهٔ خودشناسی و پذیرش جنبه‌های شخصیتی مناسب است.',
      },
    ],
    hooks: [
      'اگر از تجربهٔ انسانی یا مشاهدهٔ رفتار واقعی مثال بزنی، عمق فهمت روشن‌تر می‌شود.',
      'روان‌شناسی فقط اصطلاحات نیست؛ تفسیر رفتار و انگیزه‌ها مهم است.',
      'تلاش کن بین نظریه و تجربهٔ شخصی ارتباط بسازی.',
    ],
  },
}

type Message = {
  id: number
  role: 'assistant' | 'user'
  content: string
}

type SessionInsight = {
  level: 'مقدماتی' | 'متوسط' | 'پیشرفته'
  strengths: string[]
  gaps: string[]
  lessonTitle: string
  lessonText: string
  lessonExample: string
  question: string
  book: { title: string; author: string; reason: string } | null
}

const USER_KEY = 'wai_user_name'
const STAGE_KEY = 'wai_assessment_stage'

function chatKey(domain: string) {
  return `wai_chat_${domain}`
}

function mapKey(domain: string) {
  return `wai_map_${domain}`
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

function pickBook(domain: string, used: string[]) {
  const books = domainInfo[domain]?.books || []
  return books.find((b) => !used.includes(`${b.title}::${b.author}`)) || books[0] || null
}

function buildLocalInsight(domain: string, messages: Message[]): SessionInsight {
  const info = domainInfo[domain] || domainInfo.philosophy
  const userMessages = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content.trim())
    .filter(Boolean)

  const last = userMessages[userMessages.length - 1] || ''
  const words = last.split(/s+/).filter(Boolean).length
  const hasExample = /\b(مثال|مثلاً|example|for example)\b/i.test(last)
  const hasReason = /\b(چون|زیرا|دلیل|because|since)\b/i.test(last)

  const level: SessionInsight['level'] =
    words < 12 ? 'مقدماتی' : hasExample && hasReason ? 'پیشرفته' : 'متوسط'

  const strengths: string[] = []
  const gaps: string[] = []

  if (hasReason) strengths.push('به سراغ دلیل و استدلال رفته‌ای.')
  else gaps.push('برای پاسخ قانع‌کننده‌تر، یک دلیل روشن اضافه کن.')

  if (hasExample) strengths.push('از مثال استفاده کرده‌ای که فهم را عمیق‌تر می‌کند.')
  else gaps.push('یک مثال واقعی یا روزمره اضافه کن تا سطح فهمت بهتر دیده شود.')

  if (words > 20) strengths.push('پاسخت نسبتاً بسط‌داده شده و نشانهٔ درگیری ذهنی دارد.')
  else gaps.push('پاسخ کوتاه‌تر از آن است که عمق دانشت را کامل نشان دهد.')

  const hook = info.hooks[(messages.length + userMessages.length) % info.hooks.length]
  const book = pickBook(domain, [])

  return {
    level,
    strengths,
    gaps,
    lessonTitle:
      domain === 'programming'
        ? 'نکتهٔ آموزشی: پاسخ خوب فقط نتیجه نیست'
        : domain === 'history'
          ? 'نکتهٔ آموزشی: علت و زمینه را فراموش نکن'
          : domain === 'psychology'
            ? 'نکتهٔ آموزشی: نظریه را به رفتار واقعی وصل کن'
            : 'نکتهٔ آموزشی: تفاوت نظر و استدلال مهم است',
    lessonText: hook,
    lessonExample:
      domain === 'programming'
        ? 'مثلاً اگر دربارهٔ «async/await» حرف می‌زنی، فقط تعریفش را نگوی؛ بگو در چه مسئله‌ای به کارت آمده.'
        : domain === 'history'
          ? 'مثلاً دربارهٔ یک انقلاب، فقط تاریخ وقوع را نگوی؛ توضیح بده چرا رخ داد و چه تغییری ایجاد کرد.'
          : domain === 'psychology'
            ? 'مثلاً در بحث انگیزه، فقط اسم یک نظریه را نگوی؛ نشان بده در رفتار روزمره چگونه دیده می‌شود.'
            : 'مثلاً در بحث اخلاق، فقط یک حکم نده؛ توضیح بده چرا آن حکم قابل دفاع است.',
    question:
      domain === 'programming'
        ? 'اگر بخواهی این مفهوم را در یک پروژه واقعی استفاده کنی، چه تصمیمی می‌گیری؟'
        : domain === 'history'
          ? 'اگر این رویداد را از دید یک گروه دیگر ببینی، چه تغییری در تحلیل تو ایجاد می‌شود؟'
          : domain === 'psychology'
            ? 'این ایده را در یک موقعیت واقعی انسانی چگونه می‌بینی؟'
            : 'آیا می‌توانی از این نظر یک استدلال مخالف هم بسازی؟',
    book,
  }
}

export default function AssessmentPage() {
  const params = useParams()
  const domain = (params.domain as string) || 'philosophy'
  const info = domainInfo[domain] || domainInfo.philosophy

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
          content: `سلام ${savedName}. خوش اومدی.

قرار است دربارهٔ «${info.title}» با هم گفت‌وگو کنیم تا بفهمم چه چیزهایی را عمیق می‌دانی، چه چیزهایی نیاز به تقویت دارد، و قدم بعدی رشدت چه باشد.

با زبان خودت جواب بده و اگر خواستی مثال هم بزن.`,
        },
      ])
    }

    setReady(true)
  }, [domain, info.title])

  useEffect(() => {
    if (!ready || messages.length === 0) return
    localStorage.setItem(chatKey(domain), JSON.stringify(messages))
  }, [messages, domain, ready])

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
        content: `سلام ${n}. خوشحالم می‌شناسمت.

من ارزیاب دانش هستم. در گفت‌وگو با هم جلو می‌رویم، نکته‌های آموزشی می‌دهم، و در طول مسیر کتاب‌های مفید هم معرفی می‌کنم.

اولین پاسخ را آزاد و به زبان خودت بنویس.`,
      },
    ])
  }

  const callAI = async (allMessages: Message[]) => {
    const res = await fetch('/api/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain,
        messages: [
          { role: 'user', content: `نام کاربر: ${userName || nameInput || 'کاربر'}` },
          ...allMessages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: 'خروجی را با تمرکز بر پرسش بعدی، نکته آموزشی، و کتاب مناسب ادامه بده.' },
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
      const res = await fetch('/api/analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, userName: userName || nameInput || 'کاربر', messages: allMessages }),
      })
      const data = await res.json().catch(() => null)
      if (data?.success && data.map) {
        localStorage.setItem(mapKey(domain), JSON.stringify(data.map))
        window.dispatchEvent(new Event('wai-map-updated'))
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
            content: `الان نتوانستم به هوش مصنوعی وصل شوم، اما می‌توانیم با این سؤال ادامه دهیم:

${fallback.question}

${fallback.lessonTitle}
${fallback.lessonText}`,
          },
        ])
      } finally {
        setIsTyping(false)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [ready, needsName, userName, messages.length])

  const sendMessage = async () => {
    if (!input.trim() || isTyping || needsName) return

    const userMessage: Message = { id: Date.now(), role: 'user', content: input.trim() }
    const next = [...messages, userMessage]
    setMessages(next)
    setInput('')
    setIsTyping(true)

    try {
      const reply = await callAI(next)
      const withReply: Message[] = [...next, { id: Date.now() + 1, role: 'assistant', content: reply }]
      setMessages(withReply)
      const localInsight = computeInsight(withReply)
      updateMapFromChat(withReply)

      const enrich: Message = {
        id: Date.now() + 2,
        role: 'assistant',
        content: [
          `${localInsight.lessonTitle}`,
          localInsight.lessonText,
          `نکتهٔ جذاب: ${localInsight.lessonExample}`,
          `سؤال بعدی: ${localInsight.question}`,
          localInsight.book
            ? `کتاب پیشنهادی: ${localInsight.book.title} — ${localInsight.book.author}
${localInsight.book.reason}`
            : '',
        ]
          .filter(Boolean)
          .join('\n\n'),
      }

      setMessages((prev) => [...prev, enrich])
    } catch {
      const localInsight = computeInsight(next)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: [
            'خطا در دریافت پاسخ از هوش مصنوعی، اما گفت‌وگو را می‌توانیم ادامه دهیم.',
            `سؤال بعدی: ${localInsight.question}`,
            localInsight.lessonTitle,
            localInsight.lessonText,
            `نکتهٔ جذاب: ${localInsight.lessonExample}`,
            localInsight.book
              ? `کتاب پیشنهادی: ${localInsight.book.title} — ${localInsight.book.author}
${localInsight.book.reason}`
              : '',
          ]
            .filter(Boolean)
            .join('\n\n'),
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const clearChat = () => {
    localStorage.removeItem(chatKey(domain))
    startedRef.current = false
    setInsight(null)
    setMessages([
      {
        id: Date.now(),
        role: 'assistant',
        content: `باشه ${userName}. گفت‌وگوی قبلی این حوزه پاک شد.

دوباره دربارهٔ «${info.title}» شروع می‌کنیم.`,
      },
    ])
  }

  const currentBook = useMemo(() => insight?.book || pickBook(domain, usedBooks), [insight, domain, usedBooks])

  if (!ready) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 flex items-center justify-center text-white">
        <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
      </main>
    )
  }

  if (needsName) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 rtl flex items-center justify-center px-4">
        <div className="w-full max-w-md card space-y-5">
          <div className="flex items-center gap-2 text-teal-300">
            <User className="w-5 h-5" />
            <h1 className="text-lg font-semibold text-white">خوش آمدی</h1>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            قبل از شروع ارزیابی «{info.title}»، اسمت را بگو تا گفت‌وگو، نکته‌های آموزشی و نقشه دانشت ذخیره شود.
          </p>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            placeholder="مثلاً علی"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500/50"
          />
          <button onClick={saveName} disabled={!nameInput.trim()} className="btn-primary w-full py-3 disabled:opacity-40">
            شروع کنیم
          </button>
          <Link href="/start" className="block text-center text-sm text-gray-400 hover:text-white">
            بازگشت
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 rtl flex flex-col">
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-dark-950/70 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">{info.emoji}</span>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-semibold text-white truncate">ارزیابی {info.title}</h1>
              <p className="text-[10px] sm:text-xs text-teal-400/80 truncate">
                {userName} {mapUpdating ? ' · در حال به‌روزرسانی نقشه...' : ' · نقشه خودکار'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button onClick={clearChat} className="text-[10px] sm:text-xs text-gray-500 hover:text-white transition-colors">
              گفت‌وگوی جدید
            </button>

            <Link
              href="/map"
              className="text-[10px] sm:text-xs text-teal-300/90 hover:text-teal-200 transition-colors inline-flex items-center gap-1"
            >
              <Map className="w-3.5 h-3.5" />
              نقشه ذهن
            </Link>

            <Link href="/start" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              <span className="hidden sm:inline">بازگشت</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
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
                      ? 'bg-teal-600/90 text-white rounded-br-md'
                      : 'bg-white/5 border border-white/10 text-gray-100 rounded-bl-md'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1.5 text-teal-400/80">
                      <Brain className="w-3.5 h-3.5" />
                      <span className="text-[10px] sm:text-xs">ارزیاب</span>
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
              className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3"
            >
              <div className="flex items-center gap-2 text-teal-300">
                <Sparkles className="w-4 h-4" />
                <h2 className="text-sm font-semibold">جمع‌بندی آموزشی</h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-sm text-gray-200">
                <div className="rounded-xl bg-black/10 p-3">
                  <div className="text-gray-400 text-xs mb-1">سطح فعلی</div>
                  <div className="font-semibold text-white">{insight.level}</div>
                </div>
                <div className="rounded-xl bg-black/10 p-3">
                  <div className="text-gray-400 text-xs mb-1">کتاب پیشنهادی</div>
                  <div className="font-semibold text-white">{currentBook?.title || '—'}</div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 text-sm">
                <div className="rounded-xl bg-black/10 p-3">
                  <div className="flex items-center gap-2 text-teal-300 mb-2">
                    <Lightbulb className="w-4 h-4" />
                    نقاط قوت
                  </div>
                  <ul className="space-y-1 text-gray-200">
                    {insight.strengths.map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl bg-black/10 p-3">
                  <div className="flex items-center gap-2 text-teal-300 mb-2">
                    <BookOpen className="w-4 h-4" />
                    نیازهای رشد
                  </div>
                  <ul className="space-y-1 text-gray-200">
                    {insight.gaps.map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-xl bg-black/10 p-3 text-sm text-gray-200">
                <div className="font-semibold text-white mb-1">{insight.lessonTitle}</div>
                <div>{insight.lessonText}</div>
                <div className="mt-2 text-gray-300">{insight.lessonExample}</div>
                <div className="mt-2 text-teal-200">سؤال بعدی پیشنهادی: {insight.question}</div>
              </div>

              {currentBook && (
                <div className="rounded-xl bg-black/10 p-3 text-sm text-gray-200">
                  <div className="flex items-center gap-2 text-teal-300 mb-1">
                    <BookOpen className="w-4 h-4" />
                    {currentBook.title} — {currentBook.author}
                  </div>
                  <div>{currentBook.reason}</div>
                </div>
              )}
            </motion.div>
          )}

          {isTyping && (
            <div className="flex justify-end">
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                در حال فکر کردن...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-white/5 bg-dark-950/80 backdrop-blur-lg">
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
              placeholder="جوابت را بنویس..."
              rows={1}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm sm:text-base text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500/50 resize-none max-h-32"
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
