import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Public STUN servers — no account required
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

type SignalMsg =
  | { type: 'join';   from: string }
  | { type: 'leave';  from: string }
  | { type: 'offer';  from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'ice';    from: string; to: string; candidate: RTCIceCandidateInit }

export interface VoicePeer {
  userId: string
  speaking: boolean   // future: voice-activity detection
  muted: boolean      // true if their remote track is muted on our side
}

export function useVoiceChat(roomId: string, userId: string) {
  const [active, setActive]   = useState(false)
  const [muted, setMuted]     = useState(false)           // our own mic
  const [peers, setPeers]     = useState<Record<string, VoicePeer>>({})

  const localStream  = useRef<MediaStream | null>(null)
  const peerConns    = useRef<Record<string, RTCPeerConnection>>({})
  const audioEls     = useRef<Record<string, HTMLAudioElement>>({})   // keep refs to avoid GC
  const channel      = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // ── helpers ────────────────────────────────────────────────

  const send = useCallback((payload: SignalMsg) => {
    channel.current?.send({ type: 'broadcast', event: 'signal', payload })
  }, [])

  const addPeer = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    // Attach our local mic tracks to the connection
    localStream.current?.getTracks().forEach(t =>
      pc.addTrack(t, localStream.current!)
    )

    // Play remote audio
    pc.ontrack = ({ streams: [stream] }) => {
      if (!audioEls.current[peerId]) {
        const el = new Audio()
        el.autoplay = true
        el.srcObject = stream
        audioEls.current[peerId] = el
      } else {
        audioEls.current[peerId].srcObject = stream
      }
    }

    // Forward ICE candidates via signaling channel
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) send({ type: 'ice', from: userId, to: peerId, candidate: candidate.toJSON() })
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        delete peerConns.current[peerId]
        setPeers(p => { const n = { ...p }; delete n[peerId]; return n })
      }
    }

    peerConns.current[peerId] = pc
    setPeers(p => ({ ...p, [peerId]: { userId: peerId, speaking: false, muted: false } }))
    return pc
  }, [userId, send])

  const handleSignal = useCallback(async (msg: SignalMsg) => {
    if (msg.from === userId) return   // ignore own echoes

    if (msg.type === 'join') {
      // We are the existing peer — initiate an offer
      const pc = addPeer(msg.from)
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        send({ type: 'offer', from: userId, to: msg.from, sdp: pc.localDescription! })
      } catch (e) { console.warn('[voice] offer error', e) }

    } else if (msg.type === 'offer' && msg.to === userId) {
      const pc = peerConns.current[msg.from] ?? addPeer(msg.from)
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        send({ type: 'answer', from: userId, to: msg.from, sdp: pc.localDescription! })
      } catch (e) { console.warn('[voice] answer error', e) }

    } else if (msg.type === 'answer' && msg.to === userId) {
      const pc = peerConns.current[msg.from]
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp)).catch(console.warn)

    } else if (msg.type === 'ice' && msg.to === userId) {
      const pc = peerConns.current[msg.from]
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(console.warn)

    } else if (msg.type === 'leave') {
      peerConns.current[msg.from]?.close()
      delete peerConns.current[msg.from]
      audioEls.current[msg.from]?.remove()
      delete audioEls.current[msg.from]
      setPeers(p => { const n = { ...p }; delete n[msg.from]; return n })
    }
  }, [userId, addPeer, send])

  // ── public API ─────────────────────────────────────────────

  const join = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStream.current = stream

      const ch = supabase
        .channel(`voice-${roomId}`)
        .on('broadcast', { event: 'signal' }, ({ payload }) =>
          handleSignal(payload as SignalMsg)
        )
        .subscribe(status => {
          if (status === 'SUBSCRIBED') {
            send({ type: 'join', from: userId })
          }
        })

      channel.current = ch
      setActive(true)
      setMuted(false)
    } catch (err) {
      const e = err as Error
      if (e.name === 'NotAllowedError') {
        console.warn('[voice] Microphone permission denied')
      } else {
        console.error('[voice] join error', err)
      }
    }
  }, [roomId, userId, handleSignal, send])

  const leave = useCallback(() => {
    send({ type: 'leave', from: userId })

    Object.values(peerConns.current).forEach(pc => pc.close())
    peerConns.current = {}

    Object.values(audioEls.current).forEach(el => { el.srcObject = null })
    audioEls.current = {}

    localStream.current?.getTracks().forEach(t => t.stop())
    localStream.current = null

    if (channel.current) {
      supabase.removeChannel(channel.current)
      channel.current = null
    }

    setActive(false)
    setMuted(false)
    setPeers({})
  }, [userId, send])

  const toggleMute = useCallback(() => {
    const track = localStream.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = muted   // if currently muted, re-enable
    setMuted(m => !m)
  }, [muted])

  // Cleanup on unmount
  useEffect(() => () => { leave() }, [leave])

  return { active, muted, peers, join, leave, toggleMute }
}
