// Superadmin › Inventaris › Audit Aset: register barang masuk, rusak, hilang, servis; rekap, pergerakan, dashboard.
import React, { useState } from 'react'
import { useStore, api } from '../services/store.js'
import { Btn, Card, Badge, Table, Modal, Field, useToast, PageHead, Note, Icon, Empty, Stat, Avatar } from '../components/ui.jsx'
import { HBars, SegBar, Columns } from '../components/charts.jsx'
import { useLookup, fmtDate } from './shared.jsx'
import { rupiah } from '../services/payroll.js'
import { exportXlsx } from '../services/export.js'
import { statusOf, holderOf, KONDISI, hargaOf } from '../data/assets.js'

const BL3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const ST_T = { Tersedia: 'neutral', Dipakai: 'ok', 'Dalam servis': 'warn', Rusak: 'bad', Hilang: 'bad' }
const ST_C = { Tersedia: '#2a78d6', Dipakai: '#2f8f4e', 'Dalam servis': '#d9a400', Rusak: '#c0452a', Hilang: '#6250d6' }
const JN_T = { Masuk: 'ok', Serah: 'neutral', Kembali: 'neutral', Rusak: 'bad', Servis: 'warn', 'Selesai servis': 'ok', Hilang: 'bad' }
const KD_T = { Baik: 'ok', 'Rusak ringan': 'warn', 'Rusak sedang': 'warn', 'Rusak berat': 'bad' }
const jt = (n) => Math.round(n / 1e5) / 10
const todayISO = () => new Date().toISOString().slice(0, 10)
const Crumb = ({ items }) => <nav className="crumb" aria-label="Breadcrumb">{items.map(([l, fn], i) => <React.Fragment key={i}>{i > 0 && <span>›</span>}{fn ? <button onClick={fn}>{l}</button> : <b>{l}</b>}</React.Fragment>)}</nav>
const TABS = [['dashboard', 'Dashboard & rekap'], ['aset', 'Daftar aset'], ['gerak', 'Pergerakan barang']]

