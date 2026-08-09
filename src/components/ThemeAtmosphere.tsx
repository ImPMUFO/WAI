'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { THEME_KEY, isThemeId, type ThemeId } from '@/lib/themes'
import { useLocale } from '@/lib/i18n/LocaleProvider'

function Draggable({
  className,
  children,
  style,
  label,
}: {
  className?: string
  children?: ReactNode
  style?: CSSProperties
  label?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const origin = useRef({ px: 0, py: 0, x: 0, y: 0 })

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      e.preventDefault()
      e.stopPropagation()
      ref.current?.setPointerCapture(e.pointerId)
      origin.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y }
      setDragging(true)
    },
    [pos.x, pos.y]
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging) return
      e.preventDefault()
      setPos({
        x: origin.current.x + (e.clientX - origin.current.px),
        y: origin.current.y + (e.clientY - origin.current.py),
      })
    },
    [dragging]
  )

  const endDrag = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging) return
      try {
        ref.current?.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      setDragging(false)
      setPos((p) => ({ x: p.x * 0.9, y: p.y * 0.9 }))
    },
    [dragging]
  )

  return (
    <div
      ref={ref}
      className={`ta-interactive${dragging ? ' is-dragging' : ''}${className ? ` ${className}` : ''}`}
      role="presentation"
      aria-hidden
      title={label}
      style={{
        ...style,
        translate: `${pos.x}px ${pos.y}px`,
        scale: dragging ? '1.06' : undefined,
        transition: dragging
          ? 'none'
          : 'translate 0.35s cubic-bezier(0.22, 1, 0.36, 1), scale 0.2s ease',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => setPos({ x: 0, y: 0 })}
    >
      {children}
    </div>
  )
}

function WaterBucket() {
  const { dir, locale } = useLocale()
  const side = dir === 'ltr' ? 'right' : 'left'

  const extinguish = () => {
    try {
      localStorage.setItem(THEME_KEY, 'main')
      document.documentElement.setAttribute('data-theme', 'main')
      window.dispatchEvent(new Event('storage'))
      window.dispatchEvent(new CustomEvent('waima-theme', { detail: 'main' }))
    } catch {
      /* ignore */
    }
  }

  const label =
    locale === 'en' ? 'Put out fire' : locale === 'ar' ? 'أطفئ النار' : 'خاموش کردن آتش'

  return (
    <button type="button" className="ta-water-bucket" data-side={side} onClick={extinguish} title={label}>
      <span className="ta-bucket-icon" aria-hidden>
        🪣
      </span>
      <span className="ta-bucket-label">{label}</span>
    </button>
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
  { id: 'mercury', name: 'Mercury', className: 'p-mercury', orbit: 0, angle: 0.2, speed: 0.9, size: 14 },
  { id: 'venus', name: 'Venus', className: 'p-venus', orbit: 1, angle: 1.1, speed: 0.7, size: 18 },
  { id: 'earth', name: 'Earth', className: 'p-earth', orbit: 2, angle: 2.4, speed: 0.55, size: 19 },
  { id: 'mars', name: 'Mars', className: 'p-mars', orbit: 3, angle: 3.5, speed: 0.45, size: 17 },
  { id: 'jupiter', name: 'Jupiter', className: 'p-jupiter', orbit: 4, angle: 4.8, speed: 0.28, size: 30 },
  { id: 'saturn', name: 'Saturn', className: 'p-saturn', orbit: 5, angle: 5.6, speed: 0.2, size: 26 },
]

function GalaxySystem() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [planets, setPlanets] = useState<PlanetBody[]>(INITIAL_PLANETS)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const dragOffset = useRef({ ox: 0, oy: 0 })

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      setPlanets((prev) =>
        prev.map((p) => (p.id === dragId ? p : { ...p, angle: p.angle + p.speed * dt }))
      )
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [dragId])

  const centerAndRadii = useCallback(() => {
    const el = wrapRef.current
    if (!el) return { cx: 0, cy: 0, radii: ORBIT_RATIOS.map(() => 80) }
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const base = Math.min(r.width, r.height) / 2
    return { cx, cy, radii: ORBIT_RATIOS.map((ratio) => base * ratio) }
  }, [])

  const localPos = (p: PlanetBody) => {
    const el = wrapRef.current
    if (!el) return { x: 50, y: 50 }
    const r = el.getBoundingClientRect()
    const radii = ORBIT_RATIOS.map((ratio) => (Math.min(r.width, r.height) / 2) * ratio)
    const rad = radii[p.orbit] ?? radii[0]
    const x = r.width / 2 + Math.cos(p.angle) * rad
    const y = r.height / 2 + Math.sin(p.angle) * rad
    return { x, y }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>, id: string) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const wrap = wrapRef.current?.getBoundingClientRect()
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    dragOffset.current = { ox: e.clientX - cx, oy: e.clientY - cy }
    setDragId(id)
    if (wrap) {
      setDragPos({ x: cx - wrap.left, y: cy - wrap.top })
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragId) return
    e.preventDefault()
    const wrap = wrapRef.current?.getBoundingClientRect()
    if (!wrap) return
    setDragPos({
      x: e.clientX - dragOffset.current.ox - wrap.left,
      y: e.clientY - dragOffset.current.oy - wrap.top,
    })
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
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
    setPlanets((prev) => prev.map((p) => (p.id === dragId ? { ...p, orbit: best, angle } : p)))
    setDragId(null)
    setDragPos(null)
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
            className={`ta-interactive ta-planet ${p.className}${dragging ? ' is-dragging' : ''}`}
            title={p.name}
            role="presentation"
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              width: Math.max(p.size, 28),
              height: Math.max(p.size, 28),
              transform: 'translate(-50%, -50%)',
              zIndex: dragging ? 50 : 5,
              touchAction: 'none',
            }}
            onPointerDown={(e) => onPointerDown(e, p.id)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        )
      })}
    </div>
  )
}

