// HashRouter mini: rute seperti #/admin/approval. Cocok untuk static build & Capacitor.
import { useEffect, useState } from 'react'

const read = () => (window.location.hash.replace(/^#/, '') || '/')

export function useRoute() {
  const [path, setPath] = useState(read)
  useEffect(() => {
    const on = () => { setPath(read()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return path
}

export const go = (path) => { window.location.hash = path }
