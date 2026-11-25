// Superadmin › Akses Talent: aturan menu karier (Lowongan & Tawaran, Jadwal Wawancara, Pre-test) di aplikasi Talent.
// Default: disembunyikan saat kontrak aktif; terbuka saat notice period, kontrak berakhir, atau belum punya kontrak.
// Superadmin/Admin (izin Ubah) bisa membuka akses manual per talent untuk kasus tertentu, dengan alasan & batas waktu.
import React, { useState } from 'react'
import { useStore, api } from '../services/store.js'
import { Btn, Card, Badge, Table, Modal, Field, useToast, PageHead, Icon, Avatar, Note, usePerm } from '../components/ui.jsx'
import { useLookup, fmtDate } from './shared.jsx'
import { KARIER, talentPhase, karierState, overrideOf, DEFAULT_ACCESS, menuState, realPhase } from '../talent/services/talentAccess.js'
import { TALENT_MENU } from './menus.js'

// Pratinjau & simulasi (dipindahkan dari desain revisi 16 Nov, 22 Nov 2026)
const PHASES_ALL = [['aktif', 'Kontrak aktif'], ['resign', 'Resign disetujui'], ['selesai', 'Kontrak berakhir'], ['kandidat', 'Belum punya kontrak']]
const ST_LABEL = { buka: ['Dibuka', 'ok'], kunci: ['Tampil terkunci', 'warn'], sembunyi: ['Sembunyikan', 'neutral'] }
const DEMO_ID = 'e5'
function PreviewDemo({ cfg, toast }) {
  const s = useStore(); const [ph, setPh] = useState('aktif')
  const sim = { ...s, talentAccess: cfg, talentOverride: {} }
  const demo = s.employees.find((e) => e.id === DEMO_ID)
  const cur = s.talentDemo?.[DEMO_ID] || ''
  const real = PHASES_ALL.find((p) => p[0] === realPhase(s, DEMO_ID))?.[1] || 'Kontrak aktif'
  return (
    <>
      <Card title="Pratinjau menu talent">
        <p className="muted sm" style={{ marginTop: 0 }}>Lihat menu yang muncul di akun talent untuk tiap fase, memakai aturan di atas (termasuk yang belum disimpan).</p>
        <div className="seg" role="tablist" aria-label="Fase talent" style={{ justifySelf: 'start' }}>{PHASES_ALL.map(([k, l]) => <button key={k} role="tab" aria-selected={ph === k} className={ph === k ? 'on' : ''} onClick={() => setPh(k)}>{l}</button>)}</div>
        <div className="ak-prev">{TALENT_MENU.map((g) => <div key={g.group} className="ak-g"><span className="side-gl">{g.group}</span>{g.items.map(([k, l, ic]) => { const st = menuState(sim, DEMO_ID, k, ph); const [lb, tn] = ST_LABEL[st]; return <div key={k} className={`ak-i ${st}`}><Icon name={st === 'sembunyi' ? 'eyeOff' : st === 'kunci' ? 'lock' : ic} size={17} /><span className="grow">{l}</span><Badge t={tn}>{lb}</Badge></div> })}</div>)}</div>
      </Card>
      <Card title="Simulasi status talent (khusus demo)">
        <p className="muted sm" style={{ marginTop: 0 }}>Prototipe belum punya data kontrak yang berakhir. Pilih status untuk akun demo talent, lalu buka akun talent untuk mencobanya.</p>
        <div className="ak-demo row-act">
          <label className="fsel"><span>{demo?.name || 'Talent demo'}</span><select value={cur} onChange={(e) => { api.setTalentDemo(DEMO_ID, e.target.value || null); toast(e.target.value ? `Simulasi: ${PHASES_ALL.find((p) => p[0] === e.target.value)[1]}` : 'Simulasi dimatikan, kembali ke data asli') }}>
            <option value="">Ikuti data asli ({real})</option>{PHASES_ALL.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <Btn kind="ghost" icon="arrowRight" onClick={() => { window.location.hash = '#/app/talent/beranda' }}>Buka akun talent</Btn>
        </div>
        <p className="muted sm" style={{ margin: 0 }}>Di aplikasi asli status ini dihitung otomatis: resign disetujui dari menu Resign, kontrak berakhir dari tanggal akhir kontrak.</p>
      </Card>
    </>
  )
}

const PH = { aktif: ['Kontrak aktif', 'neutral'], resign: ['Notice period', 'warn'], selesai: ['Kontrak berakhir', 'bad'], kandidat: ['Belum ada kontrak', 'neutral'] }
const ST = { sembunyi: ['Disembunyikan', 'neutral', 'eye'], kunci: ['Tampil terkunci', 'warn', 'lock'], buka: ['Terbuka', 'ok', 'check'] }
const OPS_AKTIF = [['sembunyi', 'Sembunyikan (default)'], ['kunci', 'Tampilkan terkunci'], ['buka', 'Buka']]
const today = () => new Date().toISOString().slice(0, 10)

export function AksesTalent({ me }) {
  const s = useStore(); const { branch } = useLookup(); const [t, toast] = useToast()
  const pm = usePerm(); const canU = !pm || pm.can('u')
  const oleh = me ? me.name : 'Rani Hapsari'
  const cfg0 = s.talentAccess || DEFAULT_ACCESS
  const [cfg, setCfg] = useState(null); const cur = cfg || cfg0
  const [q, setQ] = useState(''); const [fb, setFb] = useState(''); const [cat, setCat] = useState(''); const [edit, setEdit] = useState(null)
  const brs = me ? s.branches.filter((b) => me.branches.includes(b.id)) : s.branches
  const people = [
    ...s.employees.filter((e) => brs.some((b) => b.id === e.branch)).map((e) => ({ id: e.id, name: e.name, sub: `${e.role || ''} · ${branch(e.branch).replace('Branch ', '')}`, branch: e.branch, end: e.end, phase: talentPhase(s, e.id) })),
    ...(me ? [] : s.pool.filter((p) => !s.employees.some((e) => e.name === p.name)).map((p) => ({ id: p.id, name: p.name, sub: `Talent pool · ${p.status}`, branch: '', end: '', phase: 'kandidat' }))),
  ].map((x) => ({ ...x, ov: s.talentOverride?.[x.id], st: Object.fromEntries(KARIER.map(([k]) => [k, karierState(s, x.id, k, x.phase)])) }))
  const ovActive = (x) => x.ov && (!x.ov.sampai || x.ov.sampai >= today())
  const CATS = [
    ['', 'Semua talent', 'users', '#0a5950', () => true, 'semua fase'],
    ['aktif', 'Kontrak aktif', 'lock', '#5b6b66', (x) => x.phase === 'aktif' && !ovActive(x), 'menu karier mengikuti aturan'],
    ['resign', 'Notice period', 'door', '#d9a400', (x) => x.phase === 'resign', 'resign disetujui · menu terbuka'],
    ['bebas', 'Tanpa kontrak / berakhir', 'briefcase', '#2a78d6', (x) => x.phase === 'selesai' || x.phase === 'kandidat', 'menu karier terbuka'],
    ['manual', 'Akses manual', 'key', '#7a5af5', (x) => ovActive(x), 'dibuka khusus oleh HR'],
  ]
  const fn = (CATS.find((c) => c[0] === cat) || CATS[0])[4]
  const rows = people.filter((x) => fn(x) && (!fb || x.branch === fb) && (x.name + ' ' + x.sub).toLowerCase().includes(q.toLowerCase()))
  const toList = () => setTimeout(() => document.getElementById('at-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  const label = (k) => KARIER.find((x) => x[0] === k)?.[1]
  const dirty = JSON.stringify(cur) !== JSON.stringify(cfg0)
  const saveCfg = () => { api.saveTalentAccess(cur, oleh, KARIER.map(([k, l]) => `${l}: aktif ${OPS_AKTIF.find((o) => o[0] === cur[k].aktif)[1].replace(' (default)', '').toLowerCase()}, notice ${cur[k].resign ? 'buka' : 'ikut aturan aktif'}`).join(' · ')); setCfg(null); toast('Aturan akses talent disimpan') }
  return (
    <>
      <PageHead title="Akses Talent" sub="Atur kapan menu karier (Lowongan & Tawaran, Jadwal Wawancara, Pre-test) tampil di aplikasi Talent, termasuk akses manual per talent." />
      <Note><div><b>Default:</b> talent dengan <b>kontrak aktif</b> tidak melihat ketiga menu karier. Menu otomatis <b>terbuka</b> saat resign disetujui (notice period), kontrak berakhir, atau talent belum punya kontrak. Untuk kasus khusus, buka akses manual per talent di tabel bawah.</div></Note>

      <Card title="Aturan umum" action={canU && <div className="row-act">{dirty && <Btn kind="ghost" perm="r" onClick={() => setCfg(null)}>Batal</Btn>}<Btn perm="u" disabled={!dirty} onClick={saveCfg}>Simpan aturan</Btn></div>} pad={false}>
        <div className="tbl-wrap"><table className="tbl at-rule">
          <thead><tr><th>Menu karier</th><th>Kontrak aktif</th><th>Notice period (resign disetujui)</th><th>Kontrak berakhir / belum ada kontrak</th></tr></thead>
          <tbody>{KARIER.map(([k, l]) => <tr key={k}><td><b>{l}</b></td>
            <td><select aria-label={`${l} saat kontrak aktif`} value={cur[k]?.aktif || 'sembunyi'} disabled={!canU} onChange={(e) => setCfg({ ...cur, [k]: { ...cur[k], aktif: e.target.value } })}>{OPS_AKTIF.map(([v, x]) => <option key={v} value={v}>{x}</option>)}</select></td>
            <td><label className="at-sw"><input type="checkbox" className="chk" checked={!!cur[k]?.resign} disabled={!canU} onChange={(e) => setCfg({ ...cur, [k]: { ...cur[k], resign: e.target.checked } })} />{cur[k]?.resign ? 'Terbuka' : 'Ikuti aturan kontrak aktif'}</label></td>
            <td><Badge t="ok">Selalu terbuka</Badge></td></tr>)}</tbody>
        </table></div>
        <p className="muted sm at-note">"Tampilkan terkunci" = menu terlihat di sidebar tapi isinya pesan "Kamu sedang bekerja". "Sembunyikan" = menu tidak muncul dan tidak bisa dibuka lewat tautan.</p>
      </Card>

      <div className="rk-tiles" role="group" aria-label="Rekap talent per fase">{CATS.map(([k, l, ic, c, f, sub]) => { const n = people.filter(f).length; const on = cat === k; return (
        <button key={l} className={`rk-tile ${on ? 'on' : ''}`} style={{ borderTopColor: c }} aria-pressed={on} onClick={() => { setCat(k); toList() }}>
          <span className="rk-h"><Icon name={ic === 'key' ? 'lock' : ic} size={18} />{l}</span><b>{n.toLocaleString('id-ID')}</b><small>{sub}</small>
          <small className="rk-br">{s.branches.filter((b) => brs.includes(b)).map((b) => `${b.name.replace('Branch ', '').split(' ')[0]} ${people.filter((x) => f(x) && x.branch === b.id).length}`).join(' · ')}</small></button>) })}</div>

      <div id="at-list" className="anchor" />
      <div className="filters">
        <label className="search"><Icon name="search" size={18} /><input placeholder="Cari nama talent" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <label className="fsel"><span>Branch</span><select value={fb} onChange={(e) => setFb(e.target.value)}><option value="">Semua Branch</option>{brs.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <span className="muted sm">{rows.length.toLocaleString('id-ID')} talent{cat ? ` · ${CATS.find((c) => c[0] === cat)[1]}` : ''}</span>
      </div>
      <Card pad={false}><Table rows={rows} empty="Tidak ada talent untuk filter ini." cols={[
        { h: 'Talent', r: (x) => <div className="who"><Avatar name={x.name} size={30} /><div><strong>{x.name}</strong><div className="muted sm">{x.sub}</div></div></div> },
        { h: 'Fase', r: (x) => <><Badge t={PH[x.phase][1]}>{PH[x.phase][0]}</Badge>{x.end && x.phase !== 'kandidat' ? <div className="muted sm">s.d. {fmtDate(x.end)}</div> : null}</> },
        { h: 'Menu karier di app Talent', r: (x) => <div className="at-menus">{KARIER.map(([k, l]) => { const v = x.st[k]; const man = x.phase === 'aktif' && overrideOf(s, x.id, k); return <span key={k} className={`at-m ${v}`} title={`${l}: ${ST[v][0]}${man ? ' (manual)' : ''}`}><Icon name={ST[v][2]} size={14} />{l.split(' ')[0]}{man && <small className="at-man">manual</small>}</span> })}</div> },
        { h: 'Akses manual', r: (x) => (ovActive(x) ? <span className="sm">s.d. {x.ov.sampai ? fmtDate(x.ov.sampai) : 'tanpa batas'}<span className="muted" style={{ display: 'block' }}>{x.ov.oleh}</span></span> : x.ov ? <span className="muted sm">kedaluwarsa</span> : <span className="muted sm">—</span>) },
        { h: 'Aksi', r: (x) => (x.phase === 'aktif' ? <Btn kind="ghost" perm="u" onClick={() => setEdit(x)}>Atur akses</Btn> : <span className="muted sm">Otomatis terbuka</span>) },
      ]} /></Card>

      {!me && <PreviewDemo cfg={cur} toast={toast} />}
      <Card title="Riwayat perubahan" pad={false}><Table rows={(s.talentAccessLog || []).map((l, i) => ({ ...l, id: i }))} empty="Belum ada perubahan." cols={[
        { h: 'Waktu', r: (l) => <span className="nowrap sm">{l.at}</span> }, { h: 'Oleh', k: 'oleh' }, { h: 'Aksi', r: (l) => <b>{l.aksi}</b> },
        { h: 'Talent', r: (l) => (l.target ? (s.employees.find((e) => e.id === l.target) || s.pool.find((p) => p.id === l.target))?.name || l.target : 'Semua') }, { h: 'Detail', r: (l) => <span className="sm">{l.detail}</span> }]} /></Card>
      <OverrideModal x={edit} onClose={() => setEdit(null)} onSave={(data, detail) => { api.setTalentOverride(edit.id, data, oleh, detail); setEdit(null); toast(data ? 'Akses manual disimpan & talent diberi notifikasi' : 'Akses manual dicabut, kembali ke aturan umum') }} cfg={cfg0} />
      {t}
    </>
  )
}

function OverrideModal({ x, onClose, onSave, cfg }) {
  const [f, setF] = useState(null)
  const init = () => ({ menu: Object.fromEntries(KARIER.map(([k]) => [k, x?.ov?.menu?.[k] || ''])), alasan: x?.ov?.alasan || '', sampai: x?.ov?.sampai || '' })
  const cur = f || (x ? init() : null)
  if (!x || !cur) return null
  const anyOpen = Object.values(cur.menu).some((v) => v === 'buka')
  const err = anyOpen && !cur.alasan.trim() ? 'Alasan wajib diisi saat membuka akses' : cur.sampai && cur.sampai < today() ? 'Tanggal berakhir tidak boleh sebelum hari ini' : ''
  const changed = Object.values(cur.menu).some(Boolean)
  const close = () => { setF(null); onClose() }
  const detail = KARIER.filter(([k]) => cur.menu[k]).map(([k, l]) => `${l}: ${ST[cur.menu[k]][0].toLowerCase()}`).join(', ') + (cur.sampai ? ` · s.d. ${fmtDate(cur.sampai)}` : '')
  return (
    <Modal open title={`Akses menu karier · ${x.name}`} onClose={close} footer={<>
      {x.ov && <Btn kind="ghost" perm="u" onClick={() => { setF(null); onSave(null, 'kembali ke aturan umum') }}>Cabut akses manual</Btn>}
      <Btn kind="ghost" perm="r" onClick={close}>Batal</Btn><Btn perm="u" disabled={!!err || !changed} onClick={() => { const d = { menu: Object.fromEntries(Object.entries(cur.menu).filter(([, v]) => v)), alasan: cur.alasan.trim(), sampai: cur.sampai }; setF(null); onSave(d, detail) }}>Simpan</Btn></>}>
      <div className="form">
        <p className="muted sm">{x.name} sedang <b>kontrak aktif</b>{x.end ? ` (s.d. ${fmtDate(x.end)})` : ''}. Pilihan di sini mengalahkan aturan umum hanya untuk talent ini.</p>
        {KARIER.map(([k, l]) => <Field key={k} label={l} hint={`Aturan umum: ${ST[(cfg[k] || {}).aktif || 'sembunyi'][0].toLowerCase()}`}>
          <div className="mod-row" role="radiogroup" aria-label={l}>{[['', 'Ikuti aturan umum'], ['buka', 'Buka'], ['kunci', 'Tampil terkunci'], ['sembunyi', 'Sembunyikan']].map(([v, t]) => <label key={v} className={`mod ${cur.menu[k] === v ? 'on' : ''}`}><input type="radio" name={'ov' + k} checked={cur.menu[k] === v} onChange={() => setF({ ...cur, menu: { ...cur.menu, [k]: v } })} />{t}</label>)}</div></Field>)}
        <div className="grid2">
          <Field label="Alasan" hint={anyOpen ? 'Wajib saat membuka akses. Ikut dikirim ke inbox talent.' : 'Opsional'}><input value={cur.alasan} maxLength={160} onChange={(e) => setF({ ...cur, alasan: e.target.value })} placeholder="Misal: seleksi promosi internal" /></Field>
          <Field label="Berlaku sampai" hint="Kosongkan bila tanpa batas. Setelah lewat, kembali ke aturan umum."><input type="date" value={cur.sampai} min={today()} onChange={(e) => setF({ ...cur, sampai: e.target.value })} /></Field>
        </div>
        {err && <p role="alert" style={{ color: "var(--bad, #b4412f)", fontWeight: 700, margin: 0 }}>{err}</p>}
      </div>
    </Modal>
  )
}
