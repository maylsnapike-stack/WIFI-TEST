export type Phase =
  | 'idle'
  | 'ping'
  | 'download'
  | 'upload'
  | 'done'
  | 'error'
  | 'cancelled'

export type QualityLevel = 'Excellent' | 'Very Good' | 'Good' | 'Average' | 'Poor'

export interface TestResult {
  id: string
  timestamp: number
  /** Mbps */
  download: number
  /** Mbps */
  upload: number
  /** ms */
  ping: number
  /** ms */
  jitter: number
  /** %, brauzerda ishonchli o‘lchab bo‘lmagani uchun hozircha doim null */
  packetLoss: number | null
  quality: QualityLevel
  server: string | null
}
