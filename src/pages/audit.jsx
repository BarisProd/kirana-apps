// Root · Audit & Keamanan: Audit Log, Review Akses (recertification), Privileged Access Management (PAM), Laporan Kepatuhan.
// Superadmin (manajer di tenant demo c1): halaman Review Akses + pengingat.
import React, { useEffect, useMemo, useState } from 'react'
import { useStore, api } from '../services/store.js'
import { tenantOf, accountsOf } from '../services/tenant.js'
import { Btn, Card, Badge, Table, Modal, Field, Toggle, useToast, PageHead, Note, Icon, Empty, Stat } from '../components/ui.jsx'
import { HBars, SegBar } from '../components/charts.jsx'
import { LOG_KAT } from '../data/rootSeed.js'
import { JIT_ROLES, APPS, ROOT_NET, PLATFORM } from '../data/rootAudit.js'
import { tgl, jam, sheet, dlx, Crumb, Meter, sisaHari, todayISO } from './root.jsx'

const p2 = (n) => String(n).padStart(2, '0')
const daysAgo = (iso) => Math.floor((new Date(todayISO()) - new Date(iso.slice(0, 10))) / 86400000)
const since = (d) => { const x = new Date(todayISO()); x.setDate(x.getDate() - d); return x.toISOString().slice(0, 10) }
const nowISO = () => { const d = new Date(); return `${todayISO()}T${p2(d.getHours())}:${p2(d.getMinutes())}` }
const minsLeft = (iso) => Math.max(0, Math.round((new Date(iso) - Date.now()) / 60000))
const durMin = (a, b) => Math.max(1, Math.round((new Date(b || Date.now()) - new Date(a)) / 60000))
const fmtDur = (m) => (m >= 60 ? `${Math.floor(m / 60)} jam${m % 60 ? ` ${m % 60} mnt` : ""}` : `${m} menit`)
const custName = (s, id) => (id === PLATFORM ? 'Platform Kirana (internal)' : s.root.customers.find((c) => c.id === id)?.nama || '—')
const short = (c) => c.brand || c.nama.replace(/^(PT|CV)\s+/, '')
const selfAppr = (l) => l.penyetuju && l.diajukan && l.penyetuju === l.diajukan
const isAccessChange = (l) => !!(l.sebelum || l.penyetuju) && (l.kategori === 'Akun & Izin' || l.kategori === 'Akses Istimewa')
// Sidik log (tamper-evident): hash FNV dari isi log, ditampilkan sebagai bukti integritas.
const sidik = (l) => { let h = 2166136261; for (const ch of JSON.stringify([l.at, l.aktor, l.aksi, l.detail, l.ip])) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0).toString(16).padStart(8, '0') + ((h * 31) >>> 0).toString(16).padStart(8, '0') }
const RISK_T = { Rendah: 'neutral', Sedang: 'warn', Tinggi: 'bad' }
const lastLoginOf = (s, cid, email) => s.root.logs.find((l) => l.customer === cid && l.email === email && l.kategori === 'Autentikasi' && l.hasil === 'Berhasil')?.at