export default function ThemeAtmosphere() {
  const [theme, setTheme] = useState<ThemeId>('main')

  useEffect(() => {
    const read = () => {
      const saved = localStorage.getItem(THEME_KEY) || 'main'
      setTheme(isThemeId(saved) ? saved : 'main')
    }
    read()
    const onStorage = () => read()
    const onCustom = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (typeof d === 'string' && isThemeId(d)) setTheme(d)
      else read()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('waima-theme', onCustom as EventListener)
    const obs = new MutationObserver(() => {
      const t = document.documentElement.getAttribute('data-theme') || 'main'
      if (isThemeId(t)) setTheme(t)
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('waima-theme', onCustom as EventListener)
      obs.disconnect()
    }
  }, [])

  return (
    <div className="theme-atmosphere" data-active={theme}>
      <div className="ta-layer ta-day">
        <Draggable className="ta-sun" label="خورشید" />
        <Draggable className="ta-cloud ta-cloud-1" label="ابر" />
        <Draggable className="ta-cloud ta-cloud-2" label="ابر" />
        <Draggable className="ta-cloud ta-cloud-3" label="ابر" />
        <div className="ta-grass" />
        <div className="ta-cottage" />
      </div>

      <div className="ta-layer ta-ocean">
        <div className="ta-wave ta-wave-1" />
        <div className="ta-wave ta-wave-2" />
        <div className="ta-wave ta-wave-3" />
        <div className="ta-bubble b1" />
        <div className="ta-bubble b2" />
        <div className="ta-bubble b3" />
        <div className="ta-bubble b4" />
        <Draggable className="ta-fish f1" label="ماهی">
          <span className="ta-fish-fin" />
          <span className="ta-fish-eye" />
        </Draggable>
        <Draggable className="ta-fish f2" label="ماهی">
          <span className="ta-fish-fin" />
          <span className="ta-fish-eye" />
        </Draggable>
        <Draggable className="ta-fish f3" label="ماهی">
          <span className="ta-fish-fin" />
          <span className="ta-fish-eye" />
        </Draggable>
        <Draggable className="ta-shell" label="صدف" />
      </div>

      <div className="ta-layer ta-galaxy">
        <div className="ta-nebula" />
        <div className="ta-star-dot d1" />
        <div className="ta-star-dot d2" />
        <div className="ta-star-dot d3" />
        <div className="ta-star-dot d4" />
        <div className="ta-star-dot d5" />
        <div className="ta-star-dot d6" />
        <div className="ta-star-dot d7" />
        <div className="ta-star-dot d8" />
        {theme === 'galaxy' && <GalaxySystem />}
      </div>

      <div className="ta-layer ta-fire">
        <div className="ta-ember e1" />
        <div className="ta-ember e2" />
        <div className="ta-ember e3" />
        <div className="ta-ember e4" />
        <div className="ta-ember e5" />
        <div className="ta-lava" />
        <div className="ta-smoke s1" />
        <div className="ta-smoke s2" />
        {theme === 'fire' && <WaterBucket />}
      </div>

      <div className="ta-layer ta-wood">
        <Draggable className="ta-leaf l1" label="برگ" />
        <Draggable className="ta-leaf l2" label="برگ" />
        <Draggable className="ta-leaf l3" label="برگ" />
        <Draggable className="ta-leaf l4" label="برگ" />
        <div className="ta-branch" />
      </div>

      <div className="ta-layer ta-main">
        <div className="ta-main-ring" />
        <div className="ta-main-ring ta-main-ring-2" />
        <div className="ta-main-glow g1" />
        <div className="ta-main-glow g2" />
        <div className="ta-main-glow g3" />
      </div>
    </div>
  )
}
