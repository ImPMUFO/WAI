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

/* ---------- Ambient audio (home only) ---------- */
function useThemeAmbient(theme: ThemeId, enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null)
  const nodesRef = useRef<{ stop: () => void } | null>(null)

  useEffect(() => {
    if (!enabled) {
      nodesRef.current?.stop()
      nodesRef.current = null
      return
    }
    let stopped = false
    const start = async () => {
      try {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext
        if (!Ctx) return
        const ctx: AudioContext = ctxRef.current || new Ctx()
        ctxRef.current = ctx
        if (ctx.state === 'suspended') await ctx.resume()
        nodesRef.current?.stop()

        const master = ctx.createGain()
        master.gain.value = 0.035
        master.connect(ctx.destination)

        const stoppers: Array<() => void> = []
        const addOsc = (type: OscillatorType, freq: number, gainVal: number, lfoHz = 0) => {
          const o = ctx.createOscillator()
          const g = ctx.createGain()
          o.type = type
          o.frequency.value = freq
          g.gain.value = gainVal
          if (lfoHz > 0) {
            const lfo = ctx.createOscillator()
            const lg = ctx.createGain()
            lfo.frequency.value = lfoHz
            lg.gain.value = freq * 0.02
            lfo.connect(lg)
            lg.connect(o.frequency)
            lfo.start()
            stoppers.push(() => lfo.stop())
          }
          o.connect(g)
          g.connect(master)
          o.start()
          stoppers.push(() => {
            try {
              o.stop()
            } catch {
              /* */
            }
          })
        }

        if (theme === 'main') {
          addOsc('sine', 110, 0.4, 0.08)
          addOsc('sine', 164.8, 0.15, 0.05)
        } else if (theme === 'day') {
          addOsc('triangle', 520, 0.08, 1.2)
          addOsc('sine', 180, 0.12, 0.15)
        } else if (theme === 'ocean') {
          // soft noise-ish via detuned sines
          addOsc('sine', 60, 0.35, 0.2)
          addOsc('sine', 90, 0.2, 0.35)
          addOsc('triangle', 40, 0.15, 0.1)
        } else if (theme === 'fire') {
          addOsc('sawtooth', 55, 0.08, 8)
          addOsc('square', 90, 0.04, 12)
        } else if (theme === 'galaxy') {
          addOsc('sine', 80, 0.25, 0.04)
          addOsc('sine', 240, 0.08, 0.07)
        } else if (theme === 'wood') {
          addOsc('sine', 100, 0.2, 0.12)
          addOsc('triangle', 220, 0.06, 0.3)
        }

        nodesRef.current = {
          stop: () => {
            stoppers.forEach((s) => s())
            master.disconnect()
          },
        }
      } catch {
        /* ignore */
      }
    }
    void start()
    return () => {
      stopped = true
      nodesRef.current?.stop()
      nodesRef.current = null
    }
  }, [theme, enabled])
}

function playTick(kind: 'leaf' | 'wood' | 'pearl' | 'xp') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = kind === 'wood' ? 'triangle' : 'sine'
    o.frequency.value = kind === 'pearl' ? 880 : kind === 'xp' ? 660 : kind === 'leaf' ? 420 : 180
    g.gain.value = 0.06
    o.connect(g)
    g.connect(ctx.destination)
    o.start()
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2)
    o.stop(ctx.currentTime + 0.22)
  } catch {
    /* */
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
        /* */
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
        transition: dragging ? 'none' : 'translate 0.3s ease',
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

/** سطل آتش — پاک‌کن تکه‌تکه */
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
      const next = [...patches]
      let changed = false
      document.querySelectorAll<HTMLElement>('[data-fire-patch]').forEach((el) => {
        const i = Number(el.dataset.firePatch)
        if (next[i] === false) return
        const r = el.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        if (Math.hypot(cx - bx, cy - by) < 48) {
          next[i] = false
          changed = true
        }
      })
      if (changed) {
        setPatches(next)
        if (next.every((v) => !v)) {
          try {
            localStorage.setItem(THEME_KEY, 'main')
            document.documentElement.setAttribute('data-theme', 'main')
            window.dispatchEvent(new CustomEvent('waima-theme', { detail: 'main' }))
          } catch {
            /* */
          }
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
  }, [drag, patches, setPatches])

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
                /* */
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
      setTimeout(() => setToast(''), 2000)
    } catch {
      /* */
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
  const [onHome, setOnHome] = useState(true)
  const [firePatches, setFirePatches] = useState(() => Array.from({ length: 10 }, () => true))
  const [pearls, setPearls] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const read = () => {
      const saved = localStorage.getItem(THEME_KEY) || 'main'
      setTheme(isThemeId(saved) ? saved : 'main')
    }
    read()
    const path = () => setOnHome(window.location.pathname === '/')
    path()
    const onCustom = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (typeof d === 'string' && isThemeId(d)) setTheme(d)
      else read()
      if (typeof d === 'string' && d === 'fire') {
        setFirePatches(Array.from({ length: 10 }, () => true))
      }
    }
    window.addEventListener('storage', read)
    window.addEventListener('waima-theme', onCustom as EventListener)
    window.addEventListener('popstate', path)
    // observe SPA navigations via click on links
    const obs = new MutationObserver(path)
    obs.observe(document.body, { childList: true, subtree: true })
    const t = window.setInterval(path, 800)
    return () => {
      window.removeEventListener('storage', read)
      window.removeEventListener('waima-theme', onCustom as EventListener)
      window.removeEventListener('popstate', path)
      obs.disconnect()
      window.clearInterval(t)
    }
  }, [])

  useThemeAmbient(theme, onHome)

  return (
    <div className="theme-atmosphere" data-active={theme}>
      <div className="ta-layer ta-day">
        <div className="ta-sun" />
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
        <div className="ta-seaweed sw1" />
        <div className="ta-seaweed sw2" />
        <div className="ta-seaweed sw3" />
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
      </div>

      <div className="ta-layer ta-galaxy">
        <div className="ta-nebula" />
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className={`ta-star-dot d${i + 1}`} />
        ))}
        {theme === 'galaxy' && <GalaxySystem />}
      </div>

      <div className="ta-layer ta-fire">
        {firePatches.map((on, i) =>
          on ? (
            <div
              key={i}
              data-fire-patch={i}
              className={`ta-ember e${(i % 5) + 1}`}
              style={{ opacity: 1 }}
            />
          ) : null
        )}
        <div className="ta-lava" />
        <div className="ta-smoke s1" />
        <div className="ta-smoke s2" />
        {theme === 'fire' && (
          <FireEraser patches={firePatches} setPatches={setFirePatches} />
        )}
      </div>

      <div className="ta-layer ta-wood">
        <Draggable
          className="ta-leaf l1"
          label="برگ"
          onDoubleClick={() => playTick('leaf')}
        />
        <Draggable className="ta-leaf l2" label="برگ" onDoubleClick={() => playTick('leaf')} />
        <Draggable className="ta-leaf l3" label="برگ" onDoubleClick={() => playTick('leaf')} />
        <Draggable className="ta-leaf l4" label="برگ" onDoubleClick={() => playTick('leaf')} />
        <div
          className="ta-wood-hit"
          onPointerDown={() => playTick('wood')}
          aria-hidden
        />
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
