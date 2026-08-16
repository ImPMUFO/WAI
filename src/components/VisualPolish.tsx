'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const STYLE = `
/* WAIMA visual polish */
body[data-waima-page="map"] main {
  background:
    radial-gradient(circle at 50% 18%, color-mix(in srgb,var(--accent) 9%,transparent), transparent 38%),
    radial-gradient(circle at 10% 90%, color-mix(in srgb,var(--accent2) 7%,transparent), transparent 32%);
}
body[data-waima-page="map"] main [class*="max-w-5xl"][class*="touch-none"] {
  border-radius: 28px !important;
  background:
    radial-gradient(circle at 50% 50%, color-mix(in srgb,var(--accent) 7%,transparent), transparent 42%),
    linear-gradient(145deg, color-mix(in srgb,var(--card-solid) 94%,var(--accent)), var(--card-solid)) !important;
  box-shadow:
    0 20px 70px rgba(0,0,0,.22),
    inset 0 1px 0 color-mix(in srgb,var(--accent) 20%,transparent) !important;
}
body[data-waima-page="map"] .map-interpretation {
  box-shadow: 0 10px 35px rgba(0,0,0,.16);
  backdrop-filter: blur(14px);
}
body[data-waima-page="journey"] main {
  background:
    radial-gradient(circle at 15% 15%, color-mix(in srgb,var(--accent) 10%,transparent), transparent 30%),
    radial-gradient(circle at 85% 40%, color-mix(in srgb,var(--accent2) 8%,transparent), transparent 28%);
}
body[data-waima-page="journey"] main .card {
  border-radius: 20px;
  box-shadow: 0 10px 35px rgba(0,0,0,.08);
}
body[data-waima-page="journey"] main .card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 45px rgba(0,0,0,.12);
}
body[data-waima-page="assessment"] header {
  z-index: 100 !important;
  box-shadow: 0 8px 30px rgba(0,0,0,.12);
  backdrop-filter: blur(18px);
}
body[data-waima-page="assessment"] textarea,
body[data-waima-page="assessment"] input {
  transition: border-color .2s ease, box-shadow .2s ease, transform .12s ease;
}
body[data-waima-page="assessment"] textarea:focus,
body[data-waima-page="assessment"] input:focus {
  border-color: color-mix(in srgb,var(--accent) 65%,var(--border)) !important;
  box-shadow: 0 0 0 4px color-mix(in srgb,var(--accent) 12%,transparent);
}
`

export default function VisualPolish() {
  const pathname = usePathname()

  useEffect(() => {
    document.body.dataset.waimaPage =
      pathname?.startsWith('/map') ? 'map' :
      pathname?.startsWith('/journey') ? 'journey' :
      pathname?.startsWith('/assessment') ? 'assessment' : 'other'

    const id = 'waima-visual-polish'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = STYLE
      document.head.appendChild(style)
    }
    return () => {
      delete document.body.dataset.waimaPage
    }
  }, [pathname])

  return null
}
