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
import { addXp, loadGame, saveGame } from '@/lib/gamification'

function playTick(kind: 'leaf' | 'wood' | 'pearl' | 'xp') {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const t0 = ctx.currentTime

    if (kind === 'wood') {
      // صدای ضربه چوب / تخته (نویز کوتاه فیلترشده)
      const dur = 0.12
      const frames = Math.floor(ctx.sampleRate * dur)
      const buf = ctx.createBuffer(1, frames, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < frames; i++) {
        const env = Math.pow(1 - i / frames, 2.5)
        data[i] = (Math.random() * 2 - 1) * env
      }
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
      // لایه بم تخته
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

    if (kind === 'leaf') {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.setValueAtTime(520, t0)
      o.frequency.exponentialRampToValueAtTime(280, t0 + 0.15)
      g.gain.setValueAtTime(0.04, t0)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16)
      o.connect(g)
      g.connect(ctx.destination)
      o.start(t0)
      o.stop(t0 + 0.17)
      return
    }

    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = kind === 'pearl' ? 880 : 660
    g.gain.value = 0.05
    o.connect(g)
    g.connect(ctx.destination)
    o.start(t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18)
    o.stop(t0 + 0.2)
  } catch {
    /* ignore */
  }
}

function Draggable({
  className,
  children,
  style,
  label,
  onDoubleClick,
}: {
  className?: string
  children?: ReactNode
  style?: CSSProperties
  label?: string
  onDoubleClick?: () => void
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
        transition: dragging ? 'none' : 'translate 0.25s ease',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onDoubleClick}
    >
      {children}
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
  const [drag, setDrag] = useState(false)
  const origin = useRef({ px: 0, py: 0, x: 0, y: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const patchesRef = useRef(patches)
  patchesRef.current = patches

  useEffect(() => {
    if (!drag) return
    const onMove = (e: PointerEvent) => {
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
      if (next.every((v) => !v)) {
        try {
          localStorage.setItem(THEME_KEY, 'main')
          document.documentElement.setAttribute('data-theme', 'main')
          window.dispatchEvent(new CustomEvent('waima-theme', { detail: 'main' }))
        } catch {
          /* ignore */
        }
      }
    }
    const onUp = () => setDrag(false)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [drag, setPatches])

  return (
    <div
      ref={ref}
      className="ta-water-bucket"
      data-side={side}
      style={{
        translate: `${pos.x}px ${pos.y}px`,
        cursor: drag ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      onPointerDown={(e) => {
        e.preventDefault()
        origin.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y }
        setDrag(true)
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
  { id: 'mercury', name: 'Mercury', className: 'p-mercury', orbit: 0, angle: 0.2, speed: 0.9, size: 14 },
  { id: 'venus', name: 'Venus', className: 'p-venus', orbit: 1, angle: 1.1, speed: 0.7, size: 18 },
  { id: 'earth', name: 'Earth', className: 'p-earth', orbit: 2, angle: 2.4, speed: 0.55, size: 19 },
  { id: 'mars', name: 'Mars', className: 'p-mars', orbit: 3, angle: 3.5, speed: 0.45, size: 17 },
  { id: 'jupiter', name: 'Jupiter', className: 'p-jupiter', orbit: 4, angle: 4.8, speed: 0.28, size: 30 },
  { id: 'saturn', name: 'Saturn', className: 'p-saturn', orbit: 5, angle: 5.6, speed: 0.2, size: 26 },
]

function GalaxySystem() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [planets, setPlanets] = useState(INITIAL_PLANETS)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const dragOffset = useRef({ ox: 0, oy: 0 })

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      if (!document.hidden) {
        const dt = Math.min(0.05, (now - last) / 1000)
        last = now
        setPlanets((prev) =>
          prev.map((p) => (p.id === dragId ? p : { ...p, angle: p.angle + p.speed * dt }))
        )
      } else {
        last = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [dragId])

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
            className={`ta-interactive ta-planet ${p.className}${dragging ? ' is-dragging' : ''}`}
            title={p.name}
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
            onPointerDown={(e) => {
              if (e.button !== 0 && e.pointerType === 'mouse') return
              e.preventDefault()
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

function OceanTreasure() {
  const key = 'waima_ocean_chest_day'
  const [claimed, setClaimed] = useState(true)
  const [toast, setToast] = useState('')

  useEffect(() => {
    try {
      const day = new Date().toISOString().slice(0, 10)
      setClaimed(localStorage.getItem(key) === day)
    } catch {
      setClaimed(false)
    }
  }, [])

  const open = () => {
    if (claimed) return
    const rewards = [5, 10, 15, 20, 25]
    const xp = rewards[Math.floor(Math.random() * rewards.length)]
    try {
      const g = addXp(loadGame(), xp, 'صندوقچه دریایی')
      saveGame(g)
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
        <button type="button" className="ta-treasure" onClick={open} title="صندوقچه">
          🪙
        </button>
      )}
      {toast && <div className="ta-treasure-toast">{toast}</div>}
    </>
  )
}

export default function ThemeAtmosphere() {
  const [theme, setTheme] = useState<ThemeId>('main')
  const [firePatches, setFirePatches] = useState(() => Array.from({ length: 10 }, () => true))
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
        if (d === 'fire') setFirePatches(Array.from({ length: 10 }, () => true))
      } else {
        read()
      }
    }
    window.addEventListener('storage', read)
    window.addEventListener('waima-theme', onCustom as EventListener)
    return () => {
      window.removeEventListener('storage', read)
      window.removeEventListener('waima-theme', onCustom as EventListener)
    }
  }, [])

  return (
    <div className="theme-atmosphere" data-active={theme}>
      {/* DAY */}
      <div className="ta-layer ta-day">
        <div className="ta-sun" />
        <Draggable className="ta-cloud ta-cloud-1" label="ابر" />
        <Draggable className="ta-cloud ta-cloud-2" label="ابر" />
        <Draggable className="ta-cloud ta-cloud-3" label="ابر" />
        <div className="ta-grass" />
        <div className="ta-cottage" />
      </div>

      {/* OCEAN — فقط وقتی فعال است سنگین‌ها را سوار کن */}
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
        {theme === 'ocean' && (
          <>
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
            <Draggable className="ta-jelly j1" label="عروس دریایی" />
            <Draggable className="ta-jelly j2" label="عروس دریایی" />
            {['s1', 's2', 's3', 's4'].map((id) => (
              <Draggable
                key={id}
                className={`ta-shell ${id}`}
                label="صدف"
                onDoubleClick={() => {
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

      {/* GALAXY */}
      <div className="ta-layer ta-galaxy">
        <div className="ta-nebula" />
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className={`ta-star-dot d${i + 1}`} />
        ))}
        {theme === 'galaxy' && <GalaxySystem />}
      </div>

      {/* FIRE */}
      <div className="ta-layer ta-fire">
        {theme === 'fire' &&
          firePatches.map((on, i) =>
            on ? <div key={i} data-fire-patch={i} className={`ta-ember e${(i % 5) + 1}`} /> : null
          )}
        <div className="ta-lava" />
        <div className="ta-smoke s1" />
        <div className="ta-smoke s2" />
        {theme === 'fire' && <FireEraser patches={firePatches} setPatches={setFirePatches} />}
      </div>

      {/* WOOD */}
      <div className="ta-layer ta-wood">
        {theme === 'wood' && (
          <>
            <Draggable className="ta-leaf l1" label="برگ" onDoubleClick={() => playTick('leaf')} />
            <Draggable className="ta-leaf l2" label="برگ" onDoubleClick={() => playTick('leaf')} />
            <Draggable className="ta-leaf l3" label="برگ" onDoubleClick={() => playTick('leaf')} />
            <Draggable className="ta-leaf l1b" label="برگ" onDoubleClick={() => playTick('leaf')} />
            <Draggable
              className="ta-log"
              label="چوب"
              onDoubleClick={() => playTick('wood')}
            />
          </>
        )}
      </div>

      {/* MAIN */}
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
