'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getUnlockedSpecial, rollSpecialReward, unlockSpecial } from '@/lib/avatars'
import { consumeWheelChance, getWheelChances, ensureWheelChancesBackfill } from '@/lib/gamification'

type Props = { open: boolean; level: number; onClose: () => void }
type Seg = { key: string; emoji: string; label: string; kind: 'prize' | 'empty'; color: string }

const SEGMENTS: Seg[] = [
  { key: 'p1', emoji: '💎', label: 'آواتار خاص', kind: 'prize', color: '#2dd4bf' },
  { key: 'e1', emoji: '✨', label: 'پوچ', kind: 'empty', color: '#334155' },
  { key: 'p2', emoji: '👑', label: 'آواتار خاص', kind: 'prize', color: '#a78bfa' },
  { key: 'e2', emoji: '🍀', label: 'پوچ', kind: 'empty', color: '#475569' },
  { key: 'p3', emoji: '⭐', label: 'آواتار خاص', kind: 'prize', color: '#fbbf24' },
  { key: 'e3', emoji: '🪐', label: 'پوچ', kind: 'empty', color: '#1e293b' },
  { key: 'p4', emoji: '🔥', label: 'آواتار خاص', kind: 'prize', color: '#f472b6' },
  { key: 'e4', emoji: '😼', label: 'پوچ', kind: 'empty', color: '#64748b' },
]

function soundTick() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = 520 + Math.random() * 260
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.035, ctx.currentTime + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.045)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.05)
    window.setTimeout(() => void ctx.close(), 100)
  } catch {}
}

function soundWin() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new AudioCtx()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    const now = ctx.currentTime
    ;[523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = freq
      osc.connect(gain)
      osc.start(now + i * 0.07)
      osc.stop(now + i * 0.07 + 0.16)
    })
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)
    window.setTimeout(() => void ctx.close(), 550)
  } catch {}
}

