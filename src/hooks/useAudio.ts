import { useCallback } from 'react'
import { audioManager } from '../lib/audio'

export function useAudio() {
  const play = useCallback((key: string, options?: { volume?: number; loop?: boolean }) => {
    audioManager.play(key, options)
  }, [])

  const playMusic = useCallback((key: string, fadeMs?: number) => {
    audioManager.playMusic(key, fadeMs)
  }, [])

  const playAmbient = useCallback((type: 'lobby' | 'game') => {
    audioManager.playAmbient(type)
  }, [])

  const stopAmbient = useCallback(() => {
    audioManager.stopAmbient()
  }, [])

  const stopMusic = useCallback((fadeMs?: number) => {
    audioManager.stopMusic(fadeMs)
  }, [])

  const setVolume = useCallback((category: Parameters<typeof audioManager.setVolume>[0], value: number) => {
    audioManager.setVolume(category, value)
  }, [])

  const setMuted = useCallback((muted: boolean) => {
    audioManager.setMuted(muted)
  }, [])

  const isMuted = useCallback(() => audioManager.isMuted(), [])

  return { play, playMusic, playAmbient, stopAmbient, stopMusic, setVolume, setMuted, isMuted }
}
