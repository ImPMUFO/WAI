'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, ArrowRight, Brain, Loader2 } from 'lucide-react'
import Link from 'next/link'

const domainInfo: Record<string, { title: string; emoji: string }> = {
  philosophy: { title: 'فلسفه', emoji: '🧠' },
  programming: { title: 'برنامه‌نویسی', emoji: '💻' },
  history: { title: 'تاریخ', emoji: '📜' },
  psychology: { title: 'روان‌شناسی', emoji: '🧩' },
}

// سؤال‌های نمونه برای نسخه آزمایشی (بدون AI واقعی)
const sampleQuestions: Record<string, string[]> = {
  philosophy: [
    'به نظر تو فرق بین «دانستن» و «باور داشتن» چیه؟',
    'اگر کسی چیزی رو فقط حفظ کرده باشه، می‌تونیم بگیم واقعاً اون مفهوم رو فهمیده؟ چرا؟',
    'یک مثال از سوءبرداشت رایجی که مردم درباره «آزادی» دارن بزن.',
    'وقتی دو نفر درباره یک موضوع اخلاقی مخالف هم هستن، از کجا بفهمیم کدوم استدلال قوی‌تره؟',
    'به نظرت پیش‌نیاز فهمیدن فلسفه اخلاق چیه؟',
  ],
  programming: [
    'به زبان ساده بگو الگوریتم یعنی چی و چرا مهمه؟',
    'فرق بین حلقه for و while رو با یک مثال روزمره توضیح بده.',
    'اگر برنامه‌ات درست کار نکنه، اولین کارهایی که برای پیدا کردن مشکل انجام می‌دی چیه؟',
    'متغیر و ثابت چه تفاوتی دارن؟',
    'یک مثال از مشکلی بزن که با شکستن اون به بخش‌های کوچیک‌تر حل بشه.',
  ],
  history: [
    'به نظرت چرا مطالعه تاریخ فقط حفظ کردن تاریخ‌ها نیست؟',
    'یک رویداد تاریخی رو مثال بزن که نتیجه‌اش هنوز روی زندگی امروز اثر داره.',
    'فرق بین «علت» و «بهانه» در تحلیل رویدادهای تاریخی چیه؟',
    'چطور می‌تونیم بفهمیم یک روایت تاریخی جانبدارانه نوشته شده؟',
    'به نظرت مهم‌ترین پیش‌نیاز فهم تاریخ معاصر چیه؟',
  ],
  psychology: [
    'به زبان ساده بگو تفاوت احساس و هیجان چیه؟',
    'یک مثال از سوگیری شناختی که خودت در زندگی دیدی بزن.',
    'چرا گاهی آدم‌ها با وجود دونستن کار درست، خلافش عمل می‌کنن؟',
    'یادگیری از تجربه با یادگیری از آموزش چه فرقی داره؟',
    'به نظرت خودآگاهی از کجا شروع می‌شه؟',
  ],
}

type Message = {
  id: number
  role: 'assistant' | 'user'
  content: string
}

export default function AssessmentPage() {
  const params = useParams()
  const domain = (params.domain as string) || 'philosophy'
  const info = domainInfo[domain] || { title: 'دانش', emoji: '📚' }
  const questions = sampleQuestions[domain] || sampleQuestions.philosophy

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content: `سلام. قراره دربارهٔ «${info.title}» با هم حرف بزنیم.\n\nهدفم نمره‌دادن نیست؛ می‌خوام بفهمم چی رو عمیق بلدی، کجاها ممکنه سوءبرداشت داشته باشی و مسیر رشدت چیه.\n\nهر جوابی که می‌دی با آرامش و به زبان خودت بنویس.`,
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const sendMessage = async () => {
    if (!input.trim() || isTyping || finished) return

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    // شبیه‌سازی فکر کردن سیستم
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 600))

    const nextIndex = questionIndex + 1

    if (nextIndex >= questions.length) {
      // پایان جلسه
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content:
            'ممنون از جواب‌هات.\n\nدر این نسخه آزمایشی، ارزیابی واقعی با هوش مصنوعی هنوز وصل نشده. در نسخه بعدی، بعد از این گفت‌وگو نقشه دانش تو ساخته می‌شه و نقاط قوت، ضعف و سوءبرداشت‌هات مشخص می‌شن.\n\nفعلاً می‌تونی به صفحه انتخاب حوزه برگردی یا بعداً دوباره تلاش کنی.',
        },
      ])
      setFinished(true)
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: questions[nextIndex],
        },
      ])
      setQuestionIndex(nextIndex)
    }

    setIsTyping(false)
  }

  // شروع اولین سؤال
  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: 2,
          role: 'assistant',
          content: questions[0],
        },
      ])
    }, 1200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 rtl flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-dark-950/70 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{info.emoji}</span>
            <div>
              <h1 className="text-sm sm:text-base font-semibold text-white">ارزیابی {info.title}</h1>
              <p className="text-[10px] sm:text-xs text-teal-400/80">من کیستم؟ پایگاه دانش</p>
            </div>
          </div>
          <Link
            href="/start"
            className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            بازگشت
          </Link>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
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

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-end"
            >
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                در حال فکر کردن...
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 border-t border-white/5 bg-dark-950/80 backdrop-blur-lg">
        <div className="max-w-3xl mx-auto px-4 py-3 sm:py-4">
          {finished ? (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/start"
                className="btn-secondary text-center px-5 py-2.5 text-sm sm:text-base"
              >
                انتخاب حوزه دیگر
              </Link>
              <Link
                href="/"
                className="btn-primary text-center px-5 py-2.5 text-sm sm:text-base"
              >
                بازگشت به صفحه اصلی
              </Link>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </main>
  )
  }
