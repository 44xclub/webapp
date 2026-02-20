'use client'

import { useEffect } from 'react'

export function PWARegister() {
  // Set --app-dvh CSS var for browsers without proper dvh support (iOS < 15.4)
  useEffect(() => {
    const setVh = () => {
      document.documentElement.style.setProperty(
        '--app-dvh',
        `${window.innerHeight}px`
      )
    }

    // Only install JS fallback if dvh isn't supported
    if (!CSS.supports('height', '100dvh')) {
      setVh()
      window.addEventListener('resize', setVh)
      return () => window.removeEventListener('resize', setVh)
    }
  }, [])

  // Set --app-height CSS var: always driven by window.innerHeight for maximum
  // stability across iOS Safari, Whop in-app browser, and Android Chrome.
  // Unlike 100dvh/100vh, window.innerHeight gives the *actual* visible area
  // and doesn't snap when the keyboard opens/closes.
  useEffect(() => {
    const setAppHeight = () => {
      document.documentElement.style.setProperty(
        '--app-height',
        `${window.innerHeight}px`
      )
    }

    setAppHeight()
    window.addEventListener('resize', setAppHeight)

    // orientationchange fires before resize on some iOS versions;
    // delay the measurement to let the viewport settle.
    const handleOrientation = () => {
      setTimeout(setAppHeight, 120)
    }
    window.addEventListener('orientationchange', handleOrientation)

    return () => {
      window.removeEventListener('resize', setAppHeight)
      window.removeEventListener('orientationchange', handleOrientation)
    }
  }, [])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope)
          // Force update check on every page load
          registration.update()
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })

      // Listen for controller change and reload to get fresh content
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('New service worker activated, reloading...')
      })
    }
  }, [])

  return null
}
