export type ThemeId = 'main' | 'wood' | 'day' | 'fire' | 'ocean' | 'galaxy'

export type ThemeDef = {
  id: ThemeId
  nameKey: 'themeMain' | 'themeWood' | 'themeDay' | 'themeFire' | 'themeOcean' | 'themeGalaxy'
  descKey:
    | 'themeMainDesc'
    | 'themeWoodDesc'
    | 'themeDayDesc'
    | 'themeFireDesc'
    | 'themeOceanDesc'
    | 'themeGalaxyDesc'
  preview: [string, string, string]
}

export const THEMES: ThemeDef[] = [
  { id: 'main', nameKey: 'themeMain', descKey: 'themeMainDesc', preview: ['#14b8a6', '#10b981', '#020617'] },
  { id: 'wood', nameKey: 'themeWood', descKey: 'themeWoodDesc', preview: ['#c4a484', '#6b7280', '#1c1410'] },
  { id: 'day', nameKey: 'themeDay', descKey: 'themeDayDesc', preview: ['#38bdf8', '#fbbf24', '#e0f2fe'] },
  { id: 'fire', nameKey: 'themeFire', descKey: 'themeFireDesc', preview: ['#ef4444', '#f59e0b', '#1c1917'] },
  { id: 'ocean', nameKey: 'themeOcean', descKey: 'themeOceanDesc', preview: ['#0ea5e9', '#38bdf8', '#0c4a6e'] },
  { id: 'galaxy', nameKey: 'themeGalaxy', descKey: 'themeGalaxyDesc', preview: ['#a855f7', '#fbbf24', '#0f0a1e'] },
]

export const THEME_KEY = 'wai_theme'

export function isThemeId(v: string): v is ThemeId {
  return THEMES.some((t) => t.id === v)
}
