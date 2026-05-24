// AudioManager — lazy-initialized on first user interaction
// All sounds wrapped in try/catch — game NEVER breaks due to audio failure

type SoundCategory = 'ui' | 'game' | 'music'

const SOUNDS: Record<string, { url: string; category: SoundCategory }> = {
  // UI sounds — Mixkit URLs (verify before production deploy)
  btn_hover:  { url: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', category: 'ui' },
  btn_click:  { url: 'https://assets.mixkit.co/active_storage/sfx/2997/2997-preview.mp3', category: 'ui' },
  card_pickup: { url: 'https://assets.mixkit.co/active_storage/sfx/2073/2073-preview.mp3', category: 'ui' },
  card_place:  { url: 'https://assets.mixkit.co/active_storage/sfx/2108/2108-preview.mp3', category: 'ui' },
  timer_tick:  { url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', category: 'ui' },
  timer_warn:  { url: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', category: 'ui' },

  // Game event sounds
  card_flip:          { url: 'https://assets.mixkit.co/active_storage/sfx/2073/2073-preview.mp3', category: 'game' },
  zombie_card:        { url: 'https://assets.mixkit.co/active_storage/sfx/565/565-preview.mp3', category: 'game' },
  shotgun_fire:       { url: 'https://assets.mixkit.co/active_storage/sfx/10/10-preview.mp3', category: 'game' },
  vaccine_use:        { url: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3', category: 'game' },
  card_steal:         { url: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', category: 'game' },
  player_infected:    { url: 'https://assets.mixkit.co/active_storage/sfx/100/100-preview.mp3', category: 'game' },
  player_eliminated:  { url: 'https://assets.mixkit.co/active_storage/sfx/565/565-preview.mp3', category: 'game' },
  round_start:        { url: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3', category: 'game' },
  commit_lock:        { url: 'https://assets.mixkit.co/active_storage/sfx/2997/2997-preview.mp3', category: 'game' },
  countdown_end:      { url: 'https://assets.mixkit.co/active_storage/sfx/100/100-preview.mp3', category: 'game' },
  humans_win:         { url: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3', category: 'game' },
  zombies_win:        { url: 'https://assets.mixkit.co/active_storage/sfx/565/565-preview.mp3', category: 'game' },
  death_sting:        { url: 'https://assets.mixkit.co/active_storage/sfx/10/10-preview.mp3', category: 'game' },

  // Ambient music
  bg_lobby:   { url: 'https://assets.mixkit.co/active_storage/sfx/123/123-preview.mp3', category: 'music' },
  bg_game:    { url: 'https://assets.mixkit.co/active_storage/sfx/124/124-preview.mp3', category: 'music' },
  bg_results: { url: 'https://assets.mixkit.co/active_storage/sfx/125/125-preview.mp3', category: 'music' },
}

class AudioManager {
  private ctx: AudioContext | null = null
  private buffers: Map<string, AudioBuffer> = new Map()
  private volumes = { master: 0.8, ui: 0.6, game: 0.8, music: 0.4 }
  private musicSource: AudioBufferSourceNode | null = null
  private musicGain: GainNode | null = null
  private initialized = false
  private muted = false

  private loadMutedFromStorage() {
    try {
      const stored = sessionStorage.getItem('zh_audio')
      if (stored) {
        const parsed = JSON.parse(stored)
        this.muted = parsed.muted ?? false
        Object.assign(this.volumes, parsed.volumes ?? {})
      }
    } catch { /* ignore */ }
  }

  private saveToStorage() {
    try {
      sessionStorage.setItem('zh_audio', JSON.stringify({ muted: this.muted, volumes: this.volumes }))
    } catch { /* ignore */ }
  }

  async init(): Promise<void> {
    if (this.initialized) return
    this.loadMutedFromStorage()
    try {
      this.ctx = new AudioContext()
      if (this.ctx.state === 'suspended') await this.ctx.resume()
      this.initialized = true
    } catch { /* audio not available */ }
  }

  private async loadBuffer(key: string): Promise<AudioBuffer | null> {
    if (!this.ctx) return null
    if (this.buffers.has(key)) return this.buffers.get(key)!
    const sound = SOUNDS[key]
    if (!sound) return null
    try {
      const response = await fetch(sound.url)
      if (!response.ok) return null
      const arrayBuffer = await response.arrayBuffer()
      const decoded = await this.ctx!.decodeAudioData(arrayBuffer)
      this.buffers.set(key, decoded)
      return decoded
    } catch { return null }
  }

  async preload(category: SoundCategory): Promise<void> {
    await this.init()
    const keys = Object.entries(SOUNDS).filter(([, v]) => v.category === category).map(([k]) => k)
    await Promise.allSettled(keys.map(k => this.loadBuffer(k)))
  }

  play(key: string, options?: { volume?: number; loop?: boolean; fadeIn?: number }): void {
    if (this.muted) return
    if (!this.initialized) {
      this.init().then(() => this.play(key, options))
      return
    }
    if (!this.ctx) return
    this.loadBuffer(key).then(buffer => {
      if (!buffer || !this.ctx) return
      try {
        const source = this.ctx.createBufferSource()
        source.buffer = buffer
        source.loop = options?.loop ?? false

        const gainNode = this.ctx.createGain()
        const sound = SOUNDS[key]
        const catVol = this.volumes[sound?.category as keyof typeof this.volumes] ?? 1
        const finalVol = (options?.volume ?? 1) * catVol * this.volumes.master

        gainNode.gain.value = options?.fadeIn ? 0 : finalVol
        if (options?.fadeIn) {
          gainNode.gain.linearRampToValueAtTime(finalVol, this.ctx.currentTime + options.fadeIn / 1000)
        }

        source.connect(gainNode)
        gainNode.connect(this.ctx.destination)
        source.start()
      } catch { /* ignore */ }
    })
  }

  async playMusic(key: string, fadeMs = 1000): Promise<void> {
    await this.init()
    await this.stopMusic(fadeMs)
    if (this.muted || !this.ctx) return
    const buffer = await this.loadBuffer(key)
    if (!buffer || !this.ctx) return
    try {
      this.musicSource = this.ctx.createBufferSource()
      this.musicSource.buffer = buffer
      this.musicSource.loop = true
      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = 0
      this.musicGain.gain.linearRampToValueAtTime(this.volumes.music * this.volumes.master, this.ctx.currentTime + fadeMs / 1000)
      this.musicSource.connect(this.musicGain)
      this.musicGain.connect(this.ctx.destination)
      this.musicSource.start()
    } catch { /* ignore */ }
  }

  async stopMusic(fadeMs = 500): Promise<void> {
    if (!this.musicGain || !this.ctx || !this.musicSource) return
    try {
      this.musicGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeMs / 1000)
      const src = this.musicSource
      setTimeout(() => { try { src.stop() } catch { /* ignore */ } }, fadeMs)
      this.musicSource = null
      this.musicGain = null
    } catch { /* ignore */ }
  }

  setVolume(category: keyof typeof this.volumes, value: number): void {
    this.volumes[category] = Math.max(0, Math.min(1, value))
    if (category === 'music' && this.musicGain && this.ctx) {
      this.musicGain.gain.value = this.volumes.music * this.volumes.master
    }
    this.saveToStorage()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (muted) { this.stopMusic(200) }
    this.saveToStorage()
  }

  isMuted(): boolean { return this.muted }
  getVolumes() { return { ...this.volumes } }
}

export const audioManager = new AudioManager()
