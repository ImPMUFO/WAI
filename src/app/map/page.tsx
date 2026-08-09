'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Download,
  FileImage,
  FileText,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { loadMindMapFromServer, saveMindMapToServer } from '@/lib/sync'

type NodeStatus = 'known' | 'near' | 'far'
type KnowledgeNode = {
  id: string
  title: string
  parent?: string
  status: NodeStatus
  mastery: number
  note: string
}
type MapData = {
  domainTitle?: string
  summary?: string
  updatedAt?: string
  nodes: KnowledgeNode[]
}
type Laid = KnowledgeNode & { x: number; y: number; r: number }

const MAP_KEY = 'wai_map_unified'
const EXPORT_META_KEY = 'wai_map_last_export'

function mapFingerprint(map: MapData | null): string {
  if (!map?.nodes?.length) return 'empty'
  const parts = map.nodes
    .map((n) => n.id + ':' + n.status + ':' + Math.round(n.mastery) + ':' + n.title)
    .sort()
  return parts.join('|') + '|' + (map.updatedAt || '')
}

const VB = 1000
const CX = 500
const CY = 500

function asStatus(v: unknown): NodeStatus {
  if (v === 'known' || v === 'near' || v === 'far') return v
  return 'far'
}

function normalizeNodes(raw: unknown): KnowledgeNode[] {
  const arr = Array.isArray(raw) ? raw : []
  const out: KnowledgeNode[] = []
  const seen = new Set<string>()
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    const n = item as Record<string, unknown>
    const id = String(n.id || '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    const status = asStatus(n.status)
    const masteryNum = Number(n.mastery)
    out.push({
      id,
      title: String(n.title || id).slice(0, 48),
      parent: n.parent ? String(n.parent) : undefined,
      status,
      mastery: Number.isFinite(masteryNum)
        ? Math.max(0, Math.min(100, masteryNum))
        : status === 'known'
          ? 60
          : status === 'near'
            ? 30
            : 8,
      note: String(n.note || ''),
    })
  }
  if (!seen.has('mind')) {
    out.unshift({ id: 'mind', title: 'ذهن', status: 'known', mastery: 40, note: 'مرکز آگاهی' })
  }
  // سقف برای عملکرد
  if (out.length > 90) return out.slice(0, 90)
  return out
}

function normalizeMap(data: unknown): MapData | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  const nodes = normalizeNodes(d.nodes)
  if (!nodes.length) return null
  return {
    domainTitle: String(d.domainTitle || 'نقشه ذهنی'),
    summary: String(d.summary || ''),
    updatedAt: String(d.updatedAt || new Date().toISOString()),
    nodes,
  }
}

function mergeMaps(a: MapData | null, b: MapData | null): MapData | null {
  if (!a && !b) return null
  if (!a) return b
  if (!b) return a
  const map = new Map<string, KnowledgeNode>()
  for (const n of [...a.nodes, ...b.nodes]) {
    const prev = map.get(n.id)
    if (!prev || n.mastery >= prev.mastery) map.set(n.id, n)
  }
  return {
    domainTitle: b.domainTitle || a.domainTitle,
    summary: b.summary || a.summary,
    updatedAt: new Date().toISOString(),
    nodes: Array.from(map.values()),
  }
}

/** چیدمان شعاعی سبک — بدون حلقه‌های سنگین */
function layoutRadial(nodes: KnowledgeNode[]): Laid[] {
  const list = normalizeNodes(nodes)
  const mind = list.find((n) => n.id === 'mind') || list[0]
  const rest = list.filter((n) => n.id !== mind.id)

  const known = rest.filter((n) => n.status === 'known')
  const near = rest.filter((n) => n.status === 'near')
  const far = rest.filter((n) => n.status === 'far')

  const place = (arr: KnowledgeNode[], radius: number, size: number) => {
    const n = arr.length || 1
    return arr.map((node, i) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2
      return {
        ...node,
        x: CX + Math.cos(a) * radius,
        y: CY + Math.sin(a) * radius,
        r: size,
      }
    })
  }

  const laid: Laid[] = [
    { ...mind, x: CX, y: CY, r: 36 },
    ...place(known, 160, 22),
    ...place(near, 280, 18),
    ...place(far, 400, 15),
  ]
  return laid
}

