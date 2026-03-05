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

  // Set --app-height CSS var for viewport stability (used by .min-h-app, .h-app)
  // AND --app-shell-keyboard-height for AppShell keyboard handling.
  //
  // Key insight: On iOS PWA standalone, window.innerHeight and
  // visualViewport.height can be SMALLER than what 100dvh resolves to
  // (CSS knows the true viewport; JS APIs may exclude safe areas).
  // So AppShell uses 100dvh by default, and we only set the keyboard
  // override when the viewport actually shrinks (keyboard open).
  useEffect(() => {
    // Capture initial height on mount — this is our "no keyboard" baseline.
    // Use a small delay so the viewport is fully settled (PWA launch).
    let initialHeight = 0

    const captureInitial = () => {
      const h = window.visualViewport?.height ?? window.innerHeight
      if (h > initialHeight) initialHeight = h
    }

    const setAppHeight = () => {
      const h = window.visualViewport?.height ?? window.innerHeight
      const root = document.documentElement

      // Always update --app-height for .min-h-app / .h-app consumers
      root.style.setProperty('--app-height', `${h}px`)

      // Track max height seen (handles delayed viewport settling in PWA)
      if (h > initialHeight) initialHeight = h

      // Keyboard detection: if the visible height shrinks significantly
      // below our baseline, the virtual keyboard is likely open.
      // Threshold: 100px avoids false positives from toolbar changes.
      const keyboardThreshold = 100
      if (initialHeight > 0 && (initialHeight - h) > keyboardThreshold) {
        root.style.setProperty('--app-shell-keyboard-height', `${h}px`)
      } else {
        // No keyboard — remove override so AppShell uses 100dvh
        root.style.removeProperty('--app-shell-keyboard-height')
      }
    }

    // Run synchronously on mount
    captureInitial()
    setAppHeight()

    // Also capture after a short delay to account for PWA viewport settling
    const settleTimer = setTimeout(() => {
      captureInitial()
      setAppHeight()
    }, 300)

    window.addEventListener('resize', setAppHeight)

    // visualViewport resize for iOS keyboard and safe area changes
    const vv = window.visualViewport
    if (vv) {
      vv.addEventListener('resize', setAppHeight)
    }

    const handleOrientation = () => {
      // Reset baseline after orientation change
      initialHeight = 0
      setTimeout(() => {
        captureInitial()
        setAppHeight()
      }, 120)
    }
    window.addEventListener('orientationchange', handleOrientation)

    return () => {
      clearTimeout(settleTimer)
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
