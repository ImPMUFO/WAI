'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, ArrowRight, Brain, Loader2, User, Map } from 'lucide-react'
import Link from 'next/link'

const domainInfo: Record<string, { title: string; emoji: string }> = {
  philosophy: { title: 'فلسفه', emoji: '🧠' },
  programming: { title: 'برنامه‌نویسی', emoji: '💻' },
  history: { title: 'تاریخ', emoji: '📜' },
  psychology: { title: 'روان‌شناسی', emoji: '🧩' },
}

type Message = {
  id: number
  role: 'assistant' | 'user'
  content: string
}

const USER_KEY = 'wai_user_name'

function chatKey(domain: string) {
  return `wai_chat_${domain}`
}

export default function AssessmentPage() {
  const params = useParams()
  const domain = (params.domain as string) || 'philosophy'
  const info = domainInfo[domain] || { title: 'دانش', emoji: '📚' }

  const [userName, setUserName] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [needsName, setNeedsName] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [ready, setReady] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)

  // بارگذاری اسم و گفت‌وگو
  useEffect(() => {
    const savedName = localStorage.getItem(USER_KEY)?.trim() || ''
    const savedChat = localStorage.getItem(chatKey(domain))

    if (savedName) {
      setUserName(savedName)
      setNeedsName(false)
    }

    if (savedChat) {
      try {
        const parsed = JSON.parse(savedChat) as Message[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
          startedRef.current = true
          setReady(true)
          return
        }
      } catch {
        // ignore broken storage
      }
    }

    if (savedName) {
      setMessages([
        {
          id: 1,
          role: 'assistant',
          content: `سلام \( {savedName}. خوش اومدی.\n\nقرار است دربارهٔ « \){info.title}» با هم گفت‌وگو کنیم تا بفهمم چه چیزهایی را عمیق می‌دانی و کجاها می‌توانی رشد کنی.\n\nبا زبان خودت جواب بده.`,
        },
      ])
    }

    setReady(true)
  }, [domain, info.title])

  // ذخیره گفت‌وگو
  useEffect(() => {
    if (!ready || messages.length === 0) return
    localStorage.setItem(chatKey(domain), JSON.stringify(messages))
  }, [messages, domain, ready])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

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
        content: `سلام \( {n}! خوشحالم می‌شناسمت.\n\nمن ارزیاب دانش هستم. دربارهٔ « \){info.title}» با هم حرف می‌زنیم تا نقشه دانش تو شکل بگیرد.\n\nهر پاسخی را راحت و به زبان خودت بنویس.`,
      },
    ])
  }

  const callAI = async (allMessages: Message[]) => {
    const res = await fetch('/api/deepseek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain,
        messages: [
          {
            role: 'user',
            content: `نام کاربر: ${userName || nameInput || 'کاربر'}`,
          },
          ...allMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        ],
      }),
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'خطا در ارتباط با هوش مصنوعی')
    }
    return data.content as string
  }

  // گرفتن اولین سؤال از AI
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
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), role: 'assistant', content: reply },
        ])
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: 'assistant',
            content: 'الان نتوانستم به هوش مصنوعی وصل شوم. کمی بعد دوباره تلاش کن.',
          },
        ])
      } finally {
        setIsTyping(false)
      }
    }, 600)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, needsName, userName, messages.length])

  const sendMessage = async () => {
    if (!input.trim() || isTyping || needsName) return

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
    }

    const next = [...messages, userMessage]
    setMessages(next)
    setInput('')
    setIsTyping(true)

    try {
      const reply = await callAI(next)
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', content: reply },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'خطا در دریافت پاسخ. لطفاً دوباره تلاش کن.',
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const clearChat = () => {
    localStorage.removeItem(chatKey(domain))
    startedRef.current = false
    setMessages([
      {
        id: Date.now(),
        role: 'assistant',
        content: `باشه \( {userName}. گفت‌وگوی قبلی این حوزه پاک شد.\n\nدوباره دربارهٔ « \){info.title}» شروع می‌کنیم.`,
      },
    ])
  }

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
            قبل از شروع ارزیابی «{info.title}»، اسمت را بگو تا گفت‌وگوهایت ذخیره شود و
            دفعه بعد از بین نرود.
          </p>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName()
            }}
            placeholder="مثلاً علی"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500/50"
          />
          <button
            onClick={saveName}
            disabled={!nameInput.trim()}
            className="btn-primary w-full py-3 disabled:opacity-40"
          >
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
              <h1 className="text-sm sm:text-base font-semibold text-white truncate">
                ارزیابی {info.title}
              </h1>
              <p className="text-[10px] sm:text-xs text-teal-400/80 truncate">
                {userName} · گفت‌وگو ذخیره می‌شود
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={clearChat}
              className="text-[10px] sm:text-xs text-gray-500 hover:text-white transition-colors"
            >
              گفت‌وگوی جدید
            </button>

            <Link
              href="/map"
              className="text-[10px] sm:text-xs text-teal-300/90 hover:text-teal-200 transition-colors inline-flex items-center gap-1"
            >
              <Map className="w-3.5 h-3.5" />
              نقشه دانش
            </Link>

            <Link
              href="/start"
              className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
            >
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
