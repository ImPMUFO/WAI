'use client'

import { useEffect } from 'react'
import { THEME_KEY, isThemeId } from '@/lib/themes'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) || 'main'
    const theme = isThemeId(saved) ? saved : 'main'
    document.documentElement.setAttribute('data-theme', theme)
  }, [])

  return <>{children}</>
}
