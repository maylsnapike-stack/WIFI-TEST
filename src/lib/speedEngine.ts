/**
 * Real speed-test engine.
 *
 * - Ping/Jitter : Cloudflare `__down?bytes=0` ga ketma-ket HTTP so‘rovlar
 * - Download    : bir nechta parallel stream, ReadableStream orqali haqiqiy qabul qilingan baytlar
 * - Upload      : bir nechta parallel XHR POST; faqat server TO‘LIQ qabul qilib javob bergan bo‘laklar
 *                  sanaladi (upload.onprogress bufer to‘lishini ham sanagani uchun natijani oshirib yuboradi)
 * - Mbps        : (baytlar × 8) / sekund / 1e6 — isitish (warm-up) davri hisobdan chiqariladi
 *
 * Hech qanday tasodifiy/soxta qiymat ishlatilmaydi. Server ishlamasa SpeedTestError tashlanadi.
 */

const BASE: string = (import.meta.env.VITE_SPEED_BASE ?? 'https://speed.cloudflare.com').replace(/\/$/, '')

export type SpeedErrorKind = 'offline' | 'network' | 'server' | 'timeout' | 'aborted'

export class SpeedTestError extends Error {
  readonly kind: SpeedErrorKind
  constructor(kind: SpeedErrorKind, message: string) {
    super(message)
    this.name = 'SpeedTestError'
    this.kind = kind
  }
}

const abortError = () => new SpeedTestError('aborted', 'Test bekor qilindi.')

const networkError = () =>
  new SpeedTestError(
    'network',
    'Test serveriga ulanib bo‘lmadi. Internet aloqasini, VPN yoki reklama blokerni va tarmoq (CORS) cheklovlarini tekshiring.',
  )

const toSpeedError = (e: unknown): SpeedTestError => (e instanceof SpeedTestError ? e : networkError())

/** Faqat cache-busting uchun (o‘lchov natijasiga ta’sir qilmaydi). */
const nonce = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

/** Tashqi signalga bog‘langan bola controller. */
function linkedController(parent: AbortSignal) {
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  if (parent.aborted) controller.abort()
  else parent.addEventListener('abort', onAbort, { once: true })
  return { controller, dispose: () => parent.removeEventListener('abort', onAbort) }
}

/* ------------------------------------------------------------------ */
/* PING + JITTER                                                       */
/* ------------------------------------------------------------------ */

export interface PingResult {
  ping: number
  jitter: number
  samples: number[]
}

/** Brauzer Resource Timing orqali so‘rov → birinchi bayt vaqtini oladi (agar server ruxsat bersa). */
function resourceTimingMs(url: string): number | null {
  try {
    const entries = performance.getEntriesByName(url) as PerformanceResourceTiming[]
    const e = entries[entries.length - 1]
    performance.clearResourceTimings()
    if (!e) return null
    const d = e.responseStart - e.requestStart
    return d > 0 && d < 10_000 ? d : null
  } catch {
    return null
  }
}

async function pingOnce(signal: AbortSignal, timeoutMs: number): Promise<number> {
  const url = `${BASE}/__down?bytes=0&r=${nonce()}`
  const { controller, dispose } = linkedController(signal)
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const t0 = performance.now()
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal })
    await res.arrayBuffer()
    if (!res.ok) throw new SpeedTestError('server', `Server xatosi: HTTP ${res.status}.`)
    const wall = performance.now() - t0
    return resourceTimingMs(url) ?? wall
  } catch (e) {
    if (signal.aborted) throw abortError()
    if (timedOut) throw new SpeedTestError('timeout', 'Server javob bermadi (vaqt tugadi).')
    throw toSpeedError(e)
  } finally {
    clearTimeout(timer)
    dispose()
  }
}

