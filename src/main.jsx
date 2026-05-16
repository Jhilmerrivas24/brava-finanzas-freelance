import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import './styles/globals.css'
import './styles/liquid-glass.css'
import { AuthProvider } from './auth/AuthContext.jsx'
import { ToastProvider } from './components/ui/ToastProvider.jsx'
import { DialogProvider } from './components/ui/DialogProvider.jsx'
import App from './App.jsx'   // App.jsx now exports AuthGate as default

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ToastProvider>
          <DialogProvider>
            <App />
          </DialogProvider>
        </ToastProvider>
      </AuthProvider>
    </MotionConfig>
  </StrictMode>
)
