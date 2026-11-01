import { useCallback, useEffect, useState } from 'react'
import { HISTORY_STORAGE_KEY, MAX_HISTORY, loadHistory, saveHistory } from '../lib/storage'
import type { TestResult } from '../types'

export function useHistory() {
  const [history, setHistory] = useState<TestResult[]>(loadHistory)

  useEffect(() => {
    saveHistory(history)
  }, [history])

  // Boshqa tabda o‘zgarish bo‘lsa — sinxronlash
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === HISTORY_STORAGE_KEY) setHistory(loadHistory())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const add = useCallback((r: TestResult) => {
    setHistory((h) => [r, ...h.filter((x) => x.id !== r.id)].slice(0, MAX_HISTORY))
  }, [])

  const remove = useCallback((id: string) => {
    setHistory((h) => h.filter((x) => x.id !== id))
  }, [])

  const clear = useCallback(() => setHistory([]), [])

  return { history, add, remove, clear }
}
