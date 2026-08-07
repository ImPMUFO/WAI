'use client'

import { useEffect, useState } from 'react'
import {
  availableForLevel,
  getSavedAvatar,
  getUnlockedSpecial,
  loadAvatarManifest,
  setSavedAvatar,
  type AvatarManifest,
} from '@/lib/avatars'
import { loadGame } from '@/lib/gamification'

export default function AvatarPicker() {
  const [manifest, setManifest] = useState<AvatarManifest | null>(null)
  const [selected, setSelected] = useState('/profiles/level-1/a.svg')
  const [level, setLevel] = useState(1)
  const [unlocked, setUnlocked] = useState<string[]>([])

  useEffect(() => {
    void loadAvatarManifest().then(setManifest)
    setSelected(getSavedAvatar())
    setUnlocked(getUnlockedSpecial())
    try {
      setLevel(loadGame().level || 1)
    } catch {
      setLevel(1)
    }
  }, [])

  if (!manifest) {
    return <p className="text-sm text-[var(--muted)]">…</p>
  }

  const options = availableForLevel(manifest, level, unlocked)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={selected} alt="avatar" className="w-14 h-14 rounded-full border-2 border-[var(--accent)] object-cover bg-[var(--card)]" />
        <div>
          <p className="text-sm font-medium">پروفایل من</p>
          <p className="text-[11px] text-[var(--muted)]">سطح {level} · از عکس‌های بازشده انتخاب کن</p>
        </div>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
        {options.map((o) => (
          <button
            key={o.path}
            type="button"
            onClick={() => {
              setSelected(o.path)
              setSavedAvatar(o.path)
            }}
            className={`rounded-xl border p-1 transition ${
              selected === o.path ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/40' : 'border-[var(--border)]'
            }`}
            title={o.label}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={o.path} alt={o.label} className="w-full aspect-square rounded-lg object-cover" />
          </button>
        ))}
      </div>
    </div>
  )
}
