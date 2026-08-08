'use client'

import { useEffect, useState } from 'react'
import { THEME_KEY, isThemeId, type ThemeId } from '@/lib/themes'

/** لایه جوی سبک — فقط CSS */
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
    <div className="theme-atmosphere" aria-hidden data-active={theme}>
      <div className="ta-layer ta-day">
        <div className="ta-sun" />
        <div className="ta-cloud ta-cloud-1" />
        <div className="ta-cloud ta-cloud-2" />
        <div className="ta-cloud ta-cloud-3" />
      </div>

      <div className="ta-layer ta-ocean">
        <div className="ta-wave ta-wave-1" />
        <div className="ta-wave ta-wave-2" />
        <div className="ta-wave ta-wave-3" />
        <div className="ta-bubble b1" />
        <div className="ta-bubble b2" />
        <div className="ta-bubble b3" />
        <div className="ta-bubble b4" />
        <div className="ta-fish f1">
          <span className="ta-fish-eye" />
        </div>
        <div className="ta-fish f2">
          <span className="ta-fish-eye" />
        </div>
        <div className="ta-fish f3">
          <span className="ta-fish-eye" />
        </div>
        <div className="ta-shell" />
      </div>

      <div className="ta-layer ta-galaxy">
        <div className="ta-nebula" />
        <div className="ta-stars" />
        <div className="ta-star-dot d1" />
        <div className="ta-star-dot d2" />
        <div className="ta-star-dot d3" />
        <div className="ta-star-dot d4" />
        <div className="ta-star-dot d5" />
        <div className="ta-meteor m1" />
        <div className="ta-meteor m2" />
        <div className="ta-blackhole" />
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
      </div>

      <div className="ta-layer ta-wood">
        <div className="ta-leaf l1" />
        <div className="ta-leaf l2" />
        <div className="ta-leaf l3" />
        <div className="ta-leaf l4" />
        <div className="ta-branch" />
      </div>

      <div className="ta-layer ta-main">
        <div className="ta-orb o1" />
        <div className="ta-orb o2" />
        <div className="ta-orb o3" />
      </div>
    </div>
  )
}
