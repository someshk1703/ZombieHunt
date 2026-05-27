// AudioManager — 100% procedural Web Audio API synthesis
// No external files or CDN dependencies — game NEVER breaks due to audio failure

type SoundCategory = 'ui' | 'game' | 'music'

type SynthFn = (ctx: AudioContext, vol: number) => void

interface SynthDef {
  category: SoundCategory
  fn: SynthFn
}

class AudioManager {
  private ctx: AudioContext | null = null
  private volumes = { master: 0.75, ui: 0.6, game: 0.85, music: 0.35 }
  private initialized = false
  private muted = false
  private synths: Record<string, SynthDef> = {}

  // ── Storage ───────────────────────────────────────────────────────────────
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

  // ── Init ──────────────────────────────────────────────────────────────────
  async init(): Promise<void> {
    if (this.initialized) return
    this.loadMutedFromStorage()
    try {
      this.ctx = new AudioContext()
      if (this.ctx.state === 'suspended') await this.ctx.resume()
      this.initialized = true
      this.registerSynths()
    } catch { /* audio not available */ }
  }

  // ── Synthesis helpers ─────────────────────────────────────────────────────
  private whiteNoise(ctx: AudioContext, durationSec: number): AudioBufferSourceNode {
    const sr = ctx.sampleRate
    const len = Math.ceil(sr * durationSec)
    const buf = ctx.createBuffer(1, len, sr)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    return src
  }

