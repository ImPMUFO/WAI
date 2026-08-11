'use client'

import { useEffect, useRef } from 'react'

type Props = {
  fishClass: string
  /** درصد افقی شروع 0–100 */
  startX?: number
  /** درصد عمودی از بالا */
  y?: number
  /** سرعت نسبی */
  speed?: number
  /** 1 راست، -1 چپ */
  initialDir?: 1 | -1
  label?: string
}

/**
 * ماهی اقیانوسی: شنا از این‌سوی دریا به آن‌سو، چرخش، برگشت
 * قابل کشیدن با دست بدون خراب شدن چرخه
 */
export default function SwimmingFish({
  fishClass,
  startX = 15,
  y = 60,
  speed = 1,
  initialDir = 1,
  label = 'ماهی',
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const fishRef = useRef<HTMLDivElement>(null)
  const state = useRef({
    x: startX,
    y,
    dir: initialDir as 1 | -1,
    bob: 0,
    dragging: false,
    ox: 0,
    oy: 0,
    px: 0,
    py: 0,
  })

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const s = state.current
      const wrap = wrapRef.current
      const fish = fishRef.current
      if (wrap && fish && !document.hidden) {
        if (!s.dragging) {
          s.x += s.dir * 12 * speed * dt
          if (s.x >= 88) {
            s.x = 88
            s.dir = -1
          } else if (s.x <= 6) {
            s.x = 6
            s.dir = 1
          }
          s.bob += dt * 3.2 * speed
        }
        const bobY = Math.sin(s.bob) * 6
        wrap.style.left = `${s.x}%`
        wrap.style.top = `${s.y}%`
        wrap.style.transform = `translate(-50%, -50%) translateY(${bobY}px)`
        // ظاهر ماهی رو به راست است → scaleX(dir)
        fish.style.transform = `scaleX(${s.dir})`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [speed])

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const s = state.current
    s.dragging = true
    s.px = e.clientX
    s.py = e.clientY
    s.ox = s.x
    s.oy = s.y
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const s = state.current
    if (!s.dragging) return
    const w = window.innerWidth || 1
    const h = window.innerHeight || 1
    s.x = Math.min(92, Math.max(4, s.ox + ((e.clientX - s.px) / w) * 100))
    s.y = Math.min(88, Math.max(35, s.oy + ((e.clientY - s.py) / h) * 100))
  }
  const onPointerUp = () => {
    state.current.dragging = false
  }

  return (
    <div
      ref={wrapRef}
      className={`ta-swim-wrap ta-pos-fish ${fishClass}-wrap`}
      style={{ left: `${startX}%`, top: `${y}%` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="img"
      aria-label={label}
    >
      <div ref={fishRef} className={`ta-fish ${fishClass}`}>
        <span className="ta-fish-tail" />
        <span className="ta-fish-fin-top" />
        <span className="ta-fish-fin-side" />
        <span className="ta-fish-eye" />
        <span className="ta-fish-mouth" />
        <span className="ta-fish-bubble b-a" />
        <span className="ta-fish-bubble b-b" />
      </div>
    </div>
  )
}
