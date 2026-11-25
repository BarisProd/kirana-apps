// Editor teks kecil untuk pesan & alasan: tebal, miring, garis bawah, daftar, tautan. Hasil berupa HTML sederhana.
import React, { useEffect, useRef } from 'react'
import { Icon } from './ui.jsx'

const clean = (html) => html.replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, '').replace(/ on\w+="[^"]*"/gi, '')
export const htmlText = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

export function RichText({ value, onChange, placeholder = 'Tulis pesan…', label = 'Isi pesan', minHeight = 160 }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value || '' }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const cmd = (c, v) => { ref.current.focus(); document.execCommand(c, false, v); onChange(clean(ref.current.innerHTML)) }
  const link = () => { const t = String(window.getSelection() || '').trim(); cmd('createLink', /^https?:\/\//.test(t) ? t : 'https://' + t.replace(/^\/+/, '')) }
  const B = ({ c, v, title, children }) => <button type="button" className="rx-b" title={title} aria-label={title} onMouseDown={(e) => e.preventDefault()} onClick={() => cmd(c, v)}>{children}</button>
  return (
    <div className="rx">
      <div className="rx-bar" role="toolbar" aria-label="Format teks">
        <B c="bold" title="Tebal (Ctrl+B)"><b>B</b></B><B c="italic" title="Miring (Ctrl+I)"><i>I</i></B><B c="underline" title="Garis bawah (Ctrl+U)"><u>U</u></B>
        <span className="rx-sep" />
        <B c="insertUnorderedList" title="Daftar berpoin">•≡</B><B c="insertOrderedList" title="Daftar bernomor">1≡</B>
        <span className="rx-sep" />
        <button type="button" className="rx-b" title="Sisipkan tautan (blok teks berisi alamat https://)" aria-label="Sisipkan tautan" onMouseDown={(e) => e.preventDefault()} onClick={link}><Icon name="share" size={16} /></button>
        <B c="removeFormat" title="Hapus format">Tx</B>
      </div>
      <div ref={ref} className="rx-area" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label={label} data-ph={placeholder} style={{ minHeight }} onInput={() => onChange(clean(ref.current.innerHTML))} />
    </div>
  )
}
