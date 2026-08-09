/**
 * صداهای محیطی سبک با Web Audio — فقط صفحه اصلی
 * بدون فایل خارجی (حجم صفر شبکه)
 */

export type AmbientTheme =
  | 'main'
  | 'day'
  | 'ocean'
  | 'fire'
  | 'galaxy'
  | 'wood'

type Handle = { stop: () => void }

function noiseBuffer(ctx: AudioContext, seconds: number, type: 'white' | 'pink' | 'brown') {
  const frames = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, frames, ctx.sampleRate)
  const data = buf.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, last = 0
  for (let i = 0; i < frames; i++) {
    const w = Math.random() * 2 - 1
    if (type === 'white') {
      data[i] = w * 0.4
    } else if (type === 'pink') {
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.969 * b2 + w * 0.153852
      data[i] = (b0 + b1 + b2 + w * 0.3) * 0.11
    } else {
      last = (last + 0.02 * w) / 1.02
      data[i] = last * 3.5
    }
  }
  return buf
}

export async function startAmbient(theme: AmbientTheme): Promise<Handle | null> {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return null
    const ctx: AudioContext = new Ctx()
    if (ctx.state === 'suspended') await ctx.resume()

    const master = ctx.createGain()
    master.gain.value = 0.0001
    master.connect(ctx.destination)
    // fade in
    master.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 1.2)

    const stoppers: Array<() => void> = []

    const addNoise = (type: 'white' | 'pink' | 'brown', gainVal: number, filterType: BiquadFilterType, freq: number, q = 1) => {
      const src = ctx.createBufferSource()
      src.buffer = noiseBuffer(ctx, 3, type)
      src.loop = true
      const filter = ctx.createBiquadFilter()
      filter.type = filterType
      filter.frequency.value = freq
      filter.Q.value = q
      const g = ctx.createGain()
      g.gain.value = gainVal
      src.connect(filter)
      filter.connect(g)
      g.connect(master)
      src.start()
      stoppers.push(() => {
        try { src.stop() } catch { /* */ }
      })
    }

    const addPad = (freq: number, type: OscillatorType, gainVal: number, lfoHz = 0.05) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = type
      o.frequency.value = freq
      g.gain.value = gainVal
      if (lfoHz) {
        const lfo = ctx.createOscillator()
        const lg = ctx.createGain()
        lfo.frequency.value = lfoHz
        lg.gain.value = gainVal * 0.35
        lfo.connect(lg)
        lg.connect(g.gain)
        lfo.start()
        stoppers.push(() => { try { lfo.stop() } catch { /* */ } })
      }
      o.connect(g)
      g.connect(master)
      o.start()
      stoppers.push(() => { try { o.stop() } catch { /* */ } })
    }

    if (theme === 'main') {
      // نفس / پد عرفانی آرام
      addPad(110, 'sine', 0.35, 0.04)
      addPad(164.8, 'sine', 0.12, 0.03)
      addNoise('brown', 0.08, 'lowpass', 180, 0.7)
    } else if (theme === 'day') {
      // نسیم + جیرجیرک نرم
      addNoise('pink', 0.12, 'bandpass', 2200, 0.6)
      addNoise('brown', 0.1, 'lowpass', 400, 0.8)
      addPad(880, 'triangle', 0.015, 2.4)
    } else if (theme === 'ocean') {
      // موج عمیق + حباب نرم
      addNoise('brown', 0.35, 'lowpass', 320, 0.9)
      addNoise('pink', 0.1, 'bandpass', 900, 0.5)
      addPad(55, 'sine', 0.2, 0.08)
    } else if (theme === 'fire') {
      // ترق ترق آتش
      addNoise('pink', 0.22, 'highpass', 800, 0.7)
      addNoise('brown', 0.18, 'lowpass', 500, 0.8)
      addPad(70, 'sawtooth', 0.03, 9)
    } else if (theme === 'galaxy') {
      // پد فضایی عمیق
      addPad(65, 'sine', 0.28, 0.03)
      addPad(98, 'sine', 0.1, 0.05)
      addNoise('pink', 0.06, 'lowpass', 600, 0.5)
    } else if (theme === 'wood') {
      // جنگل: باد ملایم در برگ‌ها
      addNoise('pink', 0.16, 'bandpass', 1400, 0.7)
      addNoise('brown', 0.14, 'lowpass', 280, 0.8)
      addPad(120, 'triangle', 0.06, 0.12)
    }

    return {
      stop: () => {
        try {
          master.gain.cancelScheduledValues(ctx.currentTime)
          master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
        } catch { /* */ }
        window.setTimeout(() => {
          stoppers.forEach((s) => s())
          try { ctx.close() } catch { /* */ }
        }, 450)
      },
    }
  } catch {
    return null
  }
}
