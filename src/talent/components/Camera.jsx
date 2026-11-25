// Kamera untuk selfie absensi: pratinjau langsung → Ambil foto → Ulangi / pakai.
import React, { useEffect, useRef, useState } from 'react'
import { Icon } from './ui.jsx'
import { openCamera, stopStream, captureFrame, cameraError } from '../services/camera.js'

export function useCamera({ audio = false, enabled = true } = {}) {
  const ref = useRef(null); const streamRef = useRef(null)
  const [state, setState] = useState('loading'); const [err, setErr] = useState(null); const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let off = false; setState('loading'); setErr(null)
    openCamera({ audio }).then((st) => {
      if (off) return stopStream(st)
      streamRef.current = st; if (ref.current) { ref.current.srcObject = st; ref.current.play().catch(() => {}) }; setState('ready')
    }).catch((e) => { if (!off) { setErr(cameraError(e)); setState('error') } })
    return () => { off = true; stopStream(streamRef.current); streamRef.current = null }
  }, [tick, enabled])
  return { videoRef: ref, stream: streamRef, state, err, retry: () => setTick((x) => x + 1) }
}

export function CamError({ err, onRetry }) {
  return <div className="cam-err" role="alert"><Icon name="camera" size={28} /><b>{err.title}</b><p>{err.text}</p><button type="button" className="btn btn-ghost" onClick={onRetry}>Coba lagi</button></div>
}

export function SelfieCamera({ value, onChange, label = 'Selfie' }) {
  const cam = useCamera({ enabled: !value })
  const [flash, setFlash] = useState(false)
  const shoot = () => { const v = cam.videoRef.current; if (!v || cam.state !== 'ready') return; setFlash(true); setTimeout(() => setFlash(false), 180); onChange(captureFrame(v)) }
  return (
    <div className="cam">
      <div className={`cam-view ${flash ? 'flash' : ''}`}>
        {value ? <img src={value} alt={label + ' yang diambil'} />
          : cam.state === 'error' ? <CamError err={cam.err} onRetry={cam.retry} />
            : <><video ref={cam.videoRef} className="mirror" playsInline muted autoPlay aria-label="Pratinjau kamera" />
              {cam.state === 'loading' && <span className="cam-load">Menyalakan kamera…</span>}
              <span className="cam-guide" aria-hidden="true" /></>}
      </div>
      <div className="cam-act">
        {value ? <button type="button" className="btn btn-ghost" onClick={() => onChange('')}><Icon name="back" size={16} />Ulangi foto</button>
          : <button type="button" className="cam-shutter" disabled={cam.state !== 'ready'} onClick={shoot} aria-label="Ambil foto"><span /></button>}
      </div>
      {!value && cam.state === 'ready' && <p className="muted sm cam-tip">Posisikan wajah di dalam lingkaran, lalu tekan tombol bulat.</p>}
    </div>
  )
}
