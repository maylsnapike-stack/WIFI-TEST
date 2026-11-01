import { Wifi } from 'lucide-react'
import MusicPlayer from './MusicPlayer'
import type { MusicControls } from '../hooks/useMusic'

export default function Header({ music }: { music: MusicControls }) {
  return (
    <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pt-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-600 shadow-[0_0_26px_-4px_rgba(34,211,238,0.6)]">
          <Wifi className="h-6 w-6 text-ink-950" aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">
            WiFi <span className="text-cyan-300">SpeedTest</span>
          </h1>
          <p className="truncate text-xs text-slate-400">Real vaqtda internet tezligini o‘lchash</p>
        </div>
      </div>
      <MusicPlayer music={music} />
    </header>
  )
}
