'use client'

import { useEffect } from 'react'
import { BottomNav } from './BottomNav'

/**
 * AppShell — single layout contract for all routes with bottom navigation.
 *
 * Structure:
 *   ┌─────────────────────────┐  ← position:fixed, height = var(--app-height)
 *   │  flex-1 overflow-y-auto │  ← scrollable content area
 *   │  (children rendered here)│
 *   ├─────────────────────────┤
 *   │  BottomNav (flex child) │  ← flex-shrink:0, padding-bottom: env(safe-area-inset-bottom)
 *   └─────────────────────────┘
 *
 * --app-height is set by:
 *   1. Inline <script> in layout.tsx (before first paint, prevents flash)
 *   2. PWARegister.tsx (on resize, orientationchange, visualViewport.resize)
 * Both use: visualViewport?.height ?? innerHeight
 *
 * BottomNav is the ONLY element that applies env(safe-area-inset-bottom).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  // Debug logging for standalone PWA — prints viewport metrics to console
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true

    if (!isStandalone && !localStorage.getItem('44club-debug')) return

    const logMetrics = () => {
      const shell = document.querySelector('.app-shell') as HTMLElement | null
      const nav = document.querySelector('.app-shell nav') as HTMLElement | null
      const navRect = nav?.getBoundingClientRect()
      const viewportH = window.visualViewport?.height ?? window.innerHeight

      console.log('[AppShell Debug]', {
        visualViewportHeight: window.visualViewport?.height ?? 'N/A',
        innerHeight: window.innerHeight,
        appHeight_css: getComputedStyle(document.documentElement).getPropertyValue('--app-height'),
        shellHeight: shell?.offsetHeight,
        shellBoundingHeight: shell?.getBoundingClientRect().height,
        navBottom: navRect?.bottom,
        navPaddingBottom: nav ? getComputedStyle(nav).paddingBottom : 'N/A',
        gapBelowNav: navRect ? Math.round(viewportH - navRect.bottom) : 'N/A',
        standalone: isStandalone,
      })
    }

    // Log after initial render
    const t = setTimeout(logMetrics, 500)
    // Log on resize
    window.addEventListener('resize', logMetrics)
    window.visualViewport?.addEventListener('resize', logMetrics)

    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', logMetrics)
      window.visualViewport?.removeEventListener('resize', logMetrics)
    }
  }, [])

  return (
    <div className="app-shell">
      <div className="app-shell-content">
        {children}
      </div>
      <BottomNav />
    </div>
  )
}
