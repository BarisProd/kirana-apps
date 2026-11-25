// Data turunan per customer. c1 = tenant demo yang dibaca dari state aplikasi; customer lain dari s.root.tenants.
export function tenantOf(s, cid) {
  if (cid === 'c1') {
    return {
      branches: s.branches.map((b) => ({ id: b.id, name: b.name, kota: b.kota, pic: b.accounts?.[0]?.nama || b.customer, email: b.email, aktif: b.aktif !== false })),
      employees: s.employees.map((e) => ({ id: e.id, name: e.name, branch: e.branch, role: e.role, type: e.type, start: e.start, status: e.status || 'Aktif', email: e.email || '' })),
      accounts: [
        ...s.admins.map((a) => ({ id: 'c1-a-' + a.id, role: 'Admin', nama: a.name, email: a.email, aktif: a.aktif !== false })),
        ...s.branches.flatMap((b) => (b.accounts || []).map((a, i) => ({ id: `c1-ba-${b.id}-${i}`, role: 'Branch', nama: a.nama, email: a.email, branch: b.id, aktif: b.aktif !== false && a.aktif !== false }))),
      ],
    }
  }
  return s.root.tenants[cid] || { branches: [], employees: [], accounts: [] }
}
export const accountsOf = (s, c) => [{ id: c.id + '-sa', role: 'Superadmin', nama: c.superadmin.nama, email: c.superadmin.email, aktif: c.status !== 'Ditangguhkan' }, ...tenantOf(s, c.id).accounts]
