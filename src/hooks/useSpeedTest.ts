import { useCallback, useEffect, useRef, useState } from 'react'
import { measureDownload, measurePing, measureUpload, SpeedTestError } from '../lib/speedEngine'
import { rateConnection } from '../lib/quality'
import type { Phase, TestResult } from '../types'

export interface TestState {
  phase: Phase
  /** Joriy bosqich progressi, 0…1 */
  progress: number
  /** Joriy (real vaqtdagi, silliqlangan) tezlik, Mbps */
  liveSpeed: number
  livePing: number | null
  ping: number | null
  jitter: number | null
  download: number | null
  upload: number | null
  result: TestResult | null
  error: string | null
}

const initial: TestState = {
  phase: 'idle',
  progress: 0,
  liveSpeed: 0,
  livePing: null,
  ping: null,
  jitter: null,
  download: null,
  upload: null,
  result: null,
  error: null,
}

interface Options {
  onComplete: (result: TestResult) => void
  serverLabel: string | null
}

const newId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.floor(performance.now())}`

export function useSpeedTest(options: Options) {
  const [state, setState] = useState<TestState>(initial)
  const abortRef = useRef<AbortController | null>(null)
  const runningRef = useRef(false)
  const optionsRef = useRef(options)

  useEffect(() => {
    optionsRef.current = options
  })

  // Sahifadan chiqib ketilsa yoki komponent o‘chirilsa — barcha aktiv so‘rovlar to‘xtatiladi.
  useEffect(() => () => abortRef.current?.abort(), [])

  const start = useCallback(async () => {
    if (runningRef.current) return // test davomida qayta bosishdan himoya

    if (!navigator.onLine) {
      setState({
        ...initial,
        phase: 'error',
        error: 'Internet aloqasi yo‘q. Wi-Fi yoki mobil internetni tekshirib, qayta urinib ko‘ring.',
      })
      return
    }

    runningRef.current = true
    const ac = new AbortController()
    abortRef.current = ac
    setState({ ...initial, phase: 'ping' })

    try {
      const p = await measurePing(ac.signal, (ms, done, total) =>
        setState((s) => ({ ...s, livePing: ms, progress: done / total })),
      )
      setState((s) => ({
        ...s,
        ping: p.ping,
        jitter: p.jitter,
        livePing: p.ping,
        phase: 'download',
        progress: 0,
        liveSpeed: 0,
      }))

      const dl = await measureDownload(ac.signal, (mbps, progress) =>
        setState((s) => ({ ...s, liveSpeed: mbps, progress })),
      )
      setState((s) => ({ ...s, download: dl, phase: 'upload', progress: 0, liveSpeed: 0 }))

      const ul = await measureUpload(ac.signal, (mbps, progress) =>
        setState((s) => ({ ...s, liveSpeed: mbps, progress })),
      )

      const result: TestResult = {
        id: newId(),
        timestamp: Date.now(),
        download: dl,
        upload: ul,
        ping: p.ping,
        jitter: p.jitter,
        packetLoss: null, // HTTP orqali ishonchli o‘lchab bo‘lmaydi — N/A
        quality: rateConnection({ download: dl, upload: ul, ping: p.ping, jitter: p.jitter }),
        server: optionsRef.current.serverLabel,
      }

      setState((s) => ({ ...s, upload: ul, liveSpeed: dl, progress: 1, phase: 'done', result }))
      optionsRef.current.onComplete(result)
    } catch (e) {
      if (ac.signal.aborted) {
        setState({ ...initial, phase: 'cancelled' })
      } else {
        setState((s) => ({
          ...s,
          phase: 'error',
          liveSpeed: 0,
          progress: 0,
          error:
            e instanceof SpeedTestError
              ? e.message
              : 'Kutilmagan xatolik yuz berdi. Qayta urinib ko‘ring.',
        }))
      }
    } finally {
      runningRef.current = false
      if (abortRef.current === ac) abortRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const running = state.phase === 'ping' || state.phase === 'download' || state.phase === 'upload'

  return { state, running, start, cancel }
}

export type SpeedTestApi = ReturnType<typeof useSpeedTest>
