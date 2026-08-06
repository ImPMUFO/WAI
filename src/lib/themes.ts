export type ThemeId =
  | 'main'
  | 'wood'
  | 'day'
  | 'fire'
  | 'ocean'
  | 'galaxy'

export type ThemeDef = {
  id: ThemeId
  nameKey: 'themeMain' | 'themeWood' | 'themeDay' | 'themeFire' | 'themeOcean' | 'themeGalaxy'
  descKey: 'themeMainDesc' | 'themeWoodDesc' | 'themeDayDesc' | 'themeFireDesc' | 'themeOceanDesc' | 'themeGalaxyDesc'
  preview: [string, string, string]
}

export const THEMES: ThemeDef[] = [
  { id: 'main', nameKey: 'themeMain', descKey: 'themeMainDesc', preview: ['#0d9488', '#059669', '#022c22'] },
  { id: 'wood', nameKey: 'themeWood', descKey: 'themeWoodDesc', preview: ['#a3784f', '#6b7280', '#1c1410'] },
  { id: 'day', nameKey: 'themeDay', descKey: 'themeDayDesc', preview: ['#f59e0b', '#eab308', '#fff7ed'] },
  { id: 'fire', nameKey: 'themeFire', descKey: 'themeFireDesc', preview: ['#ef4444', '#f59e0b', '#1e3a8a'] },
  { id: 'ocean', nameKey: 'themeOcean', descKey: 'themeOceanDesc', preview: ['#0284c7', '#a8a29e', '#0c4a6e'] },
  { id: 'galaxy', nameKey: 'themeGalaxy', descKey: 'themeGalaxyDesc', preview: ['#a855f7', '#eab308', '#1e1b4b'] },
]

export const THEME_KEY = 'wai_theme'

export function isThemeId(v: string): v is ThemeId {
  return THEMES.some((t) => t.id === v)
}
