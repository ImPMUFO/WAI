'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-dark-950/60 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🧠</div>
          <div>
            <h1 className="text-base sm:text-lg font-bold">من کیستم؟</h1>
            <p className="text-[10px] sm:text-xs text-teal-400/80">پایگاه دانش</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-4">
          <Link href="/start" className="text-sm text-gray-200 hover:text-white">شروع</Link>
          <Link href="/assessment" className="text-sm text-gray-200 hover:text-white">ارزیابی</Link>
          <Link href="/map" className="text-sm text-gray-200 hover:text-white">نقشه دانش</Link>
          <Link href="/docs" className="text-sm text-gray-200 hover:text-white">مستندات</Link>
          <Link href="https://github.com/ImPMUFO/WAI" className="ml-2 btn-secondary">GitHub</Link>
        </nav>

        <div className="md:hidden">
          <button onClick={() => setOpen(!open)} aria-label="menu" className="p-2 rounded-md bg-white/3">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-dark-950/90 border-t border-white/5">
          <div className="px-4 py-3 flex flex-col gap-2">
            <Link href="/start" className="text-sm text-gray-200">شروع</Link>
            <Link href="/assessment" className="text-sm text-gray-200">ارزیابی</Link>
            <Link href="/map" className="text-sm text-gray-200">نقشه دانش</Link>
            <Link href="/docs" className="text-sm text-gray-200">مستندات</Link>
          </div>
        </div>
      )}
    </header>
  )
}