// ===================================================== AUDIT LOG
const AUDIT_TABS = [['semua', 'Semua aktivitas'], ['login', 'Login & sesi'], ['akses', 'Perubahan hak akses'], ['istimewa', 'Akses istimewa']]
export function AuditLog({ sub, go }) {
  const s = useStore(); const [t, toast] = useToast()
  const [cid, setCid] = useState(sub && sub !== 'all' ? sub : ''); const [tab, setTab] = useState('semua')
  const [peran, setPeran] = useState(''); const [hasil, setHasil] = useState(''); const [risiko, setRisiko] = useState(''); const [app, setApp] = useState('')
  const [d1, setD1] = useState(since(30)); const [d2, setD2] = useState(''); const [q, setQ] = useState(''); const [sel, setSel] = useState(null); const [more, setMore] = useState({})
  const inTab = (l) => tab === 'semua' || (tab === 'login' && l.kategori === 'Autentikasi') || (tab === 'akses' && isAccessChange(l) && l.kategori === 'Akun & Izin') || (tab === 'istimewa' && l.kategori === 'Akses Istimewa')
  const scope = s.root.logs.filter((l) => (!cid || l.customer === cid) && (!d1 || l.at.slice(0, 10) >= d1) && (!d2 || l.at.slice(0, 10) <= d2))
  const rows = scope.filter((l) => inTab(l) && (!peran || l.peran === peran) && (!hasil || l.hasil === hasil) && (!risiko || l.risiko === risiko) && (!app || l.aplikasi === app)
    && (!q || [l.aksi, l.detail, l.aktor, l.email, l.ip, l.lokasi, l.penyetuju].join(' ').toLowerCase().includes(q.toLowerCase())))
  const auth = scope.filter((l) => l.kategori === 'Autentikasi'); const chg = scope.filter((l) => isAccessChange(l) && l.kategori === 'Akun & Izin')
  const ids = [...s.root.customers.map((c) => c.id), PLATFORM]
  const groups = cid ? [[cid, rows]] : ids.map((id) => [id, rows.filter((l) => l.customer === id)]).filter(([, r]) => r.length)
  const perans = [...new Set(s.root.logs.map((l) => l.peran))]; const apps = [...new Set(s.root.logs.map((l) => l.aplikasi).filter(Boolean))]
  const xls = () => dlx(toast, [sheet('Audit log', ['Waktu', 'Customer', 'Pengguna', 'E-mail', 'Peran', 'Kategori', 'Aktivitas', 'Detail', 'Aplikasi', 'Modul', 'IP', 'Lokasi', 'Perangkat', 'Hasil', 'Risiko', 'Diajukan oleh', 'Disetujui oleh', 'Sebelum', 'Sesudah', 'Durasi sesi (menit)', 'Modul diakses', 'Sidik log'],
    rows.map((l) => [jam(l.at), custName(s, l.customer), l.aktor, l.email || '', l.peran, l.kategori, l.aksi, l.detail, l.aplikasi || '', l.modul || '', l.ip || '', l.lokasi || '', l.perangkat || '', l.hasil || '', l.risiko || '', l.diajukan || '', l.penyetuju || '', l.sebelum || '', l.sesudah || '', l.sesi?.durasi || '', (l.sesi?.akses || []).join(', '), sidik(l)]))], `Audit-log${cid ? '-' + (s.root.customers.find((c) => c.id === cid)?.kode || cid) : ''}`)
  const cols = [
    { h: 'Waktu', r: (l) => <span className="nowrap">{jam(l.at)}</span> },
    { h: 'Pengguna', r: (l) => <div><strong>{l.aktor}</strong><div className="muted sm">{l.peran}{l.email ? ' · ' + l.email : ''}</div></div> },
    { h: 'Aktivitas', r: (l) => <div className="au-a"><strong>{l.aksi}</strong><div className="muted sm">{l.detail}</div>{l.sebelum && <div className="au-diff"><s>{l.sebelum}</s> → <b>{l.sesudah}</b></div>}</div> },
    { h: 'Aplikasi', r: (l) => <div><span className="nowrap">{l.aplikasi}</span><div className="muted sm">{l.modul}</div></div> },
    { h: 'IP & lokasi', r: (l) => <div><span className="mono nowrap">{l.ip}</span><div className="muted sm nowrap">{l.lokasi} · {l.perangkat}</div></div> },
    { h: 'Hasil', r: (l) => <div className="au-st"><Badge t={l.hasil === 'Gagal' ? 'bad' : 'ok'}>{l.hasil}</Badge>{l.risiko !== 'Rendah' && <Badge t={RISK_T[l.risiko]}>Risiko {l.risiko.toLowerCase()}</Badge>}</div> },
    { h: 'Disetujui oleh', r: (l) => l.penyetuju ? <div><span>{l.penyetuju}</span>{selfAppr(l) && <div className="txt-warn sm">Disetujui sendiri</div>}</div> : <span className="muted">—</span> },
  ]
  return (
    <>
      <PageHead title="Audit Log" sub="Riwayat lengkap per customer: siapa login kapan, dari mana, memakai aplikasi apa, dan siapa yang menyetujui perubahan hak akses. Log hanya bisa ditambah, tidak bisa diubah atau dihapus."><Btn kind="ghost" icon="download" onClick={xls}>Download Excel</Btn></PageHead>
      <div className="filters">
        <label className="fsel"><span>Customer</span><select value={cid} onChange={(e) => setCid(e.target.value)}><option value="">Semua customer</option>{s.root.customers.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}<option value={PLATFORM}>Platform Kirana (internal)</option></select></label>
        <label className="fsel"><span>Dari</span><input type="date" value={d1} onChange={(e) => setD1(e.target.value)} /></label>
        <label className="fsel"><span>Sampai</span><input type="date" value={d2} onChange={(e) => setD2(e.target.value)} /></label>
      </div>
      <div className="stats">
        <Stat icon="user" label="Login berhasil" value={auth.filter((l) => l.hasil === 'Berhasil').length} hint={`${new Set(auth.map((l) => l.email || l.aktor)).size} pengguna · ${new Set(auth.map((l) => l.aplikasi)).size} aplikasi`} />
        <Stat icon="x" label="Login gagal" value={auth.filter((l) => l.hasil === 'Gagal').length} hint="password salah / akun terkunci" />
        <Stat icon="pin" label="Login berisiko tinggi" value={scope.filter((l) => l.risiko === 'Tinggi' && l.kategori === 'Autentikasi').length} hint="lokasi/perangkat baru, akun dikunci" />
        <Stat icon="lock" label="Perubahan hak akses" value={chg.length} hint={`${chg.filter(selfAppr).length} disetujui sendiri (tanpa pihak kedua)`} />
      </div>
      <div className="tabs" role="tablist">{AUDIT_TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      <div className="filters">
        <label className="fsel"><span>Peran</span><select value={peran} onChange={(e) => setPeran(e.target.value)}><option value="">Semua</option>{perans.map((k) => <option key={k}>{k}</option>)}</select></label>
        <label className="fsel"><span>Aplikasi</span><select value={app} onChange={(e) => setApp(e.target.value)}><option value="">Semua</option>{apps.map((k) => <option key={k}>{k}</option>)}</select></label>
        <label className="fsel"><span>Hasil</span><select value={hasil} onChange={(e) => setHasil(e.target.value)}><option value="">Semua</option><option>Berhasil</option><option>Gagal</option></select></label>
        <label className="fsel"><span>Risiko</span><select value={risiko} onChange={(e) => setRisiko(e.target.value)}><option value="">Semua</option><option>Rendah</option><option>Sedang</option><option>Tinggi</option></select></label>
        <label className="fsel grow"><span>Cari</span><span className="search"><Icon name="search" size={18} /><input placeholder="Nama, e-mail, IP, lokasi, aksi" value={q} onChange={(e) => setQ(e.target.value)} /></span></label>
      </div>
      {!cid && !q && !peran && !hasil && !risiko && !app ? (
        <Card title="Pilih customer" action={<span className="muted sm">klik baris untuk membuka log lengkap</span>} pad={false}><Table rows={ids.map((id) => { const r = rows.filter((l) => l.customer === id); return { id, r, n: r.length, ok: r.filter((l) => l.kategori === 'Autentikasi' && l.hasil === 'Berhasil').length, gagal: r.filter((l) => l.kategori === 'Autentikasi' && l.hasil === 'Gagal').length, tinggi: r.filter((l) => l.risiko === 'Tinggi').length, chg: r.filter((l) => isAccessChange(l) && l.kategori === 'Akun & Izin'), last: r[0] } }).filter((x) => x.n)} onRow={(x) => setCid(x.id)} cols={[
          { h: 'Customer', r: (x) => <strong>{custName(s, x.id)}</strong> }, { h: 'Aktivitas', right: true, k: 'n' }, { h: 'Login berhasil', right: true, k: 'ok' },
          { h: 'Login gagal', right: true, r: (x) => x.gagal ? <b className="txt-bad">{x.gagal}</b> : 0 }, { h: 'Risiko tinggi', right: true, r: (x) => x.tinggi ? <Badge t="bad">{x.tinggi}</Badge> : 0 },
          { h: 'Perubahan akses', right: true, r: (x) => <span>{x.chg.length}{x.chg.filter(selfAppr).length ? <span className="txt-warn sm"> · {x.chg.filter(selfAppr).length} disetujui sendiri</span> : ''}</span> },
          { h: 'Aktivitas terakhir', r: (x) => <div><span className="nowrap">{jam(x.last.at)}</span><div className="muted sm">{x.last.aktor} · {x.last.aksi}</div></div> },
          { h: '', r: () => <span className="muted" aria-hidden="true"><Icon name="arrowRight" size={18} /></span> },
        ]} /></Card>
      ) : groups.length === 0 ? <Card><Empty text="Tidak ada aktivitas yang cocok." /></Card> : groups.map(([id, r]) => { const n = more[id] || (cid ? 50 : 10); return (
        <Card key={id} title={<span className="log-h">{custName(s, id)} <span className="muted sm">{r.length} aktivitas</span></span>} pad={false}>
          <Table rows={r.slice(0, n)} empty="Tidak ada aktivitas." onRow={setSel} cols={cols} />
          {r.length > n && <div className="more-row"><Btn kind="ghost" onClick={() => setMore({ ...more, [id]: n + 50 })}>Tampilkan {Math.min(50, r.length - n)} lagi</Btn></div>}
        </Card>) })}
      <Modal open={!!sel} title="Detail log audit" onClose={() => setSel(null)} footer={<Btn onClick={() => setSel(null)}>Tutup</Btn>}>
        {sel && <dl className="au-dl">
          {[['Waktu', jam(sel.at)], ['Customer', custName(s, sel.customer)], ['Pengguna', `${sel.aktor} · ${sel.peran}`], ['E-mail', sel.email || '—'], ['Kategori', sel.kategori], ['Aktivitas', sel.aksi], ['Detail', sel.detail || '—'],
            ['Aplikasi', sel.aplikasi], ['Modul', sel.modul], ['Alamat IP', sel.ip], ['Lokasi', sel.lokasi], ['Perangkat', sel.perangkat], ['Hasil', sel.hasil], ['Risiko', sel.risiko],
            ...(sel.sesi ? [['Durasi sesi', `${sel.sesi.durasi} menit`], ['Modul yang diakses', sel.sesi.akses.join(', ')]] : []),
            ...(sel.akun ? [['Akun yang diubah', sel.akun]] : []), ...(sel.sebelum ? [['Sebelum', sel.sebelum], ['Sesudah', sel.sesudah]] : []),
            ...(sel.diajukan ? [['Diajukan oleh', sel.diajukan]] : []), ...(sel.penyetuju ? [['Disetujui oleh', sel.penyetuju + (selfAppr(sel) ? ' · disetujui sendiri' : '')]] : []),
            ['Sidik log', <span className="mono">{sidik(sel)}</span>]].map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}
        </dl>}
        <Note>Log disimpan minimal 1 tahun dan bersifat append-only. Sidik log berubah bila isi log diubah, sehingga perubahan bisa dideteksi saat audit.</Note>
      </Modal>
      {t}
    </>
  )
}

// ===================================================== REVIEW AKSES
export const rvStatus = (r) => r.selesaiAt ? (r.selesaiAt.slice(0, 10) <= r.tenggat ? 'Selesai' : 'Selesai terlambat') : todayISO() > r.tenggat ? 'Terlambat' : 'Berjalan'
const RV_T = { Selesai: 'ok', 'Selesai terlambat': 'warn', Terlambat: 'bad', Berjalan: 'warn' }
const DEC_T = { Pertahankan: 'ok', Cabut: 'bad', Ubah: 'warn' }
const done = (r) => r.items.filter((i) => i.keputusan).length
const latestReview = (s, cid) => { const rs = s.root.reviews.filter((r) => r.customer === cid); return rs.find((r) => !r.selesaiAt) || rs.sort((a, b) => b.mulai.localeCompare(a.mulai))[0] }
const Progress = ({ r }) => { const n = done(r), tot = r.items.length || 1; const st = rvStatus(r); return <div className="st-m"><div className="nowrap"><b>{n}/{r.items.length}</b> <span className="muted sm">akun ditinjau</span></div><span className="meter-b"><i style={{ width: Math.max(2, (n / tot) * 100) + '%' }} className={st === 'Terlambat' ? 'hot' : ''} /></span></div> }
const sched = (r, pol) => { // jadwal pengingat otomatis
  const at = (d) => { const x = new Date(r.tenggat); x.setDate(x.getDate() - d); return x.toISOString().slice(0, 10) }
  return [...(pol?.pengingat || [7, 3, 1]).map((d) => [at(d), `Pengingat otomatis H-${d}`]), ...(pol?.eskalasi ? [[at(-1), 'Eskalasi ke Superadmin/PIC & Root bila belum selesai']] : [])].filter(([d]) => d > todayISO())
}
const FREK = ['Bulanan', 'Triwulanan', 'Semesteran', 'Tahunan']

export function AccessReview({ sub, go }) {
  if (sub) return <ReviewDetail id={sub} go={go} />
  return <ReviewList go={go} />
}
function ReviewList({ go }) {
  const s = useStore(); const [t, toast] = useToast(); const [start, setStart] = useState(null); const [pol, setPol] = useState(null)
  const rows = s.root.customers.map((c) => ({ c, r: latestReview(s, c.id), p: s.root.reviewPolicy[c.id] }))
  const all = s.root.reviews; const open = all.filter((r) => !r.selesaiAt)
  const dicabut = all.filter((r) => r.mulai >= since(90)).flatMap((r) => r.items).filter((i) => i.keputusan === 'Cabut').length
  const xls = () => dlx(toast, [sheet('Review akses', ['Customer', 'Review', 'Cakupan', 'Mulai', 'Tenggat', 'Selesai', 'Status', 'Akun', 'Ditinjau', 'Dicabut', 'Pengingat terkirim'], all.map((r) => [custName(s, r.customer), r.nama, r.cakupan, r.mulai, r.tenggat, r.selesaiAt ? jam(r.selesaiAt) : '', rvStatus(r), r.items.length, done(r), r.items.filter((i) => i.keputusan === 'Cabut').length, r.reminders.length]))], 'Review-akses')
  return (
    <>
      <PageHead title="Review Akses" sub="Recertification berkala: manajer (Superadmin/PIC customer) memvalidasi apakah setiap bawahan masih butuh hak aksesnya. Root memantau, mengatur jadwal, dan mengirim pengingat."><div className="row-act"><Btn kind="ghost" icon="download" onClick={xls}>Download Excel</Btn><Btn icon="plus" onClick={() => setStart({ customer: rows.find((x) => !x.r || x.r.selesaiAt)?.c.id || 'c1', cakupan: 'Admin & Branch', tenggat: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10), nama: '' })}>Mulai review</Btn></div></PageHead>
      <div className="stats">
        <Stat icon="approval" label="Review berjalan" value={open.filter((r) => rvStatus(r) === 'Berjalan').length} hint="masih dalam tenggat" />
        <Stat icon="clock" label="Lewat tenggat" value={open.filter((r) => rvStatus(r) === 'Terlambat').length} hint="sudah dieskalasi ke Root" />
        <Stat icon="users" label="Akun belum ditinjau" value={open.reduce((a, r) => a + r.items.length - done(r), 0)} hint={`dari ${open.reduce((a, r) => a + r.items.length, 0)} akun di review aktif`} />
        <Stat icon="lock" label="Akses dicabut" value={dicabut} hint="hasil review 90 hari terakhir" />
      </div>
      <Card title="Alur review akses">
        <ol className="rv-flow">
          {[['Undangan', 'Saat review dimulai, manajer menerima e-mail & notifikasi berisi daftar akun bawahannya.'], ['Pengingat berkala', 'Otomatis H-7, H-3, dan H-1 sebelum tenggat. Root bisa mengirim pengingat manual.'], ['Keputusan manajer', 'Per akun: Pertahankan, Ubah izin, atau Cabut. Akun yang dicabut langsung nonaktif.'], ['Eskalasi', 'Lewat tenggat: Superadmin/PIC & Root diberi tahu. Hasil review jadi bukti audit.']].map(([h, d], i) => <li key={h}><b>{i + 1}</b><div><strong>{h}</strong><p className="muted sm">{d}</p></div></li>)}
        </ol>
      </Card>
      <Card pad={false}><Table rows={rows} onRow={(x) => x.r && go('access-review/' + x.r.id)} cols={[
        { h: 'Customer', r: (x) => <div><strong>{x.c.nama}</strong><div className="muted sm">{x.c.kode} · reviewer {x.c.superadmin.nama}</div></div> },
        { h: 'Jadwal', r: (x) => x.p?.aktif ? <div><span>{x.p.frek}</span><div className="muted sm nowrap">berikutnya {tgl(x.p.berikut)}</div></div> : <span className="muted">Belum aktif{x.c.status === 'Trial' ? ' (Trial)' : ''}</span> },
        { h: 'Review terakhir', r: (x) => x.r ? <div><strong>{x.r.nama}</strong><div className="muted sm nowrap">tenggat {tgl(x.r.tenggat)}</div></div> : <span className="muted">Belum pernah</span> },
        { h: 'Progres', r: (x) => x.r ? <Progress r={x.r} /> : '—' },
        { h: 'Status', r: (x) => x.r ? <Badge t={RV_T[rvStatus(x.r)]}>{rvStatus(x.r)}</Badge> : <Badge t="neutral">—</Badge> },
        { h: '', r: (x) => <div className="row-act" onClick={(e) => e.stopPropagation()}>
          {x.r && !x.r.selesaiAt && <Btn kind="ghost" icon="bell" onClick={() => { api.sendReviewReminder(x.r.id); toast(`Pengingat dikirim ke ${x.c.superadmin.nama}`) }}>Ingatkan</Btn>}
          <Btn kind="ghost" icon="settings" onClick={() => setPol({ cid: x.c.id, ...(x.p || { aktif: true, frek: 'Triwulanan', durasi: 14, pengingat: [7, 3, 1], eskalasi: true, autoCabut: false, dormant: 30 }) })}>Jadwal</Btn></div> },
      ]} /></Card>
      <Modal open={!!start} title="Mulai review akses" onClose={() => setStart(null)} footer={<><Btn kind="ghost" onClick={() => setStart(null)}>Batal</Btn><Btn icon="send" disabled={!start?.tenggat || start.tenggat <= todayISO()} onClick={() => { const id = api.startReview(start); setStart(null); toast('Review dimulai · undangan dikirim ke reviewer'); go('access-review/' + id) }}>Mulai & kirim undangan</Btn></>}>
        {start && <div className="form">
          <Field label="Customer"><select value={start.customer} onChange={(e) => setStart({ ...start, customer: e.target.value })}>{s.root.customers.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}</select></Field>
          <Field label="Nama review" hint="Kosongkan untuk nama otomatis"><input value={start.nama} onChange={(e) => setStart({ ...start, nama: e.target.value })} placeholder="Contoh: Review akses pasca-restrukturisasi" /></Field>
          <Field label="Cakupan akun"><select value={start.cakupan} onChange={(e) => setStart({ ...start, cakupan: e.target.value })}>{['Admin & Branch', 'Admin saja', 'Branch saja', 'Semua akun'].map((k) => <option key={k}>{k}</option>)}</select></Field>
          <Field label="Tenggat"><input type="date" value={start.tenggat} min={todayISO()} onChange={(e) => setStart({ ...start, tenggat: e.target.value })} /></Field>
          {(() => { const c = s.root.customers.find((x) => x.id === start.customer); const n = accountsOf(s, c).filter((a) => a.aktif !== false && (start.cakupan === 'Semua akun' || a.role !== 'Superadmin') && (start.cakupan !== 'Admin saja' || a.role === 'Admin') && (start.cakupan !== 'Branch saja' || a.role === 'Branch')).length
            return <Note>{n} akun aktif akan ditinjau oleh {c.superadmin.nama}{start.cakupan === 'Semua akun' && c.pic.nama !== c.superadmin.nama ? ` (akun Superadmin ditinjau ${c.pic.nama})` : ''}. Root tidak ikut memutuskan.</Note> })()}
        </div>}
      </Modal>
      <Modal open={!!pol} title={`Jadwal review · ${pol ? custName(s, pol.cid) : ''}`} onClose={() => setPol(null)} footer={<><Btn kind="ghost" onClick={() => setPol(null)}>Batal</Btn><Btn onClick={() => { const { cid, ...p } = pol; api.saveReviewPolicy(cid, p); setPol(null); toast('Jadwal review disimpan') }}>Simpan</Btn></>}>
        {pol && <div className="form">
          <Toggle on={pol.aktif} onChange={(v) => setPol({ ...pol, aktif: v })} label="Review akses berkala aktif" />
          <Field label="Frekuensi"><select value={pol.frek} onChange={(e) => setPol({ ...pol, frek: e.target.value })}>{FREK.map((k) => <option key={k}>{k}</option>)}</select></Field>
          <Field label="Review berikutnya dimulai"><input type="date" value={pol.berikut || ''} onChange={(e) => setPol({ ...pol, berikut: e.target.value })} /></Field>
          <Field label="Waktu peninjauan (hari)"><input type="number" min="3" max="60" value={pol.durasi} onChange={(e) => setPol({ ...pol, durasi: Number(e.target.value) })} /></Field>
          <fieldset className="chk-row"><legend className="field-l">Pengingat otomatis (hari sebelum tenggat)</legend>{[14, 7, 3, 1].map((d) => <label key={d} className="chk"><input type="checkbox" checked={pol.pengingat.includes(d)} onChange={(e) => setPol({ ...pol, pengingat: e.target.checked ? [...pol.pengingat, d].sort((a, b) => b - a) : pol.pengingat.filter((x) => x !== d) })} />H-{d}</label>)}</fieldset>
          <Field label="Tandai akun tidak aktif setelah (hari tanpa login)"><input type="number" min="7" value={pol.dormant} onChange={(e) => setPol({ ...pol, dormant: Number(e.target.value) })} /></Field>
          <Toggle on={pol.eskalasi} onChange={(v) => setPol({ ...pol, eskalasi: v })} label="Eskalasi ke PIC & Root bila lewat tenggat" />
          <Toggle on={pol.autoCabut} onChange={(v) => setPol({ ...pol, autoCabut: v })} label="Nonaktifkan sementara akun yang tidak ditinjau 7 hari setelah tenggat" />
        </div>}
      </Modal>
      {t}
    </>
  )
}
function ReviewDetail({ id, go }) {
  const s = useStore(); const [t, toast] = useToast()
  const r = s.root.reviews.find((x) => x.id === id)
  if (!r) return <Empty text="Review tidak ditemukan." />
  const c = s.root.customers.find((x) => x.id === r.customer); const pol = s.root.reviewPolicy[r.customer]; const st = rvStatus(r)
  const hist = s.root.reviews.filter((x) => x.customer === r.customer && x.id !== r.id)
  const items = r.items.map((i) => { const ll = lastLoginOf(s, r.customer, i.email); return { ...i, ll, dorm: !ll || daysAgo(ll) >= (pol?.dormant || 30) } })
  const left = sisaHari(r.tenggat)
  const xls = () => dlx(toast, [
    sheet('Hasil review', ['Akun', 'E-mail', 'Peran', 'Akses saat ditinjau', 'Login terakhir', 'Reviewer', 'Keputusan', 'Catatan', 'Waktu keputusan'], items.map((i) => [i.nama, i.email, i.role, i.akses, i.ll ? jam(i.ll) : 'Belum pernah', i.reviewer, i.keputusan || 'Belum ditinjau', i.catatan, i.at ? jam(i.at) : ''])),
    sheet('Pengingat', ['Waktu', 'Jenis', 'Dikirim ke'], r.reminders.map((m) => [jam(m.at), m.jenis, m.ke])),
  ], `Bukti-review-akses-${c.kode}-${r.mulai}`)
  return (
    <>
      <Crumb items={[['Review Akses', () => go('access-review')], [c.nama]]} />
      <PageHead title={r.nama} sub={`${c.nama} · ${r.cakupan} · dibuat ${r.dibuat} · ${tgl(r.mulai)} – ${tgl(r.tenggat)}`}><div className="row-act">
        {!r.selesaiAt && <Btn kind="ghost" icon="bell" onClick={() => { api.sendReviewReminder(r.id); toast('Pengingat dikirim lewat e-mail & notifikasi aplikasi') }}>Kirim pengingat</Btn>}
        <Btn kind="ghost" icon="download" onClick={xls}>Download bukti</Btn></div></PageHead>
      {st === 'Terlambat' && <div className="alert bad" role="status"><Icon name="clock" size={18} />Lewat tenggat {-left} hari. {r.items.length - done(r)} akun belum ditinjau; eskalasi sudah dikirim ke {c.superadmin.nama} dan Root.</div>}
      <div className="stats">
        <Stat icon="approval" label="Status" value={<Badge t={RV_T[st]}>{st}</Badge>} hint={r.selesaiAt ? `selesai ${jam(r.selesaiAt)}` : left >= 0 ? `sisa ${left} hari` : `terlambat ${-left} hari`} />
        <Stat icon="users" label="Ditinjau" value={`${done(r)}/${r.items.length}`} hint="akun" />
        <Stat icon="lock" label="Dicabut / diubah" value={`${r.items.filter((i) => i.keputusan === 'Cabut').length} / ${r.items.filter((i) => i.keputusan === 'Ubah').length}`} hint="akun" />
        <Stat icon="clock" label="Tidak aktif" value={items.filter((i) => i.dorm).length} hint={`tanpa login ≥ ${pol?.dormant || 30} hari`} />
      </div>
      <Card title="Akun yang ditinjau" pad={false}><Table rows={items} cols={[
        { h: 'Akun', r: (i) => <div><strong>{i.nama}</strong><div className="muted sm">{i.role} · {i.email}</div></div> },
        { h: 'Akses', k: 'akses' },
        { h: 'Login terakhir', r: (i) => <div className="nowrap">{i.ll ? jam(i.ll) : 'Belum pernah'}{i.dorm && <div className="txt-warn sm">Tidak aktif {i.ll ? daysAgo(i.ll) + ' hari' : ''}</div>}</div> },
        { h: 'Reviewer (manajer)', k: 'reviewer' },
        { h: 'Keputusan', r: (i) => i.keputusan ? <div><Badge t={DEC_T[i.keputusan]}>{i.keputusan}</Badge>{i.catatan && <div className="muted sm">{i.catatan}</div>}<div className="muted sm nowrap">{jam(i.at)}</div></div> : <Badge t="neutral">Belum ditinjau</Badge> },
      ]} /></Card>
      <div className="dgrid two">
        <Card title="Pengingat & eskalasi">
          <ul className="tl">{r.reminders.map((m, i) => <li key={i} className="done"><b>{m.jenis}</b><span className="muted sm">{jam(m.at)} · ke {m.ke}</span></li>)}
            {!r.selesaiAt && sched(r, pol).map(([d, l]) => <li key={l}><b>{l}</b><span className="muted sm">terjadwal {tgl(d)}</span></li>)}</ul>
        </Card>
        <Card title="Riwayat review customer ini">{hist.length ? <ul className="tl">{hist.map((h) => <li key={h.id} className="done"><button className="linkish" onClick={() => go('access-review/' + h.id)}>{h.nama}</button><span className="muted sm">{tgl(h.mulai)} – {tgl(h.tenggat)} · <Badge t={RV_T[rvStatus(h)]}>{rvStatus(h)}</Badge></span></li>)}</ul> : <Empty text="Belum ada review sebelumnya." />}</Card>
      </div>
      <Note>Keputusan diambil oleh manajer di akun Superadmin customer (menu Pengaturan › Review Akses). Root hanya memantau, agar pemberi akses dan peninjau tetap terpisah.</Note>
      {t}
    </>
  )
}

