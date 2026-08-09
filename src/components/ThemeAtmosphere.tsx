'use client'

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
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const origin = useRef({ px: 0, py: 0, x: 0, y: 0 })
  const [, force] = useState(0)

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      e.preventDefault()
      e.stopPropagation()
      ref.current?.setPointerCapture(e.pointerId)
      origin.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y }
      dragging.current = true
      force((n) => n + 1)
    },
    [pos.x, pos.y]
  )

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    e.preventDefault()
    setPos({
      x: origin.current.x + (e.clientX - origin.current.px),
      y: origin.current.y + (e.clientY - origin.current.py),
    })
  }, [])

  const endDrag = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return
      try {
        ref.current?.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      const moved =
        Math.abs(e.clientX - origin.current.px) + Math.abs(e.clientY - origin.current.py)
      dragging.current = false
      force((n) => n + 1)
      if (moved < 8) onActivate?.()
    },
    [onActivate]
  )

  return (
    <div
      ref={ref}
      className={`ta-drag${wrapClassName ? ` ${wrapClassName}` : ''}${dragging.current ? ' is-dragging' : ''}`}
      role="presentation"
      aria-hidden
      title={label}
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: dragging.current ? 'none' : 'transform 0.2s ease',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className={className}>{children}</div>
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
      } else last = now
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


function DayCat() {
  const ref = useRef<HTMLButtonElement>(null)
  const [look, setLook] = useState(false)
  const pos = useRef({ x: 18, dir: 1 as 1 | -1 })
  const [, bump] = useState(0)
  const lookTimer = useRef<any>(null)

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      if (!document.hidden && !look) {
        const dt = Math.min(0.05, (now - last) / 1000)
        last = now
        let { x, dir } = pos.current
        x += dir * 4.2 * dt // درصد عرض
        if (x > 72) dir = -1
        if (x < 10) dir = 1
        pos.current = { x, dir }
        bump((n) => n + 1)
      } else {
        last = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      if (lookTimer.current) window.clearTimeout(lookTimer.current)
    }
  }, [look])

  const onTap = () => {
    setLook(true)
    if (lookTimer.current) window.clearTimeout(lookTimer.current)
    lookTimer.current = window.setTimeout(() => setLook(false), 1400)
  }

  return (
    <button
      ref={ref}
      type="button"
      className={`ta-cat${look ? ' is-looking' : ''}`}
      style={{
        left: `${pos.current.x}%`,
        transform: `translateX(-50%) scaleX(${pos.current.dir})`,
      }}
      onClick={onTap}
      title="گربه سیامی"
      aria-label="گربه سیامی"
    >
      <span className="ta-cat-body" />
      <span className="ta-cat-head">
        <span className="ta-cat-ear l" />
        <span className="ta-cat-ear r" />
        <span className="ta-cat-eye l" />
        <span className="ta-cat-eye r" />
        <span className="ta-cat-nose" />
      </span>
      <span className="ta-cat-tail" />
    </button>
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
      <div className="theme-atmosphere theme-atmosphere-bg" data-active={theme} aria-hidden>
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

      <div className="theme-atmosphere theme-atmosphere-fg" data-active={theme} aria-hidden>
        <div className="ta-layer ta-day">
          {theme === 'day' && (
            <>
              <Draggable wrapClassName="ta-pos-sun" className="ta-sun ta-sun-drag" label="خورشید" />
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
                <span className="ta-fish-fin" />
                <span className="ta-fish-eye" />
              </Draggable>
              <Draggable wrapClassName="ta-pos-f2" className="ta-fish f2" label="ماهی">
                <span className="ta-fish-fin" />
                <span className="ta-fish-eye" />
              </Draggable>
              <Draggable wrapClassName="ta-pos-f3" className="ta-fish f3" label="ماهی">
                <span className="ta-fish-fin" />
                <span className="ta-fish-eye" />
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
              <Draggable wrapClassName="ta-pos-l1" className="ta-leaf l1" label="برگ" onActivate={() => playTick('leaf')} />
              <Draggable wrapClassName="ta-pos-l2" className="ta-leaf l2" label="برگ" onActivate={() => playTick('leaf')} />
              <Draggable wrapClassName="ta-pos-l3" className="ta-leaf l3" label="برگ" onActivate={() => playTick('leaf')} />
              <Draggable wrapClassName="ta-pos-l4" className="ta-leaf l4" label="برگ" onActivate={() => playTick('leaf')} />
            </>
          )}
        </div>
      </div>
    </>
  )
}