export async function measurePing(
  signal: AbortSignal,
  onSample?: (ms: number, done: number, total: number) => void,
): Promise<PingResult> {
  const TOTAL = 12
  const TIMEOUT = 4000

  // Birinchi so‘rov (DNS + TLS) hisobga olinmaydi.
  try {
    await pingOnce(signal, TIMEOUT)
  } catch (e) {
    if (signal.aborted) throw abortError()
    // Birinchi urinish muvaffaqiyatsiz bo‘lsa ham davom etamiz; pastda yetarli namuna bo‘lmasa xato beramiz.
    if (e instanceof SpeedTestError && e.kind === 'aborted') throw e
  }

  const samples: number[] = []
  let lastError: SpeedTestError | null = null
  for (let i = 0; i < TOTAL; i++) {
    try {
      const ms = await pingOnce(signal, TIMEOUT)
      samples.push(ms)
      onSample?.(ms, i + 1, TOTAL)
    } catch (e) {
      if (signal.aborted) throw abortError()
      lastError = toSpeedError(e)
    }
  }

  if (samples.length < 4) {
    throw lastError ?? networkError()
  }

  const sorted = [...samples].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2

  let diffSum = 0
  for (let i = 1; i < samples.length; i++) diffSum += Math.abs(samples[i] - samples[i - 1])
  const jitter = diffSum / (samples.length - 1)

  return { ping: median, jitter, samples }
}

/* ------------------------------------------------------------------ */
/* THROUGHPUT (umumiy o‘lchagich)                                      */
/* ------------------------------------------------------------------ */

interface Sample {
  t: number
  b: number
}

interface ThroughputOptions {
  signal: AbortSignal
  /** Parallel worker‘larni ishga tushiradi. `add` — haqiqiy uzatilgan baytlarni qo‘shadi. */
  startWorkers: (add: (bytes: number) => void, stop: AbortSignal) => Promise<void>[]
  onUpdate: (mbps: number, progress: number) => void
  /**
   * 'stream'    — baytlar qabul qilinishi bilan sanaladi (download uchun aniq).
   * 'completed' — baytlar faqat butun so‘rov server tomonidan tasdiqlanganda sanaladi (upload uchun).
   */
  mode: 'stream' | 'completed'
  /** Oxirgi 3 ta 1 soniyalik oyna tezliklari orasidagi nisbiy farq shundan kichik bo‘lsa — barqaror */
  stableTolerance: number
  warmupMs: number
  minMs: number
  maxMs: number
}

function sampleAt(samples: Sample[], t: number): Sample {
  for (let i = samples.length - 1; i >= 0; i--) {
    if (samples[i].t <= t) return samples[i]
  }
  return samples[0]
}

/** Oxirgi 3 ta 1 soniyalik oynadagi tezliklar bir-biridan `tolerance` dan kam farq qilsa — barqaror. */
function isStable(samples: Sample[], t: number, warmupMs: number, tolerance: number): boolean {
  if (t - 3000 < warmupMs) return false
  const pts = [0, 1000, 2000, 3000].map((d) => sampleAt(samples, t - d))
  const rates: number[] = []
  for (let i = 0; i < 3; i++) {
    const dt = (pts[i].t - pts[i + 1].t) / 1000
    if (dt <= 0) return false
    rates.push((pts[i].b - pts[i + 1].b) / dt)
  }
  const max = Math.max(...rates)
  const min = Math.min(...rates)
  return min > 0 && (max - min) / max < tolerance
}

