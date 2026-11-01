import { useEffect, useRef, useState, type ElementType } from 'react'
import { Activity, Check, Copy, Download, Minus, Radio, RotateCw, TrendingDown, TrendingUp, Upload, Waves, X } from 'lucide-react'
import { copyText, fmtDate, fmtMs, fmtSpeed, resultToText } from '../lib/format'
import { QUALITY_META, metricScore, scoreColor } from '../lib/quality'
import type { TestResult } from '../types'

interface Props {
  result: TestResult
  previous: TestResult | null
  /** Tarixdan tanlangan (eski) natija ko‘rsatilyaptimi */
  viewingSaved: boolean
  running: boolean
  onRetest: () => void
  onDismiss: () => void
}

interface Delta {
  text: string
  /** true — yaxshilandi, false — yomonlashdi, null — deyarli o‘zgarmagan */
  good: boolean | null
}

function speedDelta(cur: number, prev: number | undefined): Delta | null {
  if (prev === undefined || prev <= 0) return null
  const pct = ((cur - prev) / prev) * 100
  if (Math.abs(pct) < 2) return { text: 'o‘zgarmagan', good: null }
  return { text: `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`, good: pct > 0 }
}

function msDelta(cur: number, prev: number | undefined): Delta | null {
  if (prev === undefined) return null
  const d = cur - prev
  if (Math.abs(d) < 1) return { text: 'o‘zgarmagan', good: null }
  return { text: `${d > 0 ? '+' : ''}${d.toFixed(0)} ms`, good: d < 0 }
}

interface Metric {
  key: string
  label: string
  Icon: ElementType
  value: string
  unit: string
  color: string
  delta: Delta | null
  hint?: string
}

export default function TestResults({ result, previous, viewingSaved, running, onRetest, onDismiss }: Props) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const q = QUALITY_META[result.quality]

  const metrics: Metric[] = [
    {
      key: 'download',
      label: 'Download',
      Icon: Download,
      value: fmtSpeed(result.download),
      unit: 'Mbps',
      color: scoreColor(metricScore('download', result.download)),
      delta: speedDelta(result.download, previous?.download),
    },
    {
      key: 'upload',
      label: 'Upload',
      Icon: Upload,
      value: fmtSpeed(result.upload),
      unit: 'Mbps',
      color: scoreColor(metricScore('upload', result.upload)),
      delta: speedDelta(result.upload, previous?.upload),
    },
    {
      key: 'ping',
      label: 'Ping',
      Icon: Activity,
      value: fmtMs(result.ping),
      unit: 'ms',
      color: scoreColor(metricScore('ping', result.ping)),
      delta: msDelta(result.ping, previous?.ping),
    },
    {
      key: 'jitter',
      label: 'Jitter',
      Icon: Waves,
      value: fmtMs(result.jitter),
      unit: 'ms',
      color: scoreColor(metricScore('jitter', result.jitter)),
      delta: msDelta(result.jitter, previous?.jitter),
    },
    {
      key: 'loss',
      label: 'Packet Loss',
      Icon: Radio,
      value: result.packetLoss === null ? 'N/A' : result.packetLoss.toFixed(1),
      unit: result.packetLoss === null ? '' : '%',
      color: '#94a3b8',
      delta: null,
      hint: result.packetLoss === null ? 'Brauzerda ishonchli o‘lchab bo‘lmaydi' : undefined,
    },
  ]

  const handleCopy = async () => {
    const ok = await copyText(resultToText(result))
    if (!ok) return
    setCopied(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="glass animate-fade-up p-4 sm:p-8" aria-labelledby="results-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="results-title" className="text-xl font-bold tracking-tight">
            {viewingSaved ? 'Saqlangan natija' : 'Test natijalari'}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {fmtDate(result.timestamp)}
            {result.server ? ` · ${result.server}` : ''}
          </p>
        </div>

        <div
          className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold"
          style={{ color: q.color, borderColor: `${q.color}66`, background: `${q.color}1a` }}
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: q.color }} aria-hidden />
          {result.quality}
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-300">{q.summary}</p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map(({ key, label, Icon, value, unit, color, delta, hint }) => (
          <div key={key} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4" title={hint}>
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{label}</span>
            </div>
            <p className="mt-2 truncate text-2xl font-bold tabular-nums" style={{ color }}>
              {value}
              {unit && <span className="ml-1 text-xs font-medium text-slate-400">{unit}</span>}
            </p>
            {delta ? (
              <p
                className="mt-2 flex items-center gap-1 text-xs"
                style={{ color: delta.good === null ? '#94a3b8' : delta.good ? '#34d399' : '#f87171' }}
                title="Oldingi testga nisbatan"
              >
                {delta.good === null ? (
                  <Minus className="h-3.5 w-3.5" aria-hidden />
                ) : delta.good ? (
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" aria-hidden />
                )}
                {delta.text}
              </p>
            ) : (
              hint && <p className="mt-2 text-[11px] leading-snug text-slate-500">{hint}</p>
            )}
          </div>
        ))}
      </div>

      {previous && <p className="mt-3 text-xs text-slate-500">Taqqoslash: oldingi test — {fmtDate(previous.timestamp)}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className="btn-ghost" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4 text-emerald-300" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? 'Nusxalandi' : 'Nusxalash'}
        </button>
        <button type="button" className="btn-ghost" onClick={onRetest} disabled={running}>
          <RotateCw className="h-4 w-4" aria-hidden />
          Testni qayta boshlash
        </button>
        {viewingSaved && (
          <button type="button" className="btn-ghost" onClick={onDismiss}>
            <X className="h-4 w-4" aria-hidden />
            Yopish
          </button>
        )}
      </div>
    </section>
  )
}
