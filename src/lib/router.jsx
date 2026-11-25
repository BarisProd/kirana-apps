// HashRouter ringan (API mirip react-router-dom: HashRouter, useNavigate, useLocation, Link).
// Bisa diganti 1:1 dengan `import { HashRouter, ... } from 'react-router-dom'` saat dependency dipasang.
import React, { createContext, useContext, useEffect, useState } from 'react'

const Ctx = createContext({ path: '/', navigate: () => {} })
const read = () => (window.location.hash.replace(/^#/, '') || '/')

export function HashRouter({ children }) {
  const [path, setPath] = useState(read())
  useEffect(() => {
    const on = () => { setPath(read()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const navigate = (to) => { if (read() === to) return; window.location.hash = to }
  return <Ctx.Provider value={{ path, navigate }}>{children}</Ctx.Provider>
}

export const useLocation = () => ({ pathname: useContext(Ctx).path })
export const useNavigate = () => useContext(Ctx).navigate

export function Link({ to, children, className, ...rest }) {
  return <a href={'#' + to} className={className} {...rest}>{children}</a>
}
