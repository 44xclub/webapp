'use client'

import { WifiOff, Wifi } from 'lucide-react'
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus'

export function OfflineIndicator() {
  const { isOnline, wasOffline } = useOnlineStatus()

  if (isOnline && !wasOffline) return null

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 py-1.5 text-xs font-medium transition-colors duration-300 ${
        isOnline
          ? 'bg-emerald-500/90 text-white'
          : 'bg-zinc-800 text-zinc-300'
      }`}
      style={{ paddingTop: 'max(6px, env(safe-area-inset-top, 6px))' }}
    >
      {isOnline ? (
        <>
          <Wifi className="w-3.5 h-3.5" />
          Back online
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          You&apos;re offline — some features may be limited
        </>
      )}
    </div>
  )
}
