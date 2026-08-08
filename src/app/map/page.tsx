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

  put('%PDF-1.4
')
  offs.push(pos)
  put('1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
')
  offs.push(pos)
  put('2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
')
  offs.push(pos)
  put(
    `3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>
endobj
`
  )
  const stream = `q
${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm
/Im0 Do
Q
`
  offs.push(pos)
  put(`4 0 obj
<< /Length ${stream.length} >>
stream
${stream}endstream
endobj
`)
  offs.push(pos)
  put(
    `5 0 obj
<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>
stream
`
  )
  putBin(imgBytes)
  put('
endstream
endobj
')
  const xrefAt = pos
  let xref = `xref
0 6
0000000000 65535 f 
`
  for (const o of offs) xref += `${String(o).padStart(10, '0')} 00000 n 
`
  put(xref)
  put(`trailer
<< /Size 6 /Root 1 0 R >>
startxref
${xrefAt}
%%EOF`)

  const total = chunks.reduce((a, c) => a + c.length, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const c of chunks) {
    out.set(c, o)
    o += c.length
  }
  return new Blob([out], { type: 'application/pdf' })
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

  const renderToCanvas = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    const svg = svgRef.current
    if (!svg) return null
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    // پس‌زمینه در export
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg0').trim() || '#0f172a'
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', '100%')
    rect.setAttribute('height', '100%')
    rect.setAttribute('fill', bg)
    clone.insertBefore(rect, clone.firstChild)

    const xml = new XMLSerializer().serializeToString(clone)
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    try {
      const img = new Image()
      img.decoding = 'async'
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('img'))
        img.src = url
      })
      const size = 1600
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      return canvas
    } finally {
      URL.revokeObjectURL(url)
    }
  }, [])

  const downloadJpg = async () => {
    setExporting(true)
    try {
      const canvas = await renderToCanvas()
      if (!canvas) return
      const a = document.createElement('a')
      a.download = `waima-mindmap-${Date.now()}.jpg`
      a.href = canvas.toDataURL('image/jpeg', 0.92)
      a.click()
    } catch {
      /* ignore */
    } finally {
      setExporting(false)
    }
  }

  const downloadPdf = async () => {
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
    } catch {
      /* fallback: jpg */
      await downloadJpg()
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
              style={{ width: VB, height: VB }}
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
                      fill={isRoot ? color : 'var(--card-solid)'}
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
                      y={isRoot ? 5 : n.r + 14}
                      fill="var(--text)"
                      fontSize={isRoot ? 13 : 11}
                      fontWeight={isRoot ? 700 : 500}
                      opacity={n.status === 'far' ? 0.55 : 0.95}
                      style={{ pointerEvents: 'none' }}
                    >
                      {n.title.length > 14 ? n.title.slice(0, 13) + '…' : n.title}
                    </text>
                  </g>
                )
              })}
            </svg>
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
