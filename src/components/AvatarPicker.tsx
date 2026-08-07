'use client'

import { useEffect, useState } from 'react'
import {
  availableForLevel,
  getSavedAvatar,
  getUnlockedSpecial,
  setSavedAvatar,
} from '@/lib/avatars'
import { loadGame } from '@/lib/gamification'

export default function AvatarPicker() {
  const [selected, setSelected] = useState('')
  const [level, setLevel] = useState(1)
  const [unlocked, setUnlocked] = useState<string[]>([])

  useEffect(() => {
    setSelected(getSavedAvatar())
    setUnlocked(getUnlockedSpecial())
    try {
      setLevel(loadGame().level || 1)
    } catch {
      setLevel(1)
    }
  }, [])

  const options = availableForLevel(level, unlocked)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={selected || options[0]?.url}
          alt="avatar"
          className="w-14 h-14 rounded-full border-2 border-[var(--accent)] object-cover bg-[var(--card)]"
        />
        <div>
          <p className="text-sm font-medium">پروفایل من</p>
          <p className="text-[11px] text-[var(--muted)]">سطح {level} · از لیست انتخاب کن</p>
        </div>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-52 overflow-y-auto">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => {
              setSelected(o.url)
              setSavedAvatar(o.url)
            }}
            className={`rounded-xl border p-1 transition ${
              selected === o.url ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/40' : 'border-[var(--border)]'
            }`}
            title={o.label}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={o.url} alt={o.label} className="w-full aspect-square rounded-lg object-cover bg-[var(--card)]" />
          </button>
        ))}
      </div>
    </div>
  )
}
