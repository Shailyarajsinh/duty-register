import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <div className="pb-2 bg-[var(--ink-950)] text-[var(--brass)] text-xs text-center tracking-[0.35em] uppercase" style={{ fontFamily: "Oswald, sans-serif" }}>
     developed by Shailyarajsinh Mahida😎
    </div>
  </StrictMode>,
)
