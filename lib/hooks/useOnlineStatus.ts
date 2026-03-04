'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Hook that tracks online/offline status.
 * Returns { isOnline, wasOffline } where wasOffline indicates
 * the user was recently offline (for showing "back online" message).
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setWasOffline(true)
      // Clear "back online" indicator after 3 seconds
      setTimeout(() => setWasOffline(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, wasOffline }
}
