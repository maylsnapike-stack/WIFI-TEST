import { useEffect, useRef, useState } from 'react'
import { Eye, History, Trash2 } from 'lucide-react'
import { fmtDate, fmtMs, fmtSpeed } from '../lib/format'
import { QUALITY_META } from '../lib/quality'
import type { TestResult } from '../types'

interface Props {
  history: TestResult[]
  activeId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onClear: () => void
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export default function TestHistory({ history, activeId, onSelect, onRemove, onClear }: Props) {
  const [confirming, setConfirming] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const handleClear = () => {
    if (!confirming) {
      setConfirming(true)
      timerRef.current = setTimeout(() => setConfirming(false), 3000)
      return
    }
    clearTimeout(timerRef.current)
    setConfirming(false)
    onClear()
  }

  return (
    <section className="glass min-w-0 p-4 sm:p-6" aria-labelledby="history-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="history-title" className="flex items-center gap-2 text-lg font-bold">
          <History className="h-5 w-5 text-cyan-300" aria-hidden />
          Test tarixi
        </h2>
        {history.length > 0 && (
          <button type="button" className="btn-ghost !px-4 text-xs" onClick={handleClear}>
            <Trash2 className="h-4 w-4" aria-hidden />
            {confirming ? 'Tasdiqlang' : 'Tozalash'}
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">Hali test o‘tkazilmagan. Natijalar shu qurilmada (brauzerda) saqlanadi.</p>
      ) : (
        <>
          {history.length >= 2 && (
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { k: 'O‘rt. download', v: `${fmtSpeed(avg(history.map((h) => h.download)))}` },
                { k: 'O‘rt. upload', v: `${fmtSpeed(avg(history.map((h) => h.upload)))}` },
                { k: 'O‘rt. ping', v: `${fmtMs(avg(history.map((h) => h.ping)))} ms` },
              ].map(({ k, v }) => (
                <div key={k} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-2">
                  <dt className="truncate text-[10px] uppercase tracking-wider text-slate-400">{k}</dt>
                  <dd className="truncate text-sm font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
            {history.map((h) => {
              const q = QUALITY_META[h.quality]
              const active = h.id === activeId
              return (
                <li key={h.id} className="flex items-stretch gap-2">
                  <button
                    type="button"
                    onClick={() => onSelect(h.id)}
                    aria-pressed={active}
                    aria-label={`Natijani ko‘rish: ${fmtDate(h.timestamp)}`}
                    className={`min-h-[3.25rem] min-w-0 flex-1 rounded-2xl border px-3 py-2 text-left transition ${
                      active ? 'border-cyan-300/50 bg-cyan-400/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                      <span className="truncate">{fmtDate(h.timestamp)}</span>
                      <span className="flex shrink-0 items-center gap-1 font-semibold" style={{ color: q.color }}>
                        <Eye className="h-3.5 w-3.5" aria-hidden />
                        {h.quality}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold tabular-nums">
                      ↓ {fmtSpeed(h.download)} <span className="text-slate-500">·</span> ↑ {fmtSpeed(h.upload)}{' '}
                      <span className="text-slate-500">·</span> {fmtMs(h.ping)} ms
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(h.id)}
                    aria-label={`O‘chirish: ${fmtDate(h.timestamp)}`}
                    className="grid w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-red-400/40 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
