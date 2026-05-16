import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { AuthProvider } from './auth/AuthContext.jsx'
import App from './App.jsx'   // App.jsx now exports AuthGate as default

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
)
