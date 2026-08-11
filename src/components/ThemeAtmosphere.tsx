'use client'

import { usePathname } from 'next/navigation'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { THEME_KEY, isThemeId, type ThemeId } from '@/lib/themes'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { addXp, loadGame, saveGame } from '@/lib/gamification'

function playTick(kind: 'leaf' | 'wood' | 'pearl' | 'xp') {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const t0 = ctx.currentTime
    if (kind === 'wood') {
      const dur = 0.12
      const frames = Math.floor(ctx.sampleRate * dur)
      const buf = ctx.createBuffer(1, frames, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, 2.5)
      const src = ctx.createBufferSource()
      src.buffer = buf
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = 420
      filter.Q.value = 1.2
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.35, t0)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
      src.connect(filter)
      filter.connect(g)
      g.connect(ctx.destination)
      src.start(t0)
      src.stop(t0 + dur + 0.02)
      const o = ctx.createOscillator()
      const og = ctx.createGain()
      o.type = 'triangle'
      o.frequency.setValueAtTime(90, t0)
      o.frequency.exponentialRampToValueAtTime(55, t0 + 0.08)
      og.gain.setValueAtTime(0.12, t0)
      og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1)
      o.connect(og)
      og.connect(ctx.destination)
      o.start(t0)
      o.stop(t0 + 0.11)
      return
    }
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = kind === 'pearl' ? 880 : kind === 'xp' ? 660 : 420
    g.gain.value = 0.05
    o.connect(g)
    g.connect(ctx.destination)
    o.start(t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16)
    o.stop(t0 + 0.18)
  } catch {
    /* ignore */
  }
}

