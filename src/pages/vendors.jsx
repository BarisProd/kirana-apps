// Role Root — Layanan Pihak Ketiga: masa layanan, biaya, metode pembayaran, pemakaian, gangguan, jadwal maintenance, catatan.
import React, { useState } from 'react'
import { useStore, api } from '../services/store.js'
import { rupiah } from '../services/payroll.js'
import { Btn, Card, Badge, Table, Modal, Field, useToast, PageHead, Icon, Empty, Tabs } from '../components/ui.jsx'
import { Columns } from '../components/charts.jsx'
import { tgl, jam, sheet, dlx, Crumb, Meter, sisaHari, todayISO } from './root.jsx'
import { KURS, BULAN6, TROUBLE_TK, costOf } from '../data/vendors.js'

const CUR = BULAN6[BULAN6.length - 1]
const BL = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const blnS = (p) => { const [y, m] = p.split('-'); return `${BL[+m - 1]} ${y}` }
const usd = (n) => 'US$ ' + Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const idr = (n) => rupiah((n || 0) * KURS)
const num = (n) => Number(n || 0).toLocaleString('id-ID')
const expDays = (exp) => { if (!exp) return 999; const [y, m] = exp.split('-').map(Number); return sisaHari(new Date(y, m, 0).toISOString().slice(0, 10)) }
const expS = (exp) => (exp ? exp.split('-').reverse().join('/') : '—')
const open = (tr) => tr.status !== 'Selesai'
const TK_T = { Tinggi: 'bad', Sedang: 'warn', Rendah: 'neutral' }
const TS_T = { Terbuka: 'bad', Investigasi: 'warn', Selesai: 'ok' }
const MS_T = { Terjadwal: 'warn', Selesai: 'ok', Dibatalkan: 'neutral' }
const pakaiOf = (v, p) => (v.skus ? v.skus.reduce((a, k) => a + (k.pakai[p] || 0), 0) : (v.pakai?.[p] || 0))
const statusOf = (v) => (v.troubles.some((t) => open(t) && t.tingkat === 'Tinggi') ? 'Gangguan' : v.troubles.some(open) ? 'Aktif · ada isu' : 'Aktif')
const ST_T = { Gangguan: 'bad', 'Aktif · ada isu': 'warn', Aktif: 'ok' }

// Hal yang perlu ditindaklanjuti per layanan
function flagsOf(v) {
  const f = []
  const sh = sisaHari(v.berakhir)
  if (!v.autoRenew && sh <= 30) f.push({ t: sh < 0 ? 'bad' : 'warn', k: 'masa', msg: sh < 0 ? `Masa layanan berakhir ${tgl(v.berakhir)}` : `Masa layanan berakhir ${sh} hari lagi (${tgl(v.berakhir)}), tidak diperpanjang otomatis` })
  const ed = expDays(v.bayar.exp)
  if (ed <= 45) f.push({ t: ed < 0 ? 'bad' : 'warn', k: 'bayar', msg: `${v.bayar.detail} ${ed < 0 ? 'sudah kedaluwarsa' : `berakhir ${expS(v.bayar.exp)} (${ed} hari lagi)`} — ganti sebelum tagihan berikutnya` })
  if (v.kuota) { const p = pakaiOf(v, CUR) / v.kuota.max; if (p >= 0.85) f.push({ t: p >= 1 ? 'bad' : 'warn', k: 'pakai', msg: `Pemakaian ${blnS(CUR)} ${Math.round(p * 100)}% dari kuota ${num(v.kuota.max)} ${v.kuota.label}` }) }
  if (v.skus) { const over = v.skus.filter((k) => (k.pakai[CUR] || 0) > k.cap); if (over.length) f.push({ t: 'warn', k: 'pakai', msg: `${over.length} SKU melewati free cap bulan ini (${over.map((k) => k.sku.split(' (')[0]).join(', ')})` }) }
  v.troubles.filter(open).forEach((tr) => f.push({ t: tr.tingkat === 'Tinggi' ? 'bad' : 'warn', k: 'gangguan', msg: `Gangguan ${tr.status.toLowerCase()}: ${tr.judul}` }))
  return f
}