// ---------- Superadmin: halaman review untuk manajer + pengingat di atas halaman
export const activeReviewC1 = (s) => s.root.reviews.find((r) => r.customer === 'c1' && !r.selesaiAt)
export function ReviewReminder({ go }) {
  const s = useStore(); const r = activeReviewC1(s)
  if (!r || done(r) === r.items.length) return null
  const left = sisaHari(r.tenggat)
  return <div className={`alert ${left <= 3 ? 'bad' : 'warn'} rv-bar`} role="status"><Icon name="bell" size={18} /><span>{r.nama}: {r.items.length - done(r)} akun bawahanmu belum ditinjau · tenggat {tgl(r.tenggat)} ({left >= 0 ? `${left} hari lagi` : `lewat ${-left} hari`}).</span><Btn kind="ghost" onClick={() => go('review-akses')}>Tinjau sekarang</Btn></div>
}
export function ReviewAkses({ go }) {
  const s = useStore(); const [t, toast] = useToast(); const [cab, setCab] = useState(null); const [note, setNote] = useState('')
  const r = activeReviewC1(s); const pol = s.root.reviewPolicy.c1
  const hist = s.root.reviews.filter((x) => x.customer === 'c1' && x.selesaiAt)
  if (!r) return (<><PageHead title="Review Akses" sub="Validasi berkala hak akses Admin dan Branch di bawahmu." /><Card><Empty text={`Tidak ada review yang berjalan. Review berikutnya dimulai ${tgl(pol?.berikut)}.`} /></Card>
    <Card title="Riwayat" pad={false}><Table rows={hist} cols={[{ h: 'Review', k: 'nama' }, { h: 'Selesai', r: (h) => jam(h.selesaiAt) }, { h: 'Akun', r: (h) => h.items.length }, { h: 'Dicabut', r: (h) => h.items.filter((i) => i.keputusan === 'Cabut').length }]} /></Card></>)
  const left = sisaHari(r.tenggat); const all = done(r) === r.items.length
  const dec = (i, k, c = '') => { api.decideReview(r.id, i.id, k, c); toast(k === 'Cabut' ? `Akses ${i.nama} dicabut, akun dinonaktifkan` : `${i.nama}: ${k}`) }
  return (
    <>
      <PageHead title="Review Akses" sub={`${r.nama} · tenggat ${tgl(r.tenggat)} (${left >= 0 ? `${left} hari lagi` : `lewat ${-left} hari`}). Pastikan setiap akun bawahan masih membutuhkan hak aksesnya.`} />
      <div className="stats">
        <Stat icon="users" label="Akun ditinjau" value={`${done(r)}/${r.items.length}`} hint="keputusanmu tercatat di audit log" />
        <Stat icon="clock" label="Tenggat" value={tgl(r.tenggat)} hint={`pengingat H-${(pol?.pengingat || [7, 3, 1]).join(', H-')}`} />
      </div>
      <div className="rv-cards">{r.items.map((i) => { const ll = lastLoginOf(s, 'c1', i.email); const dorm = !ll || daysAgo(ll) >= (pol?.dormant || 30); return (
        <Card key={i.id}>
          <div className="rv-c">
            <div><strong>{i.nama}</strong><div className="muted sm">{i.role} · {i.email}</div><div className="sm mt">Akses: <b>{i.akses}</b></div><div className={`sm ${dorm ? 'txt-warn' : 'muted'}`}>Login terakhir: {ll ? `${jam(ll)} (${daysAgo(ll)} hari lalu)` : 'belum pernah'}{dorm ? ' · pertimbangkan dicabut' : ''}</div></div>
            {i.keputusan ? <div className="rv-dec"><Badge t={DEC_T[i.keputusan]}>{i.keputusan}</Badge>{i.catatan && <span className="muted sm">{i.catatan}</span>}<button className="linkish sm" onClick={() => api.decideReview(r.id, i.id, null, '')}>Ubah keputusan</button></div>
              : <div className="row-act"><Btn kind="ghost" icon="check" onClick={() => dec(i, 'Pertahankan')}>Pertahankan</Btn>{i.role === 'Admin' && <Btn kind="ghost" icon="edit" onClick={() => { dec(i, 'Ubah', 'Izin disesuaikan di Admin & Izin'); go('admin-izin') }}>Ubah izin</Btn>}<Btn kind="danger" icon="x" onClick={() => { setCab(i); setNote('') }}>Cabut</Btn></div>}
          </div>
        </Card>) })}</div>
      <div className="sticky-act"><span className="muted">{all ? 'Semua akun sudah ditinjau.' : `${r.items.length - done(r)} akun belum ditinjau.`}</span><Btn icon="send" disabled={!all} onClick={() => { api.submitReview(r.id); toast('Hasil review dikirim · tercatat sebagai bukti audit') }}>Kirim hasil review</Btn></div>
      <Modal open={!!cab} title={`Cabut akses ${cab?.nama || ''}`} onClose={() => setCab(null)} footer={<><Btn kind="ghost" onClick={() => setCab(null)}>Batal</Btn><Btn kind="danger" disabled={note.trim().length < 5} onClick={() => { dec(cab, 'Cabut', note.trim()); setCab(null) }}>Cabut akses</Btn></>}>
        <p>Akun akan langsung dinonaktifkan dan tidak bisa login. Data yang pernah dibuat tetap tersimpan.</p>
        <Field label="Alasan (wajib, tercatat di audit log)"><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: pindah divisi, tidak lagi menangani payroll" /></Field>
      </Modal>
      {t}
    </>
  )
}