function Draggable({
  className,
  wrapClassName,
  children,
  label,
  onActivate,
}: {
  className?: string
  wrapClassName?: string
  children?: ReactNode
  label?: string
  onActivate?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: 0, y: 0 })
  const dragging = useRef(false)
  const origin = useRef({ px: 0, py: 0, x: 0, y: 0 })
  const pid = useRef<number | null>(null)
  const [, force] = useState(0)

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current || pid.current !== e.pointerId) return
      e.preventDefault()
      pos.current = {
        x: origin.current.x + (e.clientX - origin.current.px),
        y: origin.current.y + (e.clientY - origin.current.py),
      }
      if (ref.current) {
        ref.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`
      }
    }
    const onUp = (e: PointerEvent) => {
      if (!dragging.current || (pid.current !== null && pid.current !== e.pointerId)) return
      const moved =
        Math.abs(e.clientX - origin.current.px) + Math.abs(e.clientY - origin.current.py)
      dragging.current = false
      pid.current = null
      if (ref.current) {
        ref.current.classList.remove('is-dragging')
        ref.current.style.transition = 'transform 0.2s ease'
      }
      force((n) => n + 1)
      if (moved < 8) onActivate?.()
    }
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [onActivate])

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.preventDefault()
    e.stopPropagation()
    // بدون setPointerCapture — تداخل با خورشید/اشیای دیگر ندارد
    pid.current = e.pointerId
    origin.current = { px: e.clientX, py: e.clientY, x: pos.current.x, y: pos.current.y }
    dragging.current = true
    if (ref.current) {
      ref.current.classList.add('is-dragging')
      ref.current.style.transition = 'none'
    }
  }

  return (
    <div
      ref={ref}
      className={`ta-drag${wrapClassName ? ` ${wrapClassName}` : ''}`}
      role="presentation"
      aria-hidden
      title={label}
      style={{
        transform: `translate(${pos.current.x}px, ${pos.current.y}px)`,
        transition: 'transform 0.2s ease',
      }}
      onPointerDown={onPointerDown}
    >
      <div className={className}>{children}</div>
    </div>
  )
}


/** برگ چوبی: درگ دستی + بعد از رها کردن آرام می‌افتد پایین */
function FallingLeaf({
  wrapClassName,
  className,
  label,
}: {
  wrapClassName: string
  className: string
  label?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: 0, y: 0 })
  const dragging = useRef(false)
  const falling = useRef(false)
  const origin = useRef({ px: 0, py: 0, x: 0, y: 0 })
  const pid = useRef<number | null>(null)
  const vel = useRef({ vy: 0, vx: 0, rot: 0 })
  const [, force] = useState(0)

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (falling.current && !dragging.current && ref.current) {
        vel.current.vy += 180 * dt // gravity px/s^2 soft
        vel.current.vx *= 0.99
        pos.current.x += vel.current.vx * dt
        pos.current.y += vel.current.vy * dt
        vel.current.rot += vel.current.vx * 0.08
        const maxY = typeof window !== 'undefined' ? window.innerHeight * 0.72 : 600
        // relative to start: stop near bottom of viewport roughly
        if (pos.current.y > maxY) {
          pos.current.y = maxY
          falling.current = false
          vel.current.vy = 0
          vel.current.vx = 0
        }
        ref.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px) rotate(${vel.current.rot}deg)`
        ref.current.classList.add('is-falling')
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onMove = (e: PointerEvent) => {
      if (!dragging.current || pid.current !== e.pointerId) return
      e.preventDefault()
      pos.current = {
        x: origin.current.x + (e.clientX - origin.current.px),
        y: origin.current.y + (e.clientY - origin.current.py),
      }
      if (ref.current) {
        ref.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`
      }
    }
    const onUp = (e: PointerEvent) => {
      if (!dragging.current || (pid.current !== null && pid.current !== e.pointerId)) return
      dragging.current = false
      pid.current = null
      // شروع سقوط نرم
      falling.current = true
      vel.current.vy = 40
      vel.current.vx = (Math.random() - 0.5) * 60
      vel.current.rot = (Math.random() - 0.5) * 20
      if (ref.current) {
        ref.current.classList.remove('is-dragging')
        ref.current.classList.add('is-falling')
      }
      try {
        playTick('leaf')
      } catch {
        /* */
      }
      force((n) => n + 1)
    }
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.preventDefault()
    e.stopPropagation()
    falling.current = false
    vel.current = { vy: 0, vx: 0, rot: 0 }
    pid.current = e.pointerId
    origin.current = { px: e.clientX, py: e.clientY, x: pos.current.x, y: pos.current.y }
    dragging.current = true
    if (ref.current) {
      ref.current.classList.add('is-dragging')
      ref.current.classList.remove('is-falling')
      ref.current.style.transition = 'none'
      ref.current.style.animation = 'none'
    }
  }

  return (
    <div
      ref={ref}
      className={`ta-drag ta-leaf-drag${wrapClassName ? ` ${wrapClassName}` : ''}`}
      role="presentation"
      title={label || 'برگ'}
      style={{
        transform: `translate(${pos.current.x}px, ${pos.current.y}px)`,
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
    >
      <div className={className} />
    </div>
  )
}

function FireEraser({
  patches,
  setPatches,
}: {
  patches: boolean[]
  setPatches: (p: boolean[]) => void
}) {
  const { dir } = useLocale()
  const side = dir === 'ltr' ? 'right' : 'left'
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const drag = useRef(false)
  const origin = useRef({ px: 0, py: 0, x: 0, y: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const patchesRef = useRef(patches)
  patchesRef.current = patches
  const [, bump] = useState(0)

  useEffect(() => {
    if (!drag.current) return
    const onMove = (e: PointerEvent) => {
      if (!drag.current) return
      setPos({
        x: origin.current.x + (e.clientX - origin.current.px),
        y: origin.current.y + (e.clientY - origin.current.py),
      })
      const bucket = ref.current?.getBoundingClientRect()
      if (!bucket) return
      const bx = bucket.left + bucket.width / 2
      const by = bucket.top + bucket.height / 2
      const next = [...patchesRef.current]
      let changed = false
      document.querySelectorAll<HTMLElement>('[data-fire-patch]').forEach((el) => {
        const i = Number(el.dataset.firePatch)
        if (!Number.isFinite(i) || next[i] === false) return
        const r = el.getBoundingClientRect()
        if (Math.hypot(r.left + r.width / 2 - bx, r.top + r.height / 2 - by) < 48) {
          next[i] = false
          changed = true
        }
      })
      if (!changed) return
      patchesRef.current = next
      setPatches(next)
      const left = next.filter(Boolean).length
      if (left <= 2) {
        try {
          localStorage.setItem(THEME_KEY, 'main')
          document.documentElement.setAttribute('data-theme', 'main')
          window.dispatchEvent(new CustomEvent('waima-theme', { detail: 'main' }))
        } catch {
          /* ignore */
        }
      }
    }
    const onUp = () => {
      drag.current = false
      bump((n) => n + 1)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  })

  return (
    <div
      ref={ref}
      className="ta-water-bucket"
      data-side={side}
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        cursor: drag.current ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        origin.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y }
        drag.current = true
        bump((n) => n + 1)
      }}
      title="سطل آب"
    >
      <span className="ta-bucket-icon" aria-hidden>
        🪣
      </span>
    </div>
  )
}

const ORBIT_RATIOS = [0.12, 0.18, 0.26, 0.34, 0.42, 0.5]
type PlanetBody = {
  id: string
  name: string
  className: string
  orbit: number
  angle: number
  speed: number
  size: number
}
const INITIAL_PLANETS: PlanetBody[] = [
  { id: 'mercury', name: 'Mercury', className: 'p-mercury', orbit: 0, angle: 0.2, speed: 0.9, size: 18 },
  { id: 'venus', name: 'Venus', className: 'p-venus', orbit: 1, angle: 1.1, speed: 0.7, size: 24 },
  { id: 'earth', name: 'Earth', className: 'p-earth', orbit: 2, angle: 2.4, speed: 0.55, size: 26 },
  { id: 'mars', name: 'Mars', className: 'p-mars', orbit: 3, angle: 3.5, speed: 0.45, size: 22 },
  { id: 'jupiter', name: 'Jupiter', className: 'p-jupiter', orbit: 4, angle: 4.8, speed: 0.28, size: 38 },
  { id: 'saturn', name: 'Saturn', className: 'p-saturn', orbit: 5, angle: 5.6, speed: 0.2, size: 34 },
]

function GalaxySystem() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [planets, setPlanets] = useState(INITIAL_PLANETS)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const dragOffset = useRef({ ox: 0, oy: 0 })

  const planetsRef = useRef(planets)
  planetsRef.current = planets
  const dragIdRef = useRef(dragId)
  dragIdRef.current = dragId

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let acc = 0
    const tick = (now: number) => {
      if (!document.hidden) {
        const dt = Math.min(0.05, (now - last) / 1000)
        last = now
        acc += dt
        // به‌روزرسانی DOM مستقیم هر فریم، React فقط هر ~100ms
        const wrap = wrapRef.current
        if (wrap && acc < 0.1) {
          for (const p of planetsRef.current) {
            if (p.id === dragIdRef.current) continue
            p.angle += p.speed * dt
            const el = wrap.querySelector(`[data-planet="${p.id}"]`) as HTMLElement | null
            if (el && !el.classList.contains('is-dragging')) {
              const r = 42 + p.orbit * 28
              const x = 50 + Math.cos(p.angle) * (r / 6)
              const y = 50 + Math.sin(p.angle) * (r / 9)
              el.style.left = `${x}%`
              el.style.top = `${y}%`
            }
          }
        } else if (acc >= 0.1) {
          acc = 0
          setPlanets((prev) =>
            prev.map((p) =>
              p.id === dragIdRef.current ? p : { ...p, angle: p.angle + p.speed * 0.1 }
            )
          )
        }
      } else last = now
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const localPos = (p: PlanetBody) => {
    const el = wrapRef.current
    if (!el) return { x: 50, y: 50 }
    const r = el.getBoundingClientRect()
    const radii = ORBIT_RATIOS.map((ratio) => (Math.min(r.width, r.height) / 2) * ratio)
    const rad = radii[p.orbit] ?? radii[0]
    return {
      x: r.width / 2 + Math.cos(p.angle) * rad,
      y: r.height / 2 + Math.sin(p.angle) * rad,
    }
  }

  return (
    <div ref={wrapRef} className="ta-galaxy-system">
      {ORBIT_RATIOS.map((ratio, i) => (
        <div key={i} className="ta-orbit-ring" style={{ width: `${ratio * 100}%`, height: `${ratio * 100}%` }} />
      ))}
      {planets.map((p) => {
        const dragging = dragId === p.id
        const pos = dragging && dragPos ? dragPos : localPos(p)
        return (
          <div
            key={p.id}
            className={`ta-planet ${p.className}${dragging ? ' is-dragging' : ''}`}
            title={p.name}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              width: Math.max(p.size, 28),
              height: Math.max(p.size, 28),
              transform: 'translate(-50%, -50%)',
              zIndex: dragging ? 40 : 6,
              touchAction: 'none',
            }}
            onPointerDown={(e) => {
              if (e.button !== 0 && e.pointerType === 'mouse') return
              e.preventDefault()
              e.stopPropagation()
              e.currentTarget.setPointerCapture(e.pointerId)
              const wrap = wrapRef.current?.getBoundingClientRect()
              const rect = e.currentTarget.getBoundingClientRect()
              const cx = rect.left + rect.width / 2
              const cy = rect.top + rect.height / 2
              dragOffset.current = { ox: e.clientX - cx, oy: e.clientY - cy }
              setDragId(p.id)
              if (wrap) setDragPos({ x: cx - wrap.left, y: cy - wrap.top })
            }}
            onPointerMove={(e) => {
              if (!dragId) return
              const wrap = wrapRef.current?.getBoundingClientRect()
              if (!wrap) return
              setDragPos({
                x: e.clientX - dragOffset.current.ox - wrap.left,
                y: e.clientY - dragOffset.current.oy - wrap.top,
              })
            }}
            onPointerUp={(e) => {
              if (!dragId || !dragPos) return
              try {
                e.currentTarget.releasePointerCapture(e.pointerId)
              } catch {
                /* ignore */
              }
              const wrap = wrapRef.current?.getBoundingClientRect()
              if (!wrap) {
                setDragId(null)
                setDragPos(null)
                return
              }
              const cx = wrap.width / 2
              const cy = wrap.height / 2
              const radii = ORBIT_RATIOS.map((ratio) => (Math.min(wrap.width, wrap.height) / 2) * ratio)
              const dx = dragPos.x - cx
              const dy = dragPos.y - cy
              const dist = Math.hypot(dx, dy)
              let best = 0
              let bestDiff = Infinity
              radii.forEach((rad, i) => {
                const d = Math.abs(rad - dist)
                if (d < bestDiff) {
                  bestDiff = d
                  best = i
                }
              })
              const angle = Math.atan2(dy, dx)
              setPlanets((prev) => prev.map((x) => (x.id === dragId ? { ...x, orbit: best, angle } : x)))
              setDragId(null)
              setDragPos(null)
            }}
          />
        )
      })}
    </div>
  )
}



function playMeow() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.connect(g)
    g.connect(ctx.destination)
    const t = ctx.currentTime
    o.frequency.setValueAtTime(980, t)
    o.frequency.exponentialRampToValueAtTime(520, t + 0.16)
    o.frequency.exponentialRampToValueAtTime(760, t + 0.3)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36)
    o.start(t)
    o.stop(t + 0.38)
    window.setTimeout(() => {
      try {
        ctx.close()
      } catch {
        /* */
      }
    }, 450)
  } catch {
    /* silent */
  }
}

/** خورشید: ورود از چپ → خروج از راست → تکرار؛ درگ دستی بدون قفل pointer */
function DaySun() {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const pid = useRef<number | null>(null)
  const origin = useRef({ px: 0, py: 0, ox: 0, oy: 0 })
  const progress = useRef(0)
  const yBoost = useRef(0)
  const lastTs = useRef(performance.now())
  const CYCLE = 55

  const applyTransform = () => {
    const el = ref.current
    if (!el) return
    const xPct = -12 + progress.current * 124
    const arc = Math.sin(progress.current * Math.PI)
    const yPct = 18 - arc * 12 + yBoost.current
    el.style.left = `${xPct}%`
    el.style.top = `${yPct}%`
    el.style.transform = 'translate(-50%, -50%)'
  }

  useEffect(() => {
    let raf = 0
    lastTs.current = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs.current) / 1000)
      lastTs.current = now
      if (!dragging.current) {
        progress.current += dt / CYCLE
        if (progress.current >= 1) progress.current -= 1
        if (Math.abs(yBoost.current) > 0.05) yBoost.current *= 0.97
        else yBoost.current = 0
        applyTransform()
      }
      raf = requestAnimationFrame(loop)
    }
    applyTransform()
    raf = requestAnimationFrame(loop)

    const onMove = (e: PointerEvent) => {
      if (!dragging.current || pid.current !== e.pointerId) return
      e.preventDefault()
      const w = window.innerWidth || 1
      const h = window.innerHeight || 1
      let p = origin.current.ox + ((e.clientX - origin.current.px) / w) * 0.9
      p = ((p % 1) + 1) % 1
      progress.current = p
      const dy = ((e.clientY - origin.current.py) / h) * 28
      yBoost.current = Math.max(-10, Math.min(10, origin.current.oy + dy))
      applyTransform()
    }
    const onUp = (e: PointerEvent) => {
      if (!dragging.current) return
      if (pid.current !== null && pid.current !== e.pointerId) return
      dragging.current = false
      pid.current = null
    }
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.preventDefault()
    e.stopPropagation()
    pid.current = e.pointerId
    dragging.current = true
    origin.current = {
      px: e.clientX,
      py: e.clientY,
      ox: progress.current,
      oy: yBoost.current,
    }
  }

  return (
    <div
      ref={ref}
      className="ta-drag ta-pos-sun ta-sun-draggable"
      role="presentation"
      title="خورشید"
      style={{ left: '-12%', top: '18%', transform: 'translate(-50%, -50%)' }}
      onPointerDown={onPointerDown}
    >
      <div className="ta-sun ta-sun-face" />
    </div>
  )
}

function DayCat() {
  const elRef = useRef<HTMLDivElement>(null)
  const lookRef = useRef(false)
  const sitRef = useRef(false)
  const pos = useRef({ x: 22, dir: 1 as 1 | -1, step: 0 })
  const timers = useRef<{ look?: number; sit?: number }>({})
  const nextSit = useRef(performance.now() + 6000 + Math.random() * 8000)

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const el = elRef.current
      if (el && !document.hidden) {
        const dt = Math.min(0.05, (now - last) / 1000)
        last = now
        if (!lookRef.current && !sitRef.current) {
          let { x, dir, step } = pos.current
          // حرکت آهسته و طبیعی مثل گربه
          x += dir * 3.6 * dt
          if (x > 68) dir = -1
          if (x < 12) dir = 1
          step = (step + dt * 7.5) % (Math.PI * 2)
          pos.current = { x, dir, step }
          const bob = Math.sin(step) * 1.6
          const lean = Math.sin(step * 2) * 1.2
          el.style.left = `${x}%`
          el.style.transform = `translateX(-50%) translateY(${bob}px) rotate(${lean}deg) scaleX(${-dir})`
          el.classList.add('is-walk')
          el.classList.remove('is-sitting', 'is-looking')
          if (now > nextSit.current) {
            sitRef.current = true
            el.classList.add('is-sitting')
            el.classList.remove('is-walk')
            if (timers.current.sit) window.clearTimeout(timers.current.sit)
            timers.current.sit = window.setTimeout(() => {
              sitRef.current = false
              nextSit.current = performance.now() + 7000 + Math.random() * 10000
            }, 2200 + Math.random() * 2500)
          }
        } else if (el) {
          el.classList.toggle('is-looking', lookRef.current)
          el.classList.toggle('is-sitting', sitRef.current || lookRef.current)
          el.classList.toggle('is-walk', false)
        }
      } else {
        last = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      if (timers.current.look) window.clearTimeout(timers.current.look)
      if (timers.current.sit) window.clearTimeout(timers.current.sit)
    }
  }, [])

  const onTap = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation()
    playMeow()
    lookRef.current = true
    sitRef.current = true
    elRef.current?.classList.add('is-looking', 'is-sitting')
    elRef.current?.classList.remove('is-walk')
    if (timers.current.look) window.clearTimeout(timers.current.look)
    timers.current.look = window.setTimeout(() => {
      lookRef.current = false
      sitRef.current = false
      elRef.current?.classList.remove('is-looking', 'is-sitting')
    }, 1600 + Math.random() * 600)
  }

  return (
    <div
      ref={elRef}
      role="button"
      tabIndex={0}
      className="ta-cat"
      aria-label="گربه سیامی"
      onClick={onTap}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="ta-cat-shadow" />
      <span className="ta-cat-leg back-l" />
      <span className="ta-cat-leg back-r" />
      <span className="ta-cat-body">
        <span className="ta-cat-fur f1" />
        <span className="ta-cat-fur f2" />
        <span className="ta-cat-fur f3" />
        <span className="ta-cat-chest" />
      </span>
      <span className="ta-cat-leg front-l" />
      <span className="ta-cat-leg front-r" />
      <span className="ta-cat-head">
        <span className="ta-cat-ear l"><span className="inner" /></span>
        <span className="ta-cat-ear r"><span className="inner" /></span>
        <span className="ta-cat-mask" />
        <span className="ta-cat-eye l"><span className="pupil" /><span className="shine" /></span>
        <span className="ta-cat-eye r"><span className="pupil" /><span className="shine" /></span>
        <span className="ta-cat-nose" />
        <span className="ta-cat-mouth" />
        <span className="ta-cat-whisker w1" />
        <span className="ta-cat-whisker w2" />
        <span className="ta-cat-whisker w3" />
        <span className="ta-cat-whisker w4" />
        <span className="ta-cat-whisker w5" />
        <span className="ta-cat-whisker w6" />
      </span>
      <span className="ta-cat-tail" />
    </div>
  )
}

function OceanTreasure() {
  const key = 'waima_ocean_chest_day'
  const [claimed, setClaimed] = useState(true)
  const [toast, setToast] = useState('')

  useEffect(() => {
    try {
      setClaimed(localStorage.getItem(key) === new Date().toISOString().slice(0, 10))
    } catch {
      setClaimed(false)
    }
  }, [])

  const open = () => {
    if (claimed) return
    const rewards = [5, 10, 15, 20, 25]
    const xp = rewards[Math.floor(Math.random() * rewards.length)]
    try {
      saveGame(addXp(loadGame(), xp, 'صندوقچه دریایی'))
      localStorage.setItem(key, new Date().toISOString().slice(0, 10))
      setClaimed(true)
      setToast(`+${xp} XP`)
      playTick('xp')
      window.dispatchEvent(new Event('wai-game-updated'))
      window.setTimeout(() => setToast(''), 2000)
    } catch {
      /* ignore */
    }
  }

  if (claimed && !toast) return null
  return (
    <>
      {!claimed && (
        <button type="button" className="ta-treasure" onClick={open} title="صندوقچه گنج">
          <span className="ta-chest" aria-hidden>
            <span className="ta-chest-lid" />
            <span className="ta-chest-body" />
            <span className="ta-chest-lock" />
          </span>
        </button>
      )}
      {toast && <div className="ta-treasure-toast">{toast}</div>}
    </>
  )
}

export default function ThemeAtmosphere() {
  const pathname = usePathname() || '/'
  const showObjects = pathname === '/'
  const [theme, setTheme] = useState<ThemeId>('main')
  const [firePatches, setFirePatches] = useState(() => Array.from({ length: 16 }, () => true))
  const [pearls, setPearls] = useState<Record<string, boolean>>({})



  useEffect(() => {
    const read = () => {
      try {
        const saved = localStorage.getItem(THEME_KEY) || 'main'
        const t = isThemeId(saved) ? saved : 'main'
        setTheme((prev) => (prev === t ? prev : t))
      } catch {
        /* ignore */
      }
    }
    read()
    const onCustom = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (typeof d === 'string' && isThemeId(d)) {
        setTheme(d)
        if (d === 'fire') setFirePatches(Array.from({ length: 16 }, () => true))
      } else read()
    }
    window.addEventListener('storage', read)
    window.addEventListener('waima-theme', onCustom as EventListener)
    return () => {
      window.removeEventListener('storage', read)
      window.removeEventListener('waima-theme', onCustom as EventListener)
    }
  }, [])

  return (
    <>
      <div className="theme-atmosphere theme-atmosphere-bg" data-active={theme} data-objects={showObjects ? '1' : '0'} aria-hidden>
        <div className="ta-layer ta-day">
          <div className="ta-grass" />
          <div className="ta-cottage" />
        </div>
        <div className="ta-layer ta-ocean">
          <div className="ta-wave ta-wave-1" />
          <div className="ta-wave ta-wave-2" />
          <div className="ta-wave ta-wave-3" />
          <div className="ta-seaweed sw1" />
          <div className="ta-seaweed sw2" />
          <div className="ta-seaweed sw3" />
          <div className="ta-bubble b1" />
          <div className="ta-bubble b2" />
          <div className="ta-bubble b3" />
        </div>
        <div className="ta-layer ta-galaxy">
          <div className="ta-nebula" />
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={`ta-star-dot d${i + 1}`} />
          ))}
        </div>
        <div className="ta-layer ta-fire">
          <div className="ta-lava" />
          <div className="ta-smoke s1" />
          <div className="ta-smoke s2" />
        </div>
        <div className="ta-layer ta-main">
          <div className="ta-main-ring" />
          <div className="ta-main-ring ta-main-ring-2" />
          <div className="ta-main-glow g1" />
          <div className="ta-main-glow g2" />
          <div className="ta-main-glow g3" />
        </div>
      </div>

      <div className="theme-atmosphere theme-atmosphere-fg" data-active={theme} data-objects={showObjects ? '1' : '0'} aria-hidden>
        {showObjects ? (
        <>
        <div className="ta-layer ta-day">
          {theme === 'day' && (
            <>
              <DaySun />
              <Draggable wrapClassName="ta-pos-cloud-1" className="ta-cloud ta-cloud-1" label="ابر" />
              <Draggable wrapClassName="ta-pos-cloud-2" className="ta-cloud ta-cloud-2" label="ابر" />
              <Draggable wrapClassName="ta-pos-cloud-3" className="ta-cloud ta-cloud-3" label="ابر" />
              <DayCat />
            </>
          )}
        </div>

        <div className="ta-layer ta-ocean">
          {theme === 'ocean' && (
            <>
              <Draggable wrapClassName="ta-pos-f1" className="ta-fish f1" label="ماهی">
                <span className="ta-fish-tail" />
                <span className="ta-fish-fin-top" />
                <span className="ta-fish-fin-side" />
                <span className="ta-fish-eye" />
                <span className="ta-fish-mouth" />
                <span className="ta-fish-bubble b-a" />
                <span className="ta-fish-bubble b-b" />
              </Draggable>
              <Draggable wrapClassName="ta-pos-f2" className="ta-fish f2" label="ماهی">
                <span className="ta-fish-tail" />
                <span className="ta-fish-fin-top" />
                <span className="ta-fish-fin-side" />
                <span className="ta-fish-eye" />
                <span className="ta-fish-mouth" />
                <span className="ta-fish-bubble b-a" />
                <span className="ta-fish-bubble b-b" />
              </Draggable>
              <Draggable wrapClassName="ta-pos-f3" className="ta-fish f3" label="ماهی">
                <span className="ta-fish-tail" />
                <span className="ta-fish-fin-top" />
                <span className="ta-fish-fin-side" />
                <span className="ta-fish-eye" />
                <span className="ta-fish-mouth" />
                <span className="ta-fish-bubble b-a" />
                <span className="ta-fish-bubble b-b" />
              </Draggable>
              <Draggable wrapClassName="ta-pos-j1" className="ta-jelly j1" label="عروس دریایی" />
              <Draggable wrapClassName="ta-pos-j2" className="ta-jelly j2" label="عروس دریایی" />
              {(['s1', 's2', 's3', 's4'] as const).map((id) => (
                <Draggable
                  key={id}
                  wrapClassName={`ta-pos-shell-${id}`}
                  className={`ta-shell ${id}`}
                  label="صدف"
                  onActivate={() => {
                    if (pearls[id]) return
                    setPearls((p) => ({ ...p, [id]: true }))
                    playTick('pearl')
                  }}
                >
                  {pearls[id] && <span className="ta-pearl" />}
                </Draggable>
              ))}
              <OceanTreasure />
            </>
          )}
        </div>

        <div className="ta-layer ta-galaxy">{theme === 'galaxy' && <GalaxySystem />}</div>

        <div className="ta-layer ta-fire">
          {theme === 'fire' &&
            firePatches.map((on, i) =>
              on ? <div key={i} data-fire-patch={i} className={`ta-ember e${(i % 5) + 1}`} /> : null
            )}
          {theme === 'fire' && <FireEraser patches={firePatches} setPatches={setFirePatches} />}
        </div>

        <div className="ta-layer ta-wood">
          {theme === 'wood' && (
            <>
              <FallingLeaf wrapClassName="ta-pos-l1" className="ta-leaf l1" label="برگ" />
              <FallingLeaf wrapClassName="ta-pos-l2" className="ta-leaf l2" label="برگ" />
              <FallingLeaf wrapClassName="ta-pos-l3" className="ta-leaf l3" label="برگ" />
              <FallingLeaf wrapClassName="ta-pos-l4" className="ta-leaf l4" label="برگ" />
            </>
          )}
        </div>
        </>
        ) : null}
      </div>
    </>
  )
}