const toList = (id) => setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
const Logo = ({ v, size = 36 }) => <span className="vd-logo" style={{ background: v.warna || '#0a5950', width: size, height: size }} aria-hidden="true">{v.nama.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>

export function Vendors({ sub, go }) {
  if (sub) { const [id, tab] = sub.split('~'); return <VendorDetail id={id} tab0={tab} go={go} /> }
  return <VendorList go={go} />
}

// ---------------- Daftar ----------------
function VendorList({ go }) {
  const s = useStore(); const [t, toast] = useToast()
  const V = s.root.vendors
  const [trF, setTrF] = useState('open'); const [mnF, setMnF] = useState('Terjadwal'); const [add, setAdd] = useState(false)
  const costNow = V.reduce((a, v) => a + costOf(v, CUR), 0)
  const flags = V.flatMap((v) => flagsOf(v).map((f) => ({ ...f, v })))
  const troubles = V.flatMap((v) => v.troubles.map((x) => ({ ...x, v }))).sort((a, b) => b.mulai.localeCompare(a.mulai))
  const maint = V.flatMap((v) => v.maint.map((x) => ({ ...x, v }))).sort((a, b) => (mnF === 'Selesai' ? b.mulai.localeCompare(a.mulai) : a.mulai.localeCompare(b.mulai)))
  const trRows = troubles.filter((x) => trF === 'all' || (trF === 'open' ? open(x) : !open(x)))
  const mnRows = maint.filter((x) => mnF === 'all' || x.status === mnF)
  const xls = () => dlx(toast, [
    sheet('Layanan', ['Layanan', 'Produk', 'Kategori', 'Paket', 'Model', 'Sejak', 'Periode berakhir', 'Perpanjang otomatis', `Biaya ${blnS(CUR)} (USD)`, 'Metode bayar', 'Detail', 'Exp', 'PIC'],
      V.map((v) => [v.nama, v.produk, v.kategori, v.paket, v.model, v.mulai, v.berakhir, v.autoRenew ? 'Ya' : 'Tidak', costOf(v, CUR), v.bayar.metode, v.bayar.detail, expS(v.bayar.exp), v.pic])),
    sheet('Tagihan', ['Layanan', 'Periode', 'No. tagihan', 'USD', 'Rupiah (kurs perkiraan)', 'Status', 'Tgl bayar'], V.flatMap((v) => v.invoices.map((i) => [v.nama, blnS(i.periode), i.no, i.usd, Math.round(i.usd * KURS), i.status, i.tgl]))),
    sheet('Gangguan', ['Layanan', 'Mulai', 'Selesai', 'Judul', 'Tingkat', 'Sumber', 'Status', 'Dampak', 'Tindakan'], troubles.map((x) => [x.v.nama, x.mulai, x.selesai, x.judul, x.tingkat, x.sumber, x.status, x.dampak, x.tindakan])),
    sheet('Maintenance', ['Layanan', 'Mulai', 'Selesai', 'Judul', 'Jenis', 'Dampak', 'Status'], maint.map((x) => [x.v.nama, x.mulai, x.selesai, x.judul, x.jenis, x.dampak, x.status])),
  ], 'Layanan-pihak-ketiga')
  const tiles = [
    ['Layanan aktif', 'handshake', '#0a5950', V.length, V.map((v) => v.nama).join(' · '), () => toList('vd-list')],
    [`Biaya ${blnS(CUR)}`, 'wallet', '#7a5af5', idr(costNow), `${usd(costNow)} · kurs Rp ${num(KURS)}`, () => toList('vd-biaya')],
    ['Perlu tindakan', 'bell', '#d9a400', flags.length, 'kartu, kuota, masa layanan, isu', () => toList('vd-flags')],
    ['Gangguan belum selesai', 'test', '#c0452a', troubles.filter(open).length, `${troubles.length} tercatat · ${troubles.filter((x) => x.tingkat === 'Tinggi').length} tingkat tinggi`, () => { setTrF('open'); toList('vd-trouble') }],
    ['Maintenance terjadwal', 'calendar', '#2a78d6', maint.filter((x) => x.status === 'Terjadwal').length, (() => { const n = maint.filter((x) => x.status === 'Terjadwal').sort((a, b) => a.mulai.localeCompare(b.mulai))[0]; return n ? `terdekat ${jam(n.mulai)}` : 'tidak ada' })(), () => { setMnF('Terjadwal'); toList('vd-maint') }],
  ]
  return (
    <>
      <PageHead title="Layanan Pihak Ketiga" sub="Vendor yang dipakai platform Kirana: masa layanan, biaya, metode pembayaran, pemakaian, gangguan, dan jadwal maintenance.">
        <div className="row-act"><Btn kind="ghost" icon="download" onClick={xls}>Download Excel</Btn><Btn icon="plus" onClick={() => setAdd(true)}>Tambah layanan</Btn></div>
      </PageHead>
      <div className="rk-tiles" role="group" aria-label="Rekap layanan pihak ketiga">{tiles.map(([l, ic, c, v, sub, fn]) => (
        <button key={l} className="rk-tile" style={{ borderTopColor: c }} onClick={fn}><span className="rk-h"><Icon name={ic} size={18} />{l}</span><b>{v}</b><small>{sub}</small><small className="rk-br">Lihat data →</small></button>))}</div>

      <div id="vd-flags" className="anchor" /><Card title="Perlu tindakan">
        {flags.length ? <ul className="vd-flags">{flags.map((f, i) => <li key={i} className={f.t}><Logo v={f.v} size={28} /><span><b>{f.v.nama}</b> · {f.msg}</span><Btn kind="ghost" perm="r" onClick={() => go(`pihak-ketiga/${f.v.id}~${f.k === 'bayar' ? 'biaya' : f.k === 'pakai' ? 'pakai' : f.k === 'gangguan' ? 'gangguan' : 'ringkasan'}`)}>Buka</Btn></li>)}</ul> : <p className="muted">Semua aman.</p>}
      </Card>

      <div id="vd-list" className="anchor" />
      <Card title="Daftar layanan" pad={false}><Table rows={V} onRow={(v) => go('pihak-ketiga/' + v.id)} cols={[
        { h: 'Layanan', r: (v) => <div className="vd-name"><Logo v={v} /><div><strong>{v.nama}</strong><div className="muted sm">{v.produk}</div></div></div> },
        { h: 'Dipakai untuk', r: (v) => <span className="sm">{v.kategori}<span className="muted" style={{ display: 'block' }}>{v.dipakai.slice(0, 2).join(', ')}{v.dipakai.length > 2 ? ` +${v.dipakai.length - 2}` : ''}</span></span> },
        { h: 'Paket', r: (v) => <span className="sm"><b>{v.paket}</b><span className="muted" style={{ display: 'block' }}>{v.model}</span></span> },
        { h: 'Masa layanan', r: (v) => <span className="sm nowrap">Sejak {tgl(v.mulai)}<span className="muted" style={{ display: 'block' }}>periode s.d. {tgl(v.berakhir)} · {v.autoRenew ? 'otomatis' : `${sisaHari(v.berakhir)} hari lagi`}</span></span> },
        { h: `Biaya ${BL[+CUR.slice(5) - 1]}`, right: true, r: (v) => <span className="nowrap"><b>{idr(costOf(v, CUR))}</b><span className="muted sm" style={{ display: 'block' }}>{usd(costOf(v, CUR))}</span></span> },
        { h: 'Pembayaran', r: (v) => <span className="sm">{v.bayar.metode}<span className={`${expDays(v.bayar.exp) <= 45 ? 'vd-warn' : 'muted'}`} style={{ display: 'block' }}>{v.bayar.detail} · exp {expS(v.bayar.exp)}</span></span> },
        { h: 'Status', r: (v) => <Badge t={ST_T[statusOf(v)]}>{statusOf(v)}</Badge> },
        { h: '', r: () => <span className="muted" aria-hidden="true"><Icon name="arrowRight" size={18} /></span> },
      ]} /></Card>

      <div id="vd-biaya" className="anchor" />
      <div className="dgrid">
        <Card title="Biaya per bulan · semua layanan" action={<span className="muted sm">ribu Rupiah</span>}>
          <Columns label="Biaya layanan pihak ketiga per bulan" unit=" rb" points={BULAN6.map((p) => ({ l: BL[+p.slice(5) - 1], full: `${blnS(p)} · ${usd(V.reduce((a, v) => a + costOf(v, p), 0))}`, v: Math.round(V.reduce((a, v) => a + costOf(v, p), 0) * KURS / 1000) }))} />
        </Card>
        <Card className="d-wide" title="Rincian biaya per layanan" pad={false}><div className="tbl-wrap"><table className="tbl vd-ct">
          <thead><tr><th>Layanan</th>{BULAN6.map((p) => <th key={p} className="r">{BL[+p.slice(5) - 1]}</th>)}<th className="r">6 bulan</th></tr></thead>
          <tbody>{V.map((v) => <tr key={v.id} onClick={() => go(`pihak-ketiga/${v.id}~biaya`)} className="click"><td><strong>{v.nama}</strong></td>{BULAN6.map((p) => <td key={p} className="r nowrap">{usd(costOf(v, p))}</td>)}<td className="r nowrap"><b>{idr(BULAN6.reduce((a, p) => a + costOf(v, p), 0))}</b></td></tr>)}</tbody>
          <tfoot><tr><td><b>Total</b></td>{BULAN6.map((p) => <td key={p} className="r nowrap"><b>{usd(V.reduce((a, v) => a + costOf(v, p), 0))}</b></td>)}<td className="r nowrap"><b>{idr(V.reduce((a, v) => a + BULAN6.reduce((b, p) => b + costOf(v, p), 0), 0))}</b></td></tr></tfoot>
        </table></div><p className="muted sm vd-note">Tagihan dalam USD; Rupiah memakai kurs perkiraan Rp {num(KURS)}/US$. Klik baris untuk riwayat tagihan.</p></Card>
      </div>

      <div id="vd-trouble" className="anchor" />
      <Card title="Gangguan (trouble)" action={<Seg value={trF} onChange={setTrF} opts={[['open', 'Belum selesai'], ['done', 'Selesai'], ['all', 'Semua']]} label="Filter gangguan" />} pad={false}>
        <TroubleTable rows={trRows} showV go={go} /></Card>

      <div id="vd-maint" className="anchor" />
      <Card title="Jadwal maintenance" action={<Seg value={mnF} onChange={setMnF} opts={[['Terjadwal', 'Terjadwal'], ['Selesai', 'Selesai'], ['all', 'Semua']]} label="Filter maintenance" />} pad={false}>
        <MaintTable rows={mnRows} showV go={go} /></Card>
      <AddVendor open={add} onClose={() => setAdd(false)} onDone={(id) => { setAdd(false); toast('Layanan ditambahkan'); go('pihak-ketiga/' + id) }} />
      {t}
    </>
  )
}

const Seg = ({ value, onChange, opts, label }) => <div className="vd-seg" role="group" aria-label={label}>{opts.map(([v, l]) => <button key={v} className={value === v ? 'on' : ''} aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>)}</div>
const dur = (a, b) => { if (!b) return 'berlangsung'; const m = Math.round((new Date(b) - new Date(a)) / 60000); return m >= 1440 ? `${Math.round(m / 144) / 10} hari` : m >= 60 ? `${Math.floor(m / 60)} j ${m % 60} m` : `${m} m` }

function TroubleTable({ rows, showV, go, onSet }) {
  return <Table rows={rows} empty="Tidak ada gangguan." cols={[
    ...(showV ? [{ h: 'Layanan', r: (x) => <button className="linkish" onClick={() => go(`pihak-ketiga/${x.v.id}~gangguan`)}>{x.v.nama}</button> }] : []),
    { h: 'Gangguan', r: (x) => <><strong>{x.judul}</strong><small className="muted" style={{ display: 'block' }}>{x.sumber}</small></> },
    { h: 'Waktu', r: (x) => <span className="sm nowrap">{jam(x.mulai)} WIB<span className="muted" style={{ display: 'block' }}>durasi {dur(x.mulai, x.selesai)}</span></span> },
    { h: 'Tingkat', r: (x) => <Badge t={TK_T[x.tingkat]}>{x.tingkat}</Badge> },
    { h: 'Dampak ke Kirana', r: (x) => <span className="sm">{x.dampak}</span> },
    { h: 'Tindak lanjut', r: (x) => <span className="sm">{x.tindakan || '—'}</span> },
    { h: 'Status', r: (x) => <Badge t={TS_T[x.status]}>{x.status}</Badge> },
    ...(onSet ? [{ h: 'Aksi', r: (x) => open(x) ? <div className="row-act">{x.status === 'Terbuka' && <Btn kind="ghost" perm="u" onClick={() => onSet(x, 'Investigasi')}>Investigasi</Btn>}<Btn kind="ghost" perm="u" icon="check" onClick={() => onSet(x, 'Selesai')}>Selesai</Btn></div> : <span className="muted sm">{jam(x.selesai)}</span> }] : []),
  ]} />
}
function MaintTable({ rows, showV, go, onSet }) {
  return <Table rows={rows} empty="Tidak ada jadwal." cols={[
    ...(showV ? [{ h: 'Layanan', r: (x) => <button className="linkish" onClick={() => go(`pihak-ketiga/${x.v.id}~maint`)}>{x.v.nama}</button> }] : []),
    { h: 'Jadwal', r: (x) => <span className="sm nowrap"><b>{jam(x.mulai)}</b><span className="muted" style={{ display: 'block' }}>s.d. {x.selesai ? jam(x.selesai).split(' ').slice(-1)[0] : '—'} WIB{x.status === 'Terjadwal' && sisaHari(x.mulai.slice(0, 10)) >= 0 ? ` · ${sisaHari(x.mulai.slice(0, 10))} hari lagi` : ''}</span></span> },
    { h: 'Kegiatan', r: (x) => <strong>{x.judul}</strong> },
    { h: 'Jenis', k: 'jenis' },
    { h: 'Dampak', r: (x) => <span className="sm">{x.dampak}</span> },
    { h: 'Status', r: (x) => <Badge t={MS_T[x.status]}>{x.status}</Badge> },
    ...(onSet ? [{ h: 'Aksi', r: (x) => x.status === 'Terjadwal' ? <div className="row-act"><Btn kind="ghost" perm="u" icon="check" onClick={() => onSet(x, 'Selesai')}>Selesai</Btn><Btn kind="ghost" perm="u" onClick={() => onSet(x, 'Dibatalkan')}>Batalkan</Btn></div> : null }] : []),
  ]} />
}

// ---------------- Detail ----------------
const TABS = [['ringkasan', 'Ringkasan'], ['biaya', 'Biaya & Pembayaran'], ['pakai', 'Pemakaian'], ['gangguan', 'Gangguan'], ['maint', 'Maintenance'], ['catatan', 'Catatan']]
function VendorDetail({ id, tab0, go }) {
  const s = useStore(); const [t, toast] = useToast()
  const [tab, setTab] = useState(TABS.some(([k]) => k === tab0) ? tab0 : 'ringkasan')
  const [mTr, setMTr] = useState(false); const [mMn, setMMn] = useState(false); const [mPay, setMPay] = useState(false); const [note, setNote] = useState('')
  const v = s.root.vendors.find((x) => x.id === id)
  if (!v) return <Empty text="Layanan tidak ditemukan." />
  const fl = flagsOf(v)
  const pStart = new Date(v.periodeMulai || v.mulai), pEnd = new Date(v.berakhir)
  const pPct = Math.max(0, Math.min(100, ((new Date(todayISO()) - pStart) / Math.max(1, pEnd - pStart)) * 100))
  const nTr = v.troubles.filter(open).length, nMn = v.maint.filter((m) => m.status === 'Terjadwal').length
  const tabs = TABS.map(([k, l]) => ({ v: k, l: k === 'gangguan' && nTr ? `${l} (${nTr})` : k === 'maint' && nMn ? `${l} (${nMn})` : l }))
  return (
    <>
      <Crumb items={[['Layanan Pihak Ketiga', () => go('pihak-ketiga')], [v.nama]]} />
      <PageHead title={<span className="vd-name"><Logo v={v} size={40} />{v.nama}</span>} sub={`${v.produk} · ${v.kategori} · paket ${v.paket}`}>
        <Badge t={ST_T[statusOf(v)]}>{statusOf(v)}</Badge>
      </PageHead>
      {fl.map((f, i) => <div key={i} className={`alert ${f.t}`} role="status"><Icon name="bell" size={18} />{f.msg}</div>)}
      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'ringkasan' && <>
        <div className="dgrid">
          <Card title="Masa layanan">
            <dl className="dl">{[['Mulai berlangganan', tgl(v.mulai)], ['Periode berjalan', `${tgl(v.periodeMulai || v.mulai)} – ${tgl(v.berakhir)}`], ['Perpanjangan', v.autoRenew ? 'Otomatis' : 'Manual'], ['Model', v.model]].map(([a, b]) => <React.Fragment key={a}><dt>{a}</dt><dd>{b}</dd></React.Fragment>)}</dl>
            <Meter label="Periode berjalan" used={`${Math.max(0, sisaHari(v.berakhir))} hari lagi`} max={tgl(v.berakhir)} pct={pPct} />
          </Card>
          <Card title="Biaya & pembayaran">
            <dl className="dl">{[[`Biaya ${blnS(CUR)}`, <><b>{idr(costOf(v, CUR))}</b> <span className="muted sm">({usd(costOf(v, CUR))})</span></>], ['Metode', v.bayar.metode], ['Kartu / rekening', <span className={expDays(v.bayar.exp) <= 45 ? 'vd-warn' : ''}>{v.bayar.detail} · exp {expS(v.bayar.exp)}</span>], ['Siklus tagihan', v.bayar.siklus]].map(([a, b]) => <React.Fragment key={a}><dt>{a}</dt><dd>{b}</dd></React.Fragment>)}</dl>
          </Card>
          <Card title="Akun & kontak">
            <dl className="dl">{[['Akun', v.akun], ['PIC internal', v.pic], ['Konfigurasi', v.domain], ['Support vendor', v.kontak]].map(([a, b]) => <React.Fragment key={a}><dt>{a}</dt><dd>{b || '—'}</dd></React.Fragment>)}</dl>
          </Card>
        </div>
        <div className="dgrid">
          <Card title="Dipakai untuk fitur Kirana"><div className="chips">{v.dipakai.map((d) => <span key={d} className="badge b-neutral">{d}</span>)}</div></Card>
          <Card title="Gangguan terakhir" action={<button className="linkish" onClick={() => setTab('gangguan')}>Semua</button>}>{v.troubles[0] ? <p className="sm"><Badge t={TS_T[v.troubles[0].status]}>{v.troubles[0].status}</Badge> <b>{v.troubles[0].judul}</b><br /><span className="muted">{jam(v.troubles[0].mulai)} · {v.troubles[0].dampak}</span></p> : <p className="muted">Belum ada.</p>}</Card>
          <Card title="Maintenance berikutnya" action={<button className="linkish" onClick={() => setTab('maint')}>Jadwal</button>}>{(() => { const n = v.maint.filter((m) => m.status === 'Terjadwal').sort((a, b) => a.mulai.localeCompare(b.mulai))[0]; return n ? <p className="sm"><b>{n.judul}</b><br /><span className="muted">{jam(n.mulai)} WIB · {n.dampak}</span></p> : <p className="muted">Tidak ada jadwal.</p> })()}</Card>
        </div>
      </>}

      {tab === 'biaya' && <>
        <div className="dgrid">
          <Card title="Biaya per bulan" action={<span className="muted sm">ribu Rupiah</span>}><Columns label={`Biaya ${v.nama} per bulan`} unit=" rb" points={BULAN6.map((p) => ({ l: BL[+p.slice(5) - 1], full: `${blnS(p)} · ${usd(costOf(v, p))}`, v: Math.round(costOf(v, p) * KURS / 1000) }))} /></Card>
          <Card className="d-wide" title="Metode pembayaran" action={<Btn kind="ghost" perm="u" icon="edit" onClick={() => setMPay(true)}>Ubah metode</Btn>}>
            <div className="vd-pay"><Icon name="wallet" size={28} /><div><b>{v.bayar.metode}</b><div>{v.bayar.detail}</div><div className={expDays(v.bayar.exp) <= 45 ? 'vd-warn sm' : 'muted sm'}>Berlaku s.d. {expS(v.bayar.exp)} · {v.bayar.siklus} · mata uang {v.bayar.mataUang}</div></div></div>
            <p className="muted sm mt">Total 6 bulan: <b>{idr(BULAN6.reduce((a, p) => a + costOf(v, p), 0))}</b> ({usd(BULAN6.reduce((a, p) => a + costOf(v, p), 0))}). Kurs perkiraan Rp {num(KURS)}/US$.</p>
          </Card>
        </div>
        <Card title="Riwayat tagihan" pad={false}><Table rows={[...v.invoices].reverse()} empty="Belum ada tagihan." cols={[
          { h: 'Periode', r: (i) => <b>{blnS(i.periode)}</b> }, { h: 'No. tagihan', k: 'no' },
          { h: 'USD', right: true, r: (i) => usd(i.usd) }, { h: 'Rupiah', right: true, r: (i) => idr(i.usd) },
          { h: 'Dibayar', r: (i) => (i.tgl ? tgl(i.tgl) : '—') }, { h: 'Metode', r: () => <span className="sm">{v.bayar.detail}</span> },
          { h: 'Status', r: (i) => <Badge t={i.status === 'Lunas' ? 'ok' : 'warn'}>{i.status}</Badge> },
        ]} /></Card>
      </>}

      {tab === 'pakai' && <UsageTab v={v} />}

      {tab === 'gangguan' && <Card title="Gangguan" action={<Btn icon="plus" perm="c" onClick={() => setMTr(true)}>Catat gangguan</Btn>} pad={false}>
        <TroubleTable rows={v.troubles} onSet={(x, st) => { api.vendorTroubleSet(v.id, x.id, st); toast(`Gangguan → ${st}`) }} /></Card>}

      {tab === 'maint' && <Card title="Jadwal maintenance" action={<Btn icon="plus" perm="c" onClick={() => setMMn(true)}>Jadwalkan</Btn>} pad={false}>
        <MaintTable rows={[...v.maint].sort((a, b) => a.mulai.localeCompare(b.mulai))} onSet={(x, st) => { api.vendorMaintSet(v.id, x.id, st); toast(`Maintenance → ${st}`) }} /></Card>}

      {tab === 'catatan' && <Card title="Catatan">
        <div className="form"><Field label="Tambah catatan" hint={`${300 - note.length} karakter tersisa`}><textarea rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Misal: hasil diskusi dengan vendor, rencana naik paket, kontak darurat" /></Field>
          <div className="row-end"><Btn perm="c" disabled={!note.trim()} onClick={() => { api.vendorNote(v.id, note.trim()); setNote(''); toast('Catatan disimpan') }}>Simpan catatan</Btn></div></div>
        <ul className="vd-notes">{v.notes.map((n, i) => <li key={i} className={n.auto ? 'auto' : ''}><span className="muted sm">{jam(n.at)} · {n.oleh}{n.auto ? ' · otomatis' : ''}</span><p>{n.isi}</p></li>)}</ul>
      </Card>}

      <TroubleForm open={mTr} onClose={() => setMTr(false)} onSave={(x) => { api.vendorTrouble(v.id, x); setMTr(false); toast('Gangguan dicatat') }} />
      <MaintForm open={mMn} onClose={() => setMMn(false)} onSave={(x) => { api.vendorMaint(v.id, x); setMMn(false); toast('Maintenance dijadwalkan') }} />
      <PayForm open={mPay} v={v} onClose={() => setMPay(false)} onSave={(x) => { api.vendorPay(v.id, x); setMPay(false); toast('Metode pembayaran diperbarui') }} />
      {t}
    </>
  )
}

