import type { TestResult } from '../types'

const HISTORY_KEY = 'wst:history:v1'
const MUSIC_KEY = 'wst:music:v1'
export const MAX_HISTORY = 30

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function isResult(v: unknown): v is TestResult {
  if (!v || typeof v !== 'object') return false
  const r = v as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    isNum(r.timestamp) &&
    isNum(r.download) &&
    isNum(r.upload) &&
    isNum(r.ping) &&
    isNum(r.jitter) &&
    typeof r.quality === 'string'
  )
}

export function loadHistory(): TestResult[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isResult).slice(0, MAX_HISTORY) : []
  } catch {
    return []
  }
}

export function saveHistory(history: TestResult[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
  } catch {
    /* private rejim yoki to‘lgan xotira — jim o‘tkazib yuboramiz */
  }
}

export const HISTORY_STORAGE_KEY = HISTORY_KEY

export interface MusicPrefs {
  enabled: boolean
  volume: number
}

export function loadMusicPrefs(): MusicPrefs {
  try {
    const raw = localStorage.getItem(MUSIC_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<MusicPrefs>
      return {
        enabled: typeof p.enabled === 'boolean' ? p.enabled : true,
        volume: isNum(p.volume) ? Math.min(1, Math.max(0, p.volume)) : 0.6,
      }
    }
  } catch {
    /* ignore */
  }
  return { enabled: true, volume: 0.6 }
}

export function saveMusicPrefs(p: MusicPrefs): void {
  try {
    localStorage.setItem(MUSIC_KEY, JSON.stringify(p))
  } catch {
    /* ignore */
  }
}
