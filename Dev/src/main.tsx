import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/theme.css'
import App from './App.tsx'
import { initMagneticHover } from './lib/magneticHover'
import {registerPushWorker} from './services/pushNotifications'

// Auto-recover from stale Vite chunks when new version is deployed
window.addEventListener('vite:preloadError', () => {
  const lastReload = Number(sessionStorage.getItem('last_chunk_reload') || '0');
  if (Date.now() - lastReload > 10000) {
    sessionStorage.setItem('last_chunk_reload', String(Date.now()));
    window.location.reload();
  }
});

initMagneticHover();
void registerPushWorker().catch(()=>{});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
