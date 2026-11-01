import { useEffect, type ReactNode } from 'react'
import { Activity, AlertTriangle, Download, Loader2, Play, RotateCw, Square, Upload, Waves } from 'lucide-react'
import Speedometer from './Speedometer'
import { fmtGauge, fmtMs, fmtSpeed } from '../lib/format'
import { speedToFraction } from '../lib/gauge'
import type { SpeedTestApi } from '../hooks/useSpeedTest'

interface Props {
  test: SpeedTestApi
  onStart: () => void
}

const STEPS = [
  { key: 'ping', label: 'Ping', Icon: Activity },
  { key: 'download', label: 'Download', Icon: Download },
  { key: 'upload', label: 'Upload', Icon: Upload },
] as const

function Chip({ icon, label, value, unit, active }: { icon: ReactNode; label: string; value: string; unit: string; active: boolean }) {
  return (
    <div
      className={`min-w-0 rounded-2xl border px-3 py-2.5 transition ${
        active ? 'border-cyan-300/40 bg-cyan-400/10' : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 truncate text-lg font-semibold tabular-nums">
        {value} <span className="text-xs font-normal text-slate-400">{value === '—' ? '' : unit}</span>
      </p>
    </div>
  )
}

export default function SpeedTest({ test, onStart }: Props) {
  const { state, running, cancel } = test
  const { phase, liveSpeed, livePing, progress, ping, jitter, download, upload, error } = state

  // Esc — testni bekor qilish
  useEffect(() => {
    if (!running) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running, cancel])

  // Speedometer ko‘rsatkichlari
  let valueText = '0.0'
  let unit = 'Mbps'
  let label = 'TAYYOR'
  let fraction = 0
  let accent: 'cyan' | 'blue' = 'cyan'
  let indeterminate = false

  switch (phase) {
    case 'ping':
      valueText = livePing === null ? '—' : fmtMs(livePing)
      unit = 'ms'
      label = 'PING'
      indeterminate = true
      break
    case 'download':
      valueText = fmtGauge(liveSpeed)
      label = 'DOWNLOAD'
      fraction = speedToFraction(liveSpeed)
      break
    case 'upload':
      valueText = fmtGauge(liveSpeed)
      label = 'UPLOAD'
      fraction = speedToFraction(liveSpeed)
      accent = 'blue'
      break
    case 'done':
      valueText = fmtGauge(download ?? 0)
      label = 'DOWNLOAD'
      fraction = speedToFraction(download ?? 0)
      break
    case 'error':
      valueText = '—'
      label = 'XATOLIK'
      break
    case 'cancelled':
      valueText = '—'
      label = 'BEKOR QILINDI'
      break
    default:
      break
  }

  const status =
    phase === 'ping'
      ? 'Ping o‘lchanmoqda'
      : phase === 'download'
        ? 'Download tezligi o‘lchanmoqda'
        : phase === 'upload'
          ? 'Upload tezligi o‘lchanmoqda'
          : phase === 'done'
            ? `Test yakunlandi. Download ${fmtSpeed(download ?? 0)} Mbps, upload ${fmtSpeed(upload ?? 0)} Mbps, ping ${fmtMs(ping ?? 0)} ms`
            : phase === 'error'
              ? 'Test xatolik bilan tugadi'
              : phase === 'cancelled'
                ? 'Test bekor qilindi'
                : ''

  const buttonLabel = running ? 'TEST ISHLAYAPTI…' : phase === 'idle' ? 'WIFI TEKSHIRISH' : 'QAYTA TEKSHIRISH'

  return (
    <section className="glass animate-fade-up p-4 sm:p-8" aria-labelledby="speedtest-title">
      <h2 id="speedtest-title" className="sr-only">
        Internet tezligini o‘lchash
      </h2>

      {/* Bosqichlar */}
      <ol className="mx-auto mb-4 flex max-w-md items-center justify-between gap-2" aria-label="Test bosqichlari">
        {STEPS.map(({ key, label: stepLabel, Icon }) => {
          const done = (key === 'ping' && ping !== null) || (key === 'download' && download !== null) || (key === 'upload' && upload !== null)
          const current = phase === key
          return (
            <li
              key={key}
              aria-current={current ? 'step' : undefined}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border px-2 py-1.5 text-xs font-medium transition ${
                current
                  ? 'border-cyan-300/50 bg-cyan-400/15 text-cyan-200'
                  : done
                    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                    : 'border-white/10 text-slate-500'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{stepLabel}</span>
            </li>
          )
        })}
      </ol>

      <Speedometer
        fraction={fraction}
        valueText={valueText}
        unit={unit}
        label={label}
        accent={accent}
        indeterminate={indeterminate}
        active={running}
      />

      {/* Progress chizig‘i */}
      <div
        className="mx-auto mt-1 h-1 w-full max-w-xs overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label="Bosqich progressi"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={running ? Math.round(progress * 100) : phase === 'done' ? 100 : 0}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500 transition-[width] duration-200"
          style={{ width: `${running ? progress * 100 : phase === 'done' ? 100 : 0}%` }}
        />
      </div>

      {/* Jonli ko‘rsatkichlar */}
      <div className="mx-auto mt-5 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
        <Chip icon={<Activity className="h-3.5 w-3.5 shrink-0" aria-hidden />} label="Ping" value={ping === null ? '—' : fmtMs(ping)} unit="ms" active={phase === 'ping'} />
        <Chip icon={<Waves className="h-3.5 w-3.5 shrink-0" aria-hidden />} label="Jitter" value={jitter === null ? '—' : fmtMs(jitter)} unit="ms" active={phase === 'ping'} />
        <Chip
          icon={<Download className="h-3.5 w-3.5 shrink-0" aria-hidden />}
          label="Download"
          value={download !== null ? fmtSpeed(download) : phase === 'download' ? fmtSpeed(liveSpeed) : '—'}
          unit="Mbps"
          active={phase === 'download'}
        />
        <Chip
          icon={<Upload className="h-3.5 w-3.5 shrink-0" aria-hidden />}
          label="Upload"
          value={upload !== null ? fmtSpeed(upload) : phase === 'upload' ? fmtSpeed(liveSpeed) : '—'}
          unit="Mbps"
          active={phase === 'upload'}
        />
      </div>

      {/* Xabarlar */}
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      {phase === 'error' && error && (
        <div
          role="alert"
          className="mx-auto mt-5 flex max-w-xl items-start gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Test bajarilmadi</p>
            <p className="mt-1 text-red-200/90">{error}</p>
          </div>
        </div>
      )}
      {phase === 'cancelled' && (
        <p className="mt-5 text-center text-sm text-slate-400">Test bekor qilindi. Istalgan vaqtda qayta boshlashingiz mumkin.</p>
      )}

      {/* Boshqaruv */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <button type="button" className="btn-primary" onClick={onStart} disabled={running} aria-busy={running}>
          {running ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : phase === 'idle' ? (
            <Play className="h-5 w-5" aria-hidden />
          ) : (
            <RotateCw className="h-5 w-5" aria-hidden />
          )}
          {buttonLabel}
        </button>

        {running && (
          <button type="button" className="btn-ghost" onClick={cancel}>
            <Square className="h-4 w-4" aria-hidden />
            Bekor qilish
            <kbd className="hidden rounded border border-white/20 px-1.5 text-[10px] text-slate-400 sm:inline">Esc</kbd>
          </button>
        )}
      </div>
    </section>
  )
}