// ===================================================== PAM
const JIT_T = { Menunggu: 'warn', Aktif: 'ok', Berakhir: 'neutral', Ditolak: 'bad', Dicabut: 'bad' }
const roleOf = (k) => JIT_ROLES.find((x) => x.k === k)
const pwAge = (iso) => daysAgo(iso)
// Sesi istimewa yang direkam: sesi JIT + sesi Root Console Anda yang sedang berjalan + sesi Superadmin tenant demo hari ini.
function allSessions(s) {
  const me = s.root.pam.me; const tmin = (at, from) => { const m = Math.max(0, Math.round((new Date(at) - new Date(from)) / 60000)); return `${p2(Math.floor(m / 60))}:${p2(m % 60)}` }
  const rootEv = s.root.logs.filter((l) => l.peran === 'Root' && l.at >= me.mulai).reverse()
  const mine = { id: 'me', user: s.root.user.nama, peran: 'Root', customer: PLATFORM, app: APPS.root, ip: ROOT_NET.ip, mulai: me.mulai, selesai: '', live: true,
    events: [{ t: '00:00', k: 'sys', text: `Login Root Console · 2FA terverifikasi · ${ROOT_NET.perangkat} · ${ROOT_NET.lokasi}` }, ...rootEv.map((l) => ({ t: tmin(l.at, me.mulai), k: /reset|cabut|tangguh|menyetujui|break/i.test(l.aksi) ? 'edit' : 'nav', text: `${l.aksi}${l.customer !== PLATFORM ? ' · ' + custName(s, l.customer) : ''}${l.detail ? ' · ' + l.detail : ''}` }))] }
  const saEv = s.root.logs.filter((l) => l.customer === 'c1' && l.peran === 'Superadmin' && l.at.slice(0, 10) === todayISO()).reverse()
  const sa = saEv.length ? [{ id: 'sa-c1', user: 'Rani Hapsari', peran: 'Superadmin', customer: 'c1', app: APPS.admin, ip: saEv[0].ip, mulai: saEv[0].at, selesai: '', live: true, events: saEv.map((l) => ({ t: tmin(l.at, saEv[0].at), k: l.kategori === 'Akun & Izin' ? 'edit' : l.kategori === 'Autentikasi' ? 'sys' : 'nav', text: `${l.aksi}${l.detail ? ' · ' + l.detail : ''}` })) }] : []
  return [mine, ...sa, ...s.root.pam.sessions]
}
const PAM_TABS = [['akun', 'Akun istimewa'], ['jit', 'Akses sementara (JIT)'], ['sesi', 'Rekaman sesi'], ['kebijakan', 'Kebijakan']]
export function PAM({ sub, go }) {
  const s = useStore(); const [t, toast] = useToast(); const [, tick] = useState(0)
  useEffect(() => { api.settleJit(); const i = setInterval(() => { api.settleJit(); tick((x) => x + 1) }, 30000); return () => clearInterval(i) }, [])
  if (sub && sub.startsWith('sesi-')) return <SessionPlayer id={sub.slice(5)} go={go} />
  const tab = PAM_TABS.some(([k]) => k === sub) ? sub : 'akun'
  const P = s.root.pam; const sessions = allSessions(s)
  const noTwofa = P.team.filter((x) => !x.twofa).length + s.root.customers.filter((c) => !P.saTwofa[c.id]).length
  return (
    <>
      <PageHead title="Akses Istimewa (PAM)" sub="Pengamanan ekstra untuk akun dengan hak akses tertinggi: Root, Database Admin, Support, dan Superadmin customer. Akses ke data customer hanya lewat akses sementara (JIT) yang disetujui orang lain, dan setiap sesinya direkam." />
      <div className="stats">
        <Stat icon="key" label="Akses JIT aktif" value={P.jit.filter((j) => j.status === 'Aktif').length} hint="berakhir otomatis sesuai durasi" />
        <Stat icon="clock" label="Menunggu persetujuan" value={P.jit.filter((j) => j.status === 'Menunggu').length} hint={P.policy.duaOrang ? 'wajib disetujui orang lain' : 'boleh disetujui sendiri'} />
        <Stat icon="camera" label="Sesi direkam" value={sessions.length} hint={`${sessions.filter((x) => x.live).length} sedang berlangsung`} />
        <Stat icon="lock" label="Akun istimewa tanpa 2FA" value={noTwofa} hint="wajib diaktifkan" />
      </div>
      <div className="tabs" role="tablist">{PAM_TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => go('pam/' + k)}>{l}</button>)}</div>
      {tab === 'akun' && <PamAccounts s={s} toast={toast} />}
      {tab === 'jit' && <PamJit s={s} toast={toast} go={go} />}
      {tab === 'sesi' && <PamSessions s={s} sessions={sessions} go={go} />}
      {tab === 'kebijakan' && <PamPolicy s={s} toast={toast} />}
      {t}
    </>
  )
}
function PamAccounts({ s, toast }) {
  const P = s.root.pam; const asked = P.asked || {}
  const ask = (cid, nama) => { api.ask2FA(cid, nama); toast(`Permintaan aktivasi 2FA dikirim ke ${nama}`) }
  const sas = s.root.customers.map((c) => ({ c, twofa: P.saTwofa[c.id], ll: lastLoginOf(s, c.id, c.superadmin.email), n: s.root.logs.filter((l) => l.customer === c.id && l.peran === 'Superadmin' && l.sesi).length }))
  return (
    <>
      <Card title="Tim internal Kirana" pad={false}><Table rows={P.team} cols={[
        { h: 'Nama', r: (x) => <div><strong>{x.nama}</strong><div className="muted sm">{x.jabatan} · {x.email}</div></div> },
        { h: 'Tipe akun', k: 'tipe' },
        { h: 'Akses ke data customer', r: (x) => x.standing ? <div><Badge t="warn">Akses tetap</Badge><div className="muted sm">{x.penyetuju ? 'juga penyetuju JIT' : ''}</div></div> : <Badge t="ok">Hanya lewat JIT</Badge> },
        { h: '2FA', r: (x) => x.twofa ? <Badge t="ok">Aktif</Badge> : <div><Badge t="bad">Belum aktif</Badge>{asked['kirana' + x.nama] && <div className="muted sm">diminta {jam(asked['kirana' + x.nama])}</div>}</div> },
        { h: 'Ganti password', r: (x) => <span className={pwAge(x.pw) > 90 ? 'txt-warn' : ''}>{pwAge(x.pw)} hari lalu{pwAge(x.pw) > 90 ? ' · wajib ganti' : ''}</span> },
        { h: 'Aktivitas terakhir', r: (x) => <span className="nowrap">{jam(x.last)}</span> },
        { h: '', r: (x) => !x.twofa && !asked['kirana' + x.nama] ? <Btn kind="ghost" icon="send" onClick={() => ask(PLATFORM, x.nama)}>Minta 2FA</Btn> : null },
      ]} /></Card>
      <Card title="Superadmin customer" pad={false}><Table rows={sas} cols={[
        { h: 'Customer', r: (x) => <div><strong>{x.c.nama}</strong><div className="muted sm">{x.c.kode} · {x.c.status}</div></div> },
        { h: 'Superadmin', r: (x) => <div><strong>{x.c.superadmin.nama}</strong><div className="muted sm">{x.c.superadmin.email}</div></div> },
        { h: '2FA', r: (x) => x.twofa ? <Badge t="ok">Aktif</Badge> : <div><Badge t="bad">Belum aktif</Badge>{asked[x.c.id + x.c.superadmin.nama] && <div className="muted sm">diminta {jam(asked[x.c.id + x.c.superadmin.nama])}</div>}</div> },
        { h: 'Login terakhir', r: (x) => x.ll ? <span className="nowrap">{jam(x.ll)}</span> : '—' },
        { h: 'Sesi tercatat (30 hari)', r: (x) => x.n },
        { h: '', r: (x) => !x.twofa && !asked[x.c.id + x.c.superadmin.nama] ? <Btn kind="ghost" icon="send" onClick={() => ask(x.c.id, x.c.superadmin.nama)}>Minta 2FA</Btn> : null },
      ]} /></Card>
      <Note>Akun istimewa wajib 2FA dan ganti password setiap 90 hari. Tim Kirana selain Root dan Security Officer tidak punya akses tetap ke data customer.</Note>
    </>
  )
}
function PamJit({ s, toast, go }) {
  const P = s.root.pam; const me = s.root.user; const [f, setF] = useState(null); const [tolak, setTolak] = useState(null); const [why, setWhy] = useState('')
  const pending = P.jit.filter((j) => j.status === 'Menunggu' && j.email !== me.email)
  const DUR = [15, 30, 60, 120, 240, 480].filter((m) => m <= P.policy.maxMenit)
  const okForm = f && f.customer && f.alasan.trim().length >= 10 && (!P.policy.wajibTiket || f.tiket.trim())
  return (
    <>
      {pending.length > 0 && <div className="alert warn" role="status"><Icon name="key" size={18} />{pending.length} permintaan akses menunggu persetujuanmu.</div>}
      <div className="row-act end mb"><Btn icon="key" onClick={() => setF({ role: 'support', customer: 'c1', durasi: 60, alasan: '', tiket: '' })}>Ajukan akses sementara</Btn></div>
      <Card pad={false}><Table rows={P.jit} cols={[
        { h: 'Pemohon', r: (j) => <div><strong>{j.pemohon}</strong><div className="muted sm nowrap">{jam(j.diajukanAt)}</div></div> },
        { h: 'Akses', r: (j) => <div><strong>{roleOf(j.role).l}</strong><div><Badge t={RISK_T[roleOf(j.role).risiko]}>Risiko {roleOf(j.role).risiko.toLowerCase()}</Badge></div></div> },
        { h: 'Customer', r: (j) => custName(s, j.customer) },
        { h: 'Alasan', r: (j) => <div><span>{j.alasan}</span><div className="muted sm">Tiket {j.tiket || '—'} · {fmtDur(j.durasi)}</div>{j.catatanTolak && <div className="txt-bad sm">{j.catatanTolak}</div>}</div> },
        { h: 'Status', r: (j) => <div><Badge t={JIT_T[j.status]}>{j.status}</Badge>{j.status === 'Aktif' && <div className="sm nowrap"><b>sisa {fmtDur(minsLeft(j.berakhir))}</b></div>}{j.mulai && j.status !== 'Aktif' && <div className="muted sm nowrap">{jam(j.mulai)} – {j.berakhir ? jam(j.berakhir).slice(-5) : ''}</div>}</div> },
        { h: 'Penyetuju', r: (j) => j.penyetuju || (j.status === 'Menunggu' ? <span className="muted">{j.email === me.email ? 'Sari Wulandari (Security Officer)' : 'kamu / Security Officer'}</span> : '—') },
        { h: '', r: (j) => <div className="row-act">
          {j.status === 'Menunggu' && j.email !== me.email && <><Btn kind="ghost" icon="check" onClick={() => { api.decideJit(j.id, true); toast(`Akses ${j.pemohon} aktif ${fmtDur(j.durasi)} · sesi direkam`) }}>Setujui</Btn><Btn kind="danger" icon="x" onClick={() => { setTolak(j); setWhy('') }}>Tolak</Btn></>}
          {j.status === 'Menunggu' && j.email === me.email && (P.policy.duaOrang ? <Btn kind="ghost" title="Prototipe: mensimulasikan persetujuan dari Security Officer" onClick={() => { api.decideJit(j.id, true, '', 'Sari Wulandari'); toast('Disetujui Sari Wulandari · akses aktif') }}>Simulasi: disetujui Security Officer</Btn> : <Btn kind="ghost" icon="check" onClick={() => api.decideJit(j.id, true)}>Aktifkan</Btn>)}
          {j.status === 'Aktif' && <Btn kind="danger" icon="x" onClick={() => { api.revokeJit(j.id); toast('Akses dicabut, sesi ditutup') }}>Cabut</Btn>}
          {j.sesi && <Btn kind="ghost" icon="eye" onClick={() => go('pam/sesi-' + j.sesi)}>{j.status === 'Aktif' ? 'Pantau sesi' : 'Putar rekaman'}</Btn>}
        </div> },
      ]} /></Card>
      <Modal wide open={!!f} title="Ajukan akses sementara (Just-in-Time)" onClose={() => setF(null)} footer={<><Btn kind="ghost" onClick={() => setF(null)}>Batal</Btn><Btn icon="send" disabled={!okForm} onClick={() => { api.requestJit(f); setF(null); toast(P.policy.duaOrang ? 'Permintaan dikirim ke Security Officer' : 'Permintaan dibuat') }}>Kirim permintaan</Btn></>}>
        {f && <div className="form">
          <fieldset className="jit-roles"><legend className="field-l">Jenis akses</legend>{JIT_ROLES.map((r) => <label key={r.k} className={`jit-r ${f.role === r.k ? 'on' : ''}`}><input type="radio" name="jr" checked={f.role === r.k} onChange={() => setF({ ...f, role: r.k })} /><div><strong>{r.l}</strong><span className="muted sm">{r.ket}</span></div><Badge t={RISK_T[r.risiko]}>{r.risiko}</Badge></label>)}</fieldset>
          <div className="grid2">
            <Field label="Customer"><select value={f.customer} onChange={(e) => setF({ ...f, customer: e.target.value })}>{s.root.customers.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}</select></Field>
            <Field label="Durasi" hint={`Maksimal ${fmtDur(P.policy.maxMenit)} sesuai kebijakan`}><select value={f.durasi} onChange={(e) => setF({ ...f, durasi: Number(e.target.value) })}>{DUR.map((m) => <option key={m} value={m}>{fmtDur(m)}</option>)}</select></Field>
          </div>
          <Field label={`Nomor tiket${P.policy.wajibTiket ? ' (wajib)' : ''}`}><input value={f.tiket} onChange={(e) => setF({ ...f, tiket: e.target.value })} placeholder="Contoh: SUP-2320" /></Field>
          <Field label="Alasan (min. 10 karakter)"><textarea rows={2} value={f.alasan} onChange={(e) => setF({ ...f, alasan: e.target.value })} placeholder="Apa yang akan dikerjakan dan kenapa perlu akses ini" /></Field>
          <Note>{P.policy.duaOrang ? 'Permintaan harus disetujui orang lain (Security Officer); kamu tidak bisa menyetujui permintaanmu sendiri. ' : ''}Seluruh sesi direkam dan akses dicabut otomatis saat waktunya habis.{f.role === 'break' ? ` Break-glass langsung memberi tahu ${s.root.customers.find((c) => c.id === f.customer).superadmin.nama} (Superadmin customer).` : ''}</Note>
        </div>}
      </Modal>
      <Modal open={!!tolak} title={`Tolak akses ${tolak?.pemohon || ''}`} onClose={() => setTolak(null)} footer={<><Btn kind="ghost" onClick={() => setTolak(null)}>Batal</Btn><Btn kind="danger" disabled={why.trim().length < 5} onClick={() => { api.decideJit(tolak.id, false, why.trim()); setTolak(null); toast('Permintaan ditolak') }}>Tolak</Btn></>}>
        <Field label="Alasan penolakan"><textarea rows={2} value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
      </Modal>
    </>
  )
}
function PamSessions({ s, sessions, go }) {
  const [cid, setCid] = useState('')
  const rows = sessions.filter((x) => !cid || x.customer === cid)
  return (
    <>
      <div className="filters"><label className="fsel"><span>Customer</span><select value={cid} onChange={(e) => setCid(e.target.value)}><option value="">Semua</option>{s.root.customers.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}<option value={PLATFORM}>Platform Kirana (internal)</option></select></label></div>
      <Card pad={false}><Table rows={rows} onRow={(x) => go('pam/sesi-' + x.id)} cols={[
        { h: 'Pengguna', r: (x) => <div><strong>{x.user}</strong><div className="muted sm">{x.peran}</div></div> },
        { h: 'Target', r: (x) => <div><span>{custName(s, x.customer)}</span><div className="muted sm">{x.app}</div></div> },
        { h: 'Mulai', r: (x) => <span className="nowrap">{jam(x.mulai)}</span> },
        { h: 'Durasi', r: (x) => fmtDur(durMin(x.mulai, x.selesai)) },
        { h: 'Rekaman', r: (x) => <div><span>{x.events.length} langkah</span>{x.events.some((e) => e.k === 'alert') && <div><Badge t="bad">{x.events.filter((e) => e.k === 'alert').length} peringatan</Badge></div>}</div> },
        { h: 'Status', r: (x) => x.live ? <span className="live"><i />Berlangsung</span> : <Badge t="neutral">Selesai</Badge> },
        { h: '', r: () => <span className="muted" aria-hidden="true"><Icon name="arrowRight" size={18} /></span> },
      ]} /></Card>
      <Note>Rekaman berisi urutan halaman yang dibuka, data yang dilihat, perintah database, dan perubahan. Data sensitif (NIK, rekening, gaji) disamarkan. Rekaman hanya bisa diputar, tidak bisa diubah, dan disimpan 1 tahun.</Note>
    </>
  )
}
function SessionPlayer({ id, go }) {
  const s = useStore(); const [t, toast] = useToast()
  const x = allSessions(s).find((z) => z.id === id)
  const [i, setI] = useState(0); const [play, setPlay] = useState(false); const [spd, setSpd] = useState(1)
  const n = x ? x.events.length : 0
  useEffect(() => { if (x?.live) setI(n - 1) }, [n])
  useEffect(() => { if (!play) return; if (i >= n - 1) { setPlay(false); return } const h = setTimeout(() => setI((v) => v + 1), 1100 / spd); return () => clearTimeout(h) }, [play, i, spd, n])
  if (!x) return <Empty text="Rekaman tidak ditemukan." />
  const db = x.app === APPS.db; const j = x.jit ? s.root.pam.jit.find((z) => z.id === x.jit) : null
  const xls = () => dlx(toast, [sheet('Rekaman sesi', ['Waktu sesi', 'Jenis', 'Aktivitas'], x.events.map((e) => [e.t, { sys: 'Sistem', cmd: 'Perintah', out: 'Hasil', nav: 'Navigasi', view: 'Melihat data', edit: 'Perubahan', alert: 'Peringatan' }[e.k], e.text]))], `Rekaman-sesi-${x.user.split(' ')[0]}-${x.mulai.slice(0, 10)}`)
  return (
    <>
      <Crumb items={[['Akses Istimewa', () => go('pam/sesi')], [`Sesi ${x.user}`]]} />
      <PageHead title={`Rekaman sesi · ${x.user}`} sub={`${x.peran} · ${custName(s, x.customer)} · ${x.app} · IP ${x.ip}`}><Btn kind="ghost" icon="download" onClick={xls}>Download log sesi</Btn></PageHead>
      <div className="stats">
        <Stat icon="clock" label="Mulai" value={jam(x.mulai).slice(-5)} hint={tgl(x.mulai)} />
        <Stat icon="camera" label="Durasi" value={fmtDur(durMin(x.mulai, x.selesai))} hint={x.live ? 'masih berlangsung' : 'selesai ' + jam(x.selesai).slice(-5)} />
        <Stat icon="key" label="Dasar akses" value={j ? roleOf(j.role).l.split(' · ')[0] : x.peran === 'Root' ? 'Akses tetap Root' : 'Akun Superadmin'} hint={j ? `${j.tiket} · disetujui ${j.penyetuju}` : 'tanpa JIT'} />
        <Stat icon="x" label="Peringatan" value={x.events.filter((e) => e.k === 'alert').length} hint="upaya di luar izin, break-glass" />
      </div>
      <div className="player">
        <div className={`screen ${db ? 'term' : ''}`} aria-live="polite">
          <div className="screen-h"><span /><span /><span /><b>{db ? 'bastion · db-prod-01' : x.app}</b>{x.live && <span className="live"><i />REC</span>}</div>
          <div className="screen-b">{x.events.slice(0, i + 1).map((e, k) => <div key={k} className={`ln ln-${e.k} ${k === i ? 'cur' : ''}`}><span className="ln-t">{e.t}</span>{db && e.k === 'cmd' ? <code>$ {e.text}</code> : <span>{e.text}</span>}</div>)}</div>
        </div>
        <div className="ctrl">
          <Btn kind="ghost" onClick={() => { if (i >= n - 1) setI(0); setPlay(!play) }}>{play ? 'Jeda' : i >= n - 1 ? 'Putar ulang' : 'Putar'}</Btn>
          <input type="range" min="0" max={Math.max(0, n - 1)} value={i} onChange={(e) => { setPlay(false); setI(Number(e.target.value)) }} aria-label="Posisi rekaman" />
          <span className="nowrap sm">{i + 1}/{n} · {x.events[i]?.t}</span>
          <select value={spd} onChange={(e) => setSpd(Number(e.target.value))} aria-label="Kecepatan">{[1, 2, 4].map((v) => <option key={v} value={v}>{v}×</option>)}</select>
        </div>
      </div>
      <Card title="Langkah dalam sesi" pad={false}><ol className="steps-l">{x.events.map((e, k) => <li key={k} className={`${k === i ? 'on' : ''} ln-${e.k}`}><button onClick={() => { setPlay(false); setI(k) }}><span className="mono">{e.t}</span><span>{e.text}</span>{e.k === 'alert' && <Badge t="bad">Peringatan</Badge>}</button></li>)}</ol></Card>
      {t}
    </>
  )
}
function PamPolicy({ s, toast }) {
  const [p, setP] = useState(s.root.pam.policy)
  return (
    <Card title="Kebijakan akses istimewa">
      <div className="form">
        <Field label="Durasi maksimal akses JIT"><select value={p.maxMenit} onChange={(e) => setP({ ...p, maxMenit: Number(e.target.value) })}>{[60, 120, 240, 480].map((m) => <option key={m} value={m}>{fmtDur(m)}</option>)}</select></Field>
        <Field label="Keluar otomatis bila sesi idle (menit)"><input type="number" min="5" max="60" value={p.sesiIdle} onChange={(e) => setP({ ...p, sesiIdle: Number(e.target.value) })} /></Field>
        <Toggle on={p.duaOrang} onChange={(v) => setP({ ...p, duaOrang: v })} label="Prinsip dua orang: JIT wajib disetujui orang lain" />
        <Toggle on={p.wajibTiket} onChange={(v) => setP({ ...p, wajibTiket: v })} label="Wajib nomor tiket untuk setiap permintaan" />
        <Toggle on={p.wajib2FA} onChange={(v) => setP({ ...p, wajib2FA: v })} label="Wajib 2FA untuk semua akun istimewa" />
        <Toggle on={p.notifBreakGlass} onChange={(v) => setP({ ...p, notifBreakGlass: v })} label="Beri tahu Superadmin & PIC customer saat break-glass" />
        <div className="field locked"><span className="field-l">Rekam sesi <span className="lock"><Icon name="lock" size={13} /> selalu aktif</span></span><p className="muted sm">Semua sesi akun istimewa direkam dan tidak bisa dimatikan, demi kepatuhan audit.</p></div>
        <div className="row-act"><Btn onClick={() => { api.savePamPolicy(p); toast('Kebijakan PAM disimpan') }}>Simpan kebijakan</Btn></div>
      </div>
    </Card>
  )
}

