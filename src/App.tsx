import { useCallback, useEffect, useRef, useState } from 'react'
import Header from './components/Header'
import SpeedTest from './components/SpeedTest'
import TestResults from './components/TestResults'
import TestHistory from './components/TestHistory'
import ConnectionInfo from './components/ConnectionInfo'
import { useSpeedTest } from './hooks/useSpeedTest'
import { useMusic } from './hooks/useMusic'
import { useHistory } from './hooks/useHistory'
import { useConnectionInfo } from './hooks/useConnectionInfo'
import type { TestResult } from './types'

const smooth = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

export default function App() {
  const info = useConnectionInfo()
  const music = useMusic()
  const { history, add, remove, clear } = useHistory()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)

  const serverLabel = info.meta?.colo ? `Cloudflare ${info.meta.colo}` : null
  const { refresh } = info

  const handleComplete = useCallback(
    (r: TestResult) => {
      add(r)
      setSelectedId(null)
      refresh() // IP/server ma’lumotini yangilash
    },
    [add, refresh],
  )

  const test = useSpeedTest({ onComplete: handleComplete, serverLabel })
  const { start } = test

  // Tugma bosilgan zahoti (sinxron) musiqani ishga tushiramiz — brauzer autoplay qoidalari uchun
  const handleStart = useCallback(() => {
    setSelectedId(null)
    music.start()
    void start()
  }, [music, start])

  const handleRetest = useCallback(() => {
    topRef.current?.scrollIntoView({ behavior: smooth(), block: 'start' })
    handleStart()
  }, [handleStart])

  const selected = selectedId ? (history.find((h) => h.id === selectedId) ?? null) : null
  const active = selected ?? test.state.result
  const idx = active ? history.findIndex((h) => h.id === active.id) : -1
  const previous = idx >= 0 ? (history[idx + 1] ?? null) : null

  // Test tugaganda yoki tarixdan natija tanlanganda natijalar paneliga o‘tish
  const phase = test.state.phase
  useEffect(() => {
    if (phase === 'done' || selectedId) {
      resultsRef.current?.scrollIntoView({ behavior: smooth(), block: 'start' })
    }
  }, [phase, selectedId])

  return (
    <div className="relative min-h-dvh pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div aria-hidden className="bg-aurora pointer-events-none fixed inset-0 -z-10" />

      <Header music={music} />

      <main className="mx-auto w-full max-w-5xl space-y-5 px-4 pt-4 sm:space-y-6 sm:px-6">
        <div ref={topRef} className="scroll-mt-4">
          <SpeedTest test={test} onStart={handleStart} />
        </div>

        {active && (
          <div ref={resultsRef} className="scroll-mt-4">
            <TestResults
              result={active}
              previous={previous}
              viewingSaved={Boolean(selected)}
              running={test.running}
              onRetest={handleRetest}
              onDismiss={() => setSelectedId(null)}
            />
          </div>
        )}

        <div className="grid items-start gap-5 sm:gap-6 lg:grid-cols-2">
          <ConnectionInfo info={info} />
          <TestHistory
            history={history}
            activeId={active?.id ?? null}
            onSelect={setSelectedId}
            onRemove={(id) => {
              remove(id)
              if (id === selectedId) setSelectedId(null)
            }}
            onClear={() => {
              clear()
              setSelectedId(null)
            }}
          />
        </div>

        <footer className="pb-2 text-center text-xs text-slate-500">
          Natijalar haqiqiy o‘lchovlarga asoslangan (Cloudflare speed-test infratuzilmasi). Tarix faqat shu brauzerda saqlanadi.
        </footer>
      </main>
    </div>
  )
}
