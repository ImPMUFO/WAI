'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getUnlockedSpecial,
  rollSpecialReward,
  setSavedAvatar,
  unlockSpecial,
} from '@/lib/avatars'
import { consumeWheelChance } from '@/lib/gamification'

type Props = {
  open: boolean
  level: number
  onClose: () => void
}

function playSpinSound(durationMs = 2800) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.connect(gain)
    gain.connect(ctx.destination)
    const now = ctx.currentTime
    osc.frequency.setValueAtTime(180, now)
    osc.frequency.linearRampToValueAtTime(520, now + durationMs / 1000)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000)
    osc.start(now)
    osc.stop(now + durationMs / 1000 + 0.05)
  } catch {
    /* silent */
  }
}

export default function LevelUpWheel({ open, level, onClose }: Props) {
  const [spinning, setSpinning] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultLabel, setResultLabel] = useState('')
  const [miss, setMiss] = useState(false)
  const [rotation, setRotation] = useState(0)
  const done = useRef(false)

  const segments = useMemo(() => ['✨', '🔥', '💎', '👑', '🌊', '⭐', '🎯', '❌'], [])

  useEffect(() => {
    if (!open) {
      setSpinning(false)
      setResultUrl(null)
      setResultLabel('')
      setMiss(false)
      done.current = false
    }
  }, [open])

  const spin = () => {
    if (spinning || done.current) return
    setSpinning(true)
    setResultUrl(null)
    setMiss(false)
    playSpinSound(3000)
    const extra = 5 + Math.floor(Math.random() * 4)
    const land = Math.floor(Math.random() * segments.length)
    setRotation((r) => r + extra * 360 + land * (360 / segments.length))

    window.setTimeout(() => {
      const already = getUnlockedSpecial()
      const prize = rollSpecialReward(already)
      if (prize) {
        unlockSpecial(prize.id)
        setSavedAvatar(prize.url)
        setResultUrl(prize.url)
        setResultLabel(prize.label)
      } else {
        setMiss(true)
      }
      done.current = true
      consumeWheelChance()
      setSpinning(false)
    }, 3200)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--card-solid)] p-5 shadow-2xl space-y-4">
        <div className="text-center space-y-1">
          <p className="text-lg font-bold text-[var(--accent)]">سطح {level}!</p>
          <p className="text-sm text-[var(--muted)]">گردونه شانس پروفایل خاص</p>
        </div>

        <div className="relative mx-auto w-56 h-56">
          <div className="absolute left-1/2 -top-2 -translate-x-1/2 z-10 text-2xl">▼</div>
          <div
            className="w-full h-full rounded-full border-4 border-[var(--accent)] overflow-hidden transition-transform duration-[3000ms] ease-out"
            style={{
              transform: `rotate(${rotation}deg)`,
              background:
                'conic-gradient(#2dd4bf 0 45deg, #a78bfa 45deg 90deg, #fbbf24 90deg 135deg, #f472b6 135deg 180deg, #60a5fa 180deg 225deg, #34d399 225deg 270deg, #f97316 270deg 315deg, #64748b 315deg 360deg)',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[var(--bg0)] border border-[var(--border)] flex items-center justify-center text-xs">
                شانس
              </div>
            </div>
          </div>
        </div>

        {!resultUrl && !miss && (
          <button type="button" disabled={spinning} onClick={spin} className="btn-primary w-full py-3">
            {spinning ? 'می‌چرخد…' : 'بچرخان'}
          </button>
        )}

        {resultUrl && (
          <div className="text-center space-y-2">
            <p className="text-sm text-[var(--accent)]">پروفایل خاص: {resultLabel}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resultUrl} alt={resultLabel} className="w-20 h-20 mx-auto rounded-full border-2 border-[var(--accent)] bg-[var(--card)]" />
            <button type="button" onClick={onClose} className="btn-primary w-full py-3">
              عالی
            </button>
          </div>
        )}

        {miss && (
          <div className="text-center space-y-2">
            <p className="text-sm text-[var(--muted)]">این بار جایزه خاص نیامد. سطح بعد دوباره شانس داری.</p>
            <button type="button" onClick={onClose} className="btn-secondary w-full py-3">
              باشه
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
