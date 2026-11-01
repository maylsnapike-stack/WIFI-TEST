/** Speedometer shkalasi: logarifmik-ga o‘xshash, teng bo‘laklarga bo‘lingan (0 … 1000 Mbps). */
const STOPS = [0, 5, 10, 25, 50, 100, 250, 500, 1000]
export const GAUGE_LABELS = ['0', '5', '10', '25', '50', '100', '250', '500', '1G']

export function speedToFraction(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return 0
  if (v >= 1000) return 1
  for (let i = 1; i < STOPS.length; i++) {
    if (v <= STOPS[i]) {
      const seg = (v - STOPS[i - 1]) / (STOPS[i] - STOPS[i - 1])
      return (i - 1 + seg) / (STOPS.length - 1)
    }
  }
  return 1
}