// ===================================================== LAPORAN KEPATUHAN
const LV = { ok: ['ok', 'Patuh'], warn: ['warn', 'Perhatian'], bad: ['bad', 'Tidak patuh'], info: ['neutral', 'Info'] }
export function complianceOf(s, c) {
  const from = since(30); const L = s.root.logs.filter((l) => l.customer === c.id && l.at.slice(0, 10) >= from)
  const pol = s.root.reviewPolicy[c.id] || { dormant: 30 }
  const accts = accountsOf(s, c).filter((a) => a.aktif !== false)
  const dorm = accts.filter((a) => { const ll = lastLoginOf(s, c.id, a.email); return !ll || daysAgo(ll) >= pol.dormant })
  const gagal = L.filter((l) => l.kategori === 'Autentikasi' && l.hasil === 'Gagal').length; const tinggi = L.filter((l) => l.risiko === 'Tinggi' && l.kategori === 'Autentikasi')
  const chg = L.filter((l) => isAccessChange(l) && l.kategori === 'Akun & Izin'); const self = chg.filter(selfAppr)
  const r = latestReview(s, c.id); const rs = r ? rvStatus(r) : null
  const twofa = s.root.pam.saTwofa[c.id]
  const jit = s.root.pam.jit.filter((j) => j.customer === c.id && j.mulai && j.mulai.slice(0, 10) >= from); const brk = jit.filter((j) => j.role === 'break')
  const checks = [
    { k: 'review', l: 'Review akses berkala', lv: !r ? (pol.aktif ? 'warn' : 'info') : rs === 'Terlambat' ? 'bad' : rs === 'Selesai terlambat' ? 'warn' : 'ok', pen: rs === 'Terlambat' ? 25 : rs === 'Selesai terlambat' ? 10 : !r && pol.aktif ? 10 : 0,
      v: r ? `${r.nama} · ${done(r)}/${r.items.length} ditinjau · ${rs.toLowerCase()}` : pol.aktif ? 'Belum pernah dilakukan' : 'Belum dijadwalkan (Trial)', go: r ? 'access-review/' + r.id : 'access-review' },
    { k: 'dormant', l: `Akun tidak aktif ≥ ${pol.dormant} hari masih aktif`, lv: dorm.length ? 'warn' : 'ok', pen: Math.min(20, dorm.length * 10), v: dorm.length ? dorm.map((a) => a.nama).join(', ') : 'Tidak ada', go: r && !r.selesaiAt ? 'access-review/' + r.id : 'access-review' },
    { k: '2fa', l: '2FA akun Superadmin', lv: twofa ? 'ok' : 'bad', pen: twofa ? 0 : 20, v: twofa ? 'Aktif' : `Belum aktif · ${c.superadmin.nama}`, go: 'pam/akun' },
    { k: 'sod', l: 'Perubahan hak akses disetujui pihak kedua', lv: self.length ? 'warn' : 'ok', pen: Math.min(15, self.length * 5), v: chg.length ? `${chg.length - self.length}/${chg.length} disetujui orang lain` : 'Tidak ada perubahan', go: 'audit-log/' + c.id },
    { k: 'login', l: 'Login gagal & login berisiko', lv: tinggi.length ? 'warn' : 'ok', pen: Math.min(15, tinggi.length * 5), v: `${gagal} gagal · ${tinggi.length} berisiko tinggi`, go: 'audit-log/' + c.id },
    { k: 'pam', l: 'Akses tim Kirana ke data customer', lv: brk.length ? 'warn' : 'info', pen: 0, v: jit.length ? `${jit.length} sesi JIT direkam${brk.length ? ` · ${brk.length} break-glass` : ''}` : 'Tidak ada', go: 'pam/sesi' },
  ]
  const score = Math.max(0, 100 - checks.reduce((a, x) => a + x.pen, 0))
  return { checks, score, st: score >= 85 ? 'Patuh' : score >= 70 ? 'Perlu perhatian' : 'Berisiko', dorm, chg, r }
}
const SC_T = { Patuh: 'ok', 'Perlu perhatian': 'warn', Berisiko: 'bad' }
const LvIcon = ({ lv }) => <span className={`lv lv-${lv}`} title={LV[lv][1]}><Icon name={lv === 'ok' ? 'check' : lv === 'info' ? 'dot' : lv === 'bad' ? 'x' : 'clock'} size={14} /><span className="sr-only">{LV[lv][1]}</span></span>
const reportSheets = (s, list) => [
  sheet('Ringkasan', ['Customer', 'Kode', 'Skor', 'Status', ...list[0].x.checks.map((k) => k.l)], list.map(({ c, x }) => [c.nama, c.kode, x.score, x.st, ...x.checks.map((k) => `${LV[k.lv][1]}: ${k.v}`)])),
  sheet('Temuan', ['Customer', 'Kontrol', 'Status', 'Keterangan'], list.flatMap(({ c, x }) => x.checks.filter((k) => k.lv === 'bad' || k.lv === 'warn').map((k) => [c.nama, k.l, LV[k.lv][1], k.v]))),
  sheet('Audit log 30 hari', ['Waktu', 'Customer', 'Pengguna', 'Peran', 'Kategori', 'Aktivitas', 'Aplikasi', 'IP', 'Lokasi', 'Hasil', 'Disetujui oleh'], list.flatMap(({ c }) => s.root.logs.filter((l) => l.customer === c.id && l.at.slice(0, 10) >= since(30)).map((l) => [jam(l.at), c.nama, l.aktor, l.peran, l.kategori, l.aksi, l.aplikasi || '', l.ip || '', l.lokasi || '', l.hasil || '', l.penyetuju || '']))),
  sheet('Review akses', ['Customer', 'Review', 'Tenggat', 'Status', 'Akun', 'Keputusan', 'Reviewer', 'Waktu'], list.flatMap(({ c }) => s.root.reviews.filter((r) => r.customer === c.id).flatMap((r) => r.items.map((i) => [c.nama, r.nama, r.tenggat, rvStatus(r), i.nama, i.keputusan || 'Belum', i.reviewer, i.at ? jam(i.at) : ''])))),
  sheet('Akses istimewa', ['Customer', 'Pemohon', 'Akses', 'Tiket', 'Alasan', 'Status', 'Penyetuju', 'Mulai', 'Berakhir'], list.flatMap(({ c }) => s.root.pam.jit.filter((j) => j.customer === c.id).map((j) => [c.nama, j.pemohon, roleOf(j.role).l, j.tiket, j.alasan, j.status, j.penyetuju || '', j.mulai ? jam(j.mulai) : '', j.berakhir ? jam(j.berakhir) : '']))),
]
export function Compliance({ sub, go }) {
  const s = useStore(); const [t, toast] = useToast()
  const list = s.root.customers.map((c) => ({ c, x: complianceOf(s, c) }))
  if (sub) { const it = list.find((z) => z.c.id === sub); if (!it) return <Empty text="Customer tidak ditemukan." />; return <ComplianceDetail it={it} s={s} go={go} /> }
  const avg = Math.round(list.reduce((a, z) => a + z.x.score, 0) / list.length)
  const ck = list[0].x.checks
  return (
    <>
      <PageHead title="Laporan Kepatuhan" sub="Ringkasan kontrol akses per customer dari audit log, review akses, dan akses istimewa (30 hari terakhir). Unduh laporannya untuk auditor internal atau customer."><Btn kind="ghost" icon="download" onClick={() => dlx(toast, reportSheets(s, list), `Laporan-kepatuhan-${todayISO()}`)}>Download laporan</Btn></PageHead>
      <div className="stats">
        <Stat icon="chart" label="Skor rata-rata" value={avg} hint="dari 100" />
        {['Patuh', 'Perlu perhatian', 'Berisiko'].map((k) => <Stat key={k} icon={k === 'Patuh' ? 'checkCircle' : k === 'Berisiko' ? 'x' : 'clock'} label={k} value={list.filter((z) => z.x.st === k).length} hint="customer" />)}
      </div>
      <div className="dgrid two">
        <Card title="Skor kepatuhan per customer"><HBars label="Skor kepatuhan per customer" rows={list.slice().sort((a, b) => b.x.score - a.x.score).map((z) => ({ l: short(z.c), v: z.x.score }))} /><p className="muted sm mt">Skor 85+ patuh, 70–84 perlu perhatian, di bawah 70 berisiko.</p></Card>
        <Card title="Temuan per kontrol"><SegBar label="Jumlah customer per status kontrol" parts={[['ok', 'Patuh', '#2f8f4e'], ['warn', 'Perhatian', '#d9a400'], ['bad', 'Tidak patuh', '#c0452a'], ['info', 'Info', '#8f9893']].map(([k, l, c]) => ({ l, c, v: list.reduce((a, z) => a + z.x.checks.filter((x) => x.lv === k).length, 0) }))} /><p className="muted sm mt">{list.length} customer × {ck.length} kontrol.</p></Card>
      </div>
      <Card pad={false}><Table rows={list} onRow={(z) => go('kepatuhan/' + z.c.id)} cols={[
        { h: 'Customer', r: (z) => <div><strong>{z.c.nama}</strong><div className="muted sm">{z.c.kode} · {z.c.status}</div></div> },
        { h: 'Skor', r: (z) => <div className="nowrap"><b className="sc">{z.x.score}</b> <Badge t={SC_T[z.x.st]}>{z.x.st}</Badge></div> },
        ...ck.map((k, i) => ({ h: k.l.replace(/ ≥.*| berkala| akun Superadmin| disetujui pihak kedua| & login berisiko| ke data customer/g, ''), r: (z) => <span title={z.x.checks[i].v}><LvIcon lv={z.x.checks[i].lv} /></span> })),
        { h: '', r: () => <span className="muted" aria-hidden="true"><Icon name="arrowRight" size={18} /></span> },
      ]} /></Card>
      <div className="lv-leg">{Object.entries(LV).map(([k, [, l]]) => <span key={k}><LvIcon lv={k} />{l}</span>)}</div>
      {t}
    </>
  )
}
function ComplianceDetail({ it, s, go }) {
  const [t, toast] = useToast(); const { c, x } = it
  return (
    <>
      <Crumb items={[['Laporan Kepatuhan', () => go('kepatuhan')], [c.nama]]} />
      <PageHead title={`Kepatuhan · ${c.nama}`} sub={`${c.kode} · periode ${tgl(since(30))} – ${tgl(todayISO())}`}><Btn kind="ghost" icon="download" onClick={() => dlx(toast, reportSheets(s, [it]), `Laporan-kepatuhan-${c.kode}-${todayISO()}`)}>Download laporan</Btn></PageHead>
      <Card><div className="sc-row"><div><span className="sc-big">{x.score}</span><span className="muted"> / 100</span></div><Badge t={SC_T[x.st]}>{x.st}</Badge></div><Meter label="Skor kepatuhan" used={x.score} max={100} /></Card>
      <Card title="Kontrol & temuan" pad={false}><ul className="ck-l">{x.checks.map((k) => (
        <li key={k.k}><LvIcon lv={k.lv} /><div><strong>{k.l}</strong><p className="muted sm">{k.v}</p></div><Badge t={LV[k.lv][0]}>{LV[k.lv][1]}{k.pen ? ` · −${k.pen}` : ''}</Badge><Btn kind="ghost" onClick={() => go(k.go)}>Lihat</Btn></li>))}</ul></Card>
      <Note>Rekomendasi: selesaikan review yang lewat tenggat, cabut akun yang tidak aktif, aktifkan 2FA untuk semua Superadmin, dan biasakan perubahan hak akses diajukan oleh satu orang lalu disetujui orang lain.</Note>
      {t}
    </>
  )
}
