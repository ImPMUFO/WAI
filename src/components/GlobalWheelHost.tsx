'use client'

import { useEffect, useState } from 'react'
import LevelUpWheel from '@/components/LevelUpWheel'
import { PENDING_LEVEL_UP_KEY, loadGame, getWheelChances } from '@/lib/gamification'

export default function GlobalWheelHost() {
  const [open, setOpen] = useState(false)
  const [level, setLevel] = useState(1)

  useEffect(() => {
    const checkPending = () => {
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
    const openManual = () => {
      try {
        if (getWheelChances() <= 0) return
        setLevel(loadGame().level || 1)
        setOpen(true)
      } catch {
        /* ignore */
      }
    }
    checkPending()
    window.addEventListener('waima-level-up', checkPending)
    window.addEventListener('waima-open-wheel', openManual)
    window.addEventListener('storage', checkPending)
    return () => {
      window.removeEventListener('waima-level-up', checkPending)
      window.removeEventListener('waima-open-wheel', openManual)
      window.removeEventListener('storage', checkPending)
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
