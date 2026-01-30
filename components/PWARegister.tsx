'use client'

import { useEffect } from 'react'

export function PWARegister() {
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
