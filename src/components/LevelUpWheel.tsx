'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getUnlockedSpecial,
  rollSpecialReward,
  unlockSpecial,
} from '@/lib/avatars'
import { consumeWheelChance, getWheelChances } from '@/lib/gamification'

type Props = {
  open: boolean
  level: number
  onClose: () => void
}

type Seg = {
  key: string
  emoji: string
  label: string
  kind: 'prize' | 'empty'
  color: string
}

const SEGMENTS: Seg[] = [
  { key: 'p1', emoji: '💎', label: 'آواتار خاص', kind: 'prize', color: '#2dd4bf' },
  { key: 'e1', emoji: '💨', label: 'پوچ', kind: 'empty', color: '#475569' },
  { key: 'p2', emoji: '👑', label: 'آواتار خاص', kind: 'prize', color: '#a78bfa' },
  { key: 'e2', emoji: '🍃', label: 'پوچ', kind: 'empty', color: '#64748b' },
  { key: 'p3', emoji: '⭐', label: 'آواتار خاص', kind: 'prize', color: '#fbbf24' },
  { key: 'e3', emoji: '🌀', label: 'پوچ', kind: 'empty', color: '#334155' },
  { key: 'p4', emoji: '🔥', label: 'آواتار خاص', kind: 'prize', color: '#f472b6' },
  { key: 'e4', emoji: '❌', label: 'پوچ', kind: 'empty', color: '#1e293b' },
]

function playSpinSound(durationMs = 3200) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.connect(gain)
    gain.connect(ctx.destination)
    const now = ctx.currentTime
    osc.frequency.setValueAtTime(160, now)
    osc.frequency.exponentialRampToValueAtTime(480, now + durationMs / 1000)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.05)
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
  const [landedLabel, setLandedLabel] = useState('')
  const [rotation, setRotation] = useState(0)
  const [chances, setChances] = useState(0)
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
      setLandedLabel('')
    } else {
      try {
        setChances(getWheelChances())
      } catch {
        setChances(0)
      }
    }
  }, [open])

  const spin = () => {
    if (spinningRef.current || chances <= 0) return
    spinningRef.current = true
    setSpinning(true)
    setResultUrl(null)
    setResultLabel('')
    setMiss(false)
    setLandedLabel('')

    const duration = 3400
    playSpinSound(duration)

    const already = getUnlockedSpecial()
    const prize = rollSpecialReward(already)
    const wantPrize = Boolean(prize)
    const pool = SEGMENTS.map((s, i) => ({ s, i })).filter(({ s }) =>
      wantPrize ? s.kind === 'prize' : s.kind === 'empty'
    )
    const pick = pool[Math.floor(Math.random() * pool.length)] || { s: SEGMENTS[1], i: 1 }

    const step = 360 / SEGMENTS.length
    const targetCenter = pick.i * step + step / 2
    const extraTurns = 5 + Math.floor(Math.random() * 3)
    setRotation((r) => {
      const current = ((r % 360) + 360) % 360
      const desired = (360 - targetCenter + 360) % 360
      const delta = (desired - current + 360) % 360
      return r + extraTurns * 360 + delta
    })

    window.setTimeout(() => {
      if (prize) {
        unlockSpecial(prize.id)
        setResultUrl(prize.url)
        setResultLabel(prize.label)
        setLandedLabel('آواتار خاص')
        setMiss(false)
      } else {
        setMiss(true)
        setLandedLabel('پوچ')
        setResultUrl(null)
      }
      const left = consumeWheelChance()
      setChances(left)
      setSpinning(false)
      spinningRef.current = false
    }, duration + 80)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]">
      <div
        className="relative w-full max-w-sm rounded-3xl border border-[var(--border)] p-5 shadow-2xl space-y-4"
        style={{ background: 'var(--card-solid)', color: 'var(--text)' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 left-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold transition hover:scale-105"
          style={{
            background: 'var(--bg0)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
          aria-label="بستن"
          title="بستن"
        >
          ×
        </button>

        <div className="text-center space-y-1 pt-2">
          <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
            گردونه شانس
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            سطح فعلی: {level} · هر ارتقا = ۱ شانس
          </p>
        </div>

        <div className="relative mx-auto w-56 h-56">
          <div
            className="absolute left-1/2 -top-1 z-10 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: '16px solid var(--accent)',
              filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.35))',
            }}
          />
          <div
            className="absolute inset-0 rounded-full border-4 shadow-inner"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent) 50%, var(--border))',
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 3.4s cubic-bezier(0.12, 0.75, 0.12, 1)' : 'none',
              background: `conic-gradient(${conic})`,
              boxShadow: 'inset 0 0 24px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.25)',
            }}
          >
            {SEGMENTS.map((s, i) => {
              const step = 360 / SEGMENTS.length
              const angle = i * step + step / 2
              return (
                <div
                  key={s.key}
                  className="absolute left-1/2 top-1/2 text-[11px] font-bold"
                  style={{
                    transform: `rotate(${angle}deg) translateY(-78px) rotate(-${angle}deg)`,
                    color: s.kind === 'prize' ? '#0f172a' : '#e2e8f0',
                    textShadow: '0 1px 2px rgba(0,0,0,0.35)',
                  }}
                >
                  {s.emoji}
                </div>
              )
            })}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full text-[11px] font-bold"
                style={{
                  background: 'var(--bg0)',
                  border: '2px solid var(--border)',
                  color: 'var(--text)',
                }}
              >
                شانس
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4 text-[11px]" style={{ color: 'var(--muted)' }}>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#2dd4bf' }} />
            آواتار خاص
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#475569' }} />
            پوچ
          </span>
        </div>

        {!resultUrl && !miss && (
          <>
            <p className="text-center text-xs" style={{ color: 'var(--muted)' }}>
              {chances > 0
                ? `${chances} شانس باقی‌مانده · احتمال آواتار خاص ۴۰٪`
                : 'شانسی ندارید — با ارتقای سطح شانس بگیرید'}
            </p>
            <button
              type="button"
              disabled={spinning || chances <= 0}
              onClick={spin}
              className="btn-primary w-full py-3 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {spinning ? 'می‌چرخد…' : chances > 0 ? 'بچرخان' : 'بدون شانس'}
            </button>
          </>
        )}

        {resultUrl && (
          <div className="text-center space-y-3 rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-dim)] p-3">
            <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
              🎉 آواتار خاص باز شد
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              قطاع: {landedLabel || 'آواتار خاص'} · {resultLabel}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
              خودکار روی پروفایل اعمال نشد — از «حساب» خودت انتخابش کن.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resultUrl}
              alt={resultLabel}
              className="mx-auto h-20 w-20 rounded-full border-2 object-cover"
              style={{ borderColor: 'var(--accent)', background: 'var(--card)' }}
            />
            {chances > 0 ? (
              <button type="button" onClick={spin} className="btn-primary w-full py-3">
                دوباره بچرخان ({chances})
              </button>
            ) : (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                شانس دیگری نمانده — با × ببند
              </p>
            )}
          </div>
        )}

        {miss && (
          <div
            className="text-center space-y-3 rounded-2xl border p-3"
            style={{ borderColor: 'var(--border)', background: 'var(--bg0)' }}
          >
            <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
              این بار پوچ بود
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              قطاع: {landedLabel || 'پوچ'} · آواتار خاص نیامد
            </p>
            {chances > 0 ? (
              <button type="button" onClick={spin} className="btn-primary w-full py-3">
                دوباره بچرخان ({chances})
              </button>
            ) : (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                شانس دیگری نمانده — با × ببند
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
