import { useCallback, useEffect, useRef, useState } from 'react'
import { loadMusicPrefs, saveMusicPrefs } from '../lib/storage'

/** Musiqa fayli: public/music/test-music.mp3 */
const MUSIC_SRC = `${import.meta.env.BASE_URL}music/test-music.mp3`

/**
 * Bitta <audio> elementi (lazy yaratiladi) — shuning uchun qayta-qayta start bosilganda
 * musiqa ustma-ust qo‘shilmaydi. play() faqat foydalanuvchi bosishi (click handler) ichida chaqiriladi.
 */
export function useMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [prefs] = useState(loadMusicPrefs)
  const [enabled, setEnabled] = useState(prefs.enabled)
  const [volume, setVolumeState] = useState(prefs.volume)
  const [playing, setPlaying] = useState(false)
  const [available, setAvailable] = useState(true)
  const volumeRef = useRef(prefs.volume)

  const getAudio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      const a = new Audio()
      a.loop = true
      a.preload = 'auto'
      a.volume = volumeRef.current
      a.addEventListener('play', () => setPlaying(true))
      a.addEventListener('pause', () => setPlaying(false))
      a.addEventListener('error', () => {
        setAvailable(false)
        setPlaying(false)
      })
      a.src = MUSIC_SRC
      audioRef.current = a
    }
    return audioRef.current
  }, [])

  const safePlay = useCallback(
    (a: HTMLAudioElement) => {
      if (!a.paused) return
      // Fayl topilmasa yoki brauzer rad etsa — sayt jim ishlashda davom etadi.
      a.play().catch(() => undefined)
    },
    [],
  )

  /** Test tugmasi bosilganda chaqiriladi. */
  const start = useCallback(() => {
    if (!enabled || !available) return
    safePlay(getAudio())
  }, [enabled, available, getAudio, safePlay])

  const toggle = useCallback(() => {
    if (enabled) {
      setEnabled(false)
      audioRef.current?.pause()
    } else {
      setEnabled(true)
      if (available) safePlay(getAudio())
    }
  }, [enabled, available, getAudio, safePlay])

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v))
    volumeRef.current = clamped
    setVolumeState(clamped)
    if (audioRef.current) audioRef.current.volume = clamped
  }, [])

  useEffect(() => {
    saveMusicPrefs({ enabled, volume })
  }, [enabled, volume])

  useEffect(
    () => () => {
      const a = audioRef.current
      if (a) {
        a.pause()
        a.removeAttribute('src')
        a.load()
        audioRef.current = null
      }
    },
    [],
  )

  return { enabled, playing, available, volume, start, toggle, setVolume }
}

export type MusicControls = ReturnType<typeof useMusic>