function statusColor(s: NodeStatus, accent: string): string {
  if (s === 'known') return accent || '#2dd4bf'
  if (s === 'near') return '#fbbf24'
  return '#64748b'
}

/** PDF تک‌صفحه‌ای با تصویر JPEG */
function jpegToPdf(jpegBase64: string, imgW: number, imgH: number): Blob {
  const pageW = 595
  const pageH = 842
  const margin = 28
  const scale = Math.min((pageW - margin * 2) / imgW, (pageH - margin * 2) / imgH)
  const w = imgW * scale
  const h = imgH * scale
  const x = (pageW - w) / 2
  const y = (pageH - h) / 2

  const raw = atob(jpegBase64)
  const imgBytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) imgBytes[i] = raw.charCodeAt(i)

  const enc = new TextEncoder()
  const chunks: Uint8Array[] = []
  let pos = 0
  const offs: number[] = []
  const put = (s: string) => {
    const u = enc.encode(s)
    chunks.push(u)
    pos += u.length
  }
  const putBin = (u: Uint8Array) => {
    chunks.push(u)
    pos += u.length
  }

  put('%PDF-1.4\n')
  offs.push(pos)
  put('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  offs.push(pos)
  put('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')
  offs.push(pos)
  put(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' +
      pageW +
      ' ' +
      pageH +
      '] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>\nendobj\n'
  )
  const stream =
    'q\n' +
    w.toFixed(2) +
    ' 0 0 ' +
    h.toFixed(2) +
    ' ' +
    x.toFixed(2) +
    ' ' +
    y.toFixed(2) +
    ' cm\n/Im0 Do\nQ\n'
  offs.push(pos)
  put('4 0 obj\n<< /Length ' + stream.length + ' >>\nstream\n' + stream + 'endstream\nendobj\n')
  offs.push(pos)
  put(
    '5 0 obj\n<< /Type /XObject /Subtype /Image /Width ' +
      imgW +
      ' /Height ' +
      imgH +
      ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' +
      imgBytes.length +
      ' >>\nstream\n'
  )
  putBin(imgBytes)
  put('\nendstream\nendobj\n')
  const xrefAt = pos
  let xref = 'xref\n0 6\n0000000000 65535 f \n'
  for (const o of offs) {
    xref += String(o).padStart(10, '0') + ' 00000 n \n'
  }
  put(xref)
  put('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xrefAt + '\n%%EOF')

  const total = chunks.reduce((a, c) => a + c.length, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const c of chunks) {
    out.set(c, o)
    o += c.length
  }
  return new Blob([out], { type: 'application/pdf' })
}


function buildMapInterpretation(map: MapData | null, dict: any): string {
  if (!map?.nodes?.length) {
    return dict.mapEmptyHint || 'هنوز گره‌ای کشف نشده. با گفتگو نقشه شکل می‌گیرد.'
  }
  const known = map.nodes.filter((n) => n.status === 'known')
  const near = map.nodes.filter((n) => n.status === 'near')
  const far = map.nodes.filter((n) => n.status === 'far')
  const avg =
    known.length > 0
      ? Math.round(known.reduce((s, n) => s + (n.mastery || 0), 0) / known.length)
      : 0
  const top = [...known].sort((a, b) => (b.mastery || 0) - (a.mastery || 0)).slice(0, 3)
  const names = top.map((n) => n.title).join('، ')
  return (
    `نقشه ذهنی تو ${map.nodes.length} گره دارد: ${known.length} معلوم، ${near.length} نزدیک، ${far.length} در افق. ` +
    (avg ? `میانگین تسلط بخش‌های معلوم حدود ${avg}٪ است. ` : '') +
    (names ? `قوی‌ترین نقاط: ${names}. ` : '') +
    `با گفتگوی بیشتر، مه کنار می‌رود و مسیر یادگیری‌ات روشن‌تر می‌شود.`
  )
}

export default function KnowledgeMapPage() {
  const { dict, dir, locale } = useLocale()
  const [map, setMap] = useState<MapData | null>(null)
  const [selected, setSelected] = useState<Laid | null>(null)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [syncing, setSyncing] = useState(false)
  const [exporting, setExporting] = useState(false)

  const viewportRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const pinch = useRef<{ dist: number; scale: number } | null>(null)

  // بارگذاری فوری از local
  useEffect(() => {
    try {
      const local = normalizeMap(JSON.parse(localStorage.getItem(MAP_KEY) || 'null'))
      if (local) setMap(local)
      else {
        setMap({
          domainTitle: dict.mapTitle || 'نقشه ذهنی',
          nodes: [
            { id: 'mind', title: locale === 'en' ? 'Mind' : 'ذهن', status: 'known', mastery: 40, note: '' },
          ],
        })
      }
    } catch {
      setMap({
        domainTitle: 'نقشه ذهنی',
        nodes: [{ id: 'mind', title: 'ذهن', status: 'known', mastery: 40, note: '' }],
      })
    }
    // همگام‌سازی پس‌زمینه — UI را بند نمی‌کند
    void (async () => {
      try {
        const remote = normalizeMap(await loadMindMapFromServer())
        if (!remote) return
        setMap((prev) => {
          const merged = mergeMaps(prev, remote)
          if (merged) {
            try {
              localStorage.setItem(MAP_KEY, JSON.stringify(merged))
            } catch {
              /* ignore */
            }
          }
          return merged
        })
      } catch {
        /* ignore */
      }
    })()
  }, [dict.mapTitle, locale])

  const laid = useMemo(() => layoutRadial(map?.nodes || []), [map?.nodes])

  const byId = useMemo(() => {
    const m = new Map<string, Laid>()
    for (const n of laid) m.set(n.id, n)
    return m
  }, [laid])

  const links = useMemo(() => {
    const out: { x1: number; y1: number; x2: number; y2: number; status: NodeStatus }[] = []
    for (const n of laid) {
      if (n.id === 'mind') continue
      const parent = n.parent && byId.has(n.parent) ? byId.get(n.parent)! : byId.get('mind')
      if (!parent) continue
      out.push({ x1: parent.x, y1: parent.y, x2: n.x, y2: n.y, status: n.status })
    }
    return out
  }, [laid, byId])

  const accent =
    typeof window !== 'undefined'
      ? getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#2dd4bf'
      : '#2dd4bf'

  const clampScale = (s: number) => Math.min(2.5, Math.max(0.4, s))

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.08 : 0.08
      setScale((s) => clampScale(s + delta))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])


  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    setPan({
      x: drag.current.px + (e.clientX - drag.current.x),
      y: drag.current.py + (e.clientY - drag.current.y),
    })
  }
  const onPointerUp = (e: React.PointerEvent) => {
    drag.current = null
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinch.current = { dist: Math.hypot(dx, dy), scale }
      drag.current = null
    }
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinch.current) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      const ratio = dist / (pinch.current.dist || 1)
      setScale(clampScale(pinch.current.scale * ratio))
    }
  }
  const onTouchEnd = () => {
    pinch.current = null
  }

  const resetView = () => {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }

  const sync = async () => {
    setSyncing(true)
    try {
      const remote = normalizeMap(await loadMindMapFromServer())
      setMap((prev) => {
        const merged = mergeMaps(prev, remote)
        if (merged) {
          try {
            localStorage.setItem(MAP_KEY, JSON.stringify(merged))
          } catch {
            /* ignore */
          }
          void saveMindMapToServer(merged)
        }
        return merged || prev
      })
    } finally {
      setSyncing(false)
    }
  }

  /** رسم مستقیم روی Canvas — متن واضح، بدون وابستگی به var() در SVG */
  const renderToCanvas = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    const css = getComputedStyle(document.documentElement)
    const bg = (css.getPropertyValue('--bg0').trim() || '#0f172a')
    const text = (css.getPropertyValue('--text').trim() || '#f8fafc')
    const muted = (css.getPropertyValue('--muted').trim() || '#94a3b8')
    const border = (css.getPropertyValue('--border').trim() || 'rgba(148,163,184,0.35)')
    const card = (css.getPropertyValue('--card-solid').trim() || '#0f172a')
    const acc = (css.getPropertyValue('--accent').trim() || '#2dd4bf')

    const size = 2000
    const scale = size / VB
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // پس‌زمینه
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, size, size)

    const S = (n: number) => n * scale

    // حلقه‌های راهنما
    for (const [r, op] of [
      [160, 0.5],
      [280, 0.35],
      [400, 0.25],
    ] as const) {
      ctx.beginPath()
      ctx.arc(S(CX), S(CY), S(r), 0, Math.PI * 2)
      ctx.strokeStyle = border
      ctx.globalAlpha = op
      ctx.lineWidth = Math.max(1, 1.5 * scale)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // هاله مرکز
    const glow = ctx.createRadialGradient(S(CX), S(CY), 0, S(CX), S(CY), S(70))
    glow.addColorStop(0, acc + '59') // ~0.35 alpha if 8-digit not supported, fallback below
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(S(CX), S(CY), S(70), 0, Math.PI * 2)
    ctx.fill()
    // fallback glow
    ctx.fillStyle = acc
    ctx.globalAlpha = 0.12
    ctx.beginPath()
    ctx.arc(S(CX), S(CY), S(70), 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    // خطوط
    for (const l of links) {
      const col =
        l.status === 'known' ? acc : l.status === 'near' ? '#fbbf24' : '#64748b'
      ctx.beginPath()
      ctx.moveTo(S(l.x1), S(l.y1))
      ctx.lineTo(S(l.x2), S(l.y2))
      ctx.strokeStyle = col
      ctx.globalAlpha = l.status === 'far' ? 0.25 : 0.55
      ctx.lineWidth = (l.status === 'known' ? 2.5 : 1.5) * scale
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // فونت خوانا برای فارسی/عربی/انگلیسی
    const fontFamily =
      '"Segoe UI", Tahoma, "Arabic Typesetting", "Noto Naskh Arabic", Arial, sans-serif'

    // گره‌ها
    for (const n of laid) {
      const col =
        n.status === 'known' ? acc : n.status === 'near' ? '#fbbf24' : '#64748b'
      const isRoot = n.id === 'mind'
      const x = S(n.x)
      const y = S(n.y)
      const r = S(n.r)

      // هاله
      ctx.beginPath()
      ctx.arc(x, y, r + S(isRoot ? 8 : 4), 0, Math.PI * 2)
      ctx.fillStyle = col
      ctx.globalAlpha = n.status === 'far' ? 0.15 : 0.12
      ctx.fill()
      ctx.globalAlpha = 1

      // دایره اصلی
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = isRoot ? col : card
      ctx.globalAlpha = n.status === 'far' ? 0.55 : 1
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = col
      ctx.lineWidth = (isRoot ? 3.5 : 2.5) * scale
      ctx.stroke()

      // قوس mastery
      if (n.status !== 'far' && !isRoot && n.mastery > 0) {
        const rr = r - S(4)
        ctx.beginPath()
        ctx.arc(x, y, rr, -Math.PI / 2, -Math.PI / 2 + (n.mastery / 100) * Math.PI * 2)
        ctx.strokeStyle = col
        ctx.lineWidth = 2.5 * scale
        ctx.lineCap = 'round'
        ctx.stroke()
      }

      // متن — کامل و واضح
      const label = n.title
      const fontPx = Math.round((isRoot ? 22 : 16) * scale)
      ctx.font = `${isRoot ? '700' : '600'} ${fontPx}px ${fontFamily}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.globalAlpha = n.status === 'far' ? 0.7 : 1

      // سایه ملایم برای خوانایی
      ctx.fillStyle = bg
      const ty = isRoot ? y : y + r + S(16)
      ctx.fillText(label, x + 1, ty + 1)

      ctx.fillStyle = isRoot ? '#0f172a' : text
      if (isRoot) {
        // متن روی دایره رنگی مرکز
        ctx.fillStyle = '#0f172a'
      }
      ctx.fillText(label, x, ty)
      ctx.globalAlpha = 1
    }

    // عنوان پایین
    const title = map?.domainTitle || dict.mapTitle || 'نقشه ذهنی'
    ctx.font = `600 ${Math.round(18 * scale)}px ${fontFamily}`
    ctx.fillStyle = muted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(title, size / 2, size - 24 * scale)

    // تفسیر نقشه در خروجی
    const interpretation = buildMapInterpretation(map, dict)
    ctx.font = `500 ${Math.round(13 * scale)}px ${fontFamily}`
    ctx.fillStyle = text
    ctx.globalAlpha = 0.9
    const maxW = size - 80 * scale
    const words = interpretation.split(' ')
    let line = ''
    let ly = size - 70 * scale
    for (const w of words) {
      const test = line ? line + ' ' + w : w
      if (ctx.measureText(test).width > maxW) {
        ctx.fillText(line, size / 2, ly)
        ly += 18 * scale
        line = w
      } else line = test
    }
    if (line) ctx.fillText(line, size / 2, ly)
    ctx.globalAlpha = 1

    return canvas
  }, [laid, links, map, dict])

  const confirmExport = (format: 'jpg' | 'pdf') => {
    const fp = mapFingerprint(map)
    let lastFp = ''
    let lastFmt = ''
    try {
      const raw = localStorage.getItem(EXPORT_META_KEY)
      if (raw) {
        const j = JSON.parse(raw) as { fp?: string; format?: string }
        lastFp = j.fp || ''
        lastFmt = j.format || ''
      }
    } catch {
      /* ignore */
    }

    const isDup = lastFp === fp && lastFmt === format
    if (isDup) {
      const msg =
        dir === 'ltr'
          ? 'This mind map has not changed since the last download. Download again?'
          : dir === 'rtl' && (locale === 'ar')
            ? 'هذه الخريطة لم تتغير منذ آخر تنزيل. هل تريد تنزيلها مرة أخرى؟'
            : 'این نقشه ذهنی از آخرین دانلود تغییر خاصی نکرده. باز هم دانلود شود؟'
      return window.confirm(msg)
    }

    const msg =
      format === 'jpg'
        ? dir === 'ltr'
          ? 'Download the mind map as a JPG image?'
          : locale === 'ar'
            ? 'تنزيل الخريطة الذهنية كصورة JPG؟'
            : 'نقشه ذهنی به صورت تصویر (JPG) دانلود شود؟'
        : dir === 'ltr'
          ? 'Download the mind map as a PDF document?'
          : locale === 'ar'
            ? 'تنزيل الخريطة الذهنية كملف PDF؟'
            : 'نقشه ذهنی به صورت سند (PDF) دانلود شود؟'
    return window.confirm(msg)
  }

  const markExported = (format: 'jpg' | 'pdf') => {
    try {
      localStorage.setItem(
        EXPORT_META_KEY,
        JSON.stringify({ fp: mapFingerprint(map), format, at: Date.now() })
      )
    } catch {
      /* ignore */
    }
  }

  const downloadJpg = async () => {
    if (!confirmExport('jpg')) return
    setExporting(true)
    try {
      const canvas = await renderToCanvas()
      if (!canvas) return
      const a = document.createElement('a')
      a.download = `waima-mindmap-${Date.now()}.jpg`
      a.href = canvas.toDataURL('image/jpeg', 0.92)
      a.click()
      markExported('jpg')
    } catch {
      /* ignore */
    } finally {
      setExporting(false)
    }
  }

  const downloadPdf = async () => {
    if (!confirmExport('pdf')) return
    setExporting(true)
    try {
      const canvas = await renderToCanvas()
      if (!canvas) return
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      const base64 = dataUrl.split(',')[1] || ''
      const blob = jpegToPdf(base64, canvas.width, canvas.height)
      const a = document.createElement('a')
      a.download = `waima-mindmap-${Date.now()}.pdf`
      a.href = URL.createObjectURL(blob)
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 2000)
      markExported('pdf')
    } catch {
      window.alert(dir === 'ltr' ? 'PDF failed. Try JPG.' : 'خروجی PDF انجام نشد. JPG را امتحان کن.')
    } finally {
      setExporting(false)
    }
  }

  const known = laid.filter((n) => n.status === 'known').length
  const near = laid.filter((n) => n.status === 'near').length
  const far = laid.filter((n) => n.status === 'far').length

  return (
    <main dir={dir} className="min-h-screen flex flex-col" style={{ color: 'var(--text)' }}>
      <header
        className="sticky top-0 z-30 border-b border-[var(--border)]"
        style={{ background: 'var(--bg0)' }}
      >
        <div className="max-w-5xl mx-auto px-3 py-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-semibold truncate">
              {map?.domainTitle || dict.mapTitle}
            </h1>
            <p className="text-[10px] text-[var(--muted)] truncate">
              {dict.unifiedMap} · {laid.length} {locale === 'en' ? 'nodes' : 'گره'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              title="JPG"
              disabled={exporting}
              onClick={() => void downloadJpg()}
              className="p-2 rounded-lg border border-[var(--border)]"
              style={{ background: 'var(--card-solid)' }}
            >
              <FileImage className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="PDF"
              disabled={exporting}
              onClick={() => void downloadPdf()}
              className="p-2 rounded-lg border border-[var(--border)]"
              style={{ background: 'var(--card-solid)' }}
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setScale((s) => clampScale(s + 0.12))}
              className="p-2 rounded-lg border border-[var(--border)]"
              style={{ background: 'var(--card-solid)' }}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setScale((s) => clampScale(s - 0.12))}
              className="p-2 rounded-lg border border-[var(--border)]"
              style={{ background: 'var(--card-solid)' }}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={resetView}
              className="p-2 rounded-lg border border-[var(--border)]"
              style={{ background: 'var(--card-solid)' }}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => void sync()}
              className="p-2 rounded-lg border border-[var(--border)]"
              style={{ background: 'var(--card-solid)' }}
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            </button>
            <Link href="/" className="text-xs text-[var(--muted)] inline-flex items-center gap-1 ms-1">
              <ArrowRight className={`w-3.5 h-3.5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
              {dict.home}
            </Link>
          </div>
        </div>
      </header>

      <div className="px-3 py-2 flex flex-wrap gap-2 text-[11px] justify-center">
        <span className="px-2.5 py-1 rounded-full border border-[var(--border)]" style={{ background: 'var(--card-solid)' }}>
          <span className="inline-block w-2 h-2 rounded-full me-1.5 align-middle" style={{ background: accent }} />
          {dict.mapKnown}: {known}
        </span>
        <span className="px-2.5 py-1 rounded-full border border-[var(--border)]" style={{ background: 'var(--card-solid)' }}>
          <span className="inline-block w-2 h-2 rounded-full me-1.5 align-middle bg-amber-400" />
          {dict.mapNear}: {near}
        </span>
        <span className="px-2.5 py-1 rounded-full border border-[var(--border)]" style={{ background: 'var(--card-solid)' }}>
          <span className="inline-block w-2 h-2 rounded-full me-1.5 align-middle bg-slate-500" />
          {dict.mapFar}: {far}
        </span>
      </div>

      <div className="flex-1 min-h-0 px-2 pb-4">
        <div
          ref={viewportRef}
          className="relative mx-auto max-w-5xl h-[min(72vh,640px)] rounded-2xl border border-[var(--border)] overflow-hidden touch-none select-none"
          style={{ background: 'var(--card-solid)', cursor: drag.current ? 'grabbing' : 'grab' }}
                    onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              willChange: 'transform',
            }}
          >
            <svg
              ref={svgRef}
              width={VB}
              height={VB}
              viewBox={`0 0 ${VB} ${VB}`}
              className="max-w-none"
              style={{ width: VB, height: VB, color: 'var(--text)' }}
            >
              <defs>
                <radialGradient id="mindGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={accent} stopOpacity="0" />
                </radialGradient>
                <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.2" />
                </filter>
              </defs>

              {/* حلقه‌های راهنما */}
              <circle cx={CX} cy={CY} r={160} fill="none" stroke="var(--border)" strokeWidth="1" opacity="0.5" />
              <circle cx={CX} cy={CY} r={280} fill="none" stroke="var(--border)" strokeWidth="1" opacity="0.35" />
              <circle cx={CX} cy={CY} r={400} fill="none" stroke="var(--border)" strokeWidth="1" opacity="0.25" />

              <circle cx={CX} cy={CY} r={70} fill="url(#mindGlow)" />

              {links.map((l, i) => (
                <line
                  key={i}
                  x1={l.x1}
                  y1={l.y1}
                  x2={l.x2}
                  y2={l.y2}
                  stroke={statusColor(l.status, accent)}
                  strokeWidth={l.status === 'known' ? 2 : 1.2}
                  strokeOpacity={l.status === 'far' ? 0.25 : 0.55}
                />
              ))}

              {laid.map((n) => {
                const color = statusColor(n.status, accent)
                const isRoot = n.id === 'mind'
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x}, ${n.y})`}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelected(n)
                    }}
                  >
                    <circle
                      r={n.r + (isRoot ? 8 : 4)}
                      fill={color}
                      opacity={n.status === 'far' ? 0.15 : 0.12}
                    />
                    <circle
                      r={n.r}
                      fill={isRoot ? color : 'var(--card-solid, #0f172a)'}
                      stroke={color}
                      strokeWidth={isRoot ? 3 : 2}
                      opacity={n.status === 'far' ? 0.55 : 1}
                    />
                    {n.status !== 'far' && !isRoot && (
                      <circle
                        r={n.r - 4}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeDasharray={`${(n.mastery / 100) * 2 * Math.PI * (n.r - 4)} ${2 * Math.PI * (n.r - 4)}`}
                        transform="rotate(-90)"
                        opacity="0.9"
                      />
                    )}
                    <text
                      textAnchor="middle"
                      y={isRoot ? 5 : n.r + 16}
                      fill="currentColor"
                      fontSize={isRoot ? 14 : 12}
                      fontWeight={isRoot ? 700 : 600}
                      opacity={n.status === 'far' ? 0.65 : 1}
                      style={{
                        pointerEvents: 'none',
                        fontFamily:
                          'Segoe UI, Tahoma, Arabic Typesetting, Noto Naskh Arabic, Arial, sans-serif',
                      }}
                    >
                      {n.title}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>

          <div className="map-interpretation absolute bottom-10 inset-x-3 sm:inset-x-8 rounded-xl border border-[var(--border)] px-3 py-2 text-[11px] sm:text-xs leading-relaxed pointer-events-none" style={{ background: 'color-mix(in srgb, var(--card-solid) 92%, transparent)', color: 'var(--text)' }}>
            {buildMapInterpretation(map, dict)}
          </div>
          <p className="absolute bottom-2 inset-x-0 text-center text-[10px] text-[var(--muted)] pointer-events-none">
            {dir === 'ltr'
              ? 'Drag to pan · Wheel / pinch to zoom · Export JPG or PDF'
              : 'بکش تا جابه‌جا شود · چرخ/دو انگشت برای زوم · خروجی JPG یا PDF'}
          </p>
        </div>
      </div>

      {selected && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-3 pointer-events-none">
          <div
            className="pointer-events-auto max-w-md mx-auto rounded-2xl border border-[var(--border)] p-4 shadow-2xl"
            style={{ background: 'var(--card-solid)' }}
          >
            <div className="flex justify-between gap-3">
              <div>
                <h2 className="font-semibold text-sm">{selected.title}</h2>
                <p className="text-[11px] text-[var(--accent)] mt-0.5">
                  {selected.status === 'known'
                    ? dict.mapKnown
                    : selected.status === 'near'
                      ? dict.mapNear
                      : dict.mapFar}{' '}
                  · {Math.round(selected.mastery)}%
                </p>
              </div>
              <button type="button" className="text-[var(--muted)] text-sm" onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>
            {selected.note ? (
              <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">{selected.note}</p>
            ) : null}
          </div>
        </div>
      )}
    </main>
  )
}
