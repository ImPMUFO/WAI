'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, Square } from 'lucide-react'
import { useLocale } from '@/lib/i18n/LocaleProvider'

function detectLang(text: string, fallback: string): 'fa' | 'ar' | 'en' {
  const t = text || ''
  if (/[\u0600-\u06FF]/.test(t)) {
    // عربی خالص‌تر اگر بدون حروف فارسی خاص
    if (!/[پچژگ]/.test(t) && (fallback === 'ar' || /[إأآءةى]/.test(t))) return 'ar'
    return 'fa'
  }
  if (/[A-Za-z]/.test(t)) return 'en'
  return fallback === 'en' || fallback === 'ar' ? (fallback as 'en' | 'ar') : 'fa'
}

function chunkText(text: string, max = 100): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  if (clean.length <= max) return [clean]
  const parts: string[] = []
  let rest = clean
  while (rest.length > max) {
    let cut = rest.lastIndexOf(' ', max)
    if (cut < 20) cut = max
    parts.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  if (rest) parts.push(rest)
  return parts
}

function waitVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([])
      return
    }
    const cur = window.speechSynthesis.getVoices()
    if (cur.length) {
      resolve(cur)
      return
    }
    const done = () => {
      resolve(window.speechSynthesis.getVoices())
      window.speechSynthesis.onvoiceschanged = null
    }
    window.speechSynthesis.onvoiceschanged = done
    setTimeout(done, 400)
  })
}

function pickVoice(voices: SpeechSynthesisVoice[], lang: 'fa' | 'ar' | 'en') {
  const pref =
    lang === 'fa'
      ? ['fa-IR', 'fa']
      : lang === 'ar'
        ? ['ar-SA', 'ar-EG', 'ar']
        : ['en-US', 'en-GB', 'en']
  for (const p of pref) {
    const v = voices.find((x) => x.lang?.toLowerCase().startsWith(p.toLowerCase()))
    if (v) return v
  }
  // فارسی اغلب روی دستگاه‌ها نیست — صدای عربی نزدیک‌تر است
  if (lang === 'fa') {
    const ar = voices.find((x) => x.lang?.toLowerCase().startsWith('ar'))
    if (ar) return ar
  }
  return voices.find((x) => x.lang?.toLowerCase().startsWith('en')) || voices[0] || null
}

export default function SpeakButton({ text }: { text: string }) {
  const { dict, locale } = useLocale()
  const [speaking, setSpeaking] = useState(false)
  const [rate, setRate] = useState(1)
  const [err, setErr] = useState('')
  const stopRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      stopRef.current = true
      window.speechSynthesis?.cancel()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
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
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    setSpeaking(false)
  }

  const playChunkApi = async (chunk: string, lang: string) => {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: chunk, lang }),
    })
    if (!res.ok) throw new Error('tts')
    const blob = await res.blob()
    if (!blob || blob.size < 50) throw new Error('empty')
    const obj = URL.createObjectURL(blob)
    urlRef.current = obj
    const audio = new Audio(obj)
    audioRef.current = audio
    audio.playbackRate = rate
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(obj)
        if (urlRef.current === obj) urlRef.current = null
        resolve()
      }
      audio.onerror = () => reject(new Error('play'))
      void audio.play().catch(reject)
    })
  }

  const playWebSpeech = async (chunks: string[], lang: 'fa' | 'ar' | 'en') => {
    if (!('speechSynthesis' in window)) throw new Error('no-speech')
    const voices = await waitVoices()
    const pick = pickVoice(voices, lang)
    const utterLang = lang === 'fa' ? 'fa-IR' : lang === 'ar' ? 'ar-SA' : 'en-US'

    for (const chunk of chunks) {
      if (stopRef.current) break
      await new Promise<void>((resolve, reject) => {
        const u = new SpeechSynthesisUtterance(chunk)
        u.lang = utterLang
        u.rate = Math.min(1.4, Math.max(0.7, rate))
        if (pick) u.voice = pick
        u.onend = () => resolve()
        u.onerror = () => reject(new Error('utter'))
        window.speechSynthesis.cancel()
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
    const chunks = chunkText(text, 100)

    // اول Web Speech (سریع و رایگان روی دستگاه)
    // بعد API سرور (Google TTS غیررسمی — گاهی در Vercel قطع می‌شود)
    try {
      await playWebSpeech(chunks, lang)
    } catch {
      try {
        for (const chunk of chunks) {
          if (stopRef.current) break
          await playChunkApi(chunk, lang)
        }
      } catch {
        setErr(
          locale === 'en'
            ? 'Voice unavailable on this device/network'
            : locale === 'ar'
              ? 'الصوت غير متاح'
              : 'صدا روی این دستگاه/شبکه در دسترس نیست'
        )
      }
    } finally {
      setSpeaking(false)
    }
  }

  return (
    <div className="inline-flex items-center gap-0.5">
      <button
        type="button"
        onClick={speaking ? stop : () => void play()}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition"
        title={speaking ? dict.stop : dict.speak}
        aria-label={speaking ? dict.stop : dict.speak}
      >
        {speaking ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </button>
      {err && <span className="text-[10px] text-rose-300 max-w-[8rem] truncate" title={err}>!</span>}
    </div>
  )
}
