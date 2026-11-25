// Role Root — pemilik aplikasi Kirana. Mengelola customer (tenant HRIS): pendaftaran, data turunan, log aktivitas, reset password, profil.
// Hierarki: Root › Customer (Superadmin = grup) › Branch › Karyawan.
import { RootMitraSummary } from './rootMitra.jsx'
import { ArtHead } from '../components/Sticker.jsx'
import React, { useMemo, useState } from 'react'
import { useStore, api } from '../services/store.js'
import { tenantOf, accountsOf } from '../services/tenant.js'
import { exportXlsx } from '../services/export.js'
import { Btn, Card, Badge, Table, Modal, Field, Toggle, useToast, Avatar, PageHead, Note, Icon, Empty, Stat, Tabs } from '../components/ui.jsx'
import { useDraft, DraftBar } from './admin3.jsx'
import { PAKET, MODUL, BIDANG, LOG_KAT, FILE_TYPES } from '../data/rootSeed.js'
import { LineArea, Columns, SegBar, HBars, Heatmap, StackRows } from '../components/charts.jsx'

const BLS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const tgl = (s) => { if (!s) return '—'; const d = new Date(s); return `${d.getDate()} ${BLS[d.getMonth()]} ${d.getFullYear()}` }
const jam = (s) => { const d = new Date(s); return `${tgl(s)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const sisaHari = (iso) => Math.ceil((new Date(iso) - new Date(todayISO())) / 86400000)
const addMonths = (iso, n) => { const d = new Date(iso); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10) }
const addDays = (iso, n) => { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
export const maskEmail = (e = '') => { const [u, d] = e.split('@'); return d ? `${u.slice(0, 2)}${'•'.repeat(Math.max(2, u.length - 2))}@${d}` : e }
const STATUS_T = { Aktif: 'ok', Trial: 'warn', Ditangguhkan: 'bad', Berakhir: 'neutral' }
const SBadge = ({ s }) => <Badge t={STATUS_T[s]}>{s}</Badge>
const Crumb = ({ items }) => <nav className="crumb" aria-label="Breadcrumb">{items.map(([l, fn], i) => <React.Fragment key={i}>{i > 0 && <span>›</span>}{fn ? <button onClick={fn}>{l}</button> : <b>{l}</b>}</React.Fragment>)}</nav>
const Confirm = ({ open, title = 'Konfirmasi', text, onNo, onYes, yes = 'Yakin', children, ok = true }) => (
  <Modal open={!!open} title={title} onClose={onNo} footer={<><Btn kind="ghost" onClick={onNo}>Batal</Btn><Btn disabled={!ok} onClick={onYes}>{yes}</Btn></>}><div className="center"><span className="q-ic">?</span><p>{text}</p></div>{children}</Modal>
)
const dlx = (toast, sheets, file) => { try { exportXlsx({ sheets, file }); toast('File Excel diunduh') } catch (e) { toast('Unduhan diblokir di pratinjau ini') } }
const H = (v) => ({ v, fill: '0A5950', color: 'FFFFFF', bold: true, align: 'center', wrap: true, border: true })
const sheet = (name, head, rows) => ({ name, rows: [head.map(H), ...rows.map((r) => r.map((v) => ({ v, border: true })))], widths: head.map((h) => Math.max(12, h.length + 4)), freeze: 1, heights: { 0: 28 } })

// Data turunan customer. c1 = tenant demo: dibaca langsung dari data aplikasi (Superadmin/Branch/Admin).
export { tenantOf, accountsOf }
const usage = (s, c) => { const t = tenantOf(s, c.id); return { kar: t.employees.filter((e) => e.status !== 'Resign').length, br: t.branches.length } }
const Meter = ({ label, used, max, pct }) => { const p = Math.min(100, Math.round(pct ?? (used / Math.max(1, max)) * 100)); return <div className="meter"><div className="meter-h"><span>{label}</span><b>{used} / {max}</b></div><div className="meter-b" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={label}><i style={{ width: p + '%' }} className={p >= 90 ? 'hot' : ''} /></div></div> }

// ---------------- Dashboard ----------------
const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const ST_COL = { Aktif: '#2f8f4e', Trial: '#d9a400', Ditangguhkan: '#c0452a', Berakhir: '#8f9893' }
export function RootDashboard({ go }) {
  const s = useStore(); const cs = s.root.customers; const logs = s.root.logs
  const cnt = (st) => cs.filter((c) => c.status === st).length
  const totBr = cs.reduce((a, c) => a + usage(s, c).br, 0), totKar = cs.reduce((a, c) => a + usage(s, c).kar, 0)
  const soon = cs.filter((c) => c.status !== 'Ditangguhkan' && sisaHari(c.berakhir) <= 30).sort((a, b) => a.berakhir.localeCompare(b.berakhir))
  const name = (id) => cs.find((c) => c.id === id)?.nama || '—'
  const short = (c) => c.brand || c.nama.replace(/^(PT|CV)\s+/, '')
  // Aktivitas harian 30 hari terakhir (dari log)
  const today = new Date(todayISO())
  const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() - 29 + i); const k = d.toISOString().slice(0, 10); return { l: `${d.getDate()} ${BLS[d.getMonth()]}`, full: tgl(k), v: logs.filter((x) => x.at.slice(0, 10) === k).length } })
  const sum7 = days.slice(-7).reduce((a, d) => a + d.v, 0), prev7 = days.slice(-14, -7).reduce((a, d) => a + d.v, 0)
  // Customer baru per bulan, 12 bulan terakhir
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; return { l: BLS[d.getMonth()], full: `${BLN[d.getMonth()]} ${d.getFullYear()}`, v: cs.filter((c) => (c.createdAt || '').slice(0, 7) === k).length } })
  const byBidang = Object.entries(cs.reduce((a, c) => ({ ...a, [c.bidang]: (a[c.bidang] || 0) + usage(s, c).kar }), {})).map(([l, v]) => ({ l, v })).sort((a, b) => b.v - a.v)
  const quota = cs.map((c) => ({ c, u: usage(s, c) })).sort((a, b) => b.u.kar / b.c.kuotaKaryawan - a.u.kar / a.c.kuotaKaryawan)
  return (
    <>
      <ArtHead art="kerja" title={`Halo, ${s.root.user.nama.split(' ')[0]}!`} sub={`Ringkasan seluruh customer Kirana · data per ${tgl(todayISO())}.`}><Btn icon="plus" onClick={() => go('customer/baru')}>Daftarkan customer</Btn></ArtHead>
      <div className="stats">
        <Stat icon="building" label="Customer" value={cs.length} hint={`${cnt('Aktif')} aktif · ${cnt('Trial')} trial · ${cnt('Ditangguhkan')} ditangguhkan`} />
        <Stat icon="layers" label="Branch" value={totBr} hint="di seluruh customer" />
        <Stat icon="users" label="Karyawan aktif" value={totKar} hint="di seluruh customer" />
        <Stat icon="calendar" label="Perlu ditindaklanjuti" value={soon.length} hint="langganan/trial berakhir ≤ 30 hari" />
      </div>
      <div className="dgrid">
        <Card className="d-wide" title="Aktivitas harian semua customer" action={<span className="muted sm">7 hari terakhir: <b className="ink">{sum7}</b> {prev7 ? <>({sum7 >= prev7 ? '+' : ''}{Math.round(((sum7 - prev7) / prev7) * 100)}% dari minggu sebelumnya)</> : null}</span>}>
          <LineArea height={300} points={days} unit=" aktivitas" label="Grafik garis jumlah aktivitas per hari selama 30 hari terakhir" />
        </Card>
        <Card title="Status customer">
          <SegBar label="Komposisi status customer" parts={['Aktif', 'Trial', 'Ditangguhkan', 'Berakhir'].map((l) => ({ l, v: cnt(l), c: ST_COL[l] }))} />
          <h4 className="d-sub">Langganan berakhir ≤ 30 hari</h4>
          {soon.length === 0 ? <p className="muted sm">Tidak ada.</p> : <ul className="rlist">{soon.map((c) => { const h = sisaHari(c.berakhir); return (
            <li key={c.id}><button className="rlist-i" onClick={() => go('customer/c-' + c.id)}><span><strong>{c.nama}</strong><small>{c.paket} · {tgl(c.berakhir)}</small></span><Badge t={h < 0 ? 'bad' : h <= 7 ? 'warn' : 'neutral'}>{h < 0 ? `lewat ${-h} hari` : `${h} hari lagi`}</Badge></button></li>) })}</ul>}
        </Card>
        <Card title="Customer baru per bulan" action={<span className="muted sm">12 bulan terakhir</span>}>
          <Columns height={320} points={months} unit=" customer" label="Grafik kolom customer baru per bulan" />
        </Card>
        <Card title="Pemakaian kuota karyawan" action={<Btn kind="ghost" onClick={() => go('data-customer')}>Data turunan</Btn>}>
          <ul className="qlist">{quota.map(({ c, u }) => { const p = Math.round((u.kar / c.kuotaKaryawan) * 100); return (
            <li key={c.id}><button className="qlist-i" onClick={() => go('data-customer/' + c.id)}><span className="ql-n">{short(c)} <small>· {c.paket}</small></span><span className="ql-r"><b>{p}%</b> <small>{u.kar}/{c.kuotaKaryawan}</small></span><span className="meter-b"><i style={{ width: Math.max(2, p) + '%' }} className={p >= 90 ? 'hot' : ''} /></span></button></li>) })}</ul>
        </Card>
        <Card title="Karyawan aktif per bidang usaha">
          <HBars rows={byBidang} label="Bar horizontal jumlah karyawan aktif per bidang usaha" />
          <h4 className="d-sub">Customer per paket</h4>
          <HBars rows={Object.keys(PAKET).map((p) => ({ l: p, v: cs.filter((c) => c.paket === p).length }))} label="Bar horizontal jumlah customer per paket" />
        </Card>
        <Card className="d-full" title="Aktivitas per kategori & customer" action={<Btn kind="ghost" onClick={() => go('audit-log')}>Log aktivitas</Btn>}>
          <Heatmap label="Peta panas jumlah aktivitas per kategori untuk tiap customer" rows={cs.map((c) => ({ k: c.id, l: short(c) }))} cols={LOG_KAT.map((k) => ({ k, l: k }))} value={(r, c) => logs.filter((l) => l.customer === r.k && l.kategori === c.k).length} />
        </Card>
        <Card className="d-full" title="Aktivitas terbaru" action={<Btn kind="ghost" onClick={() => go('audit-log')}>Lihat log</Btn>}>
          <ul className="rlist">{logs.slice(0, 6).map((l) => <li key={l.id} className="rlog"><span className="muted sm">{jam(l.at)}</span><span><strong>{l.aksi}</strong><small>{name(l.customer)} · {l.aktor} ({l.peran})</small></span></li>)}</ul>
        </Card>
      </div>
      <RootMitraSummary go={go} />
    </>
  )
}

// ---------------- Customer: daftar, pendaftaran, edit, detail ----------------
const BLANK = { nama: '', brand: '', bidang: '', skala: '', npwp: '', alamat: '', kota: '', provinsi: '', kodepos: '', telp: '', email: '', website: '',
  pic: { nama: '', jabatan: '', email: '', hp: '' }, superadmin: { nama: '', email: '' }, samaPic: true,
  paket: 'Growth', kuotaKaryawan: PAKET.Growth.kuotaKaryawan, kuotaBranch: PAKET.Growth.kuotaBranch, kuotaStorage: PAKET.Growth.kuotaStorage, status: 'Trial', mulai: todayISO(), durasi: 12, modul: ['rekrutmen', 'payroll', 'aktivitas'], dokumen: [], catatan: '', setuju: false }

export function Customers({ sub, go }) {
  if (sub === 'baru') return <CustomerForm go={go} />
  if (sub && sub.startsWith('edit-')) return <CustomerForm go={go} id={sub.slice(5)} />
  if (sub && sub.startsWith('c-')) return <CustomerDetail go={go} id={sub.slice(2)} />
  return <CustomerList go={go} />
}

function CustomerList({ go }) {
  const s = useStore(); const [t, toast] = useToast(); const [q, setQ] = useState(''); const [st, setSt] = useState(''); const [pk, setPk] = useState('')
  const rows = s.root.customers.filter((c) => (!st || c.status === st) && (!pk || c.paket === pk) && (!q || [c.nama, c.kode, c.kota, c.pic.nama, c.superadmin.email].join(' ').toLowerCase().includes(q.toLowerCase())))
  const xls = () => dlx(toast, [sheet('Customer', ['Kode', 'Perusahaan', 'Bidang', 'Kota', 'PIC', 'Email Superadmin', 'Paket', 'Status', 'Mulai', 'Berakhir', 'Karyawan', 'Branch'],
    rows.map((c) => { const u = usage(s, c); return [c.kode, c.nama, c.bidang, c.kota, c.pic.nama, c.superadmin.email, c.paket, c.status, tgl(c.mulai), tgl(c.berakhir), u.kar, u.br] }))], 'Customer-Kirana')
  return (
    <>
      <PageHead title="Customer" sub="Perusahaan pengguna Kirana. Setiap customer punya satu Superadmin yang menaungi Branch dan karyawannya."><div className="row-act"><Btn kind="ghost" icon="download" onClick={xls}>Download Excel</Btn><Btn icon="plus" onClick={() => go('customer/baru')}>Daftarkan customer</Btn></div></PageHead>
      <div className="filters">
        <label className="fsel"><span>Status</span><select value={st} onChange={(e) => setSt(e.target.value)}><option value="">Semua status</option>{Object.keys(STATUS_T).map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="fsel"><span>Paket</span><select value={pk} onChange={(e) => setPk(e.target.value)}><option value="">Semua paket</option>{Object.keys(PAKET).map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="fsel grow"><span>Cari</span><span className="search"><Icon name="search" size={18} /><input placeholder="Nama perusahaan, kode, kota, PIC, e-mail" value={q} onChange={(e) => setQ(e.target.value)} /></span></label>
      </div>
      <Card pad={false}><Table rows={rows} empty="Customer tidak ditemukan." onRow={(c) => go('customer/c-' + c.id)} cols={[
        { h: 'Kode', r: (c) => <span className="nowrap">{c.kode}</span> },
        { h: 'Perusahaan', r: (c) => <div><strong>{c.nama}</strong><div className="muted sm">{c.bidang} · {c.kota}</div></div> },
        { h: 'Superadmin', r: (c) => <div><div>{c.superadmin.nama}</div><div className="muted sm">{c.superadmin.email}</div></div> },
        { h: 'Paket', k: 'paket' },
        { h: 'Pemakaian', r: (c) => { const u = usage(s, c); return <span className="muted sm">{u.kar}/{c.kuotaKaryawan} karyawan · {u.br}/{c.kuotaBranch} Branch</span> } },
        { h: 'Berakhir', r: (c) => { const h = sisaHari(c.berakhir); return <div><div>{tgl(c.berakhir)}</div>{c.status !== 'Ditangguhkan' && h <= 30 && <div className={'sm ' + (h < 0 ? 'txt-bad' : 'txt-warn')}>{h < 0 ? `lewat ${-h} hari` : `${h} hari lagi`}</div>}</div> } },
        { h: 'Status', r: (c) => <SBadge s={c.status} /> },
      ]} /></Card>
      {t}
    </>
  )
}

function CustomerForm({ go, id }) {
  const s = useStore(); const [t, toast] = useToast(); const [ask, setAsk] = useState(false); const [tried, setTried] = useState(false)
  const src = id && s.root.customers.find((c) => c.id === id)
  const init = src ? { ...BLANK, ...structuredClone(src), samaPic: src.pic.email === src.superadmin.email, durasi: 12, setuju: true } : BLANK
  const d = useDraft('root-customer:' + (id || 'baru'), init); const f = d.value
  const set = (k, v) => d.set({ ...f, [k]: v }); const setIn = (g, k, v) => d.set({ ...f, [g]: { ...f[g], [k]: v } })
  if (id && !src) return <Empty text="Customer tidak ditemukan." />
  const sa = f.samaPic ? { nama: f.pic.nama, email: f.pic.email } : f.superadmin
  const emailOk = (e) => /^\S+@\S+\.\S+$/.test(e || '')
  const npwpOk = /^\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3}$/.test(f.npwp) || /^\d{15,16}$/.test(f.npwp.replace(/\D/g, '')) && f.npwp.replace(/\D/g, '').length >= 15
  const dup = s.root.customers.some((c) => c.id !== id && c.superadmin.email.toLowerCase() === (sa.email || '').toLowerCase())
  const berakhir = f.status === 'Trial' ? addDays(f.mulai, 14) : addMonths(f.mulai, Number(f.durasi) || 12)
  const err = {
    nama: !f.nama.trim() && 'Wajib diisi', bidang: !f.bidang && 'Pilih bidang usaha', npwp: !npwpOk && 'Format NPWP: 00.000.000.0-000.000 atau 15–16 digit',
    alamat: !f.alamat.trim() && 'Wajib diisi', kota: !f.kota.trim() && 'Wajib diisi', telp: !/^[\d\s\-+()]{8,}$/.test(f.telp) && 'Nomor tidak valid', email: !emailOk(f.email) && 'E-mail tidak valid',
    picNama: !f.pic.nama.trim() && 'Wajib diisi', picJab: !f.pic.jabatan.trim() && 'Wajib diisi', picEmail: !emailOk(f.pic.email) && 'E-mail tidak valid', picHp: !/^[\d\s\-+]{9,}$/.test(f.pic.hp) && 'Nomor tidak valid',
    saNama: !sa.nama?.trim() && 'Wajib diisi', saEmail: !emailOk(sa.email) ? 'E-mail tidak valid' : dup && 'E-mail ini sudah dipakai Superadmin customer lain',
    modul: !f.modul.length && 'Pilih minimal satu modul', setuju: !f.setuju && 'Wajib dicentang',
  }
  const bad = Object.entries(err).filter(([, v]) => v)
  const E = ({ k }) => (tried && err[k] ? <span className="f-err" role="alert">{err[k]}</span> : null)
  const pickPaket = (p) => d.set({ ...f, paket: p, kuotaKaryawan: PAKET[p].kuotaKaryawan, kuotaBranch: PAKET[p].kuotaBranch, kuotaStorage: PAKET[p].kuotaStorage })
  const save = () => {
    const { samaPic, durasi, setuju, ...rest } = f
    const data = { ...rest, superadmin: sa, berakhir: src ? f.berakhir : berakhir }
    if (src) { api.updateCustomer(id, data); d.clear(); toast('Data customer diperbarui'); go('customer/c-' + id) }
    else { const nid = api.registerCustomer(data); d.clear(); go('customer/c-' + nid) }
  }
  return (
    <>
      <Crumb items={[['Customer', () => go('customer')], [src ? 'Edit customer' : 'Daftarkan customer']]} />
      <PageHead title={src ? `Edit ${src.nama}` : 'Pendaftaran Customer HRIS'} sub={src ? 'Perubahan dicatat di log aktivitas customer.' : 'Isian tersimpan otomatis sebagai draft. Setelah disimpan, akun Superadmin dibuat dan password acak dikirim ke e-mail Superadmin.'} />
      <DraftBar d={d} />
      <Card title="1. Data perusahaan"><div className="form two">
        <Field label="Nama perusahaan (sesuai akta) *"><input value={f.nama} onChange={(e) => set('nama', e.target.value)} placeholder="PT Contoh Sejahtera" /><E k="nama" /></Field>
        <Field label="Nama brand" hint="Opsional, tampil di aplikasi karyawan."><input value={f.brand} onChange={(e) => set('brand', e.target.value)} /></Field>
        <Field label="Bidang usaha *"><select value={f.bidang} onChange={(e) => set('bidang', e.target.value)}><option value="">Pilih bidang</option>{BIDANG.map((b) => <option key={b}>{b}</option>)}</select><E k="bidang" /></Field>
        <Field label="Jumlah karyawan saat ini"><select value={f.skala} onChange={(e) => set('skala', e.target.value)}><option value="">Pilih</option>{['1–50', '51–300', '300+'].map((b) => <option key={b}>{b}</option>)}</select></Field>
        <Field label="NPWP perusahaan *"><input inputMode="numeric" value={f.npwp} onChange={(e) => set('npwp', e.target.value)} placeholder="00.000.000.0-000.000" /><E k="npwp" /></Field>
        <Field label="Telepon kantor *"><input inputMode="tel" value={f.telp} onChange={(e) => set('telp', e.target.value)} placeholder="021-5550100" /><E k="telp" /></Field>
        <Field label="Alamat *"><input value={f.alamat} onChange={(e) => set('alamat', e.target.value)} /><E k="alamat" /></Field>
        <Field label="Kota/Kabupaten *"><input value={f.kota} onChange={(e) => set('kota', e.target.value)} /><E k="kota" /></Field>
        <Field label="Provinsi"><input value={f.provinsi} onChange={(e) => set('provinsi', e.target.value)} /></Field>
        <Field label="Kode pos"><input inputMode="numeric" maxLength={5} value={f.kodepos} onChange={(e) => set('kodepos', e.target.value.replace(/\D/g, ''))} /></Field>
        <Field label="E-mail perusahaan *"><input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="hr@perusahaan.co.id" /><E k="email" /></Field>
        <Field label="Website"><input value={f.website} onChange={(e) => set('website', e.target.value)} /></Field>
      </div></Card>
      <Card title="2. PIC (penanggung jawab)"><div className="form two">
        <Field label="Nama PIC *"><input value={f.pic.nama} onChange={(e) => setIn('pic', 'nama', e.target.value)} /><E k="picNama" /></Field>
        <Field label="Jabatan *"><input value={f.pic.jabatan} onChange={(e) => setIn('pic', 'jabatan', e.target.value)} /><E k="picJab" /></Field>
        <Field label="E-mail PIC *"><input type="email" value={f.pic.email} onChange={(e) => setIn('pic', 'email', e.target.value)} /><E k="picEmail" /></Field>
        <Field label="No. HP / WhatsApp *"><input inputMode="tel" value={f.pic.hp} onChange={(e) => setIn('pic', 'hp', e.target.value)} placeholder="0812-0000-0000" /><E k="picHp" /></Field>
      </div></Card>
      <Card title="3. Akun Superadmin (grup customer)">
        <p className="muted sm">Superadmin mengelola seluruh Branch, admin, dan karyawan milik customer ini. Password tidak diisi di sini: sistem membuat password acak dan mengirimkannya ke e-mail Superadmin, lalu Superadmin wajib menggantinya saat login pertama.</p>
        <label className="chk-l mb"><input type="checkbox" className="chk" checked={f.samaPic} onChange={(e) => set('samaPic', e.target.checked)} />Superadmin sama dengan PIC</label>
        <div className="form two">
          <Field label="Nama Superadmin *"><input disabled={f.samaPic} value={sa.nama} onChange={(e) => setIn('superadmin', 'nama', e.target.value)} /><E k="saNama" /></Field>
          <Field label="E-mail login Superadmin *" hint="Dipakai untuk login & menerima password."><input type="email" disabled={f.samaPic} value={sa.email} onChange={(e) => setIn('superadmin', 'email', e.target.value)} /><E k="saEmail" /></Field>
        </div>
      </Card>
      <Card title="4. Langganan & modul">
        <div className="pkg-pick" role="radiogroup" aria-label="Paket">{Object.entries(PAKET).map(([p, x]) => <label key={p} className={'pkg-opt' + (f.paket === p ? ' on' : '')}><input type="radio" name="paket" checked={f.paket === p} onChange={() => pickPaket(p)} /><strong>{p}</strong><small>{x.ket}</small><small>{x.kuotaKaryawan} karyawan · {x.kuotaBranch} Branch · {x.kuotaStorage} GB</small></label>)}</div>
        <div className="form two mt">
          <Field label="Kuota karyawan" hint="Bisa disesuaikan dari paket."><input type="number" min="1" value={f.kuotaKaryawan} onChange={(e) => set('kuotaKaryawan', Number(e.target.value))} /></Field>
          <Field label="Kuota Branch"><input type="number" min="1" value={f.kuotaBranch} onChange={(e) => set('kuotaBranch', Number(e.target.value))} /></Field>
          <Field label="Kuota storage (GB)" hint="Total file seluruh Superadmin & Branch."><input type="number" min="1" value={f.kuotaStorage ?? PAKET[f.paket].kuotaStorage} onChange={(e) => set('kuotaStorage', Number(e.target.value))} /></Field>
          {!src && <Field label="Status awal"><select value={f.status} onChange={(e) => set('status', e.target.value)}><option value="Trial">Trial 14 hari</option><option value="Aktif">Aktif (berlangganan)</option></select></Field>}
          {!src && <Field label="Tanggal mulai"><input type="date" value={f.mulai} onChange={(e) => set('mulai', e.target.value)} /></Field>}
          {!src && f.status === 'Aktif' && <Field label="Durasi langganan"><select value={f.durasi} onChange={(e) => set('durasi', Number(e.target.value))}>{[1, 3, 6, 12, 24].map((n) => <option key={n} value={n}>{n} bulan</option>)}</select></Field>}
          {!src && <Field label="Berakhir" hint="Dihitung otomatis."><input disabled value={tgl(berakhir)} /></Field>}
        </div>
        <h4>Modul aktif *</h4>
        <div className="mod-row">{MODUL.map(([k, l]) => <label key={k} className={`mod ${f.modul.includes(k) ? 'on' : ''}`}><input type="checkbox" checked={f.modul.includes(k)} onChange={(e) => set('modul', e.target.checked ? [...f.modul, k] : f.modul.filter((x) => x !== k))} />{l}</label>)}</div><E k="modul" />
      </Card>
      <Card title="5. Dokumen legal & catatan">
        <div className="form two">
          <Field label="Dokumen (NIB, akta, dll.)" hint="PDF/JPG, boleh lebih dari satu."><input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => set('dokumen', [...f.dokumen, ...Array.from(e.target.files).map((x) => x.name)])} /></Field>
          <Field label="Catatan internal"><textarea rows={3} value={f.catatan} onChange={(e) => set('catatan', e.target.value)} placeholder="Hanya terlihat oleh Root" /></Field>
        </div>
        {f.dokumen.length > 0 && <div className="chips">{f.dokumen.map((x, i) => <span key={i} className="chip">{x}<button className="icon-btn" aria-label={'Hapus dokumen ' + x} onClick={() => set('dokumen', f.dokumen.filter((_, j) => j !== i))}><Icon name="x" size={14} /></button></span>)}</div>}
        {!src && <label className="chk-l mt"><input type="checkbox" className="chk" checked={f.setuju} onChange={(e) => set('setuju', e.target.checked)} />Customer sudah menyetujui syarat layanan & perjanjian pemrosesan data karyawan (sesuai UU PDP).</label>}<E k="setuju" />
      </Card>
      <div className="row-end sticky-act">
        {tried && bad.length > 0 && <span className="txt-bad sm" role="alert">{bad.length} isian perlu diperbaiki</span>}
        <Btn kind="ghost" onClick={() => go(src ? 'customer/c-' + id : 'customer')}>Batal</Btn>
        <Btn onClick={() => { setTried(true); if (!bad.length) (src ? save() : setAsk(true)) }}>{src ? 'Simpan perubahan' : 'Daftarkan customer'}</Btn>
      </div>
      <Confirm open={ask} yes="Daftarkan" text={<>Daftarkan <b>{f.nama}</b> ({f.paket}, {f.status === 'Trial' ? 'Trial 14 hari' : `${f.durasi} bulan`})? Akun Superadmin <b>{sa.email}</b> dibuat dan password acak dikirim ke e-mail tersebut.</>} onNo={() => setAsk(false)} onYes={() => { setAsk(false); save() }} />
      {t}
    </>
  )
}

function CustomerDetail({ go, id }) {
  const s = useStore(); const [t, toast] = useToast(); const [sus, setSus] = useState(false); const [alasan, setAlasan] = useState(''); const [ext, setExt] = useState(false); const [bln, setBln] = useState(12); const [pk, setPk] = useState(''); const [rp, setRp] = useState(false)
  const c = s.root.customers.find((x) => x.id === id)
  if (!c) return <Empty text="Customer tidak ditemukan." />
  const u = usage(s, c); const h = sisaHari(c.berakhir)
  const logs = s.root.logs.filter((l) => l.customer === id).slice(0, 5)
  return (
    <>
      <Crumb items={[['Customer', () => go('customer')], [c.nama]]} />
      <PageHead title={c.nama} sub={`${c.kode} · ${c.bidang} · terdaftar ${tgl(c.createdAt)}`}>
        <div className="row-act">
          <SBadge s={c.status} />
          <Btn kind="ghost" icon="edit" onClick={() => go('customer/edit-' + id)}>Edit</Btn>
          <Btn kind="ghost" icon="calendar" perm="u" onClick={() => { setPk(c.paket); setExt(true) }}>Perpanjang</Btn>
          {c.status === 'Ditangguhkan' ? <Btn kind="ghost" icon="check" onClick={() => { api.setCustomerStatus(id, sisaHari(c.berakhir) < 0 ? 'Berakhir' : 'Aktif'); toast('Customer diaktifkan kembali') }}>Aktifkan kembali</Btn>
            : <Btn kind="danger" icon="lock" perm="u" onClick={() => { setAlasan(''); setSus(true) }}>Tangguhkan</Btn>}
        </div>
      </PageHead>
      {c.status === 'Ditangguhkan' && <div className="alert bad" role="status"><Icon name="lock" size={18} />Ditangguhkan: {c.alasan || '—'}. Superadmin, admin, Branch, dan karyawan customer ini tidak bisa login sampai diaktifkan kembali.</div>}
      {c.status !== 'Ditangguhkan' && h <= 30 && <div className="alert warn" role="status"><Icon name="calendar" size={18} />{h < 0 ? `Langganan lewat ${-h} hari.` : `${c.status === 'Trial' ? 'Trial' : 'Langganan'} berakhir ${h} hari lagi (${tgl(c.berakhir)}).`} Tawarkan perpanjangan.</div>}
      <div className="grid2">
        <Card title="Langganan">
          <dl className="dl"><dt>Paket</dt><dd>{c.paket}</dd><dt>Periode</dt><dd>{tgl(c.mulai)} – {tgl(c.berakhir)}</dd><dt>Modul</dt><dd>{c.modul.map((m) => MODUL.find((x) => x[0] === m)?.[1]).join(', ')}</dd></dl>
          <Meter label="Karyawan aktif" used={u.kar} max={c.kuotaKaryawan} /><Meter label="Branch" used={u.br} max={c.kuotaBranch} />
          {(() => { const st = storOf(s, c); return <button className="meter-link" onClick={() => go('storage/' + id)}><Meter label="Storage" used={fmtSize(st.sum)} max={kuotaGB(c) + ' GB'} pct={(st.sum / (kuotaGB(c) * GB)) * 100} /></button> })()}
        </Card>
        <Card title="Akun Superadmin" action={<Btn kind="ghost" icon="lock" perm="u" onClick={() => setRp(true)}>Reset password</Btn>}>
          <div className="who mb"><Avatar name={c.superadmin.nama} size={40} /><div><strong>{c.superadmin.nama}</strong><div className="muted sm">{c.superadmin.email}</div></div></div>
          <p className="muted sm">Superadmin bertindak sebagai grup: mengelola {u.br} Branch, {tenantOf(s, id).accounts.filter((a) => a.role === 'Admin').length} admin, dan {u.kar} karyawan.</p>
          <div className="row-act"><Btn kind="ghost" icon="users" onClick={() => go('data-customer/' + id)}>Lihat data turunan</Btn><Btn kind="ghost" icon="clock" onClick={() => go('audit-log/' + id)}>Log aktivitas</Btn></div>
        </Card>
      </div>
      <div className="grid2">
        <Card title="Perusahaan"><dl className="dl"><dt>Brand</dt><dd>{c.brand || '—'}</dd><dt>NPWP</dt><dd>{c.npwp}</dd><dt>Alamat</dt><dd>{c.alamat}, {c.kota}{c.provinsi ? ', ' + c.provinsi : ''} {c.kodepos}</dd><dt>Telepon</dt><dd>{c.telp}</dd><dt>E-mail</dt><dd>{c.email}</dd><dt>Website</dt><dd>{c.website || '—'}</dd><dt>Dokumen</dt><dd>{c.dokumen?.length ? c.dokumen.join(', ') : '—'}</dd></dl></Card>
        <Card title="PIC"><dl className="dl"><dt>Nama</dt><dd>{c.pic.nama}</dd><dt>Jabatan</dt><dd>{c.pic.jabatan}</dd><dt>E-mail</dt><dd>{c.pic.email}</dd><dt>HP</dt><dd>{c.pic.hp}</dd><dt>Catatan</dt><dd>{c.catatan || '—'}</dd></dl></Card>
      </div>
      <Card title="Aktivitas terakhir" action={<Btn kind="ghost" onClick={() => go('audit-log/' + id)}>Semua log</Btn>}>{logs.length ? <ul className="rlist">{logs.map((l) => <li key={l.id} className="rlog"><span className="muted sm">{jam(l.at)}</span><span><strong>{l.aksi}</strong><small>{l.aktor} ({l.peran}) · {l.detail}</small></span></li>)}</ul> : <Empty text="Belum ada aktivitas." />}</Card>

      <Confirm open={sus} title="Tangguhkan customer" yes="Tangguhkan" ok={alasan.trim().length >= 5} text={<>Semua akun <b>{c.nama}</b> tidak bisa login sampai diaktifkan kembali. Data tetap tersimpan.</>} onNo={() => setSus(false)} onYes={() => { api.setCustomerStatus(id, 'Ditangguhkan', alasan.trim()); setSus(false); toast('Customer ditangguhkan') }}>
        <Field label="Alasan (wajib, tercatat di log)"><textarea rows={2} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Contoh: tagihan perpanjangan belum dibayar" /></Field>
      </Confirm>
      <Modal open={ext} title="Perpanjang langganan" onClose={() => setExt(false)} footer={<><Btn kind="ghost" onClick={() => setExt(false)}>Batal</Btn><Btn onClick={() => { api.extendCustomer(id, bln, pk !== c.paket ? pk : null); setExt(false); toast('Langganan diperpanjang') }}>Perpanjang</Btn></>}>
        <div className="form"><Field label="Paket"><select value={pk} onChange={(e) => setPk(e.target.value)}>{Object.keys(PAKET).map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Durasi"><select value={bln} onChange={(e) => setBln(Number(e.target.value))}>{[1, 3, 6, 12, 24].map((n) => <option key={n} value={n}>{n} bulan</option>)}</select></Field>
          <p className="muted sm">Berakhir menjadi <b>{tgl(addMonths(c.berakhir > todayISO() ? c.berakhir : todayISO(), bln))}</b>. Customer Trial otomatis menjadi Aktif.</p></div>
      </Modal>
      <ResetModal open={rp} onClose={() => setRp(false)} acc={rp ? { customer: id, ...accountsOf(s, c)[0] } : null} onDone={() => toast('Password baru dikirim ke e-mail Superadmin')} />
      {t}
    </>
  )
}

// ---------------- Data turunan customer ----------------
export function CustomerData({ sub, go }) {
  if (!sub) return <CustomerDataList go={go} />
  return <CustomerDataDetail sub={sub} go={go} />
}

// Langkah 1: tabel seluruh customer, pilih salah satu untuk melihat data turunannya
function CustomerDataList({ go }) {
  const s = useStore(); const [t, toast] = useToast(); const [q, setQ] = useState(''); const [st, setSt] = useState(''); const [pk, setPk] = useState('')
  const rows = s.root.customers.map((c) => { const td = tenantOf(s, c.id); return { ...c, nBr: td.branches.length, nKar: td.employees.length, nAktif: td.employees.filter((e) => e.status !== 'Resign').length, nAkun: accountsOf(s, c).length } })
    .filter((c) => (!st || c.status === st) && (!pk || c.paket === pk) && (!q || [c.nama, c.kode, c.kota, c.superadmin.nama, c.superadmin.email].join(' ').toLowerCase().includes(q.toLowerCase())))
  const tot = (k) => rows.reduce((a, c) => a + c[k], 0)
  const xls = () => dlx(toast, [sheet('Customer', ['Kode', 'Perusahaan', 'Superadmin', 'Paket', 'Status', 'Branch', 'Kuota Branch', 'Karyawan aktif', 'Kuota karyawan', 'Total karyawan', 'Akun'],
    rows.map((c) => [c.kode, c.nama, c.superadmin.nama, c.paket, c.status, c.nBr, c.kuotaBranch, c.nAktif, c.kuotaKaryawan, c.nKar, c.nAkun]))], 'Data-turunan-semua-customer')
  return (
    <>
      <PageHead title="Data turunan customer" sub="Pilih customer untuk melihat Branch, karyawan, dan akun di bawah Superadmin-nya."><Btn kind="ghost" icon="download" onClick={xls}>Download Excel</Btn></PageHead>
      <div className="stats">
        <Stat icon="building" label="Customer" value={rows.length} /><Stat icon="layers" label="Branch" value={tot('nBr')} />
        <Stat icon="users" label="Karyawan aktif" value={tot('nAktif')} hint={`${tot('nKar')} total termasuk resign`} /><Stat icon="lock" label="Akun" value={tot('nAkun')} hint="Superadmin, admin, Branch" />
      </div>
      <div className="filters">
        <label className="fsel"><span>Status</span><select value={st} onChange={(e) => setSt(e.target.value)}><option value="">Semua status</option>{Object.keys(STATUS_T).map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="fsel"><span>Paket</span><select value={pk} onChange={(e) => setPk(e.target.value)}><option value="">Semua paket</option>{Object.keys(PAKET).map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="fsel grow"><span>Cari</span><span className="search"><Icon name="search" size={18} /><input placeholder="Nama perusahaan, kode, kota, Superadmin" value={q} onChange={(e) => setQ(e.target.value)} /></span></label>
      </div>
      <Card pad={false}><Table rows={rows} empty="Customer tidak ditemukan." onRow={(c) => go('data-customer/' + c.id)} cols={[
        { h: 'Kode', r: (c) => <span className="nowrap">{c.kode}</span> },
        { h: 'Perusahaan', r: (c) => <div><strong>{c.nama}</strong><div className="muted sm">{c.bidang} · {c.kota}</div></div> },
        { h: 'Superadmin', r: (c) => <div><div>{c.superadmin.nama}</div><div className="muted sm">{c.superadmin.email}</div></div> },
        { h: 'Paket', k: 'paket' },
        { h: 'Branch', right: true, r: (c) => <span>{c.nBr}<span className="muted sm"> / {c.kuotaBranch}</span></span> },
        { h: 'Karyawan aktif', right: true, r: (c) => <span>{c.nAktif}<span className="muted sm"> / {c.kuotaKaryawan}</span></span> },
        { h: 'Akun', right: true, k: 'nAkun' },
        { h: 'Status', r: (c) => <SBadge s={c.status} /> },
        { h: '', r: (c) => <Btn kind="ghost" icon="eye" onClick={(e) => { e.stopPropagation(); go('data-customer/' + c.id) }}>Lihat data</Btn> },
      ]} /></Card>
      {t}
    </>
  )
}

// Langkah 2: data turunan satu customer
function CustomerDataDetail({ sub, go }) {
  const s = useStore(); const [t, toast] = useToast()
  const cid = sub; const c = s.root.customers.find((x) => x.id === cid)
  const [tab, setTab] = useState('Branch'); const [q, setQ] = useState(''); const [fb, setFb] = useState(''); const [fs, setFs] = useState('')
  if (!c) return <Empty text="Customer tidak ditemukan." />
  const td = tenantOf(s, cid); const bname = (id) => td.branches.find((b) => b.id === id)?.name || '—'
  const cnt = (bid) => td.employees.filter((e) => e.branch === bid && e.status !== 'Resign').length
  const emps = td.employees.filter((e) => (!fb || e.branch === fb) && (!fs || e.status === fs) && (!q || [e.name, e.role, e.email].join(' ').toLowerCase().includes(q.toLowerCase())))
  const brs = td.branches.filter((b) => !q || [b.name, b.kota, b.pic].join(' ').toLowerCase().includes(q.toLowerCase()))
  const accs = accountsOf(s, c).filter((a) => !q || [a.nama, a.email, a.role].join(' ').toLowerCase().includes(q.toLowerCase()))
  const xls = () => dlx(toast, [
    sheet('Branch', ['Branch', 'Kota', 'PIC', 'E-mail', 'Karyawan aktif', 'Status'], td.branches.map((b) => [b.name, b.kota, b.pic, b.email, cnt(b.id), b.aktif ? 'Aktif' : 'Nonaktif'])),
    sheet('Karyawan', ['Nama', 'Branch', 'Jabatan', 'Tipe', 'Mulai', 'Status', 'E-mail'], td.employees.map((e) => [e.name, bname(e.branch), e.role, e.type, tgl(e.start), e.status, e.email])),
    sheet('Akun', ['Peran', 'Nama', 'E-mail', 'Status'], accountsOf(s, c).map((a) => [a.role, a.nama, a.email, a.aktif ? 'Aktif' : 'Nonaktif'])),
  ], `Data-${c.kode}`)
  return (
    <>
      <Crumb items={[['Data Turunan', () => go('data-customer')], [c.nama]]} />
      <PageHead title={c.nama} sub={`${c.kode} · Branch, karyawan, dan akun di bawah Superadmin. Root hanya melihat; perubahan data dilakukan Superadmin customer.`}><Btn kind="ghost" icon="download" onClick={xls}>Download Excel</Btn></PageHead>
      <div className="tree" aria-label="Hierarki"><span className="tree-n root"><Icon name="lock" size={16} />Root · Kirana</span><span>›</span><button className="tree-n" onClick={() => go('customer/c-' + cid)}><Icon name="building" size={16} />{c.nama} <SBadge s={c.status} /></button><span>›</span><span className="tree-n"><Icon name="user" size={16} />Superadmin: {c.superadmin.nama}</span><span>›</span><span className="tree-n">{td.branches.length} Branch</span><span>›</span><span className="tree-n">{td.employees.length} karyawan</span></div>
      <div className="grid2"><Card><Meter label="Karyawan aktif" used={usage(s, c).kar} max={c.kuotaKaryawan} /></Card><Card><Meter label="Branch" used={td.branches.length} max={c.kuotaBranch} /></Card></div>
      <Tabs tabs={[{ v: 'Branch', l: `Branch (${td.branches.length})` }, { v: 'Karyawan', l: `Karyawan (${td.employees.length})` }, { v: 'Akun', l: `Akun (${accountsOf(s, c).length})` }]} value={tab} onChange={(v) => { setTab(v); setQ('') }} />
      <div className="filters">
        {tab === 'Karyawan' && <><label className="fsel"><span>Branch</span><select value={fb} onChange={(e) => setFb(e.target.value)}><option value="">Semua Branch</option>{td.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label className="fsel"><span>Status</span><select value={fs} onChange={(e) => setFs(e.target.value)}><option value="">Semua status</option><option>Aktif</option><option>Resign</option></select></label></>}
        <label className="fsel grow"><span>Cari</span><span className="search"><Icon name="search" size={18} /><input placeholder="Cari…" value={q} onChange={(e) => setQ(e.target.value)} /></span></label>
      </div>
      <Card pad={false}>
        {tab === 'Branch' && <Table rows={brs} empty="Customer ini belum punya Branch. Superadmin customer membuatnya dari menu Akun Branch." cols={[{ h: 'Branch', r: (b) => <strong>{b.name}</strong> }, { h: 'Kota', k: 'kota' }, { h: 'PIC', k: 'pic' }, { h: 'E-mail', k: 'email' }, { h: 'Karyawan aktif', right: true, r: (b) => cnt(b.id) }, { h: 'Status', r: (b) => <Badge t={b.aktif ? 'ok' : 'bad'}>{b.aktif ? 'Aktif' : 'Nonaktif'}</Badge> }]} />}
        {tab === 'Karyawan' && <Table rows={emps} empty="Belum ada karyawan." cols={[{ h: 'Nama', r: (e) => <div className="who"><Avatar name={e.name} size={28} /><strong>{e.name}</strong></div> }, { h: 'Branch', r: (e) => bname(e.branch) }, { h: 'Jabatan', k: 'role' }, { h: 'Tipe', k: 'type' }, { h: 'Mulai', r: (e) => tgl(e.start) }, { h: 'Status', r: (e) => <Badge t={e.status === 'Resign' ? 'neutral' : 'ok'}>{e.status}</Badge> }]} />}
        {tab === 'Akun' && <Table rows={accs} empty="Belum ada akun." cols={[{ h: 'Peran', r: (a) => <Badge t="neutral">{a.role}</Badge> }, { h: 'Nama', r: (a) => <strong>{a.nama}</strong> }, { h: 'E-mail', k: 'email' }, { h: 'Status', r: (a) => <Badge t={a.aktif ? 'ok' : 'bad'}>{a.aktif ? 'Aktif' : 'Nonaktif'}</Badge> }, { h: '', r: () => <Btn kind="ghost" icon="lock" onClick={() => go('reset-password/' + cid)}>Reset password</Btn> }]} />}
      </Card>
      {t}
    </>
  )
}

// ---------------- Log aktivitas ----------------
export function ActivityLog({ sub, go }) {
  const s = useStore(); const [t, toast] = useToast()
  const [cid, setCid] = useState(sub || ''); const [kat, setKat] = useState(''); const [peran, setPeran] = useState(''); const [d1, setD1] = useState(''); const [d2, setD2] = useState(''); const [q, setQ] = useState('')
  const name = (id) => s.root.customers.find((c) => c.id === id)?.nama || '—'
  const rows = s.root.logs.filter((l) => (!cid || l.customer === cid) && (!kat || l.kategori === kat) && (!peran || l.peran === peran) && (!d1 || l.at.slice(0, 10) >= d1) && (!d2 || l.at.slice(0, 10) <= d2)
    && (!q || [l.aksi, l.detail, l.aktor].join(' ').toLowerCase().includes(q.toLowerCase())))
  const groups = cid ? [[cid, rows]] : s.root.customers.map((c) => [c.id, rows.filter((l) => l.customer === c.id)]).filter(([, r]) => r.length)
  const xls = () => dlx(toast, [sheet('Log aktivitas', ['Waktu', 'Customer', 'Aktor', 'Peran', 'Kategori', 'Aksi', 'Detail'], rows.map((l) => [jam(l.at), name(l.customer), l.aktor, l.peran, l.kategori, l.aksi, l.detail]))], 'Log-aktivitas')
  return (
    <>
      <PageHead title="Log aktivitas customer" sub="Jejak audit per customer: login, perubahan akun & izin, data karyawan, payroll, pengaturan, dan langganan."><Btn kind="ghost" icon="download" onClick={xls}>Download Excel</Btn></PageHead>
      <div className="filters">
        <label className="fsel"><span>Customer</span><select value={cid} onChange={(e) => setCid(e.target.value)}><option value="">Semua customer</option>{s.root.customers.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}</select></label>
        <label className="fsel"><span>Kategori</span><select value={kat} onChange={(e) => setKat(e.target.value)}><option value="">Semua kategori</option>{LOG_KAT.map((k) => <option key={k}>{k}</option>)}</select></label>
        <label className="fsel"><span>Peran</span><select value={peran} onChange={(e) => setPeran(e.target.value)}><option value="">Semua peran</option>{['Root', 'Superadmin', 'Admin', 'Branch', 'Sistem'].map((k) => <option key={k}>{k}</option>)}</select></label>
        <label className="fsel"><span>Dari</span><input type="date" value={d1} onChange={(e) => setD1(e.target.value)} /></label>
        <label className="fsel"><span>Sampai</span><input type="date" value={d2} onChange={(e) => setD2(e.target.value)} /></label>
        <label className="fsel grow"><span>Cari</span><span className="search"><Icon name="search" size={18} /><input placeholder="Aksi, detail, nama" value={q} onChange={(e) => setQ(e.target.value)} /></span></label>
      </div>
      {groups.length === 0 ? <Card><Empty text="Tidak ada aktivitas yang cocok." /></Card> : groups.map(([id, r]) => (
        <Card key={id} title={<span className="log-h">{name(id)} <span className="muted sm">{r.length} aktivitas</span></span>} pad={false}>
          <Table rows={r} empty="Tidak ada aktivitas." cols={[
            { h: 'Waktu', r: (l) => <span className="nowrap">{jam(l.at)}</span> },
            { h: 'Aktor', r: (l) => <div><strong>{l.aktor}</strong><div className="muted sm">{l.peran}</div></div> },
            { h: 'Kategori', r: (l) => <Badge t={l.kategori === 'Autentikasi' && /gagal/i.test(l.aksi) ? 'bad' : 'neutral'}>{l.kategori}</Badge> },
            { h: 'Aksi', r: (l) => <strong>{l.aksi}</strong> }, { h: 'Detail', k: 'detail' },
          ]} />
        </Card>))}
      {t}
    </>
  )
}

// ---------------- Reset password ----------------
function ResetModal({ open, onClose, acc, onDone }) {
  const [alasan, setAlasan] = useState(''); const [step, setStep] = useState(0)
  const close = () => { setAlasan(''); setStep(0); onClose() }
  if (!acc) return null
  const go = () => { setStep(1); setTimeout(() => { api.resetPassword({ customer: acc.customer, akun: acc.nama, role: acc.role, email: acc.email, alasan: alasan.trim() }); setStep(2); onDone && onDone() }, 900) }
  return (
    <Modal open={open} title="Reset password" onClose={close} footer={step === 2 ? <Btn onClick={close}>Selesai</Btn> : <><Btn kind="ghost" onClick={close}>Batal</Btn><Btn icon="send" disabled={step === 1 || alasan.trim().length < 5} onClick={go} perm="u">Kirim password baru</Btn></>}>
      {step < 2 ? (
        <div className="form">
          <div className="who"><Avatar name={acc.nama} size={40} /><div><strong>{acc.nama}</strong><div className="muted sm">{acc.role} · {acc.email}</div></div></div>
          <ul className="steps-ul"><li>Sistem membuat password acak 12 karakter.</li><li>Password dikirim hanya ke e-mail terdaftar <b>{maskEmail(acc.email)}</b>. Root tidak bisa melihatnya.</li><li>Password lama langsung tidak berlaku dan semua sesi login akun ini dikeluarkan.</li><li>Pemilik akun wajib mengganti password saat login berikutnya.</li></ul>
          <Field label="Alasan reset (wajib, tercatat di log)"><textarea rows={2} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Contoh: permintaan Superadmin via tiket #1234" /></Field>
          {step === 1 && <p className="muted sm" role="status">Membuat password & mengirim e-mail…</p>}
        </div>
      ) : <div className="center"><span className="q-ic ok"><Icon name="check" size={24} /></span><p>Password baru sudah dikirim ke <b>{maskEmail(acc.email)}</b>. Aktivitas ini tercatat di log customer.</p></div>}
    </Modal>
  )
}

export function ResetPassword({ sub, go }) {
  const s = useStore(); const [t, toast] = useToast()
  const [cid, setCid] = useState(sub || ''); const [role, setRole] = useState(''); const [q, setQ] = useState(''); const [acc, setAcc] = useState(null)
  const name = (id) => s.root.customers.find((c) => c.id === id)?.nama || '—'
  const all = useMemo(() => s.root.customers.flatMap((c) => accountsOf(s, c).map((a) => ({ ...a, customer: c.id, cst: c.status }))), [s])
  const rows = all.filter((a) => (!cid || a.customer === cid) && (!role || a.role === role) && (!q || [a.nama, a.email].join(' ').toLowerCase().includes(q.toLowerCase())))
  const last = (a) => s.root.resets.find((r) => r.email === a.email)
  return (
    <>
      <PageHead title="Reset password akun customer" sub="Password acak baru dikirim ke e-mail terdaftar pemilik akun. Root tidak pernah melihat password." />
      <div className="filters">
        <label className="fsel"><span>Customer</span><select value={cid} onChange={(e) => setCid(e.target.value)}><option value="">Semua customer</option>{s.root.customers.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}</select></label>
        <label className="fsel"><span>Peran</span><select value={role} onChange={(e) => setRole(e.target.value)}><option value="">Semua peran</option>{['Superadmin', 'Admin', 'Branch'].map((k) => <option key={k}>{k}</option>)}</select></label>
        <label className="fsel grow"><span>Cari</span><span className="search"><Icon name="search" size={18} /><input placeholder="Nama atau e-mail akun" value={q} onChange={(e) => setQ(e.target.value)} /></span></label>
      </div>
      <Card pad={false}><Table rows={rows} empty="Akun tidak ditemukan." cols={[
        { h: 'Akun', r: (a) => <div className="who"><Avatar name={a.nama} size={30} /><div><strong>{a.nama}</strong><div className="muted sm">{a.email}</div></div></div> },
        { h: 'Peran', r: (a) => <Badge t="neutral">{a.role}</Badge> }, { h: 'Customer', r: (a) => name(a.customer) },
        { h: 'Reset terakhir', r: (a) => { const r = last(a); return r ? <span className="sm">{jam(r.at)}</span> : <span className="muted sm">—</span> } },
        { h: '', r: (a) => a.cst === 'Ditangguhkan' ? <span className="muted sm">Customer ditangguhkan</span> : <Btn kind="ghost" icon="lock" onClick={() => setAcc(a)}>Reset password</Btn> },
      ]} /></Card>
      <Card title="Riwayat reset password" pad={false}><Table rows={s.root.resets.filter((r) => !cid || r.customer === cid)} empty="Belum ada reset password." cols={[
        { h: 'Waktu', r: (r) => jam(r.at) }, { h: 'Akun', r: (r) => <div><strong>{r.akun}</strong><div className="muted sm">{r.role} · {maskEmail(r.email)}</div></div> }, { h: 'Customer', r: (r) => name(r.customer) },
        { h: 'Alasan', k: 'alasan' }, { h: 'Oleh', k: 'oleh' }, { h: 'Status', r: (r) => <Badge t="ok">{r.status}</Badge> },
      ]} /></Card>
      <Note>Saat ini e-mail disimulasikan. Di produksi, Cloud Function membuat password acak, menyimpan hash-nya di Firebase Auth, lalu mengirim e-mail lewat Mailtrap.</Note>
      <ResetModal open={!!acc} onClose={() => setAcc(null)} acc={acc} onDone={() => toast('Password baru dikirim')} />
      {t}
    </>
  )
}

// ---------------- Profil Root ----------------
export function RootProfile() {
  const s = useStore(); const [t, toast] = useToast(); const u = s.root.user
  const [f, setF] = useState({ nama: u.nama, email: u.email, telp: u.telp, jabatan: u.jabatan })
  const [pw, setPw] = useState({ lama: '', baru: '', ulang: '' }); const [show, setShow] = useState(false)
  const rules = [[pw.baru.length >= 12, 'Minimal 12 karakter'], [/[A-Z]/.test(pw.baru) && /[a-z]/.test(pw.baru), 'Huruf besar & kecil'], [/\d/.test(pw.baru), 'Angka'], [/[^A-Za-z0-9]/.test(pw.baru), 'Simbol'], [pw.baru && pw.baru === pw.ulang, 'Konfirmasi sama']]
  const pwOk = pw.lama && rules.every(([ok]) => ok)
  const dirty = Object.keys(f).some((k) => f[k] !== u[k])
  return (
    <>
      <PageHead title="Profil" sub="Akun Root adalah pemilik aplikasi Kirana. Lindungi dengan password kuat dan verifikasi 2 langkah." />
      <div className="grid2">
        <Card title="Data diri">
          <div className="who mb"><Avatar name={f.nama} size={56} /><div><strong>{f.nama}</strong><div className="muted sm">Root · {f.jabatan}</div></div></div>
          <div className="form">
            <Field label="Nama"><input value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} /></Field>
            <Field label="E-mail" hint="Perubahan e-mail perlu verifikasi ulang lewat tautan yang dikirim ke e-mail baru."><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="No. HP"><input inputMode="tel" value={f.telp} onChange={(e) => setF({ ...f, telp: e.target.value })} /></Field>
            <Field label="Jabatan"><input value={f.jabatan} onChange={(e) => setF({ ...f, jabatan: e.target.value })} /></Field>
            <div className="row-end"><Btn disabled={!dirty || !f.nama.trim() || !/^\S+@\S+\.\S+$/.test(f.email)} onClick={() => { api.saveRootProfile(f); toast('Profil disimpan') }}>Simpan</Btn></div>
          </div>
        </Card>
        <Card title="Keamanan">
          <div className="form">
            <Field label="Password saat ini"><input type={show ? 'text' : 'password'} value={pw.lama} onChange={(e) => setPw({ ...pw, lama: e.target.value })} autoComplete="current-password" /></Field>
            <Field label="Password baru"><input type={show ? 'text' : 'password'} value={pw.baru} onChange={(e) => setPw({ ...pw, baru: e.target.value })} autoComplete="new-password" /></Field>
            <Field label="Ulangi password baru"><input type={show ? 'text' : 'password'} value={pw.ulang} onChange={(e) => setPw({ ...pw, ulang: e.target.value })} autoComplete="new-password" /></Field>
            <label className="chk-l"><input type="checkbox" className="chk" checked={show} onChange={(e) => setShow(e.target.checked)} />Tampilkan password</label>
            <ul className="pw-rules">{rules.map(([ok, l]) => <li key={l} className={ok ? 'ok' : ''}><Icon name={ok ? 'check' : 'dot'} size={14} />{l}</li>)}</ul>
            <div className="row-end"><Btn disabled={!pwOk} onClick={() => { api.setRootPassword(); setPw({ lama: '', baru: '', ulang: '' }); toast('Password diganti. Sesi di perangkat lain dikeluarkan.') }}>Ganti password</Btn></div>
            <p className="muted sm">Terakhir diganti {tgl(u.pwUpdated)}.</p>
            <hr />
            <div className="row-between"><div><strong>Verifikasi 2 langkah</strong><div className="muted sm">Kode dari aplikasi authenticator saat login.</div></div><Toggle on={u.twofa} onChange={(v) => { api.saveRootProfile({ twofa: v }); toast(v ? 'Verifikasi 2 langkah aktif' : 'Verifikasi 2 langkah dimatikan') }} label={u.twofa ? 'Aktif' : 'Mati'} /></div>
          </div>
        </Card>
      </div>
      <Card title="Riwayat login" pad={false}><Table rows={s.root.logins} cols={[{ h: 'Waktu', r: (l) => jam(l.at) }, { h: 'Perangkat', k: 'perangkat' }, { h: 'Lokasi', k: 'lokasi' }, { h: 'Hasil', r: (l) => <Badge t={l.ok ? 'ok' : 'bad'}>{l.ok ? 'Berhasil' : 'Gagal'}</Badge> }]} /></Card>
      {t}
    </>
  )
}

// ---------------- Storage ----------------
const GB = 1024 ** 3
export const fmtSize = (b) => { const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0; let v = b || 0; while (v >= 1024 && i < u.length - 1) { v /= 1024; i++ } return `${v.toLocaleString('id-ID', { maximumFractionDigits: v >= 100 || i < 2 ? 0 : 1 })} ${u[i]}` }
const kuotaGB = (c) => c.kuotaStorage || PAKET[c.paket]?.kuotaStorage || 0
const zero = () => Object.fromEntries(FILE_TYPES.map((t) => [t.k, 0]))
const add = (a, b) => Object.fromEntries(FILE_TYPES.map((t) => [t.k, (a[t.k] || 0) + (b[t.k] || 0)]))
const sumV = (v) => FILE_TYPES.reduce((a, t) => a + (v[t.k] || 0), 0)
const nFiles = (v) => FILE_TYPES.reduce((a, t) => a + Math.round((v[t.k] || 0) / t.avg), 0)
function storOf(s, c) {
  const st = s.root.storage?.[c.id] || { superadmin: zero(), branches: {} }
  const td = tenantOf(s, c.id)
  const levels = [{ k: 'sa', l: 'Superadmin (pusat)', sub: c.superadmin.nama, v: { ...zero(), ...st.superadmin } },
    ...td.branches.map((b) => ({ k: b.id, l: b.name, sub: b.kota, v: { ...zero(), ...(st.branches[b.id] || {}) } }))]
  const tot = levels.reduce((a, l) => add(a, l.v), zero())
  return { levels, tot, sum: sumV(tot) }
}
const pctOf = (c, sum) => (sum / Math.max(1, kuotaGB(c) * GB)) * 100
const TypeTable = ({ v, label }) => { const sum = sumV(v) || 1; return (
  <Table rows={FILE_TYPES.map((t) => ({ ...t, b: v[t.k] || 0 }))} cols={[
    { h: 'Jenis file', r: (t) => <span className="ft"><i style={{ background: t.c }} /><b>{t.l}</b></span> }, { h: 'Isi', r: (t) => <span className="muted sm">{t.ket}</span> },
    { h: 'Ukuran', right: true, r: (t) => <b className="nowrap">{fmtSize(t.b)}</b> }, { h: 'Jumlah file (perkiraan)', right: true, r: (t) => Math.round(t.b / t.avg).toLocaleString('id-ID') }, { h: 'Porsi', right: true, r: (t) => `${Math.round((t.b / sum) * 100)}%` },
  ]} />) }

export function Storage({ sub, go }) {
  if (sub) return <StorageDetail id={sub} go={go} />
  return <StorageList go={go} />
}

function StorageList({ go }) {
  const s = useStore(); const [t, toast] = useToast(); const [q, setQ] = useState(''); const [sort, setSort] = useState('pakai')
  const all = s.root.customers.map((c) => { const st = storOf(s, c); return { c, st, pct: pctOf(c, st.sum) } })
  const tot = all.reduce((a, x) => add(a, x.st.tot), zero()); const sum = sumV(tot)
  const kuota = all.reduce((a, x) => a + kuotaGB(x.c), 0)
  const rows = all.filter((x) => !q || [x.c.nama, x.c.kode].join(' ').toLowerCase().includes(q.toLowerCase())).sort((a, b) => (sort === 'persen' ? b.pct - a.pct : sort === 'nama' ? a.c.nama.localeCompare(b.c.nama) : b.st.sum - a.st.sum))
  const short = (c) => c.brand || c.nama.replace(/^(PT|CV)\s+/, '')
  const xls = () => dlx(toast, [
    sheet('Per customer', ['Kode', 'Customer', 'Paket', 'Kuota (GB)', 'Terpakai (GB)', 'Terpakai (%)', ...FILE_TYPES.map((x) => x.l + ' (GB)'), 'Jumlah file'],
      all.map((x) => [x.c.kode, x.c.nama, x.c.paket, kuotaGB(x.c), +(x.st.sum / GB).toFixed(2), Math.round(x.pct), ...FILE_TYPES.map((ft) => +((x.st.tot[ft.k] || 0) / GB).toFixed(2)), nFiles(x.st.tot)])),
    sheet('Per Superadmin & Branch', ['Customer', 'Tingkat', 'Nama', ...FILE_TYPES.map((x) => x.l + ' (GB)'), 'Total (GB)'],
      all.flatMap((x) => x.st.levels.map((l) => [x.c.nama, l.k === 'sa' ? 'Superadmin' : 'Branch', l.k === 'sa' ? l.sub : l.l, ...FILE_TYPES.map((ft) => +((l.v[ft.k] || 0) / GB).toFixed(2)), +(sumV(l.v) / GB).toFixed(2)]))),
  ], 'Storage-customer')
  return (
    <>
      <PageHead title="Storage" sub="Penyimpanan file yang dipakai tiap customer, dirinci per Superadmin (pusat) dan Branch, menurut jenis file."><Btn kind="ghost" icon="download" onClick={xls}>Download Excel</Btn></PageHead>
      <div className="stats">
        <Stat icon="layers" label="Total terpakai" value={fmtSize(sum)} hint={`dari ${kuota.toLocaleString('id-ID')} GB kuota (${Math.round((sum / (kuota * GB)) * 100)}%)`} />
        <Stat icon="doc" label="Jumlah file" value={nFiles(tot).toLocaleString('id-ID')} hint="perkiraan dari rata-rata ukuran" />
        <Stat icon="test" label="Jenis terbesar" value={FILE_TYPES.slice().sort((a, b) => tot[b.k] - tot[a.k])[0].l} hint={fmtSize(Math.max(...FILE_TYPES.map((x) => tot[x.k])))} />
        <Stat icon="calendar" label="Customer ≥ 80% kuota" value={all.filter((x) => x.pct >= 80).length} hint="perlu tambah kuota / bersihkan file" />
      </div>
      <div className="dgrid">
        <Card title="Komposisi jenis file · semua customer">
          <SegBar label="Komposisi storage menurut jenis file" parts={FILE_TYPES.map((x) => ({ l: x.l, v: +((tot[x.k] || 0) / GB).toFixed(1), c: x.c }))} />
          <p className="muted sm mt">Angka dalam GB. Persentase dari total {fmtSize(sum)}.</p>
        </Card>
        <Card className="d-wide" title="Storage per customer" action={<span className="muted sm">klik baris untuk rincian</span>}>
          <StackRows label="Bar bertumpuk storage per customer menurut jenis file" keys={FILE_TYPES} fmtV={fmtSize} onRow={(r) => go('storage/' + r.k)} rows={all.slice().sort((a, b) => b.st.sum - a.st.sum).map((x) => ({ k: x.c.id, l: short(x.c), sub: `${Math.round(x.pct)}% dari ${kuotaGB(x.c)} GB`, v: x.st.tot }))} />
        </Card>
      </div>
      <div className="filters">
        <label className="fsel"><span>Urutkan</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="pakai">Terpakai terbesar</option><option value="persen">% kuota tertinggi</option><option value="nama">Nama A–Z</option></select></label>
        <label className="fsel grow"><span>Cari</span><span className="search"><Icon name="search" size={18} /><input placeholder="Nama customer atau kode" value={q} onChange={(e) => setQ(e.target.value)} /></span></label>
      </div>
      <Card pad={false}><Table rows={rows} empty="Customer tidak ditemukan." onRow={(x) => go('storage/' + x.c.id)} cols={[
        { h: 'Customer', r: (x) => <div><strong>{x.c.nama}</strong><div className="muted sm nowrap">{x.c.kode} · {x.c.paket}</div></div> },
        { h: 'Terpakai / kuota', r: (x) => <div className="st-m"><div className="nowrap"><b>{fmtSize(x.st.sum)}</b> <span className="muted sm">/ {kuotaGB(x.c)} GB</span></div><span className="meter-b"><i style={{ width: Math.max(2, Math.min(100, x.pct)) + '%' }} className={x.pct >= 80 ? 'hot' : ''} /></span></div> },
        ...FILE_TYPES.map((ft) => ({ h: ft.l, right: true, r: (x) => <span className="nowrap">{fmtSize(x.st.tot[ft.k])}</span> })),
        { h: 'File', right: true, r: (x) => nFiles(x.st.tot).toLocaleString('id-ID') },
        { h: '', r: () => <span className="muted" aria-hidden="true"><Icon name="arrowRight" size={18} /></span> },
      ]} /></Card>
      {t}
    </>
  )
}

function StorageDetail({ id, go }) {
  const s = useStore(); const [t, toast] = useToast(); const [lv, setLv] = useState('')
  const c = s.root.customers.find((x) => x.id === id)
  if (!c) return <Empty text="Customer tidak ditemukan." />
  const st = storOf(s, c); const pct = pctOf(c, st.sum)
  const sel = st.levels.find((l) => l.k === lv); const v = sel ? sel.v : st.tot
  const xls = () => dlx(toast, [
    sheet('Per tingkat', ['Tingkat', 'Nama', ...FILE_TYPES.map((x) => x.l), 'Total', 'Jumlah file'], [...st.levels.map((l) => [l.k === 'sa' ? 'Superadmin' : 'Branch', l.k === 'sa' ? l.sub : l.l, ...FILE_TYPES.map((ft) => fmtSize(l.v[ft.k])), fmtSize(sumV(l.v)), nFiles(l.v)]), ['Total', '', ...FILE_TYPES.map((ft) => fmtSize(st.tot[ft.k])), fmtSize(st.sum), nFiles(st.tot)]]),
    sheet('Per jenis file', ['Jenis file', 'Isi', 'Ukuran (GB)', 'Jumlah file'], FILE_TYPES.map((ft) => [ft.l, ft.ket, +((st.tot[ft.k] || 0) / GB).toFixed(2), Math.round((st.tot[ft.k] || 0) / ft.avg)])),
  ], `Storage-${c.kode}`)
  return (
    <>
      <Crumb items={[['Storage', () => go('storage')], [c.nama]]} />
      <PageHead title={`Storage · ${c.nama}`} sub={`${c.kode} · paket ${c.paket} · Superadmin ${c.superadmin.nama}`}><div className="row-act"><Btn kind="ghost" onClick={() => go('customer/c-' + id)}>Profil customer</Btn><Btn kind="ghost" icon="download" onClick={xls}>Download Excel</Btn></div></PageHead>
      {pct >= 80 && <div className="alert warn" role="status"><Icon name="layers" size={18} />Storage sudah {Math.round(pct)}% dari kuota {kuotaGB(c)} GB. Tawarkan tambah kuota atau pembersihan file lama.</div>}
      <div className="stats">
        <Stat icon="layers" label="Terpakai" value={fmtSize(st.sum)} hint={`${Math.round(pct)}% dari ${kuotaGB(c)} GB`} />
        <Stat icon="doc" label="Jumlah file" value={nFiles(st.tot).toLocaleString('id-ID')} hint="perkiraan" />
        <Stat icon="user" label="Superadmin (pusat)" value={fmtSize(sumV(st.levels[0].v))} hint={`${Math.round((sumV(st.levels[0].v) / Math.max(1, st.sum)) * 100)}% dari total`} />
        <Stat icon="building" label="Branch" value={fmtSize(st.sum - sumV(st.levels[0].v))} hint={`${st.levels.length - 1} Branch`} />
      </div>
      <Card><Meter label="Storage terpakai" used={fmtSize(st.sum)} max={kuotaGB(c) + ' GB'} pct={pct} /></Card>
      <div className="dgrid">
        <Card title={`Komposisi jenis file · ${sel ? (sel.k === 'sa' ? 'Superadmin (pusat)' : sel.l) : 'semua tingkat'}`} action={<label className="fsel"><span className="sr-only">Tingkat</span><select value={lv} onChange={(e) => setLv(e.target.value)} aria-label="Pilih tingkat"><option value="">Semua tingkat</option>{st.levels.map((l) => <option key={l.k} value={l.k}>{l.l}</option>)}</select></label>}>
          <SegBar label="Komposisi storage menurut jenis file (GB)" parts={FILE_TYPES.map((x) => ({ l: x.l, v: +((v[x.k] || 0) / GB).toFixed(1), c: x.c }))} />
        </Card>
        <Card className="d-wide" title="Storage per Superadmin & Branch" action={<span className="muted sm">klik baris untuk komposisi</span>}>
          <StackRows label="Bar bertumpuk storage per tingkat menurut jenis file" keys={FILE_TYPES} fmtV={fmtSize} onRow={(r) => setLv(r.k)} rows={st.levels.map((l) => ({ k: l.k, l: l.l, sub: l.sub, v: l.v }))} />
        </Card>
      </div>
      <Card title="Rincian per Superadmin & Branch" pad={false}><div className="tbl-wrap"><table className="tbl st-t">
        <thead><tr><th>Tingkat</th>{FILE_TYPES.map((ft) => <th key={ft.k} className="r"><span className="ft"><i style={{ background: ft.c }} />{ft.l}</span></th>)}<th className="r">Total</th><th className="r">File</th></tr></thead>
        <tbody>{st.levels.map((l) => <tr key={l.k} className={lv === l.k ? 'sel' : ''} onClick={() => setLv(l.k)}><td data-h=""><strong>{l.l}</strong><div className="muted sm">{l.k === 'sa' ? 'Superadmin · ' : 'Branch · '}{l.sub}</div></td>{FILE_TYPES.map((ft) => <td key={ft.k} data-h={ft.l} className="r nowrap">{fmtSize(l.v[ft.k])}</td>)}<td data-h="Total" className="r nowrap"><b>{fmtSize(sumV(l.v))}</b></td><td data-h="File" className="r">{nFiles(l.v).toLocaleString('id-ID')}</td></tr>)}</tbody>
        <tfoot><tr><td data-h=""><b>Total semua tingkat</b></td>{FILE_TYPES.map((ft) => <td key={ft.k} data-h={ft.l} className="r nowrap"><b>{fmtSize(st.tot[ft.k])}</b></td>)}<td data-h="Total" className="r nowrap"><b>{fmtSize(st.sum)}</b></td><td data-h="File" className="r"><b>{nFiles(st.tot).toLocaleString('id-ID')}</b></td></tr></tfoot>
      </table></div></Card>
      <Card title="Rincian per jenis file" pad={false}><TypeTable v={st.tot} /></Card>
      {t}
    </>
  )
}
export { tgl, jam, sheet, dlx, Crumb, Confirm, Meter, sisaHari, todayISO }
