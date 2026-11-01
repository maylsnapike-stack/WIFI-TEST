import { GAUGE_LABELS } from '../lib/gauge'

interface Props {
  /** 0…1 (shkala bo‘yicha) */
  fraction: number
  valueText: string
  unit: string
  label: string
  accent: 'cyan' | 'blue'
  /** Ping bosqichi: aylanuvchi indikator */
  indeterminate: boolean
  active: boolean
}

const CX = 150
const CY = 150
const R = 118
const START = 135
const SWEEP = 270

const polar = (deg: number, r: number): [number, number] => {
  const a = (deg * Math.PI) / 180
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)]
}

const ARC = (() => {
  const [x1, y1] = polar(START, R)
  const [x2, y2] = polar(START + SWEEP, R)
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 1 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
})()

const GLOW: Record<Props['accent'], string> = {
  cyan: 'drop-shadow(0 0 7px rgba(34,211,238,0.65))',
  blue: 'drop-shadow(0 0 7px rgba(99,102,241,0.7))',
}

export default function Speedometer({ fraction, valueText, unit, label, accent, indeterminate, active }: Props) {
  const stroke = `url(#gauge-${accent})`
  const showArc = fraction > 0.002

  return (
    <svg
      viewBox="0 0 300 262"
      className="mx-auto h-auto w-full max-w-[26rem] select-none"
      role="img"
      aria-label={`${label}: ${valueText} ${unit}`}
    >
      <defs>
        <linearGradient id="gauge-cyan" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="gauge-blue" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>

      {/* ichki disk */}
      <circle cx={CX} cy={CY} r={96} fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.06)" />
      {active && (
        <circle
          cx={CX}
          cy={CY}
          r={104}
          fill="none"
          stroke={accent === 'cyan' ? 'rgba(34,211,238,0.35)' : 'rgba(129,140,248,0.4)'}
          className="animate-ring-pulse"
        />
      )}

      {/* trek */}
      <path d={ARC} pathLength={100} fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth={12} strokeLinecap="round" />

      {/* shkala belgilari */}
      {GAUGE_LABELS.map((t, i) => {
        const deg = START + (SWEEP * i) / (GAUGE_LABELS.length - 1)
        const [x, y] = polar(deg, R - 26)
        return (
          <text
            key={t}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={11}
            fill="rgba(148,163,184,0.75)"
          >
            {t}
          </text>
        )
      })}

      {/* progress */}
      {indeterminate ? (
        <g className="animate-sweep" style={{ transformOrigin: `${CX}px ${CY}px` }}>
          <path
            d={ARC}
            pathLength={100}
            fill="none"
            stroke={stroke}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray="12 88"
            style={{ filter: GLOW[accent] }}
          />
        </g>
      ) : (
        showArc && (
          <path
            d={ARC}
            pathLength={100}
            fill="none"
            stroke={stroke}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={`${(fraction * 100).toFixed(2)} 100`}
            style={{ transition: 'stroke-dasharray 200ms linear', filter: GLOW[accent] }}
          />
        )
      )}

      {/* markaz */}
      <text x={CX} y={108} textAnchor="middle" fontSize={13} fontWeight={600} letterSpacing={3} fill="#94a3b8">
        {label}
      </text>
      <text
        x={CX}
        y={172}
        textAnchor="middle"
        fontSize={58}
        fontWeight={700}
        fill="#ffffff"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {valueText}
      </text>
      <text x={CX} y={199} textAnchor="middle" fontSize={15} fontWeight={600} fill="#67e8f9">
        {unit}
      </text>
    </svg>
  )
}