export function AuditAset({ go, tab: t0 }) {
  const s = useStore(); const { emp, branch } = useLookup(); const [t, toast] = useToast()
  const [tab, setTab] = useState(TABS.some(([k]) => k === t0) ? t0 : 'dashboard')
  const [y, setY] = useState('2026'); const [fb, setFb] = useState(''); const [fk, setFk] = useState('')
  const [st, setSt] = useState(''); const [jn, setJn] = useState(''); const [q, setQ] = useState('')
  const [m, setM] = useState(null); const [hist, setHist] = useState(null)
  const kats = s.invCategories.map((c) => c.name)
  const A = s.assets.filter((a) => (!fb || a.branch === fb) && (!fk || a.kategori === fk))
  const ids = new Set(A.map((a) => a.id)); const aOf = (id) => s.assets.find((a) => a.id === id) || {}
  const E = s.assetEvents.filter((e) => ids.has(e.asset))
  const EY = E.filter((e) => !y || (e.tgl || '').startsWith(y))
  const stat = (a) => statusOf(s, a)
  const servCost = (list) => list.filter((e) => e.jenis === 'Servis').reduce((x, e) => x + (e.biaya || 0), 0)
  const masukY = EY.filter((e) => e.jenis === 'Masuk'); const servY = EY.filter((e) => e.jenis === 'Servis'); const rusakY = EY.filter((e) => e.jenis === 'Rusak'); const hilangY = EY.filter((e) => e.jenis === 'Hilang')
  const nilai = (l) => l.reduce((x, a) => x + (a.harga || 0), 0)
  const pjName = (id) => (id ? emp(id).name : '—')
  const xls = () => { try { const H = (h) => ({ v: h, fill: '0A5950', color: 'FFFFFF', bold: true, border: true }); exportXlsx({ file: `Audit-aset-${y || 'semua'}`, sheets: [
    { name: 'Rekap kategori', rows: [['Kategori', 'Jumlah', 'Nilai perolehan', 'Dipakai', 'Tersedia', 'Dalam servis', 'Rusak', 'Hilang', `Biaya servis ${y}`].map(H), ...kats.map((k) => { const l = A.filter((a) => a.kategori === k); return [k, l.length, nilai(l), ...['Dipakai', 'Tersedia', 'Dalam servis', 'Rusak', 'Hilang'].map((x) => l.filter((a) => stat(a) === x).length), servCost(EY.filter((e) => aOf(e.asset).kategori === k))] })] },
    { name: 'Daftar aset', rows: [['Kode', 'Nama', 'Kategori', 'Branch', 'Tgl beli', 'Harga', 'Vendor', 'Kondisi', 'Status', 'Pemegang'].map(H), ...A.map((a) => [a.kode, a.nama, a.kategori, branch(a.branch), a.tglBeli, a.harga, a.vendor, a.kondisi, stat(a), holderOf(s, a) ? emp(holderOf(s, a).emp).name : ''])] },
    { name: 'Pergerakan', rows: [['Tanggal', 'Jenis', 'Kode', 'Aset', 'Kategori', 'Karyawan/PJ', 'Keterangan', 'Nilai/Biaya', 'Tingkat', 'Bisa dipakai'].map(H), ...EY.map((e) => [e.tgl, e.jenis, aOf(e.asset).kode, aOf(e.asset).nama, aOf(e.asset).kategori, pjName(e.emp || e.pj), e.ket || '', e.nilai || e.biaya || e.gantiRugi || '', e.tingkat || '', e.bisaDipakai == null ? '' : e.bisaDipakai ? 'Ya' : 'Tidak'])] },
  ] }); toast('Excel audit aset diunduh') } catch (err) { toast('Unduhan diblokir di pratinjau ini') } }
  const jump = (id) => setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  const AssetCell = ({ a }) => <button className="linkish" onClick={() => setHist(a)}><span className="mono sm">{a.kode}</span> {a.nama}</button>
  return (
    <>
      <Crumb items={[['Inventaris', () => go('inventaris')], ['Audit Aset']]} />
      <PageHead title="Audit Aset Inventaris" sub="Catatan lengkap barang milik kantor: barang masuk (pembelian), serah terima, kerusakan, servis, dan kehilangan beserta nilainya.">
        <div className="row-act"><Btn kind="ghost" icon="download" onClick={xls}>Download Excel</Btn>
          <Btn kind="ghost" icon="x" perm="u" onClick={() => setM({ k: 'rusak', tgl: todayISO(), tingkat: 'Rusak ringan', bisaDipakai: true, asset: '', pj: '', ket: '' })}>Lapor rusak</Btn>
          <Btn kind="ghost" icon="search" perm="u" onClick={() => setM({ k: 'hilang', tgl: todayISO(), asset: '', pj: '', ket: '', gantiRugi: '' })}>Lapor hilang</Btn>
          <Btn kind="ghost" icon="settings" perm="u" onClick={() => setM({ k: 'servis', tgl: todayISO(), asset: '', vendor: '', ket: '', biaya: '', selesai: false })}>Catat servis</Btn>
          <Btn icon="plus" perm="c" onClick={() => setM({ k: 'masuk', tglBeli: todayISO(), nama: '', kategori: kats[0], branch: 'b1', harga: '', vendor: '', qty: 1 })}>Catat barang masuk</Btn></div>
      </PageHead>
      <div id="as-tabs" className="anchor" />
      <div className="tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      <div className="filters">
        <label className="fsel"><span>Tahun</span><select value={y} onChange={(e) => setY(e.target.value)}><option value="">Semua tahun</option>{['2026', '2025'].map((v) => <option key={v}>{v}</option>)}</select></label>
        <label className="fsel"><span>Branch</span><select value={fb} onChange={(e) => setFb(e.target.value)}><option value="">Semua Branch</option>{s.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label className="fsel"><span>Kategori</span><select value={fk} onChange={(e) => setFk(e.target.value)}><option value="">Semua kategori</option>{kats.map((k) => <option key={k}>{k}</option>)}</select></label>
      </div>

      {tab === 'dashboard' && <>
        <div className="rk-tiles" role="group" aria-label="Rekap aset">{[
          ['Total aset', 'box', A.length, `nilai ${rupiah(nilai(A))}`, '#8f9893', () => { setSt(''); setTab('aset'); jump('as-tabs') }],
          [`Barang masuk ${y || ''}`, 'plus', masukY.length, rupiah(masukY.reduce((x, e) => x + (e.nilai || 0), 0)), '#2f8f4e', () => { setJn('Masuk'); setTab('gerak'); jump('as-tabs') }],
          [`Biaya servis ${y || ''}`, 'settings', rupiah(servCost(servY)), `${servY.length} kali servis`, '#d9a400', () => jump('as-servis')],
          ['Rusak', 'x', rusakY.length, `${rusakY.filter((e) => !e.bisaDipakai).length} tidak bisa dipakai · ${rusakY.length} kejadian`, '#c0452a', () => jump('as-rusak')],
          ['Hilang', 'search', hilangY.length, `nilai ${rupiah(hilangY.reduce((x, e) => x + (aOf(e.asset).harga || 0), 0))}`, '#6250d6', () => jump('as-hilang')],
        ].map(([l, ic, v, sub, c, fn]) => <button key={l} className="rk-tile" style={{ borderTopColor: c }} onClick={fn}><span className="rk-h"><Icon name={ic} size={18} />{l}</span><b>{v}</b><small>{sub}</small><small className="rk-br">Lihat data →</small></button>)}</div>
        <div className="dgrid two">
          <Card title="Status aset"><SegBar label="Jumlah aset per status" parts={['Dipakai', 'Tersedia', 'Dalam servis', 'Rusak', 'Hilang'].map((x) => ({ l: x, v: A.filter((a) => stat(a) === x).length, c: ST_C[x] }))} /></Card>
          <Card title="Nilai aset per kategori" action={<span className="muted sm">Rp juta</span>}><HBars label="Nilai perolehan per kategori (juta rupiah)" rows={kats.map((k) => ({ l: k, v: jt(nilai(A.filter((a) => a.kategori === k))) })).filter((r) => r.v)} /></Card>
          <Card title={`Barang masuk per bulan ${y || '2026'}`} action={<span className="muted sm">jumlah barang</span>}><Columns label="Barang masuk per bulan" height={170} points={BL3.map((l, i) => ({ l, v: E.filter((e) => e.jenis === 'Masuk' && e.tgl.startsWith(`${y || '2026'}-${String(i + 1).padStart(2, '0')}`)).length }))} /></Card>
          <Card title={`Biaya servis per bulan ${y || '2026'}`} action={<span className="muted sm">Rp ribu</span>}><Columns label="Biaya servis per bulan (ribu rupiah)" height={170} points={BL3.map((l, i) => ({ l, v: Math.round(servCost(E.filter((e) => e.tgl.startsWith(`${y || '2026'}-${String(i + 1).padStart(2, '0')}`))) / 1000) }))} /></Card>
        </div>
        <Card title="Rekap per kategori" pad={false}><Table rows={kats.map((k) => { const l = A.filter((a) => a.kategori === k); return { k, l } }).filter((r) => r.l.length)} cols={[
          { h: 'Kategori', r: (r) => <strong>{r.k}</strong> }, { h: 'Jumlah', right: true, r: (r) => r.l.length }, { h: 'Nilai perolehan', right: true, r: (r) => <span className="nowrap">{rupiah(nilai(r.l))}</span> },
          ...['Dipakai', 'Tersedia', 'Dalam servis', 'Rusak', 'Hilang'].map((x) => ({ h: x, right: true, r: (r) => { const n = r.l.filter((a) => stat(a) === x).length; return n ? (x === 'Rusak' || x === 'Hilang' ? <b className="txt-bad">{n}</b> : n) : <span className="muted">0</span> } })),
          { h: `Biaya servis ${y}`, right: true, r: (r) => <span className="nowrap">{rupiah(servCost(EY.filter((e) => aOf(e.asset).kategori === r.k)))}</span> },
        ]} /></Card>
        <div id="as-hilang" className="anchor" />
        <Card title={<span>Barang hilang <span className="muted sm">· {hilangY.length} kejadian {y}</span></span>} pad={false}>{hilangY.length ? <Table rows={hilangY} cols={[
          { h: 'Tanggal', r: (e) => <span className="nowrap">{fmtDate(e.tgl)}</span> }, { h: 'Aset', r: (e) => <AssetCell a={aOf(e.asset)} /> }, { h: 'Kategori', r: (e) => aOf(e.asset).kategori },
          { h: 'Penanggung jawab', r: (e) => <strong>{pjName(e.pj)}</strong> }, { h: 'Alasan / kronologi', r: (e) => <span className="sm">{e.ket}</span> },
          { h: 'Nilai', right: true, r: (e) => <span className="nowrap">{rupiah(aOf(e.asset).harga)}</span> }, { h: 'Ganti rugi', right: true, r: (e) => e.gantiRugi ? <span className="nowrap">{rupiah(e.gantiRugi)}</span> : <span className="muted">—</span> },
        ]} /> : <Empty text="Tidak ada barang hilang." />}</Card>
        <div id="as-rusak" className="anchor" />
        <Card title={<span>Barang rusak <span className="muted sm">· {rusakY.length} kejadian {y}</span></span>} pad={false}>{rusakY.length ? <Table rows={rusakY} cols={[
          { h: 'Tanggal', r: (e) => <span className="nowrap">{fmtDate(e.tgl)}</span> }, { h: 'Aset', r: (e) => <AssetCell a={aOf(e.asset)} /> },
          { h: 'Tingkat', r: (e) => <Badge t={KD_T[e.tingkat]}>{e.tingkat}</Badge> }, { h: 'Masih bisa dipakai?', r: (e) => e.bisaDipakai ? <Badge t="ok">Masih bisa</Badge> : <Badge t="bad">Tidak sama sekali</Badge> },
          { h: 'Penanggung jawab', r: (e) => pjName(e.pj) }, { h: 'Keterangan', r: (e) => <span className="sm">{e.ket}</span> }, { h: 'Status sekarang', r: (e) => <Badge t={ST_T[stat(aOf(e.asset))]}>{stat(aOf(e.asset))}</Badge> },
        ]} /> : <Empty text="Tidak ada laporan kerusakan." />}</Card>
        <div id="as-servis" className="anchor" />
        <Card title={<span>Perawatan & servis <span className="muted sm">· {servY.length} kali · {rupiah(servCost(servY))}</span></span>} pad={false}>{servY.length ? <Table rows={servY} cols={[
          { h: 'Tanggal', r: (e) => <span className="nowrap">{fmtDate(e.tgl)}</span> }, { h: 'Aset', r: (e) => <AssetCell a={aOf(e.asset)} /> }, { h: 'Vendor', r: (e) => e.vendor || '—' },
          { h: 'Pekerjaan', r: (e) => <span className="sm">{e.ket}</span> }, { h: 'Biaya', right: true, r: (e) => e.biaya ? <b className="nowrap">{rupiah(e.biaya)}</b> : <span className="muted">Gratis</span> },
          { h: 'Status', r: (e) => stat(aOf(e.asset)) === 'Dalam servis' && !s.assetEvents.some((x) => x.asset === e.asset && x.jenis === 'Selesai servis' && x.tgl >= e.tgl) ? <div className="row-act"><Badge t="warn">Proses</Badge><Btn kind="ghost" perm="u" icon="check" onClick={() => setM({ k: 'selesai', asset: e.asset, tgl: todayISO(), berhasil: true, biayaTambahan: '' })}>Selesai</Btn></div> : <Badge t="ok">Selesai</Badge> },
        ]} /> : <Empty text="Belum ada servis." />}</Card>
      </>}

      {tab === 'aset' && <>
        <div className="rk-tiles six" role="group" aria-label="Rekap status aset">{['', 'Dipakai', 'Tersedia', 'Dalam servis', 'Rusak', 'Hilang'].map((x) => { const l = A.filter((a) => !x || stat(a) === x); return (
          <button key={x || 'all'} className={`rk-tile ${st === x ? 'on' : ''}`} style={{ borderTopColor: ST_C[x] || '#8f9893' }} aria-pressed={st === x} onClick={() => setSt(x)}>
            <span className="rk-h">{x || 'Semua aset'}</span><b>{l.length}</b><small>{rupiah(nilai(l))}</small></button>) })}</div>
        <div className="filters"><label className="fsel grow"><span>Cari</span><span className="search"><Icon name="search" size={18} /><input placeholder="Kode, nama, SN" value={q} onChange={(e) => setQ(e.target.value)} /></span></label></div>
        <Card pad={false}><Table rows={A.filter((a) => (!st || stat(a) === st) && (!q || [a.kode, a.nama].join(' ').toLowerCase().includes(q.toLowerCase())))} empty="Tidak ada aset." cols={[
          { h: 'Aset', r: (a) => <div><AssetCell a={a} /><div className="muted sm">{a.kategori} · {branch(a.branch)}</div></div> },
          { h: 'Dibeli', r: (a) => <div className="nowrap">{fmtDate(a.tglBeli)}<div className="muted sm">{a.vendor}</div></div> },
          { h: 'Nilai', right: true, r: (a) => <span className="nowrap">{rupiah(a.harga)}</span> },
          { h: 'Kondisi', r: (a) => <Badge t={KD_T[a.kondisi]}>{a.kondisi}</Badge> },
          { h: 'Status', r: (a) => <Badge t={ST_T[stat(a)]}>{stat(a)}</Badge> },
          { h: 'Pemegang', r: (a) => holderOf(s, a) ? emp(holderOf(s, a).emp).name : <span className="muted">—</span> },
          { h: 'Biaya servis', right: true, r: (a) => { const c = servCost(s.assetEvents.filter((e) => e.asset === a.id)); return c ? <span className="nowrap">{rupiah(c)}</span> : <span className="muted">—</span> } },
          { h: '', r: (a) => <Btn kind="ghost" perm="r" onClick={() => setHist(a)}>Riwayat</Btn> },
        ]} /></Card>
      </>}

      {tab === 'gerak' && <>
        <div className="mv-chips">{['', 'Masuk', 'Serah', 'Kembali', 'Rusak', 'Servis', 'Selesai servis', 'Hilang'].map((x) => <button key={x || 'all'} className={`chip-f ${jn === x ? 'on' : ''}`} aria-pressed={jn === x} onClick={() => setJn(x)}>{x || 'Semua'} <b>{EY.filter((e) => !x || e.jenis === x).length}</b></button>)}</div>
        <Card pad={false}><Table rows={EY.filter((e) => !jn || e.jenis === jn)} empty="Tidak ada pergerakan." cols={[
          { h: 'Tanggal', r: (e) => <span className="nowrap">{fmtDate(e.tgl)}</span> }, { h: 'Jenis', r: (e) => <Badge t={JN_T[e.jenis]}>{e.jenis}</Badge> },
          { h: 'Aset', r: (e) => <div><AssetCell a={aOf(e.asset)} /><div className="muted sm">{aOf(e.asset).kategori} · {branch(aOf(e.asset).branch)}</div></div> },
          { h: 'Karyawan / PJ', r: (e) => (e.emp || e.pj) ? <div className="who"><Avatar name={pjName(e.emp || e.pj)} size={26} />{pjName(e.emp || e.pj)}</div> : <span className="muted">—</span> },
          { h: 'Keterangan', r: (e) => <span className="sm">{e.tingkat ? `${e.tingkat} · ${e.bisaDipakai ? 'masih bisa dipakai' : 'tidak bisa dipakai'} · ` : ''}{e.vendor ? `${e.vendor} · ` : ''}{e.ket}</span> },
          { h: 'Nilai / biaya', right: true, r: (e) => { const v = e.nilai || e.biaya || e.gantiRugi; return v ? <span className="nowrap">{e.jenis === 'Hilang' ? 'Ganti rugi ' : ''}{rupiah(v)}</span> : <span className="muted">—</span> } },
        ]} /></Card>
      </>}

      <Modal wide open={!!hist} title={hist ? `${hist.kode} · ${hist.nama}` : ''} onClose={() => setHist(null)} footer={<Btn kind="ghost" onClick={() => setHist(null)}>Tutup</Btn>}>
        {hist && <><dl className="dl"><dt>Kategori</dt><dd>{hist.kategori} · {branch(hist.branch)}</dd><dt>Dibeli</dt><dd>{fmtDate(hist.tglBeli)} · {rupiah(hist.harga)} · {hist.vendor}</dd><dt>Kondisi / status</dt><dd><Badge t={KD_T[hist.kondisi]}>{hist.kondisi}</Badge> <Badge t={ST_T[stat(hist)]}>{stat(hist)}</Badge></dd><dt>Total biaya servis</dt><dd>{rupiah(servCost(s.assetEvents.filter((e) => e.asset === hist.id)))}</dd></dl>
          <ul className="tl mt">{s.assetEvents.filter((e) => e.asset === hist.id).map((e) => <li key={e.id} className="done"><b><Badge t={JN_T[e.jenis]}>{e.jenis}</Badge> {fmtDate(e.tgl)}</b><span className="muted sm">{(e.emp || e.pj) ? pjName(e.emp || e.pj) + ' · ' : ''}{e.tingkat ? e.tingkat + ' · ' : ''}{e.vendor ? e.vendor + ' · ' : ''}{e.ket}{(e.nilai || e.biaya || e.gantiRugi) ? ' · ' + rupiah(e.nilai || e.biaya || e.gantiRugi) : ''}</span></li>)}</ul></>}
      </Modal>
      <AssetModal m={m} setM={setM} toast={toast} />
      {t}
    </>
  )
}

function AssetModal({ m, setM, toast }) {
  const s = useStore()
  if (!m) return null
  const set = (p) => setM({ ...m, ...p })
  const pick = (filter) => <Field label="Aset"><select value={m.asset} onChange={(e) => set({ asset: e.target.value })}><option value="">Pilih aset</option>{s.invCategories.map((c) => { const l = s.assets.filter((a) => a.kategori === c.name && filter(a)); return l.length ? <optgroup key={c.id} label={c.name}>{l.map((a) => <option key={a.id} value={a.id}>{a.kode} · {a.nama} ({statusOf(s, a)})</option>)}</optgroup> : null })}</select></Field>
  const pjSel = (label) => <Field label={label}><select value={m.pj} onChange={(e) => set({ pj: e.target.value })}><option value="">Pilih karyawan</option>{s.employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></Field>
  const holder = m.asset && holderOf(s, s.assets.find((a) => a.id === m.asset))
  const T = { masuk: 'Catat barang masuk', rusak: 'Lapor barang rusak', hilang: 'Lapor barang hilang', servis: 'Catat perawatan / servis', selesai: 'Selesaikan servis' }[m.k]
  const ok = { masuk: m.nama?.trim() && Number(m.harga) > 0 && m.tglBeli && Number(m.qty) >= 1, rusak: m.asset && m.ket?.trim(), hilang: m.asset && m.pj && m.ket?.trim().length >= 5, servis: m.asset && m.vendor?.trim() && m.ket?.trim(), selesai: true }[m.k]
  const save = () => {
    if (m.k === 'masuk') { const n = Number(m.qty); for (let i = 1; i <= n; i++) api.addAsset({ nama: n > 1 ? `${m.nama.trim()} #${i}` : m.nama.trim(), kategori: m.kategori, branch: m.branch, harga: Number(m.harga), vendor: m.vendor.trim() || 'Vendor umum', tglBeli: m.tglBeli }); toast(`${n} barang masuk tercatat`) }
    if (m.k === 'rusak') { api.assetDamage(m.asset, { tgl: m.tgl, tingkat: m.tingkat, bisaDipakai: m.bisaDipakai, pj: m.pj, ket: m.ket.trim() }); toast('Kerusakan dicatat') }
    if (m.k === 'hilang') { api.assetLoss(m.asset, { tgl: m.tgl, pj: m.pj, ket: m.ket.trim(), gantiRugi: Number(m.gantiRugi) || 0 }); toast('Kehilangan dicatat') }
    if (m.k === 'servis') { api.assetService(m.asset, { tgl: m.tgl, vendor: m.vendor.trim(), ket: m.ket.trim(), biaya: Number(m.biaya) || 0, selesai: m.selesai }); toast('Servis dicatat') }
    if (m.k === 'selesai') { api.assetServiceDone(m.asset, { tgl: m.tgl, berhasil: m.berhasil, biayaTambahan: Number(m.biayaTambahan) || 0 }); toast('Servis diselesaikan') }
    setM(null)
  }
  return (
    <Modal open title={T} onClose={() => setM(null)} footer={<><Btn kind="ghost" onClick={() => setM(null)}>Batal</Btn><Btn perm={m.k === 'masuk' ? 'c' : 'u'} disabled={!ok} onClick={save}>Simpan</Btn></>}>
      <div className="form">
        {m.k === 'masuk' && <>
          <Field label="Nama barang" hint="Sertakan merek, tipe, dan nomor seri bila ada."><input value={m.nama} onChange={(e) => set({ nama: e.target.value, harga: m.harga || (e.target.value.length > 3 ? String(hargaOf(e.target.value)) : '') })} placeholder="Contoh: Laptop 14&quot; Lenovo · SN PF1234" /></Field>
          <div className="form two"><Field label="Kategori"><select value={m.kategori} onChange={(e) => set({ kategori: e.target.value })}>{s.invCategories.map((c) => <option key={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Branch"><select value={m.branch} onChange={(e) => set({ branch: e.target.value })}>{s.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
            <Field label="Harga per unit (Rp)"><input type="number" min="0" value={m.harga} onChange={(e) => set({ harga: e.target.value })} /></Field>
            <Field label="Jumlah unit"><input type="number" min="1" max="50" value={m.qty} onChange={(e) => set({ qty: e.target.value })} /></Field>
            <Field label="Vendor"><input value={m.vendor} onChange={(e) => set({ vendor: e.target.value })} placeholder="Nama toko / distributor" /></Field>
            <Field label="Tanggal beli"><input type="date" value={m.tglBeli} onChange={(e) => set({ tglBeli: e.target.value })} /></Field></div>
          {Number(m.qty) > 1 && <Note>Akan dibuat {m.qty} aset terpisah (#1–#{m.qty}) senilai total {rupiah(Number(m.harga) * Number(m.qty))}.</Note>}
        </>}
        {m.k === 'rusak' && <>
          {pick((a) => statusOf(s, a) !== 'Hilang')}
          <div className="form two"><Field label="Tanggal rusak"><input type="date" value={m.tgl} onChange={(e) => set({ tgl: e.target.value })} /></Field>
            <Field label="Tingkat kerusakan"><select value={m.tingkat} onChange={(e) => set({ tingkat: e.target.value, bisaDipakai: e.target.value !== 'Rusak berat' })}>{KONDISI.slice(1).map((k) => <option key={k}>{k}</option>)}</select></Field></div>
          <fieldset className="rg"><legend>Apakah masih bisa digunakan?</legend>
            <label className="chk-l"><input type="radio" checked={m.bisaDipakai} onChange={() => set({ bisaDipakai: true })} />Masih bisa digunakan</label>
            <label className="chk-l"><input type="radio" checked={!m.bisaDipakai} onChange={() => set({ bisaDipakai: false })} />Tidak bisa digunakan sama sekali</label></fieldset>
          {pjSel(holder ? `Penanggung jawab (pemegang: ${s.employees.find((e) => e.id === holder.emp)?.name})` : 'Penanggung jawab / pelapor')}
          <Field label="Penyebab / keterangan"><textarea rows={2} value={m.ket} onChange={(e) => set({ ket: e.target.value })} /></Field>
        </>}
        {m.k === 'hilang' && <>
          {pick((a) => statusOf(s, a) !== 'Hilang')}
          <Field label="Tanggal hilang"><input type="date" value={m.tgl} onChange={(e) => set({ tgl: e.target.value })} /></Field>
          {pjSel('Penanggung jawab')}
          <Field label="Alasan / kronologi (wajib)"><textarea rows={3} value={m.ket} onChange={(e) => set({ ket: e.target.value })} placeholder="Kapan terakhir terlihat, di mana, bagaimana hilangnya" /></Field>
          <Field label="Ganti rugi dibebankan (Rp, opsional)"><input type="number" min="0" value={m.gantiRugi} onChange={(e) => set({ gantiRugi: e.target.value })} /></Field>
          {holder && <Note>Barang ini sedang dipegang karyawan. Serah terimanya akan ditutup dengan kondisi "Hilang".</Note>}
        </>}
        {m.k === 'servis' && <>
          {pick((a) => !['Hilang', 'Dalam servis'].includes(statusOf(s, a)))}
          <div className="form two"><Field label="Tanggal servis"><input type="date" value={m.tgl} onChange={(e) => set({ tgl: e.target.value })} /></Field>
            <Field label="Biaya (Rp)" hint="Isi 0 bila gratis / garansi."><input type="number" min="0" value={m.biaya} onChange={(e) => set({ biaya: e.target.value })} /></Field></div>
          <Field label="Vendor / bengkel"><input value={m.vendor} onChange={(e) => set({ vendor: e.target.value })} /></Field>
          <Field label="Pekerjaan / keluhan"><textarea rows={2} value={m.ket} onChange={(e) => set({ ket: e.target.value })} placeholder="Contoh: servis berkala, ganti baterai" /></Field>
          <fieldset className="rg"><legend>Status servis</legend>
            <label className="chk-l"><input type="radio" checked={m.selesai} onChange={() => set({ selesai: true })} />Selesai hari ini</label>
            <label className="chk-l"><input type="radio" checked={!m.selesai} onChange={() => set({ selesai: false })} />Masih diproses (aset berstatus Dalam servis)</label></fieldset>
        </>}
        {m.k === 'selesai' && <>
          <Field label="Tanggal selesai"><input type="date" value={m.tgl} onChange={(e) => set({ tgl: e.target.value })} /></Field>
          <fieldset className="rg"><legend>Hasil</legend>
            <label className="chk-l"><input type="radio" checked={m.berhasil} onChange={() => set({ berhasil: true })} />Berhasil diperbaiki, kondisi baik</label>
            <label className="chk-l"><input type="radio" checked={!m.berhasil} onChange={() => set({ berhasil: false })} />Tidak bisa diperbaiki (rusak, tidak bisa dipakai)</label></fieldset>
          <Field label="Biaya tambahan (Rp, opsional)"><input type="number" min="0" value={m.biayaTambahan} onChange={(e) => set({ biayaTambahan: e.target.value })} /></Field>
        </>}
      </div>
    </Modal>
  )
}
