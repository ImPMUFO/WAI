'use client'

import { useEffect, useRef } from 'react'

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

/**
 * گربه سیامی تم روز
 * ظاهر پیش‌فرض: سر راست، دم چپ → رو به راست
 * حرکت: همیشه به سمت سر (جلو)؛ در انتها دور می‌زند و باز رو به جلو می‌رود
 */
export default function DayCat() {
  const elRef = useRef<HTMLDivElement>(null)
  const lookRef = useRef(false)
  const sitRef = useRef(false)
  // dir: 1 = راست، -1 = چپ — scaleX(dir) چون ظاهر پیش‌فرض رو به راست است
  const pos = useRef({ x: 20, dir: 1 as 1 | -1, step: 0 })
  const timers = useRef<{ look?: number; sit?: number }>({})
  const nextSitAt = useRef(performance.now() + 10000 + Math.random() * 8000)
  const walkSince = useRef(performance.now())

  useEffect(() => {
    let raf = 0
    let last = performance.now()

    const loop = (now: number) => {
      const el = elRef.current
      if (!el || document.hidden) {
        last = now
        raf = requestAnimationFrame(loop)
        return
      }

      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      if (!lookRef.current && !sitRef.current) {
        let { x, dir, step } = pos.current

        // سرعت راه رفتن گربه‌مانند (آهسته و کمی نوسانی)
        const speed = 2.8 + Math.sin(step) * 0.35
        x += dir * speed * dt

        // رسیدن به لبه → برگرد و رو به جلو (جهت جدید)
        if (x >= 72) {
          x = 72
          dir = -1
        } else if (x <= 10) {
          x = 10
          dir = 1
        }

        step = (step + dt * 6.2) % (Math.PI * 2)
        pos.current = { x, dir, step }

        // بالا-پایین خفیف بدن هنگام قدم
        const bob = Math.sin(step) * 1.4
        // scaleX(dir): dir=1 رو به راست، dir=-1 رو به چپ — سر جلو، دم عقب
        el.style.left = `${x}%`
        el.style.transform = `translateX(-50%) translateY(${bob}px) scaleX(${dir})`
        el.classList.add('is-walk')
        el.classList.remove('is-sitting', 'is-looking')

        // نشستن: فقط بعد از حداقل ۸ ثانیه راه رفتن
        const walkedLongEnough = now - walkSince.current > 8000
        if (walkedLongEnough && now >= nextSitAt.current) {
          sitRef.current = true
          el.classList.add('is-sitting')
          el.classList.remove('is-walk')
          if (timers.current.sit) window.clearTimeout(timers.current.sit)
          const sitMs = 2800 + Math.random() * 2200
          timers.current.sit = window.setTimeout(() => {
            sitRef.current = false
            walkSince.current = performance.now()
            // فاصله منطقی تا نشستن بعدی
            nextSitAt.current = performance.now() + 12000 + Math.random() * 10000
          }, sitMs)
        }
      } else {
        el.classList.toggle('is-looking', lookRef.current)
        el.classList.toggle('is-sitting', sitRef.current || lookRef.current)
        el.classList.toggle('is-walk', false)
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
      walkSince.current = performance.now()
      elRef.current?.classList.remove('is-looking', 'is-sitting')
    }, 1500 + Math.random() * 700)
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
      <span className="ta-cat-leg back-l">
        <span className="ta-cat-paw" />
      </span>
      <span className="ta-cat-leg back-r">
        <span className="ta-cat-paw" />
      </span>
      <span className="ta-cat-body">
        <span className="ta-cat-fur f1" />
        <span className="ta-cat-fur f2" />
        <span className="ta-cat-fur f3" />
        <span className="ta-cat-fur f4" />
        <span className="ta-cat-chest" />
        <span className="ta-cat-belly" />
      </span>
      <span className="ta-cat-leg front-l">
        <span className="ta-cat-paw" />
      </span>
      <span className="ta-cat-leg front-r">
        <span className="ta-cat-paw" />
      </span>
      <span className="ta-cat-head">
        <span className="ta-cat-ear l">
          <span className="inner" />
          <span className="tuft" />
        </span>
        <span className="ta-cat-ear r">
          <span className="inner" />
          <span className="tuft" />
        </span>
        <span className="ta-cat-cheek l" />
        <span className="ta-cat-cheek r" />
        <span className="ta-cat-mask" />
        <span className="ta-cat-eye l">
          <span className="pupil" />
          <span className="shine" />
          <span className="shine2" />
        </span>
        <span className="ta-cat-eye r">
          <span className="pupil" />
          <span className="shine" />
          <span className="shine2" />
        </span>
        <span className="ta-cat-nose" />
        <span className="ta-cat-mouth" />
        <span className="ta-cat-whisker w1" />
        <span className="ta-cat-whisker w2" />
        <span className="ta-cat-whisker w3" />
        <span className="ta-cat-whisker w4" />
        <span className="ta-cat-whisker w5" />
        <span className="ta-cat-whisker w6" />
      </span>
      <span className="ta-cat-tail">
        <span className="ta-cat-tail-fluff a" />
        <span className="ta-cat-tail-fluff b" />
        <span className="ta-cat-tail-tip" />
      </span>
    </div>
  )
}
