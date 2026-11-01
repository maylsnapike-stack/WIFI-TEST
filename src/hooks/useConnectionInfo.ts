import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchNetworkMeta, type NetworkMeta } from '../lib/speedEngine'

interface NetInfo extends EventTarget {
  type?: string
  effectiveType?: string
  downlink?: number
  rtt?: number
  saveData?: boolean
}

export interface ConnSnapshot {
  type: string | null
  effectiveType: string | null
  downlink: number | null
  rtt: number | null
  saveData: boolean
}

const getConn = (): NetInfo | undefined => (navigator as Navigator & { connection?: NetInfo }).connection

function readConn(): ConnSnapshot {
  const c = getConn()
  return {
    type: c?.type ?? null,
    effectiveType: c?.effectiveType ?? null,
    downlink: typeof c?.downlink === 'number' ? c.downlink : null,
    rtt: typeof c?.rtt === 'number' ? c.rtt : null,
    saveData: Boolean(c?.saveData),
  }
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

export type MetaStatus = 'loading' | 'ready' | 'error'

export function useConnectionInfo() {
  const online = useOnlineStatus()
  const [conn, setConn] = useState<ConnSnapshot>(readConn)
  const [meta, setMeta] = useState<NetworkMeta | null>(null)
  const [metaStatus, setMetaStatus] = useState<MetaStatus>('loading')
  const abortRef = useRef<AbortController | null>(null)

  const refresh = useCallback(() => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setMetaStatus('loading')
    fetchNetworkMeta(ac.signal)
      .then((m) => {
        if (ac.signal.aborted) return
        setMeta(m)
        setMetaStatus('ready')
      })
      .catch(() => {
        if (!ac.signal.aborted) setMetaStatus('error')
      })
  }, [])

  // Onlayn bo‘lganda (va sahifa ochilganda) IP/server ma’lumotini yangilaydi
  useEffect(() => {
    if (online) refresh()
    else setMetaStatus('error')
    return () => abortRef.current?.abort()
  }, [online, refresh])

  useEffect(() => {
    const c = getConn()
    if (!c) return
    const onChange = () => setConn(readConn())
    c.addEventListener('change', onChange)
    return () => c.removeEventListener('change', onChange)
  }, [])

  return { online, conn, meta, metaStatus, refresh }
}

export type ConnectionInfoApi = ReturnType<typeof useConnectionInfo>
