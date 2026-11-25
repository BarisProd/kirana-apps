// Self Interview (modul Live Recording): cek kamera & mikrofon → satu pertanyaan per layar →
// rekam maks 3 kali per pertanyaan → putar ulang & pilih 1 rekaman → ringkasan → kirim.
import React, { useEffect, useRef, useState } from 'react'
import { Icon } from './ui.jsx'
import { useCamera, CamError } from './Camera.jsx'
import { startRecording, recorderSupported } from '../services/camera.js'

const MAX_TAKES = 3
const ANSWER_SEC = 120 // batas durasi tiap jawaban
const mmss = (d) => `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(Math.floor(d % 60)).padStart(2, '0')}`

function MicMeter({ stream }) {
  const [lvl, setLvl] = useState(0)
  useEffect(() => {
    const st = stream.current; if (!st || !st.getAudioTracks().length || !window.AudioContext) return
    const ctx = new AudioContext(); const an = ctx.createAnalyser(); an.fftSize = 256; ctx.createMediaStreamSource(st).connect(an)
    const buf = new Uint8Array(an.frequencyBinCount); let raf
    const loop = () => { an.getByteFrequencyData(buf); setLvl(Math.min(1, buf.reduce((a, b) => a + b, 0) / buf.length / 60)); raf = requestAnimationFrame(loop) }
    loop(); return () => { cancelAnimationFrame(raf); ctx.close() }
  }, [stream.current])
  return <div className="mic" aria-label="Level mikrofon"><Icon name="megaphone" size={16} /><div className="mic-bar"><span style={{ width: `${Math.round(lvl * 100)}%` }} /></div></div>
}