export default function LevelUpWheel({ open, level, onClose }: Props) {
  const [spinning, setSpinning] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultLabel, setResultLabel] = useState('')
  const [miss, setMiss] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [chances, setChances] = useState(0)
  const [tick, setTick] = useState(0)
  const spinningRef = useRef(false)

  const conic = useMemo(() => {
    const step = 360 / SEGMENTS.length
    return SEGMENTS.map((s, i) => `${s.color} ${i * step}deg ${(i + 1) * step}deg`).join(', ')
  }, [])

  useEffect(() => {
    if (!open) {
      setSpinning(false)
      spinningRef.current = false
      setResultUrl(null)
      setResultLabel('')
      setMiss(false)
      return
    }
    ensureWheelChancesBackfill()
    setChances(getWheelChances())
  }, [open])

  const spin = () => {
    if (spinningRef.current || chances <= 0) return
    spinningRef.current = true
    setSpinning(true)
    setResultUrl(null)
    setResultLabel('')
    setMiss(false)

    const duration = 3200
    const already = getUnlockedSpecial()
    const prize = rollSpecialReward(already)
    const pool = SEGMENTS.map((s, i) => ({ s, i })).filter(({ s }) =>
      prize ? s.kind === 'prize' : s.kind === 'empty'
    )
    const pick = pool[Math.floor(Math.random() * pool.length)] || { s: SEGMENTS[1], i: 1 }
    const step = 360 / SEGMENTS.length
    const targetCenter = pick.i * step + step / 2
    const extraTurns = 6 + Math.floor(Math.random() * 2)

    setRotation((r) => {
      const current = ((r % 360) + 360) % 360
      const desired = (360 - targetCenter + 360) % 360
      const delta = (desired - current + 360) % 360
      return r + extraTurns * 360 + delta
    })

    const tickTimer = window.setInterval(() => {
      setTick((x) => x + 1)
      soundTick()
    }, 170)

    window.setTimeout(() => {
      window.clearInterval(tickTimer)
      const left = consumeWheelChance()
      setChances(left)

      if (prize) {
        unlockSpecial(prize.id)
        setResultUrl(prize.url)
        setResultLabel(prize.label)
        setMiss(false)
        soundWin()
      } else {
        setMiss(true)
      }

      setSpinning(false)
      spinningRef.current = false
    }, duration + 100)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border p-5 shadow-2xl"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, color-mix(in srgb,var(--accent) 18%,var(--card-solid)), var(--card-solid) 55%)',
          borderColor: 'color-mix(in srgb,var(--accent) 45%,var(--border))',
          color: 'var(--text)',
        }}
      >
        <div className="pointer-events-none absolute -inset-24 opacity-20 blur-3xl" style={{ background: 'var(--accent)' }} />
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 left-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold"
          style={{ background: 'var(--bg0)', border: '1px solid var(--border)' }}
        >
          ×
        </button>

        <div className="relative text-center space-y-1 pt-1">
          <div className="text-3xl animate-bounce">🎡</div>
          <p className="text-xl font-black" style={{ color: 'var(--accent)' }}>گردونه شانس</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            ارتقای سطح {level} · هر ارتقا یک شانس واقعی
          </p>
        </div>

        <div className="relative mx-auto my-3 h-64 w-64">
          <div
            className="absolute left-1/2 -top-2 z-20 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: '13px solid transparent',
              borderRight: '13px solid transparent',
              borderTop: '20px solid var(--accent)',
              filter: 'drop-shadow(0 3px 3px rgba(0,0,0,.45))',
            }}
          />
          <div
            className="absolute inset-0 rounded-full border-[6px]"
            style={{
              borderColor: 'color-mix(in srgb,var(--accent) 65%,white)',
              background: `conic-gradient(${conic})`,
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 3.2s cubic-bezier(.12,.75,.12,1)' : 'none',
              boxShadow: '0 0 0 8px color-mix(in srgb,var(--accent) 10%,transparent), inset 0 0 28px rgba(0,0,0,.35), 0 14px 40px rgba(0,0,0,.35)',
            }}
          >
            {SEGMENTS.map((s, i) => {
              const step = 360 / SEGMENTS.length
              const angle = i * step + step / 2
              return (
                <div
                  key={s.key}
                  className="absolute left-1/2 top-1/2 text-lg"
                  style={{
                    transform: `rotate(${angle}deg) translateY(-91px) rotate(-${angle}deg)`,
                    textShadow: '0 2px 4px rgba(0,0,0,.4)',
                  }}
                >
                  {s.emoji}
                </div>
              )
            })}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="flex h-16 w-16 flex-col items-center justify-center rounded-full font-black"
                style={{
                  background: 'var(--bg0)',
                  border: '3px solid var(--accent)',
                  boxShadow: '0 0 24px color-mix(in srgb,var(--accent) 35%,transparent)',
                }}
              >
                <span className="text-xl">✨</span>
                <span className="text-[9px]">WAIMA</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative text-center text-xs" style={{ color: 'var(--muted)' }}>
          <span className="font-bold" style={{ color: 'var(--accent)' }}>{chances}</span> شانس باقی‌مانده
        </div>

        {!resultUrl && !miss && (
          <button
            type="button"
            disabled={spinning || chances <= 0}
            onClick={spin}
            className="btn-primary relative mt-3 w-full py-3.5 text-base font-black disabled:opacity-40"
          >
            {spinning ? '🎢 می‌چرخه…' : chances > 0 ? '🎯 بچرخون!' : 'شانس نداری'}
          </button>
        )}

        {resultUrl && (
          <div className="relative mt-3 rounded-2xl border p-4 text-center" style={{ borderColor: 'var(--accent)', background: 'var(--accent-dim)' }}>
            <div className="text-3xl mb-1">🎉🥳🎊</div>
            <p className="font-black" style={{ color: 'var(--accent)' }}>آواتار خاص باز شد!</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{resultLabel}</p>
            <img src={resultUrl} alt={resultLabel} className="mx-auto mt-3 h-24 w-24 rounded-full border-4 object-cover" style={{ borderColor: 'var(--accent)' }} />
            {chances > 0 && <button type="button" onClick={spin} className="btn-primary mt-3 w-full py-3">یکی دیگه! 🎲 ({chances})</button>}
          </div>
        )}

        {miss && (
          <div className="relative mt-3 rounded-2xl border p-4 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg0)' }}>
            <div className="text-3xl mb-1">😹💨</div>
            <p className="font-black">ای بابا، پوچ شد!</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>نگران نباش؛ شانس‌های باقی‌مانده سر جاشونن.</p>
            {chances > 0 && <button type="button" onClick={spin} className="btn-primary mt-3 w-full py-3">دوباره! 🎯 ({chances})</button>}
          </div>
        )}

        <div className="relative mt-3 text-center text-[10px]" style={{ color: 'var(--muted)' }}>
          شانس‌ها با refresh، خروج از حساب و ورود دوباره از بین نمی‌روند.
        </div>
      </div>
    </div>
  )
}