function UsageTab({ v }) {
  if (v.skus) return <>
    <div className="dgrid">
      <Card title="Total request per bulan"><Columns label="Total request Google Maps Platform per bulan" points={BULAN6.map((p) => ({ l: BL[+p.slice(5) - 1], full: blnS(p), v: pakaiOf(v, p) }))} /></Card>
      <Card className="d-wide" title={`Pemakaian per SKU · ${blnS(CUR)}`}>{v.skus.map((k) => { const u = k.pakai[CUR] || 0; return (
        <div key={k.sku} className="vd-sku"><Meter label={`${k.sku} · ${k.cat}`} used={num(u)} max={`${num(k.cap)} gratis`} pct={(u / k.cap) * 100} />
          <small className="muted">{k.fitur} · {u > k.cap ? <b className="vd-warn">lewat {num(u - k.cap)} → {usd((u - k.cap) * k.tarif / 1000)}</b> : `sisa ${num(k.cap - u)} gratis`} · tarif {usd(k.tarif)}/1.000</small></div>) })}</Card>
    </div>
    <Card title="Riwayat pemakaian per SKU" pad={false}><div className="tbl-wrap"><table className="tbl vd-ct">
      <thead><tr><th>SKU</th><th className="r">Free cap</th>{BULAN6.map((p) => <th key={p} className="r">{BL[+p.slice(5) - 1]}</th>)}</tr></thead>
      <tbody>{v.skus.map((k) => <tr key={k.sku}><td><strong>{k.sku}</strong><div className="muted sm">{k.fitur}</div></td><td className="r">{num(k.cap)}</td>{BULAN6.map((p) => <td key={p} className={`r nowrap ${(k.pakai[p] || 0) > k.cap ? 'vd-over' : ''}`}>{num(k.pakai[p])}</td>)}</tr>)}</tbody>
      <tfoot><tr><td><b>Biaya (USD)</b></td><td />{BULAN6.map((p) => <td key={p} className="r nowrap"><b>{usd(costOf(v, p))}</b></td>)}</tr></tfoot>
    </table></div><p className="muted sm vd-note">Angka merah = melewati free usage cap bulanan (Essentials 10.000 event per SKU). Hanya kelebihannya yang ditagih.</p></Card>
  </>
  if (!v.kuota) return <Card><p className="muted">Belum ada data pemakaian untuk layanan ini.</p></Card>
  const u = pakaiOf(v, CUR); const tot = (v.perCustomer || []).reduce((a, [, n]) => a + n, 0)
  return <>
    <div className="dgrid">
      <Card title={`Kuota ${blnS(CUR)}`}><Meter label={`Terkirim (${v.kuota.label})`} used={num(u)} max={num(v.kuota.max)} pct={(u / v.kuota.max) * 100} /><p className="muted sm mt">Sisa {num(Math.max(0, v.kuota.max - u))}. Rata-rata naik {num(Math.round((u - pakaiOf(v, BULAN6[0])) / 5))} e-mail/bulan sejak {blnS(BULAN6[0])}.</p></Card>
      <Card className="d-wide" title="E-mail terkirim per bulan"><Columns label="E-mail terkirim per bulan" points={BULAN6.map((p) => ({ l: BL[+p.slice(5) - 1], full: `${blnS(p)} · ${Math.round((pakaiOf(v, p) / v.kuota.max) * 100)}% kuota`, v: pakaiOf(v, p) }))} /></Card>
    </div>
    {tot > 0 && <Card title={`Pemakaian per customer · ${blnS(CUR)}`} pad={false}><VendorCust rows={v.perCustomer} tot={tot} /></Card>}
  </>
}
function VendorCust({ rows, tot }) {
  const s = useStore()
  return <Table rows={rows.map(([c, n]) => ({ c: s.root.customers.find((x) => x.id === c), n })).sort((a, b) => b.n - a.n)} cols={[
    { h: 'Customer', r: (x) => <><strong>{x.c?.nama}</strong><div className="muted sm">{x.c?.kode} · {x.c?.paket}</div></> },
    { h: 'E-mail', right: true, r: (x) => num(x.n) }, { h: 'Porsi', r: (x) => <span className="vd-porsi"><span className="meter-b"><i style={{ width: `${(x.n / tot) * 100}%` }} /></span><b>{Math.round((x.n / tot) * 100)}%</b></span> },
  ]} />
}

