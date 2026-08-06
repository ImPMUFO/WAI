'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, Square } from 'lucide-react'
import { useLocale } from '@/lib/i18n/LocaleProvider'

function detectLang(text: string, fallback: string): 'fa' | 'ar' | 'en' {
  const t = text || ''
  // عربی خاص (حروفی که در فارسی رایج نیست)
  if (/[\u0621-\u0628\u062A-\u063A\u0641-\u064A]/.test(t) && /[\u0629\u064B-\u0652\u0670]/.test(t)) {
    // ممکن است عربی باشد؛ اگر کلمه‌های فارسی رایج بود فارسی
  }
  if (/[\u0600-\u06FF]/.test(t)) {
    // فارسی در برابر عربی ساده
    if (/[پچژگ]/.test(t) || /می[‌ ]|است |های |ها /.test(t)) return 'fa'
    // اگر locale عربی است و متن عربی
    if (fallback === 'ar') return 'ar'
    return 'fa'
  }
  if (/[A-Za-z]/.test(t)) return 'en'
  return fallback === 'en' || fallback === 'ar' ? (fallback as 'en' | 'ar') : 'fa'
}

function chunkText(text: string, max = 160): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  if (clean.length <= max) return [clean]
  const parts: string[] = []
  let rest = clean
  while (rest.length > max) {
    let cut = rest.lastIndexOf(' ', max)
    if (cut < 40) cut = max
    parts.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  if (rest) parts.push(rest)
  return parts
}

export default function SpeakButton({ text }: { text: string }) {
  const { dict, locale } = useLocale()
  const [speaking, setSpeaking] = useState(false)
  const [rate, setRate] = useState(1)
  const [err, setErr] = useState('')
  const stopRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      stopRef.current = true
      window.speechSynthesis?.cancel()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const stop = () => {
    stopRef.current = true
    window.speechSynthesis?.cancel()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setSpeaking(false)
  }

  const playViaApi = async (chunks: string[], lang: string) => {
    for (const chunk of chunks) {
      if (stopRef.current) break
      const url = `/api/tts?lang=${encodeURIComponent(lang)}&text=${encodeURIComponent(chunk)}`
      const audio = new Audio(url)
      audioRef.current = audio
      audio.playbackRate = rate
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve()
        audio.onerror = () => reject(new Error('audio'))
        audio.play().catch(reject)
      })
    }
  }

  const playViaWebSpeech = async (chunks: string[], lang: string) => {
    if (!('speechSynthesis' in window)) throw new Error('no-speech')
    const voices = window.speechSynthesis.getVoices()
    const pick =
      voices.find((v) => v.lang?.toLowerCase().startsWith(lang)) ||
      voices.find((v) => (lang === 'fa' || lang === 'ar') && v.lang?.toLowerCase().startsWith('ar')) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith('en')) ||
      voices[0]

    for (const chunk of chunks) {
      if (stopRef.current) break
      await new Promise<void>((resolve, reject) => {
        const u = new SpeechSynthesisUtterance(chunk)
        u.lang = lang === 'fa' ? 'fa-IR' : lang === 'ar' ? 'ar-SA' : 'en-US'
        u.rate = rate
        if (pick) u.voice = pick
        u.onend = () => resolve()
        u.onerror = () => reject(new Error('utter'))
        window.speechSynthesis.speak(u)
      })
    }
  }

  const play = async () => {
    if (!text?.trim()) return
    stopRef.current = false
    setErr('')
    setSpeaking(true)
    const lang = detectLang(text, locale)
    const chunks = chunkText(text, 160)
    try {
      // اول API (پایدارتر برای فارسی/عربی)، بعد Web Speech
      await playViaApi(chunks, lang)
    } catch {
      try {
        // voices گاهی دیر لود می‌شوند
        if (window.speechSynthesis && window.speechSynthesis.getVoices().length === 0) {
          await new Promise((r) => setTimeout(r, 250))
        }
        await playViaWebSpeech(chunks, lang)
      } catch {
        setErr(locale === 'en' ? 'Voice unavailable' : 'صدا در دسترس نیست')
      }
    } finally {
      setSpeaking(false)
    }
  }

  return (
    <div className="inline-flex items-center gap-1 flex-wrap">
      <button
        type="button"
        onClick={speaking ? stop : () => void play()}
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
      {err && <span className="text-[10px] text-rose-400">{err}</span>}
    </div>
  )
}
