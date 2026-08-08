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

/**
 * لایه جوی تم‌ها — حرکت خودکار CSS حفظ می‌شود.
 * با CSS `translate` جدا از `transform` انیمیشن، می‌توان کشید بدون قطع انیمیشن.
 */
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

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    // فقط دکمه اصلی / لمس
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.preventDefault()
    e.stopPropagation()
    const el = ref.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
    origin.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y }
    setDragging(true)
  }, [pos.x, pos.y])

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    e.preventDefault()
    const dx = e.clientX - origin.current.px
    const dy = e.clientY - origin.current.py
    setPos({ x: origin.current.x + dx, y: origin.current.y + dy })
  }, [dragging])

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    try {
      ref.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    setDragging(false)
    // کمی برگردد تا حس فنری بدهد، ولی نه کامل صفر
    setPos((p) => ({ x: p.x * 0.85, y: p.y * 0.85 }))
  }, [dragging])

  // دابل‌کلیک / دابل‌تپ = ریست موقعیت
  const onDoubleClick = useCallback(() => {
    setPos({ x: 0, y: 0 })
  }, [])

  return (
    <div
      ref={ref}
      className={`ta-interactive${dragging ? ' is-dragging' : ''}${className ? ` ${className}` : ''}`}
      role="presentation"
      aria-hidden
      title={label}
      style={{
        ...style,
        // جدا از transform انیمیشن CSS
        translate: `${pos.x}px ${pos.y}px`,
        scale: dragging ? '1.06' : undefined,
        transition: dragging ? 'none' : 'translate 0.45s cubic-bezier(0.22, 1, 0.36, 1), scale 0.2s ease',
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

export default function ThemeAtmosphere() {
  const [theme, setTheme] = useState<ThemeId>('main')

  useEffect(() => {
    const read = () => {
      const saved = localStorage.getItem(THEME_KEY) || 'main'
      setTheme(isThemeId(saved) ? saved : 'main')
    }
    read()
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY) read()
    }
    window.addEventListener('storage', onStorage)
    const obs = new MutationObserver(() => {
      const t = document.documentElement.getAttribute('data-theme') || 'main'
      if (isThemeId(t)) setTheme(t)
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      window.removeEventListener('storage', onStorage)
      obs.disconnect()
    }
  }, [])

  return (
    <div className="theme-atmosphere" data-active={theme}>
      {/* ---- روز ---- */}
      <div className="ta-layer ta-day">
        <Draggable className="ta-sun" label="خورشید را بکش" />
        <Draggable className="ta-cloud ta-cloud-1" label="ابر" />
        <Draggable className="ta-cloud ta-cloud-2" label="ابر" />
        <Draggable className="ta-cloud ta-cloud-3" label="ابر" />
      </div>

      {/* ---- دریا ---- */}
      <div className="ta-layer ta-ocean">
        <div className="ta-wave ta-wave-1" />
        <div className="ta-wave ta-wave-2" />
        <div className="ta-wave ta-wave-3" />
        <div className="ta-bubble b1" />
        <div className="ta-bubble b2" />
        <div className="ta-bubble b3" />
        <div className="ta-bubble b4" />
        <Draggable className="ta-fish f1" label="ماهی">
          <span className="ta-fish-eye" />
        </Draggable>
        <Draggable className="ta-fish f2" label="ماهی">
          <span className="ta-fish-eye" />
        </Draggable>
        <Draggable className="ta-fish f3" label="ماهی">
          <span className="ta-fish-eye" />
        </Draggable>
        <Draggable className="ta-shell" label="صدف" />
      </div>

      {/* ---- کهکشان ---- */}
      <div className="ta-layer ta-galaxy">
        <div className="ta-nebula" />
        <div className="ta-stars" />
        <Draggable className="ta-star-dot d1" label="ستاره" />
        <Draggable className="ta-star-dot d2" label="ستاره" />
        <Draggable className="ta-star-dot d3" label="ستاره" />
        <Draggable className="ta-star-dot d4" label="ستاره" />
        <Draggable className="ta-star-dot d5" label="ستاره" />
        {/* شهاب برای کلیک سخت است؛ سیاه‌چاله قابل کشیدن */}
        <div className="ta-meteor m1" />
        <div className="ta-meteor m2" />
        <Draggable className="ta-blackhole" label="سیاه‌چاله" />
      </div>

      {/* ---- آتش ---- */}
      <div className="ta-layer ta-fire">
        <Draggable className="ta-ember e1" label="جرقه" />
        <Draggable className="ta-ember e2" label="جرقه" />
        <Draggable className="ta-ember e3" label="جرقه" />
        <Draggable className="ta-ember e4" label="جرقه" />
        <Draggable className="ta-ember e5" label="جرقه" />
        <div className="ta-lava" />
        <div className="ta-smoke s1" />
        <div className="ta-smoke s2" />
      </div>

      {/* ---- چوب / طبیعت ---- */}
      <div className="ta-layer ta-wood">
        <Draggable className="ta-leaf l1" label="برگ" />
        <Draggable className="ta-leaf l2" label="برگ" />
        <Draggable className="ta-leaf l3" label="برگ" />
        <Draggable className="ta-leaf l4" label="برگ" />
        <div className="ta-branch" />
      </div>

      {/* ---- اصلی ---- */}
      <div className="ta-layer ta-main">
        <Draggable className="ta-orb o1" label="گوی" />
        <Draggable className="ta-orb o2" label="گوی" />
        <Draggable className="ta-orb o3" label="گوی" />
      </div>
    </div>
  )
}