export function SelfInterview({ m, onDone, onExit }) {
  const [step, setStep] = useState('cek') // cek | soal | ringkas
  const [qi, setQi] = useState(0)
  const [takes, setTakes] = useState({}) // { [qi]: [{url, dur}] }
  const [pick, setPick] = useState({})
  const [recording, setRecording] = useState(false); const [sec, setSec] = useState(0); const [count, setCount] = useState(0)
  const [play, setPlay] = useState(null)
  const cam = useCamera({ audio: true, enabled: step !== 'ringkas' })
  const recRef = useRef(null); const t0 = useRef(0)

  useEffect(() => () => Object.values(takes).flat().forEach((t) => URL.revokeObjectURL(t.url)), []) // eslint-disable-line
  useEffect(() => { if (!recording) return; const i = setInterval(() => { const d = (Date.now() - t0.current) / 1000; setSec(d); if (d >= ANSWER_SEC) stop() }, 250); return () => clearInterval(i) }, [recording])
  useEffect(() => { if (!count) return; const i = setTimeout(() => { if (count === 1) begin(); setCount(count - 1) }, 1000); return () => clearTimeout(i) }, [count])
  useEffect(() => { if (cam.videoRef.current && cam.stream.current && !play) { cam.videoRef.current.srcObject = cam.stream.current; cam.videoRef.current.play().catch(() => {}) } }, [play, qi, step, cam.state])

  const mine = takes[qi] || []
  const begin = () => {
    t0.current = Date.now(); setSec(0); setRecording(true)
    recRef.current = startRecording(cam.stream.current, (blob) => {
      const dur = Math.round((Date.now() - t0.current) / 1000)
      setTakes((all) => { const list = [...(all[qi] || []), { url: URL.createObjectURL(blob), dur, size: blob.size }]; setPick((p) => ({ ...p, [qi]: list.length - 1 })); return { ...all, [qi]: list } })
    })
  }
  const stop = () => { if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop(); setRecording(false) }
  const canRec = cam.state === 'ready' && recorderSupported() && mine.length < MAX_TAKES && !recording && !count
  const answered = m.soal.filter((_, i) => pick[i] != null).length

  if (step === 'cek') return (
    <div className="si">
      <div className="si-head"><button type="button" className="lnk" onClick={onExit}>‹ Kembali</button><span className="muted sm">{m.judul} · {m.soal.length} pertanyaan</span></div>
      <div className="si-grid">
        <div className="si-cam">{cam.state === 'error' ? <CamError err={cam.err} onRetry={cam.retry} /> : <><video ref={cam.videoRef} className="mirror" playsInline muted autoPlay aria-label="Pratinjau kamera" />{cam.state === 'loading' && <span className="cam-load">Menyalakan kamera & mikrofon…</span>}</>}</div>
        <div className="si-side">
          <h2>Cek kamera & mikrofon</h2>
          <p className="muted">{m.instruksi}</p>
          <ul className="si-check">
            <li className={cam.state === 'ready' ? 'ok' : ''}><Icon name={cam.state === 'ready' ? 'checkCircle' : 'camera'} size={18} />Wajah terlihat jelas dan cukup cahaya</li>
            <li className={cam.state === 'ready' ? 'ok' : ''}><Icon name={cam.state === 'ready' ? 'checkCircle' : 'megaphone'} size={18} />Bar suara bergerak saat kamu bicara</li>
            <li><Icon name="clock" size={18} />Tiap jawaban maksimal {ANSWER_SEC / 60} menit, {MAX_TAKES} kali kesempatan rekam</li>
          </ul>
          {cam.state === 'ready' && <MicMeter stream={cam.stream} />}
          {!recorderSupported() && <p className="err-t">Browser ini belum bisa merekam video. Gunakan Chrome atau Edge terbaru.</p>}
          <button type="button" className="btn btn-primary" disabled={cam.state !== 'ready' || !recorderSupported()} onClick={() => setStep('soal')}>Mulai interview<Icon name="arrowRight" size={18} /></button>
        </div>
      </div>
    </div>
  )

  if (step === 'ringkas') return (
    <div className="si">
      <div className="si-head"><button type="button" className="lnk" onClick={() => setStep('soal')}>‹ Kembali ke pertanyaan</button><span className="muted sm">{answered}/{m.soal.length} terjawab</span></div>
      <h2>Periksa jawabanmu</h2>
      <ol className="si-sum">{m.soal.map((q, i) => { const tk = (takes[i] || [])[pick[i]]; return (
        <li key={i}><div className="grow"><b>Pertanyaan {i + 1}</b><p>{q.q}</p></div>
          {tk ? <video src={tk.url} controls playsInline aria-label={`Rekaman jawaban ${i + 1}`} /> : <span className="badge b-bad">Belum direkam</span>}
          <button type="button" className="btn btn-ghost" onClick={() => { setQi(i); setStep('soal') }}>{tk ? 'Ganti' : 'Rekam'}</button></li>) })}</ol>
      <div className="row-end"><button type="button" className="btn btn-primary" disabled={answered < m.soal.length} onClick={() => onDone(m.soal.map((_, i) => takes[i][pick[i]]))}>Kirim jawaban</button></div>
    </div>
  )

  const q = m.soal[qi]
  return (
    <div className="si">
      <div className="si-head">
        <span className="si-steps" aria-label="Kemajuan">{m.soal.map((_, i) => <button key={i} type="button" className={`${i === qi ? 'on' : ''} ${pick[i] != null ? 'done' : ''}`} disabled={recording || !!count} onClick={() => { setQi(i); setPlay(null) }} aria-label={`Pertanyaan ${i + 1}`}>{i + 1}</button>)}</span>
        <span className="muted sm">{answered}/{m.soal.length} terjawab</span>
      </div>
      <div className="si-grid">
        <div className={`si-cam ${recording ? 'rec-on' : ''}`}>
          {play ? <video key={play.url} src={play.url} controls autoPlay playsInline aria-label="Putar ulang rekaman" />
            : cam.state === 'error' ? <CamError err={cam.err} onRetry={cam.retry} /> : <video ref={cam.videoRef} className="mirror" playsInline muted autoPlay aria-label="Pratinjau kamera" />}
          {recording && <span className="si-rec"><span className="rec-dot" />REC {mmss(sec)} / {mmss(ANSWER_SEC)}</span>}
          {count > 0 && <span className="si-count" aria-live="assertive">{count}</span>}
          {recording && <div className="si-prog"><span style={{ width: `${(sec / ANSWER_SEC) * 100}%` }} /></div>}
        </div>
        <div className="si-side">
          <span className="si-qn">Pertanyaan {qi + 1} dari {m.soal.length}</span>
          <h2 className="si-q">{q.q}</h2>
          <div className="si-ctrl">
            {recording ? <button type="button" className="btn btn-danger" onClick={stop}><span className="sq" />Selesai merekam</button>
              : <button type="button" className="btn btn-primary" disabled={!canRec} onClick={() => { setPlay(null); setCount(3) }}><span className="rec-dot" />{mine.length ? 'Rekam ulang' : 'Mulai rekam'}</button>}
            <span className="muted sm">{MAX_TAKES - mine.length} dari {MAX_TAKES} kesempatan tersisa</span>
          </div>
          {mine.length > 0 && <div className="si-takes" role="radiogroup" aria-label="Pilih rekaman yang dikirim">
            {mine.map((tk, k) => <div key={k} className={`si-take ${pick[qi] === k ? 'on' : ''}`}>
              <label><input type="radio" name={`tk-${qi}`} checked={pick[qi] === k} onChange={() => setPick({ ...pick, [qi]: k })} /><b>Rekaman {k + 1}</b><small>{mmss(tk.dur)}</small></label>
              <button type="button" className="btn btn-ghost" disabled={recording} onClick={() => setPlay(play?.url === tk.url ? null : tk)}><Icon name={play?.url === tk.url ? 'camera' : 'eye'} size={16} />{play?.url === tk.url ? 'Kamera' : 'Putar'}</button></div>)}
            <p className="muted sm" style={{ margin: 0 }}>Rekaman yang dipilih akan dikirim.</p></div>}
          <div className="si-nav">
            <button type="button" className="btn btn-ghost" disabled={qi === 0 || recording || !!count} onClick={() => { setQi(qi - 1); setPlay(null) }}>Sebelumnya</button>
            {qi < m.soal.length - 1 ? <button type="button" className="btn btn-primary" disabled={pick[qi] == null || recording} onClick={() => { setQi(qi + 1); setPlay(null) }}>Berikutnya<Icon name="arrowRight" size={16} /></button>
              : <button type="button" className="btn btn-primary" disabled={pick[qi] == null || recording} onClick={() => { setPlay(null); setStep('ringkas') }}>Periksa & kirim</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
