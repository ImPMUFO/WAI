'use client'

import { useEffect, useState } from 'react'
import LevelUpWheel from '@/components/LevelUpWheel'
import { PENDING_LEVEL_UP_KEY, loadGame } from '@/lib/gamification'

/**
 * گردونه شانس سراسری — هر ارتقای سطح = ۱ شانس
 * روی همه صفحات گوش می‌دهد
 */
export default function GlobalWheelHost() {
  const [open, setOpen] = useState(false)
  const [level, setLevel] = useState(1)

  const check = () => {
    try {
      const pending = localStorage.getItem(PENDING_LEVEL_UP_KEY)
      if (pending) {
        setLevel(Number(pending) || loadGame().level || 1)
        setOpen(true)
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    check()
    const onLvl = () => check()
    window.addEventListener('waima-level-up', onLvl)
    window.addEventListener('storage', onLvl)
    return () => {
      window.removeEventListener('waima-level-up', onLvl)
      window.removeEventListener('storage', onLvl)
    }
  }, [])

  return (
    <LevelUpWheel
      open={open}
      level={level}
      onClose={() => {
        setOpen(false)
        try {
          localStorage.removeItem(PENDING_LEVEL_UP_KEY)
        } catch {
          /* ignore */
        }
      }}
    />
  )
}
