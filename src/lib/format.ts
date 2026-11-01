import type { TestResult } from '../types'

/** Natijalar paneli uchun: 125.6, 45.2, 9.87 */
export const fmtSpeed = (v: number): string => (v < 10 ? v.toFixed(2) : v.toFixed(1))

/** Speedometer markazi uchun (maksimal 4 belgi): 9.87, 45.2, 125, 1032 */
export const fmtGauge = (v: number): string => (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.round(v).toString())

export const fmtMs = (v: number): string => (v < 10 ? v.toFixed(1) : Math.round(v).toString())

export const fmtDate = (ts: number): string =>
  new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function resultToText(r: TestResult): string {
  return [
    `WiFi SpeedTest — ${fmtDate(r.timestamp)}`,
    `Download: ${fmtSpeed(r.download)} Mbps`,
    `Upload: ${fmtSpeed(r.upload)} Mbps`,
    `Ping: ${fmtMs(r.ping)} ms`,
    `Jitter: ${fmtMs(r.jitter)} ms`,
    `Packet Loss: ${r.packetLoss === null ? 'N/A' : `${r.packetLoss.toFixed(1)} %`}`,
    `Sifat: ${r.quality}`,
    ...(r.server ? [`Server: ${r.server}`] : []),
  ].join('\n')
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* zaxira usulga o‘tamiz */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
