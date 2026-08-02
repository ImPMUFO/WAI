export type ThemeId =
  | 'main'
  | 'wood'
  | 'day'
  | 'fire'
  | 'ocean'
  | 'galaxy'

export type ThemeDef = {
  id: ThemeId
  name: string
  desc: string
  preview: [string, string, string]
}

export const THEMES: ThemeDef[] = [
  {
    id: 'main',
    name: 'اصلی',
    desc: 'سبز · آبی',
    preview: ['#0d9488', '#059669', '#022c22'],
  },
  {
    id: 'wood',
    name: 'چوبی',
    desc: 'قهوه‌ای · خاکستری',
    preview: ['#a3784f', '#6b7280', '#1c1410'],
  },
  {
    id: 'day',
    name: 'روز',
    desc: 'سفید · زرد · طلایی',
    preview: ['#f59e0b', '#eab308', '#fff7ed'],
  },
  {
    id: 'fire',
    name: 'آتشین',
    desc: 'گدازه‌ای · آبی پررنگ',
    preview: ['#ef4444', '#f59e0b', '#1e3a8a'],
  },
  {
    id: 'ocean',
    name: 'دریایی',
    desc: 'آبی دریا · خاک ساحل',
    preview: ['#0284c7', '#a8a29e', '#0c4a6e'],
  },
  {
    id: 'galaxy',
    name: 'کهکشانی',
    desc: 'بنفش · زرد · آبی',
    preview: ['#a855f7', '#eab308', '#1e1b4b'],
  },
]

export const THEME_KEY = 'wai_theme'

export function isThemeId(v: string): v is ThemeId {
  return THEMES.some((t) => t.id === v)
}
