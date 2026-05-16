import { useContext } from 'react'
import { DialogContext } from '../components/ui/DialogProvider.jsx'

export function useDialog() {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialog must be used inside <DialogProvider>')
  return ctx
}
