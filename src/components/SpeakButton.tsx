'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, Square } from 'lucide-react'
import { useLocale } from '@/lib/i18n/LocaleProvider'

function detectLang(text: string, fallback: string): 'fa' | 'ar' | 'en' {
  const t = text || ''
  if (/[پچژگ]/.test(t) || /[\u0600-\u06FF]/.test(t)) {
    if (fallback === 'ar' && !/[پچژگ]/.test(t)) return 'ar'
    return 'fa'
  }
  if (/[A-Za-z]/.test(t)) return 'en'
  return fallback === 'en' || fallback === 'ar' ? (fallback as 'en' | 'ar') : 'fa'
}

function chunkText(text: string, max = 140): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  if (clean.length <= max) return [clean]
  const parts: string[] = []
  let rest = clean
  while (rest.length > max) {
    let cut = rest.lastIndexOf(' ', max)
    if (cut < 30) cut = max
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
      audio.play().catch(reject)
    })
  }

  const playWebSpeech = async (chunks: string[], lang: string) => {
    if (!('speechSynthesis' in window)) throw new Error('no-speech')
    // voices load async
    await new Promise((r) => setTimeout(r, 150))
    const voices = window.speechSynthesis.getVoices()
    const pick =
      voices.find((v) => v.lang?.toLowerCase().startsWith(lang)) ||
      voices.find((v) => (lang === 'fa' || lang === 'ar') && v.lang?.toLowerCase().startsWith('ar')) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith('en')) ||
      null

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
    const chunks = chunkText(text, 140)
    try {
      for (const chunk of chunks) {
        if (stopRef.current) break
        await playChunkApi(chunk, lang)
      }
    } catch {
      try {
        await playWebSpeech(chunks, lang)
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
