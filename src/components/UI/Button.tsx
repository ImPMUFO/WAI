'use client'

import React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }

export default function Button({ variant = 'primary', className = '', children, ...rest }: Props) {
  const base = 'inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all'
  const styles =
    variant === 'primary'
      ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg hover:translate-y-[-3px]'
      : 'bg-white/5 border border-white/6 text-white'
  return (
    <button className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </button>
  )
}
