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

type Message = {
  id: number
  role: 'assistant' | 'user'
  content: string
}

export default function AssessmentPage() {
  const params = useParams()
  const domain = (params.domain as string) || 'philosophy'
  const info = domainInfo[domain] || { title: 'دانش', emoji: '📚' }

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content: `سلام. قراره دربارهٔ «${info.title}» با هم حرف بزنیم.

هدفم نمره‌دادن نیست؛ می‌خوام بفهمم چی رو عمیق بلدی، کجاها ممکنه سوءبرداشت داشته باشی و مسیر رشدت چیه.

هر جوابی که می‌دی با آرامش و به زبان خودت بنویس.`,
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [started, setStarted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const callDeepSeek = async (allMessages: Message[]) => {
    const res = await fetch('/api/deepseek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain,
        messages: allMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'خطا در ارتباط با DeepSeek')
    }
    return data.content as string
  }

  // اولین سؤال واقعی از DeepSeek
  useEffect(() => {
    if (started) return
    const timer = setTimeout(async () => {
      setIsTyping(true)
      try {
        const reply = await callDeepSeek(messages)
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
            content:
              'الان نتوانستم به DeepSeek وصل شوم. کلید API در Vercel و وضعیت سرویس را چک کن، بعد صفحه را تازه کن.',
          },
        ])
      } finally {
        setStarted(true)
        setIsTyping(false)
      }
    }, 700)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return

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
      const reply = await callDeepSeek(next)
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
          content: 'خطا در دریافت پاسخ از DeepSeek. کمی بعد دوباره تلاش کن.',
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 rtl flex flex-col">
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-dark-950/70 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{info.emoji}</span>
            <div>
              <h1 className="text-sm sm:text-base font-semibold text-white">
                ارزیابی {info.title}
              </h1>
              <p className="text-[10px] sm:text-xs text-teal-400/80">
                من کیستم؟ پایگاه دانش · DeepSeek
              </p>
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
