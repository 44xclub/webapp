'use client'

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { useInstallPrompt } from '@/components/PWARegister'

export function InstallBanner() {
  const { canInstall, promptInstall } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (!canInstall) return
    const dismissedAt = localStorage.getItem('pwa-install-dismissed')
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24)
      if (daysSince < 7) return
    }
    setDismissed(false)
  }, [canInstall])

  if (!canInstall || dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', String(Date.now()))
  }

  const handleInstall = async () => {
    const accepted = await promptInstall()
    if (!accepted) handleDismiss()
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3 shadow-xl">
        <div className="flex-shrink-0 w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
          <Download className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-100">Install 44CLUB</p>
          <p className="text-xs text-zinc-400">Add to home screen for the best experience</p>
        </div>
        <button
          onClick={handleInstall}
          className="flex-shrink-0 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
