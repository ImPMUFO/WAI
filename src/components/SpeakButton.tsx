'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, Square, Gauge } from 'lucide-react'

/** Text-to-Speech با Web Speech API مرورگر (رایگان، بدون کلید) */
export default function SpeakButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false)
  const [rate, setRate] = useState(1)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
    }
  }, [])

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null
  }

  const stop = () => {
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  const play = () => {
    if (!text?.trim()) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'fa-IR'
    u.rate = rate
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    utterRef.current = u
    setSpeaking(true)
    window.speechSynthesis.speak(u)
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={speaking ? stop : play}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-xs border border-[var(--border)] text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-colors"
        title={speaking ? 'توقف صدا' : 'خواندن با صدا'}
      >
        {speaking ? <Square className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
        {speaking ? 'توقف' : 'صدا'}
      </button>
      <button
        type="button"
        onClick={() => setRate((r) => (r >= 1.25 ? 0.85 : Number((r + 0.2).toFixed(2))))}
        className="inline-flex items-center gap-1 px-1.5 py-1 rounded-lg text-[10px] border border-[var(--border)] text-[var(--muted)]"
        title="سرعت پخش"
      >
        <Gauge className="w-3 h-3" />
        {rate.toFixed(2)}x
      </button>
    </div>
  )
}
