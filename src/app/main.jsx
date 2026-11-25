import './flag.js'
import React from 'react'
import { createRoot } from 'react-dom/client'
import AppKaryawan from './AppKaryawan.jsx'
import './fonts.css'
import '../styles.css'
import './app.css'
import { registerPwa } from '../services/pwa.js'
registerPwa()

createRoot(document.getElementById('root')).render(<AppKaryawan />)
