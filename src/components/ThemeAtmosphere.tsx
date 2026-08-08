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

/** کشیدن با CSS translate — انیمیشن transform جدا می‌ماند */
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
      setPos((p) => ({ x: p.x * 0.88, y: p.y * 0.88 }))
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
        scale: dragging ? '1.08' : undefined,
        transition: dragging
          ? 'none'
          : 'translate 0.4s cubic-bezier(0.22, 1, 0.36, 1), scale 0.2s ease',
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
      // برای ThemeSwitcher و Atmosphere
      window.dispatchEvent(new CustomEvent('waima-theme', { detail: 'main' }))
    } catch {
      /* ignore */
    }
  }

  const label =
    locale === 'en' ? 'Put out fire' : locale === 'ar' ? 'أطفئ النار' : 'خاموش کردن آتش'

  return (
    <button
      type="button"
      className="ta-water-bucket"
      data-side={side}
      onClick={extinguish}
      title={label}
    >
      <span className="ta-bucket-icon" aria-hidden>
        🪣
      </span>
      <span className="ta-bucket-label">{label}</span>
    </button>
  )
}

const PLANETS: { orbit: string; planet: string; name: string }[] = [
  { orbit: 'orb-1', planet: 'p-mercury', name: 'Mercury' },
  { orbit: 'orb-2', planet: 'p-venus', name: 'Venus' },
  { orbit: 'orb-3', planet: 'p-earth', name: 'Earth' },
  { orbit: 'orb-4', planet: 'p-mars', name: 'Mars' },
  { orbit: 'orb-5', planet: 'p-jupiter', name: 'Jupiter' },
  { orbit: 'orb-6', planet: 'p-saturn', name: 'Saturn' },
]

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
      {/* روز — روستا */}
      <div className="ta-layer ta-day">
        <Draggable className="ta-sun" label="خورشید" />
        <Draggable className="ta-cloud ta-cloud-1" label="ابر" />
        <Draggable className="ta-cloud ta-cloud-2" label="ابر" />
        <Draggable className="ta-cloud ta-cloud-3" label="ابر" />
        <div className="ta-grass" />
        <div className="ta-cottage" />
      </div>

      {/* دریا */}
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

      {/* کهکشان */}
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
        {PLANETS.map((p) => (
          <div key={p.planet} className={`ta-orbit ${p.orbit}`}>
            <div className="ta-orbit-inner">
              <Draggable className={`ta-planet ${p.planet}`} label={p.name} />
            </div>
          </div>
        ))}
      </div>

      {/* آتش — بدون کشیدن شعله؛ سطل آب */}
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

      {/* چوب */}
      <div className="ta-layer ta-wood">
        <Draggable className="ta-leaf l1" label="برگ" />
        <Draggable className="ta-leaf l2" label="برگ" />
        <Draggable className="ta-leaf l3" label="برگ" />
        <Draggable className="ta-leaf l4" label="برگ" />
        <div className="ta-branch" />
      </div>

      {/* اصلی — رسمی، بدون کشیدن */}
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