function measureThroughput(o: ThroughputOptions): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    if (o.signal.aborted) {
      reject(abortError())
      return
    }

    const stop = new AbortController()
    const samples: Sample[] = [{ t: 0, b: 0 }]
    /** 'completed' rejimida: har bir yakunlangan so‘rovdan keyingi jamlangan baytlar */
    const events: Sample[] = [{ t: 0, b: 0 }]
    const completed = o.mode === 'completed'
    const t0 = performance.now()
    let bytes = 0
    let live = 0
    let settled = false
    let failures = 0
    let firstError: SpeedTestError | null = null
    let timer: ReturnType<typeof setInterval> | undefined

    function compute(t: number): number {
      if (completed) {
        // Hisob oxirgi yakunlangan so‘rov vaqtigacha — tugallanmagan bo‘lak tezlikni sun’iy pasaytirmasin.
        const last = events[events.length - 1]
        const base = events.find((e) => e.t >= o.warmupMs && e !== last)
        if (base && last.t - base.t >= 1500) {
          return ((last.b - base.b) * 8) / ((last.t - base.t) / 1000) / 1e6
        }
        return last.t > 0 ? (last.b * 8) / (last.t / 1000) / 1e6 : 0
      }
      const warm = samples.find((s) => s.t >= o.warmupMs)
      if (!warm || t - warm.t < 1000) {
        return t > 0 ? (bytes * 8) / (t / 1000) / 1e6 : 0
      }
      return ((bytes - warm.b) * 8) / ((t - warm.t) / 1000) / 1e6
    }

    function finish(err: SpeedTestError | null, value = 0) {
      if (settled) return
      settled = true
      if (timer !== undefined) clearInterval(timer)
      o.signal.removeEventListener('abort', onAbort)
      stop.abort() // barcha aktiv so‘rovlarni to‘xtatadi
      if (err) reject(err)
      else resolve(value)
    }

    function onAbort() {
      finish(abortError())
    }

    o.signal.addEventListener('abort', onAbort, { once: true })

    const workers = o.startWorkers((n) => {
      bytes += n
      if (completed) events.push({ t: performance.now() - t0, b: bytes })
    }, stop.signal)

    workers.forEach((w) =>
      w.catch((e: unknown) => {
        if (stop.signal.aborted) return
        failures++
        if (!firstError) firstError = toSpeedError(e)
        if (failures === workers.length) {
          if (bytes === 0) finish(firstError)
          else finish(null, compute(performance.now() - t0))
        }
      }),
    )

    timer = setInterval(() => {
      const t = performance.now() - t0
      samples.push({ t, b: bytes })

      // 'completed' rejimida silliq ko‘rsatish uchun kengroq (2.5 s) oyna ishlatiladi
      const ref = completed ? sampleAt(events, t - 2500) : sampleAt(samples, t - 1000)
      const dt = (t - ref.t) / 1000
      const inst = dt > 0 ? ((bytes - ref.b) * 8) / dt / 1e6 : 0
      live = live === 0 ? inst : live * 0.6 + inst * 0.4
      o.onUpdate(live, Math.min(1, t / o.maxMs))

      if (bytes === 0 && t >= 6000) {
        finish(new SpeedTestError('timeout', 'Server ma’lumot yubormadi. Keyinroq qayta urinib ko‘ring.'))
        return
      }
      if (t >= o.maxMs) {
        const v = compute(t)
        if (v > 0) finish(null, v)
        else finish(new SpeedTestError('server', 'Server dan ma’lumot olinmadi.'))
        return
      }
      if (t >= o.minMs && isStable(completed ? events : samples, t, o.warmupMs, o.stableTolerance)) {
        finish(null, compute(t))
      }
    }, 150)
  })
}

/* ------------------------------------------------------------------ */
/* DOWNLOAD                                                            */
/* ------------------------------------------------------------------ */

async function downloadWorker(add: (n: number) => void, stop: AbortSignal): Promise<void> {
  let size = 8_000_000
  try {
    while (!stop.aborted) {
      const t0 = performance.now()
      const res = await fetch(`${BASE}/__down?bytes=${size}&r=${nonce()}`, {
        cache: 'no-store',
        signal: stop,
      })
      if (!res.ok) throw new SpeedTestError('server', `Server xatosi: HTTP ${res.status}.`)

      const reader = res.body?.getReader()
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          add(value.byteLength)
        }
      } else {
        add((await res.arrayBuffer()).byteLength)
      }

      // Tez ulanishda keyingi so‘rov kattaroq bo‘lsin (so‘rovlar orasidagi bo‘shliq kamayadi).
      if (performance.now() - t0 < 2000) size = Math.min(size * 2, 100_000_000)
    }
  } catch (e) {
    if (stop.aborted) return
    throw e
  }
}

export function measureDownload(
  signal: AbortSignal,
  onUpdate: (mbps: number, progress: number) => void,
): Promise<number> {
  return measureThroughput({
    signal,
    onUpdate,
    mode: 'stream',
    stableTolerance: 0.08,
    warmupMs: 1500,
    minMs: 6000,
    maxMs: 12_000,
    startWorkers: (add, stop) => Array.from({ length: 6 }, () => downloadWorker(add, stop)),
  })
}

/* ------------------------------------------------------------------ */
/* UPLOAD                                                              */
/* ------------------------------------------------------------------ */

const MAX_UPLOAD = 16 * 1024 * 1024
let uploadBlob: Blob | null = null

