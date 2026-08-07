'use client'

import Link from 'next/link'
import { ArrowRight, Mail } from 'lucide-react'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { contactBlocks, contactPageTitle, type ContactBlock } from '@/content/contact-content'

function BlockView({ block }: { block: ContactBlock }) {
  switch (block.type) {
    case 'heading': {
      const L = block.level || 2
      const cls =
        L === 1
          ? 'text-xl sm:text-2xl font-bold'
          : L === 2
            ? 'text-lg sm:text-xl font-semibold'
            : 'text-base font-semibold'
      if (L === 1) return <h1 className={cls}>{block.text}</h1>
      if (L === 2) return <h2 className={cls}>{block.text}</h2>
      return <h3 className={cls}>{block.text}</h3>
    }
    case 'text':
      return (
        <p className="text-sm sm:text-base text-[var(--muted)] leading-relaxed whitespace-pre-wrap">
          {block.text}
        </p>
      )
    case 'html':
      return (
        <div
          className="text-sm sm:text-base leading-relaxed prose-invert max-w-none [&_a]:text-[var(--accent)] [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      )
    case 'image':
      return (
        <figure className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.url}
            alt={block.alt || ''}
            className="w-full max-w-md rounded-2xl border border-[var(--border)] object-cover"
          />
          {block.caption ? (
            <figcaption className="text-xs text-[var(--muted)]">{block.caption}</figcaption>
          ) : null}
        </figure>
      )
    case 'link':
      return (
        <a
          href={block.href}
          target={block.external ? '_blank' : undefined}
          rel={block.external ? 'noreferrer noopener' : undefined}
          className="btn-primary inline-flex px-5 py-2.5 text-sm"
        >
          {block.label}
        </a>
      )
    case 'list':
      return (
        <ul className="list-disc pr-5 space-y-1.5 text-sm text-[var(--muted)] leading-relaxed">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )
    case 'divider':
      return <hr className="border-[var(--border)] my-2" />
    default:
      return null
  }
}

export default function ContactPage() {
  const { dict, dir } = useLocale()

  return (
    <main dir={dir} className="min-h-screen" style={{ color: 'var(--text)' }}>
      <header className="border-b border-[var(--border)] backdrop-blur-md bg-[color-mix(in_srgb,var(--bg0)_85%,transparent)] sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[var(--accent)]" />
            <h1 className="text-sm sm:text-base font-semibold">{contactPageTitle}</h1>
          </div>
          <Link href="/" className="text-sm text-[var(--muted)] inline-flex items-center gap-1">
            <ArrowRight className={`w-3.5 h-3.5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
            {dict.home}
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        {contactBlocks.map((block, i) => (
          <div key={i}>
            <BlockView block={block} />
          </div>
        ))}
      </div>
    </main>
  )
}
