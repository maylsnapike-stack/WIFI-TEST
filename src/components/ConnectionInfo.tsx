import { useMemo, type ReactNode } from 'react'
import { Globe, Loader2, MonitorSmartphone, RefreshCw, Signal, Wifi, WifiOff } from 'lucide-react'
import { getDeviceInfo } from '../lib/device'
import type { ConnectionInfoApi } from '../hooks/useConnectionInfo'

const TYPE_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi',
  cellular: 'Mobil internet',
  ethernet: 'Ethernet',
  bluetooth: 'Bluetooth',
  wimax: 'WiMAX',
  other: 'Boshqa',
  none: 'Ulanish yo‘q',
  unknown: 'Noma’lum',
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 py-3 last:border-0">
      <dt className="flex shrink-0 items-center gap-2 text-sm text-slate-400">
        {icon}
        {label}
      </dt>
      <dd className="min-w-0 break-words text-right text-sm font-medium">{children}</dd>
    </div>
  )
}

export default function ConnectionInfo({ info }: { info: ConnectionInfoApi }) {
  const { online, conn, meta, metaStatus, refresh } = info
  const device = useMemo(getDeviceInfo, [])

  const connType = conn.type
    ? (TYPE_LABELS[conn.type] ?? conn.type)
    : conn.effectiveType
      ? `Brauzer turini aytmaydi (${conn.effectiveType.toUpperCase()})`
      : 'Brauzer ma’lumot bermaydi'

  const location = [meta?.city, meta?.country].filter(Boolean).join(', ')

  return (
    <section className="glass min-w-0 p-4 sm:p-6" aria-labelledby="conn-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="conn-title" className="flex items-center gap-2 text-lg font-bold">
          <Signal className="h-5 w-5 text-cyan-300" aria-hidden />
          Ulanish ma’lumoti
        </h2>
        <button
          type="button"
          className="btn-ghost !px-4 text-xs"
          onClick={refresh}
          disabled={metaStatus === 'loading' || !online}
          aria-label="IP va server ma’lumotini yangilash"
        >
          {metaStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
          Yangilash
        </button>
      </div>

      <dl className="mt-2">
        <Row icon={online ? <Wifi className="h-4 w-4" aria-hidden /> : <WifiOff className="h-4 w-4" aria-hidden />} label="Holat">
          <span className="inline-flex items-center gap-2" role="status">
            <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-red-400'}`} aria-hidden />
            {online ? 'Internetga ulangan' : 'Oflayn'}
          </span>
        </Row>
        <Row icon={<Signal className="h-4 w-4" aria-hidden />} label="Ulanish turi">
          {connType}
          {conn.downlink !== null && (
            <span className="block text-xs font-normal text-slate-400">
              Brauzer bahosi: ~{conn.downlink} Mbps{conn.rtt !== null ? ` · RTT ${conn.rtt} ms` : ''}
            </span>
          )}
        </Row>
        <Row icon={<Globe className="h-4 w-4" aria-hidden />} label="Public IP">
          {metaStatus === 'loading' && !meta ? (
            <span className="text-slate-400">Aniqlanmoqda…</span>
          ) : meta?.ip ? (
            <span className="tabular-nums">{meta.ip}</span>
          ) : (
            <span className="text-slate-400">Aniqlab bo‘lmadi</span>
          )}
          {(meta?.isp || location) && (
            <span className="block text-xs font-normal text-slate-400">{[meta?.isp, location].filter(Boolean).join(' · ')}</span>
          )}
        </Row>
        {meta?.colo && (
          <Row icon={<Globe className="h-4 w-4" aria-hidden />} label="Test serveri">
            Cloudflare · {meta.colo}
          </Row>
        )}
        <Row icon={<MonitorSmartphone className="h-4 w-4" aria-hidden />} label="Qurilma">
          {device.browser} · {device.os}
          <span className="block text-xs font-normal text-slate-400">
            {device.screen}
            {device.cores ? ` · ${device.cores} yadro` : ''}
          </span>
        </Row>
      </dl>
    </section>
  )
}