/** Siqilmaydigan (kriptografik tasodifiy) payload — faqat trafik hosil qilish uchun, natijaga ta’sir qilmaydi. */
function getUploadBlob(): Blob {
  if (!uploadBlob) {
    const buf = new Uint8Array(MAX_UPLOAD)
    for (let o = 0; o < MAX_UPLOAD; o += 65_536) crypto.getRandomValues(buf.subarray(o, o + 65_536))
    uploadBlob = new Blob([buf])
  }
  return uploadBlob
}

function uploadOnce(add: (n: number) => void, stop: AbortSignal, payload: Blob): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    const cleanup = () => stop.removeEventListener('abort', onAbort)
    function onAbort() {
      cleanup()
      xhr.abort()
      resolve()
    }

    xhr.open('POST', `${BASE}/__up?r=${nonce()}`)
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    xhr.timeout = 30_000

    // Diqqat: upload.onprogress ishlatilmaydi — u tarmoq buferiga yozilgan baytlarni ham sanaydi.
    // Server butun tanani qabul qilib javob bergandagina bo‘lak "yuborilgan" hisoblanadi.
    xhr.onload = () => {
      cleanup()
      if (xhr.status >= 200 && xhr.status < 300) {
        add(payload.size)
        resolve()
      } else {
        reject(new SpeedTestError('server', `Server xatosi: HTTP ${xhr.status}.`))
      }
    }
    xhr.onerror = () => {
      cleanup()
      reject(networkError())
    }
    xhr.ontimeout = () => {
      cleanup()
      reject(new SpeedTestError('timeout', 'Yuklash vaqti tugadi.'))
    }

    if (stop.aborted) {
      resolve()
      return
    }
    stop.addEventListener('abort', onAbort, { once: true })
    xhr.send(payload)
  })
}

const MIN_UPLOAD = 128 * 1024

async function uploadWorker(add: (n: number) => void, stop: AbortSignal): Promise<void> {
  let size = 256 * 1024
  while (!stop.aborted) {
    const t0 = performance.now()
    await uploadOnce(add, stop, getUploadBlob().slice(0, size))
    if (stop.aborted) return
    // Har bir bo‘lak ~0.8–2.5 s ichida yakunlansin: juda kichik bo‘lsa — katta, juda sekin bo‘lsa — kichikroq
    const dt = performance.now() - t0
    if (dt < 800) size = Math.min(size * 2, MAX_UPLOAD)
    else if (dt > 2500) size = Math.max(Math.floor(size / 2), MIN_UPLOAD)
  }
}

export function measureUpload(
  signal: AbortSignal,
  onUpdate: (mbps: number, progress: number) => void,
): Promise<number> {
  return measureThroughput({
    signal,
    onUpdate,
    mode: 'completed',
    stableTolerance: 0.15,
    warmupMs: 1500,
    minMs: 6000,
    maxMs: 10_000,
    startWorkers: (add, stop) => Array.from({ length: 4 }, () => uploadWorker(add, stop)),
  })
}

/* ------------------------------------------------------------------ */
/* PUBLIC IP / SERVER META                                             */
/* ------------------------------------------------------------------ */

export interface NetworkMeta {
  ip: string | null
  isp: string | null
  city: string | null
  country: string | null
  /** Eng yaqin Cloudflare serveri (IATA kodi) */
  colo: string | null
}

export async function fetchNetworkMeta(signal?: AbortSignal): Promise<NetworkMeta> {
  try {
    const res = await fetch(`${BASE}/meta`, { signal, cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const j = (await res.json()) as Record<string, unknown>
    const str = (k: string): string | null => (typeof j[k] === 'string' && j[k] ? (j[k] as string) : null)
    const ip = str('clientIp')
    if (!ip) throw new Error('IP yo‘q')
    return { ip, isp: str('asOrganization'), city: str('city'), country: str('country'), colo: str('colo') }
  } catch (e) {
    if (signal?.aborted) throw e
    // Zaxira servis
    const res = await fetch('https://api.ipify.org?format=json', { signal, cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const j = (await res.json()) as { ip?: string }
    if (!j.ip) throw new Error('IP yo‘q')
    return { ip: j.ip, isp: null, city: null, country: null, colo: null }
  }
}
