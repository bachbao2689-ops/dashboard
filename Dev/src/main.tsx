import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/theme.css'
import App from './App.tsx'
import { initMagneticHover } from './lib/magneticHover'
import {registerPushWorker} from './services/pushNotifications'

initMagneticHover();
void registerPushWorker().catch(()=>{});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
