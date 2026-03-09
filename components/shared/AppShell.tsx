'use client'

import { useEffect, useRef } from 'react'
import { BottomNav } from './BottomNav'

/**
 * AppShell — single layout contract for all routes with bottom navigation.
 *
 * Structure:
 *   ┌─────────────────────────┐  ← position:fixed, height = --shell-h
 *   │  flex-1 overflow-y-auto │  ← scrollable content area
 *   │  (children rendered here)│
 *   ├─────────────────────────┤
 *   │  BottomNav (flex child) │  ← pinned at bottom via flex, not fixed
 *   └─────────────────────────┘
 *
 * Height strategy (CSS variable cascade):
 *   --shell-h   (set here via window.innerHeight — most accurate)
 *   --app-height (set by inline <script> in layout.tsx — before React mount)
 *   100dvh      (pure-CSS fallback)
 *
 * We use window.innerHeight because on iOS PWA standalone with
 * viewport-fit:cover it returns the true full-screen height including
 * safe areas — unlike 100dvh which may exclude the home indicator.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const sync = () => {
      el.style.setProperty('--shell-h', `${window.innerHeight}px`)
    }

    // Set immediately
    sync()

    // Update on viewport changes
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', () => setTimeout(sync, 150))

    // iOS standalone can fire a delayed resize after app becomes active
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') setTimeout(sync, 100)
    })

    return () => {
      window.removeEventListener('resize', sync)
    }
  }, [])

  return (
    <div ref={ref} className="app-shell">
      <div className="app-shell-content">
        {children}
      </div>
      <BottomNav />
    </div>
  )
}
