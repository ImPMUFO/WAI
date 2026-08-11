
import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://waima.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['', '/start', '/map', '/play', '/play/duel', '/world', '/journey', '/auth', '/contact']
  const now = new Date()
  return paths.map((p) => ({
    url: `${BASE.replace(/\/$/, '')}${p}`,
    lastModified: now,
    changeFrequency: (p === '' ? 'daily' : 'weekly') as 'daily' | 'weekly',
    priority: p === '' ? 1 : 0.7,
  }))
}