  private distortionCurve(amount: number): Float32Array {
    const n = 256; const curve = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x))
    }
    return curve
  }

  private masterVol(category: SoundCategory, userVol = 1): number {
    const catVol = this.volumes[category] ?? 1
    return userVol * catVol * this.volumes.master
  }

  // ── Sound definitions ─────────────────────────────────────────────────────
  private registerSynths() {
    const s = this.synths

    // ── UI ────────────────────────────────────────────────────────────────

    s.btn_hover = { category: 'ui', fn: (ctx, vol) => {
      const osc = ctx.createOscillator(); const g = ctx.createGain()
      osc.type = 'sine'; osc.frequency.value = 1800
      g.gain.setValueAtTime(vol * 0.12, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.05)
    }}

    s.btn_click = { category: 'ui', fn: (ctx, vol) => {
      const ns = this.whiteNoise(ctx, 0.06)
      const hpf = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 3500
      const g = ctx.createGain()
      g.gain.setValueAtTime(vol * 0.35, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06)
      ns.connect(hpf); hpf.connect(g); g.connect(ctx.destination); ns.start()
    }}

    s.card_pickup = { category: 'ui', fn: (ctx, vol) => {
      const ns = this.whiteNoise(ctx, 0.15)
      const bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 1000
      bpf.frequency.linearRampToValueAtTime(2600, ctx.currentTime + 0.12)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, ctx.currentTime)
      g.gain.linearRampToValueAtTime(vol * 0.28, ctx.currentTime + 0.03)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15)
      ns.connect(bpf); bpf.connect(g); g.connect(ctx.destination); ns.start()
    }}

    s.card_place = { category: 'ui', fn: (ctx, vol) => {
      // Low body thud
      const osc = ctx.createOscillator(); const og = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(200, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.12)
      og.gain.setValueAtTime(vol * 0.55, ctx.currentTime)
      og.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14)
      osc.connect(og); og.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.15)
      // Noise transient
      const ns = this.whiteNoise(ctx, 0.05)
      const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 700
      const ng = ctx.createGain()
      ng.gain.setValueAtTime(vol * 0.18, ctx.currentTime)
      ng.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05)
      ns.connect(lpf); lpf.connect(ng); ng.connect(ctx.destination); ns.start()
    }}

    s.timer_tick = { category: 'ui', fn: (ctx, vol) => {
      const osc = ctx.createOscillator(); const g = ctx.createGain()
      osc.type = 'sine'; osc.frequency.value = 650
      g.gain.setValueAtTime(vol * 0.18, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.05)
    }}

    s.timer_warn = { category: 'ui', fn: (ctx, vol) => {
      const osc = ctx.createOscillator(); const g = ctx.createGain()
      osc.type = 'square'; osc.frequency.value = 960
      g.gain.setValueAtTime(vol * 0.14, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.06)
    }}

    // ── Game ──────────────────────────────────────────────────────────────

    s.card_flip = { category: 'game', fn: (ctx, vol) => {
      const ns = this.whiteNoise(ctx, 0.09)
      const bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'
      bpf.frequency.value = 1400; bpf.Q.value = 2.5
      const g = ctx.createGain()
      g.gain.setValueAtTime(vol * 0.32, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09)
      ns.connect(bpf); bpf.connect(g); g.connect(ctx.destination); ns.start()
    }}

    s.zombie_card = { category: 'game', fn: (ctx, vol) => {
      const osc = ctx.createOscillator()
      const dist = ctx.createWaveShaper(); dist.curve = this.distortionCurve(400)
      const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 350
      const g = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(85, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(55, ctx.currentTime + 0.6)
      g.gain.setValueAtTime(vol * 0.55, ctx.currentTime)
      g.gain.linearRampToValueAtTime(vol * 0.45, ctx.currentTime + 0.4)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8)
      osc.connect(dist); dist.connect(lpf); lpf.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.9)
    }}

    s.shotgun_fire = { category: 'game', fn: (ctx, vol) => {
      // Explosive noise burst
      const ns = this.whiteNoise(ctx, 0.35)
      const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 5000
      const ng = ctx.createGain()
      ng.gain.setValueAtTime(vol * 0.95, ctx.currentTime)
      ng.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28)
      ns.connect(lpf); lpf.connect(ng); ng.connect(ctx.destination); ns.start()
      // Low body thud
      const osc = ctx.createOscillator(); const og = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(130, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.18)
      og.gain.setValueAtTime(vol * 0.85, ctx.currentTime)
      og.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22)
      osc.connect(og); og.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.25)
    }}

    s.vaccine_use = { category: 'game', fn: (ctx, vol) => {
      // Ascending hopeful chime — C E G C
      ;[523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator(); const g = ctx.createGain()
        const t = ctx.currentTime + i * 0.075
        osc.type = 'sine'; osc.frequency.value = freq
        g.gain.setValueAtTime(0.0001, t)
        g.gain.linearRampToValueAtTime(vol * 0.32, t + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
        osc.connect(g); g.connect(ctx.destination)
        osc.start(t); osc.stop(t + 0.38)
      })
    }}

    s.player_infected = { category: 'game', fn: (ctx, vol) => {
      // Horror descending growl
      const osc = ctx.createOscillator()
      const dist = ctx.createWaveShaper(); dist.curve = this.distortionCurve(200)
      const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 700
      const g = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(240, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 1.1)
      g.gain.setValueAtTime(vol * 0.5, ctx.currentTime)
      g.gain.linearRampToValueAtTime(vol * 0.45, ctx.currentTime + 0.6)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4)
      osc.connect(dist); dist.connect(lpf); lpf.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 1.5)
    }}

    s.player_eliminated = { category: 'game', fn: (ctx, vol) => {
      // Heavy hit + noise sweep down
      const osc = ctx.createOscillator(); const og = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(160, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.45)
      og.gain.setValueAtTime(vol * 0.7, ctx.currentTime)
      og.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55)
      osc.connect(og); og.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.6)
      // Noise sweep
      const ns = this.whiteNoise(ctx, 0.35)
      const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'
      lpf.frequency.setValueAtTime(3500, ctx.currentTime)
      lpf.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.35)
      const ng = ctx.createGain()
      ng.gain.setValueAtTime(vol * 0.45, ctx.currentTime)
      ng.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
      ns.connect(lpf); lpf.connect(ng); ng.connect(ctx.destination); ns.start()
    }}

    s.round_start = { category: 'game', fn: (ctx, vol) => {
      // Ominous minor stinger A–C–E
      ;[[220, 0], [261.63, 0.06], [329.63, 0.12]].forEach(([freq, delay]) => {
        const osc = ctx.createOscillator(); const g = ctx.createGain()
        const t = ctx.currentTime + delay
        osc.type = 'triangle'; osc.frequency.value = freq
        g.gain.setValueAtTime(0.0001, t)
        g.gain.linearRampToValueAtTime(vol * 0.38, t + 0.03)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45)
        osc.connect(g); g.connect(ctx.destination)
        osc.start(t); osc.stop(t + 0.5)
      })
    }}

    s.commit_lock = { category: 'game', fn: (ctx, vol) => {
      // Metal click
      const ns = this.whiteNoise(ctx, 0.08)
      const hpf = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 2500
      const ng = ctx.createGain()
      ng.gain.setValueAtTime(vol * 0.42, ctx.currentTime)
      ng.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.07)
      ns.connect(hpf); hpf.connect(ng); ng.connect(ctx.destination); ns.start()
      // Short metallic ring
      const osc = ctx.createOscillator(); const og = ctx.createGain()
      osc.type = 'triangle'; osc.frequency.value = 3800
      og.gain.setValueAtTime(vol * 0.18, ctx.currentTime)
      og.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.07)
      osc.connect(og); og.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.08)
    }}

    s.countdown_end = { category: 'game', fn: (ctx, vol) => {
      for (let i = 0; i < 2; i++) {
        const osc = ctx.createOscillator(); const g = ctx.createGain()
        const t = ctx.currentTime + i * 0.22
        osc.type = 'square'; osc.frequency.value = 440
        g.gain.setValueAtTime(vol * 0.28, t)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
        osc.connect(g); g.connect(ctx.destination)
        osc.start(t); osc.stop(t + 0.18)
      }
    }}

    s.humans_win = { category: 'game', fn: (ctx, vol) => {
      // Triumphant major chord C–E–G–C
      ;[261.63, 329.63, 392, 523.25].forEach((freq, i) => {
        const osc = ctx.createOscillator(); const g = ctx.createGain()
        const t = ctx.currentTime + i * 0.055
        osc.type = 'triangle'; osc.frequency.value = freq
        g.gain.setValueAtTime(0.0001, t)
        g.gain.linearRampToValueAtTime(vol * 0.32, t + 0.1)
        g.gain.linearRampToValueAtTime(vol * 0.28, t + 1.2)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2)
        osc.connect(g); g.connect(ctx.destination)
        osc.start(t); osc.stop(t + 2.3)
      })
    }}

    s.zombies_win = { category: 'game', fn: (ctx, vol) => {
      // Ominous distorted minor chord A1–E2–A2–D3
      ;[55, 82.41, 110, 146.83].forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const dist = ctx.createWaveShaper(); dist.curve = this.distortionCurve(120)
        const g = ctx.createGain()
        const t = ctx.currentTime + i * 0.12
        osc.type = 'sawtooth'; osc.frequency.value = freq
        g.gain.setValueAtTime(0.0001, t)
        g.gain.linearRampToValueAtTime(vol * 0.42, t + 0.25)
        g.gain.linearRampToValueAtTime(vol * 0.38, t + 1.2)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8)
        osc.connect(dist); dist.connect(g); g.connect(ctx.destination)
        osc.start(t); osc.stop(t + 2.9)
      })
    }}

    s.death_sting = { category: 'game', fn: (ctx, vol) => {
      const osc = ctx.createOscillator()
      const dist = ctx.createWaveShaper(); dist.curve = this.distortionCurve(300)
      const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'
      lpf.frequency.setValueAtTime(2200, ctx.currentTime)
      lpf.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 1.8)
      const g = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(460, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 1.8)
      g.gain.setValueAtTime(vol * 0.55, ctx.currentTime)
      g.gain.linearRampToValueAtTime(vol * 0.48, ctx.currentTime + 0.6)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.2)
      osc.connect(dist); dist.connect(lpf); lpf.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 2.3)
    }}

    // Aliases
    s.card_steal = { category: 'game', fn: (ctx, vol) => s.card_pickup.fn(ctx, vol) }
  }

  // ── Compatibility shims (no-ops for old URL-based API) ────────────────────
  async preload(_category: SoundCategory): Promise<void> { await this.init() }

  // ── Public play ───────────────────────────────────────────────────────────
  play(key: string, options?: { volume?: number; loop?: boolean; fadeIn?: number }): void {
    if (this.muted) return
    const doPlay = () => {
      if (!this.ctx) return
      const synth = this.synths[key]
      if (!synth) return
      const vol = this.masterVol(synth.category, options?.volume ?? 1)
      try { synth.fn(this.ctx, vol) } catch { /* ignore */ }
    }
    if (!this.initialized) { this.init().then(doPlay); return }
    doPlay()
  }

  // playMusic routes to procedural ambient — no file loading needed
  async playMusic(key: string, _fadeMs = 1000): Promise<void> {
    const type = key.includes('game') ? 'game' : 'lobby'
    await this.playAmbient(type)
  }

  async stopMusic(_fadeMs = 500): Promise<void> {
    this.stopAmbient()
  }

  setVolume(category: keyof typeof this.volumes, value: number): void {
    this.volumes[category] = Math.max(0, Math.min(1, value))
    if (category === 'music' && this.ambientMaster && this.ctx) {
      this.ambientMaster.gain.value = this.volumes.music * this.volumes.master * 0.12
    }
    this.saveToStorage()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (muted) { this.stopAmbient() }
    this.saveToStorage()
  }

  // ── Procedural ambient (oscillator-based, no file needed) ─────────────────
  private ambientNodes: Array<{ osc: OscillatorNode; lfo: OscillatorNode; gain: GainNode }> = []
  private ambientMaster: GainNode | null = null

  async playAmbient(type: 'lobby' | 'game'): Promise<void> {
    await this.init()
    if (this.muted || !this.ctx) return
    this.stopAmbient()
    const freqs = type === 'lobby' ? [40, 55, 73, 98] : [50, 75, 100, 133]
    const master = this.ctx.createGain()
    master.gain.value = 0
    master.gain.linearRampToValueAtTime(
      this.volumes.music * this.volumes.master * 0.12,
      this.ctx.currentTime + 2
    )
    master.connect(this.ctx.destination)
    this.ambientMaster = master

    for (const freq of freqs) {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      gain.gain.value = 0.25
      osc.type = 'sine'
      osc.frequency.value = freq
      const lfo = this.ctx.createOscillator()
      const lfoGain = this.ctx.createGain()
      lfo.type = 'sine'
      lfo.frequency.value = 0.05 + Math.random() * 0.15
      lfoGain.gain.value = freq * 0.015
      lfo.connect(lfoGain)
      lfoGain.connect(osc.frequency)
      osc.connect(gain)
      gain.connect(master)
      osc.start()
      lfo.start()
      this.ambientNodes.push({ osc, lfo, gain })
    }
  }

  stopAmbient(): void {
    if (!this.ambientMaster || !this.ctx) return
    try {
      this.ambientMaster.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1)
      const nodes = [...this.ambientNodes]
      setTimeout(() => {
        nodes.forEach(({ osc, lfo }) => { try { osc.stop(); lfo.stop() } catch { /* ignore */ } })
      }, 1100)
    } catch { /* ignore */ }
    this.ambientNodes = []
    this.ambientMaster = null
  }

  isMuted(): boolean { return this.muted }
  getVolumes() { return { ...this.volumes } }
}

export const audioManager = new AudioManager()
