import type { QualityLevel } from '../types'

export type MetricKind = 'download' | 'upload' | 'ping' | 'jitter'

/** 0 (yomon) … 4 (a’lo) */
export function metricScore(kind: MetricKind, v: number): number {
  switch (kind) {
    case 'download':
      return v >= 100 ? 4 : v >= 50 ? 3 : v >= 25 ? 2 : v >= 10 ? 1 : 0
    case 'upload':
      return v >= 40 ? 4 : v >= 20 ? 3 : v >= 10 ? 2 : v >= 3 ? 1 : 0
    case 'ping':
      return v <= 20 ? 4 : v <= 40 ? 3 : v <= 80 ? 2 : v <= 150 ? 1 : 0
    case 'jitter':
      return v <= 5 ? 4 : v <= 15 ? 3 : v <= 30 ? 2 : v <= 60 ? 1 : 0
  }
}

const SCORE_COLORS = ['#f87171', '#fbbf24', '#60a5fa', '#22d3ee', '#34d399']
export const scoreColor = (score: number): string => SCORE_COLORS[Math.max(0, Math.min(4, score))]

export function rateConnection(m: { download: number; upload: number; ping: number; jitter: number }): QualityLevel {
  const s =
    metricScore('download', m.download) * 0.4 +
    metricScore('upload', m.upload) * 0.2 +
    metricScore('ping', m.ping) * 0.25 +
    metricScore('jitter', m.jitter) * 0.15
  if (s >= 3.4) return 'Excellent'
  if (s >= 2.7) return 'Very Good'
  if (s >= 1.9) return 'Good'
  if (s >= 1.0) return 'Average'
  return 'Poor'
}

export const QUALITY_META: Record<QualityLevel, { color: string; summary: string }> = {
  Excellent: {
    color: '#34d399',
    summary: 'Ajoyib ulanish — 4K video, onlayn o‘yinlar va katta fayllar uchun mukammal.',
  },
  'Very Good': {
    color: '#22d3ee',
    summary: 'Juda yaxshi — HD video, video qo‘ng‘iroqlar va o‘yinlar muammosiz ishlaydi.',
  },
  Good: {
    color: '#60a5fa',
    summary: 'Yaxshi — kundalik foydalanish, HD video va qo‘ng‘iroqlar uchun yetarli.',
  },
  Average: {
    color: '#fbbf24',
    summary: 'O‘rtacha — oddiy brauzer va musiqa uchun yetadi, og‘ir vazifalarda sekinlashishi mumkin.',
  },
  Poor: {
    color: '#f87171',
    summary: 'Past — ulanish sekin yoki beqaror. Routerga yaqinlashing yoki uni qayta ishga tushiring.',
  },
}
