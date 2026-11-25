import React from 'react'
import { HashRouter, useLocation } from './lib/router.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Shell from './pages/Shell.jsx'
import { TalentLogin, TalentShell, PublicJobs, PublicJob, Register, PublicPretest } from './talent/TalentApp.jsx'
import { FileViewer } from './pages/penilaian.jsx'

function Routes() {
  const { pathname } = useLocation()
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'login') return <Login />
  // Role Talent (aplikasi Talent terbaru, gaya sendiri di dalam .ta)
  if (parts[0] === 'talent') return <div className="ta"><TalentLogin /></div>
  if (parts[0] === 'app' && parts[1] === 'talent') return <div className="ta"><TalentShell page={parts[2]} sub={parts[3]} /></div>
  if (parts[0] === 'lowongan') return <div className="ta">{parts[1] ? <PublicJob id={parts[1]} /> : <PublicJobs />}</div>
  if (parts[0] === 'daftar') return <div className="ta"><Register jobId={parts[1]} /></div>
  if (parts[0] === 'pretest') return <div className="ta"><PublicPretest jobId={parts[1]} /></div>
  if (parts[0] === 'berkas') return <FileViewer pid={parts[1]} mid={parts[2]} qi={parts[3]} fi={parts[4]} />
  if (parts[0] === 'app' && parts[1]) return <Shell role={parts[1]} page={parts[2]} sub={parts[3]} />
  return <Landing />
}

export default function App() {
  return <HashRouter><Routes /></HashRouter>
}
