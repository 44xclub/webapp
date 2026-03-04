'use client'

import { useEffect, useState, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWARegister() {
  // Set --app-dvh CSS var for browsers without proper dvh support (iOS < 15.4)
  useEffect(() => {
    const setVh = () => {
      document.documentElement.style.setProperty(
        '--app-dvh',
        `${window.innerHeight}px`
      )
    }

    if (!CSS.supports('height', '100dvh')) {
      setVh()
      window.addEventListener('resize', setVh)
      return () => window.removeEventListener('resize', setVh)
    }
  }, [])

  // Set --app-height CSS var for viewport stability
  // Must fire on load, resize, orientationchange, and visualViewport resize
  useEffect(() => {
    const setAppHeight = () => {
      // Use visualViewport.height when available (more stable on iOS PWA)
      const h = window.visualViewport?.height ?? window.innerHeight
      document.documentElement.style.setProperty(
        '--app-height',
        `${h}px`
      )
    }

    // Run synchronously on mount to prevent flash
    setAppHeight()

    window.addEventListener('resize', setAppHeight)

    // visualViewport resize for iOS keyboard and safe area changes
    const vv = window.visualViewport
    if (vv) {
      vv.addEventListener('resize', setAppHeight)
    }

    const handleOrientation = () => {
      setTimeout(setAppHeight, 120)
    }
    window.addEventListener('orientationchange', handleOrientation)

    return () => {
      window.removeEventListener('resize', setAppHeight)
      if (vv) vv.removeEventListener('resize', setAppHeight)
      window.removeEventListener('orientationchange', handleOrientation)
    }
  }, [])

  // Register service worker with update handling
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope)

          // Check for updates on page load
          registration.update()

          // Listen for new service worker waiting
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (!newWorker) return

            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                // New content available - auto-activate
                newWorker.postMessage({ type: 'SKIP_WAITING' })
              }
            })
          })
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })

      // Reload when new service worker takes over
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true
          window.location.reload()
        }
      })
    }
  }, [])

  return null
}

// Hook for install prompt - use in components that show install UI
export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return false
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    setInstallPrompt(null)
    return outcome === 'accepted'
  }, [installPrompt])

  return {
    canInstall: !!installPrompt && !isInstalled,
    isInstalled,
    promptInstall,
  }
}
