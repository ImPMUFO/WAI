'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, Square } from 'lucide-react'
import { useLocale } from '@/lib/i18n/LocaleProvider'

export default function SpeakButton({ text }: { text: string }) {
  const { dict, locale } = useLocale()
  const [speaking, setSpeaking] = useState(false)
  const [rate, setRate] = useState(1)

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
    }
  }, [])

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null
  }

  const lang = locale === 'en' ? 'en-US' : locale === 'ar' ? 'ar-SA' : 'fa-IR'

  const stop = () => {
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  const play = () => {
    if (!text?.trim()) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = rate
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(u)
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={speaking ? stop : play}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-xs border border-[var(--border)] text-[var(--muted)] hover:text-[var(--accent)]"
      >
        {speaking ? <Square className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
        {speaking ? dict.stop : dict.speak}
      </button>
      <select
        value={rate}
        onChange={(e) => setRate(Number(e.target.value))}
        className="text-[10px] bg-transparent border border-[var(--border)] rounded px-1 text-[var(--muted)]"
      >
        <option value={0.85}>0.85×</option>
        <option value={1}>1×</option>
        <option value={1.15}>1.15×</option>
      </select>
    </div>
  )
}