// ---------------- Form ----------------
const nowLocal = (d = 0) => { const x = new Date(Date.now() + d * 86400000); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16) }
function TroubleForm({ open: o, onClose, onSave }) {
  const [f, setF] = useState({ judul: '', tingkat: 'Sedang', sumber: 'Internal', mulai: nowLocal(), dampak: '', tindakan: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value }); const ok = f.judul.trim() && f.dampak.trim()
  return <Modal open={o} title="Catat gangguan" onClose={onClose} footer={<><Btn kind="ghost" onClick={onClose}>Batal</Btn><Btn perm="c" disabled={!ok} onClick={() => { onSave({ ...f, judul: f.judul.trim(), status: 'Terbuka' }); setF({ ...f, judul: '', dampak: '', tindakan: '' }) }}>Simpan</Btn></>}>
    <div className="form"><Field label="Judul gangguan"><input value={f.judul} onChange={set('judul')} placeholder="Misal: E-mail payslip tertunda" /></Field>
      <div className="grid2"><Field label="Tingkat"><select value={f.tingkat} onChange={set('tingkat')}>{TROUBLE_TK.map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Sumber"><select value={f.sumber} onChange={set('sumber')}>{['Internal', 'Status page vendor', 'Laporan customer'].map((x) => <option key={x}>{x}</option>)}</select></Field></div>
      <Field label="Mulai"><input type="datetime-local" value={f.mulai} onChange={set('mulai')} /></Field>
      <Field label="Dampak ke Kirana"><input value={f.dampak} onChange={set('dampak')} placeholder="Fitur/customer yang terdampak" /></Field>
      <Field label="Tindak lanjut (opsional)"><textarea rows={2} value={f.tindakan} onChange={set('tindakan')} /></Field></div>
  </Modal>
}
function MaintForm({ open: o, onClose, onSave }) {
  const [f, setF] = useState({ judul: '', jenis: 'Internal', mulai: nowLocal(3).slice(0, 11) + '22:00', selesai: nowLocal(3).slice(0, 11) + '23:00', dampak: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value }); const ok = f.judul.trim() && f.mulai && f.selesai >= f.mulai
  return <Modal open={o} title="Jadwalkan maintenance" onClose={onClose} footer={<><Btn kind="ghost" onClick={onClose}>Batal</Btn><Btn perm="c" disabled={!ok} onClick={() => { onSave({ ...f, judul: f.judul.trim(), dampak: f.dampak.trim() || 'Tidak ada' }); setF({ ...f, judul: '', dampak: '' }) }}>Jadwalkan</Btn></>}>
    <div className="form"><Field label="Kegiatan"><input value={f.judul} onChange={set('judul')} placeholder="Misal: Rotasi API key" /></Field>
      <Field label="Jenis"><select value={f.jenis} onChange={set('jenis')}>{['Internal', 'Vendor', 'Pembayaran'].map((x) => <option key={x}>{x}</option>)}</select></Field>
      <div className="grid2"><Field label="Mulai"><input type="datetime-local" value={f.mulai} onChange={set('mulai')} /></Field><Field label="Selesai" hint={f.selesai < f.mulai ? 'Harus setelah waktu mulai' : ''}><input type="datetime-local" value={f.selesai} onChange={set('selesai')} /></Field></div>
      <Field label="Dampak ke pengguna"><input value={f.dampak} onChange={set('dampak')} placeholder="Misal: peta clock in jeda 5 menit" /></Field></div>
  </Modal>
}
function PayForm({ open: o, v, onClose, onSave }) {
  const [f, setF] = useState(null)
  const cur = f || { metode: v.bayar.metode, detail: v.bayar.detail, exp: v.bayar.exp, siklus: v.bayar.siklus }
  const set = (k) => (e) => setF({ ...cur, [k]: e.target.value }); const ok = cur.metode && cur.detail.trim()
  const close = () => { setF(null); onClose() }
  return <Modal open={o} title={`Metode pembayaran · ${v.nama}`} onClose={close} footer={<><Btn kind="ghost" onClick={close}>Batal</Btn><Btn perm="u" disabled={!ok} onClick={() => { onSave(cur); setF(null) }}>Simpan</Btn></>}>
    <div className="form"><Field label="Metode"><select value={cur.metode} onChange={set('metode')}>{[...new Set([v.bayar.metode, 'Kartu kredit', 'Transfer bank (invoice)', 'Virtual account', 'Debit otomatis'])].map((x) => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Kartu / rekening" hint="Tulis 4 digit terakhir saja"><input value={cur.detail} onChange={set('detail')} /></Field>
      <div className="grid2"><Field label="Berlaku sampai"><input type="month" value={cur.exp} onChange={set('exp')} /></Field><Field label="Siklus tagihan"><input value={cur.siklus} onChange={set('siklus')} /></Field></div></div>
  </Modal>
}
function AddVendor({ open: o, onClose, onDone }) {
  const blank = { nama: '', produk: '', kategori: 'Lainnya', paket: '', model: 'Langganan bulanan', mulai: todayISO(), berakhir: '', biayaUsd: '', metode: 'Kartu kredit', detail: '', exp: '', dipakai: '', pic: '', catatan: '' }
  const [f, setF] = useState(blank); const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const ok = f.nama.trim() && f.berakhir && f.berakhir >= f.mulai && f.detail.trim()
  const save = () => {
    const id = api.vendorAdd({ nama: f.nama.trim(), produk: f.produk.trim() || '—', kategori: f.kategori, paket: f.paket.trim() || '—', model: f.model, mulai: f.mulai, periodeMulai: f.mulai, berakhir: f.berakhir, autoRenew: f.model !== 'Kontrak tahunan',
      biayaUsd: +f.biayaUsd || 0, warna: '#5b6b66', dipakai: f.dipakai.split(',').map((x) => x.trim()).filter(Boolean), pic: f.pic.trim(), akun: '', domain: '', kontak: '',
      bayar: { metode: f.metode, detail: f.detail.trim(), exp: f.exp, siklus: f.model === 'Kontrak tahunan' ? 'Tahunan' : 'Bulanan', mataUang: 'USD' } })
    if (f.catatan.trim()) api.vendorNote(id, f.catatan.trim())
    setF(blank); onDone(id)
  }
  return <Modal open={o} title="Tambah layanan pihak ketiga" onClose={onClose} footer={<><Btn kind="ghost" onClick={onClose}>Batal</Btn><Btn perm="c" disabled={!ok} onClick={save}>Simpan</Btn></>}>
    <div className="form">
      <div className="grid2"><Field label="Nama vendor"><input value={f.nama} onChange={set('nama')} placeholder="Misal: Twilio" /></Field><Field label="Produk"><input value={f.produk} onChange={set('produk')} placeholder="Misal: SMS OTP" /></Field></div>
      <div className="grid2"><Field label="Kategori"><select value={f.kategori} onChange={set('kategori')}>{['E-mail transaksional', 'Peta & lokasi', 'SMS / WhatsApp', 'Payment gateway', 'Cloud & hosting', 'Monitoring', 'Lainnya'].map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Model"><select value={f.model} onChange={set('model')}>{['Langganan bulanan', 'Kontrak tahunan', 'Pay-as-you-go'].map((x) => <option key={x}>{x}</option>)}</select></Field></div>
      <div className="grid2"><Field label="Paket"><input value={f.paket} onChange={set('paket')} /></Field><Field label="Biaya per bulan (USD)"><input type="number" min="0" step="0.01" value={f.biayaUsd} onChange={set('biayaUsd')} /></Field></div>
      <div className="grid2"><Field label="Mulai layanan"><input type="date" value={f.mulai} onChange={set('mulai')} /></Field><Field label="Periode berakhir" hint={f.berakhir && f.berakhir < f.mulai ? 'Harus setelah tanggal mulai' : ''}><input type="date" value={f.berakhir} onChange={set('berakhir')} /></Field></div>
      <div className="grid2"><Field label="Metode bayar"><select value={f.metode} onChange={set('metode')}>{['Kartu kredit', 'Transfer bank (invoice)', 'Virtual account', 'Debit otomatis'].map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="Kartu / rekening" hint="4 digit terakhir saja"><input value={f.detail} onChange={set('detail')} placeholder="Visa korporat •••• 1234" /></Field></div>
      <div className="grid2"><Field label="Berlaku sampai"><input type="month" value={f.exp} onChange={set('exp')} /></Field><Field label="PIC internal"><input value={f.pic} onChange={set('pic')} /></Field></div>
      <Field label="Dipakai untuk" hint="Pisahkan dengan koma"><input value={f.dipakai} onChange={set('dipakai')} placeholder="OTP login, notifikasi WhatsApp" /></Field>
      <Field label="Catatan"><textarea rows={2} value={f.catatan} onChange={set('catatan')} /></Field>
    </div>
  </Modal>
}
