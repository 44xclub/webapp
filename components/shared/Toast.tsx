'use client'

import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'status'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

const toastStyles: Record<ToastType, { bg: string; icon: typeof CheckCircle; iconColor: string }> = {
  success: { bg: 'bg-emerald-500/15 border-emerald-500/30', icon: CheckCircle, iconColor: 'text-emerald-400' },
  error: { bg: 'bg-rose-500/15 border-rose-500/30', icon: AlertCircle, iconColor: 'text-rose-400' },
  info: { bg: 'bg-blue-500/15 border-blue-500/30', icon: Info, iconColor: 'text-blue-400' },
  status: { bg: 'bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.12)]', icon: Info, iconColor: 'text-[rgba(238,242,255,0.72)]' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((prev) => [...prev, { id, type, message, duration }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-4 left-4 right-4 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => onDismiss(toast.id), toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast, onDismiss])

  const style = toastStyles[toast.type]
  const Icon = style.icon

  return (
    <div
      className={`pointer-events-auto max-w-sm w-full px-4 py-3 rounded-[12px] border ${style.bg} backdrop-blur-sm flex items-start gap-3 animate-in slide-in-from-top-2 fade-in duration-200`}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 ${style.iconColor}`} />
      <p className="flex-1 text-[13px] text-[#eef2ff] leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-0.5 rounded-[4px] text-[rgba(238,242,255,0.45)] hover:text-[rgba(238,242,255,0.72)] transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
