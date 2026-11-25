// Pengajuan: Cuti · Lembur · Reimburse dalam satu tab. Halaman & form lama dipakai ulang (aturan sama dengan web);
// di aplikasi, tombol "Ajukan" tampil sebagai tombol bulat melayang dan saldo bisa digeser ke samping.
import React, { useEffect } from 'react'
import { useStore } from '../../services/store.js'
import { ME } from '../../talent/services/session.js'
import { PAGES } from '../../talent/pages/Shell.jsx'
import { menuState } from '../../talent/services/talentAccess.js'
import { haptic } from '../../services/haptics.js'
import { Empty } from '../../talent/components/ui.jsx'

const SEG = [['cuti', 'Cuti', 'leaves'], ['lembur', 'Lembur', 'overtimes'], ['reimbursement', 'Reimburse', 'reimbursements']]

export function AppPengajuan({ sub, go }) {
  const s = useStore()
  const segs = SEG.filter(([k]) => menuState(s, ME, k) !== 'sembunyi')
  const tab = segs.some(([k]) => k === sub) ? sub : segs[0]?.[0]
  useEffect(() => { window.__kiranaSetTitle?.('Pengajuan') }, [tab])
  if (!tab) return <Empty icon="lock" title="Pengajuan belum tersedia" hint="Cuti, lembur, dan reimburse belum dibuka untuk akunmu. Hubungi HR bila ini keliru." action={{ label: 'Ke Beranda', onClick: () => go('beranda') }} />
  const Page = PAGES[tab]
  return (
    <div className="ap">
      <div className="ap-seg" role="tablist" aria-label="Jenis pengajuan">
        {segs.map(([k, l, col]) => {
          const w = s[col].filter((x) => x.emp === ME && x.status === 'Waiting').length
          return <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { haptic.tap(); go('pengajuan/' + k) }}>{l}{w > 0 && <span className="ap-n" aria-label={`${w} menunggu`}>{w}</span>}</button>
        })}
      </div>
      <div className={`ap-body ap-${tab}`}><Page go={go} /></div>
    </div>
  )
}
