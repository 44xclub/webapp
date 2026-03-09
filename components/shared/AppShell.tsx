'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { BottomNav } from './BottomNav'

// ── Scroll position store ────────────────────────────────────────────
// Persists across re-renders; keyed by pathname.
const scrollPositions = new Map<string, number>()

/**
 * AppShell — single layout contract for all routes with bottom navigation.
 *
 * Structure:
 *   ┌─────────────────────────┐  ← position:fixed, inset:0 (fills full viewport)
 *   │  flex-1 overflow-y-auto │  ← scrollable content area
 *   │  (children rendered here)│
 *   ├─────────────────────────┤
 *   │  BottomNav (flex child) │  ← flex-shrink:0, padding-bottom: env(safe-area-inset-bottom)
 *   └─────────────────────────┘
 *
 * Shell uses inset:0 (not height) to guarantee full-screen coverage.
 * --app-height is still set by JS for other consumers (.min-h-app, modals).
 *
 * BottomNav is the ONLY element that applies env(safe-area-inset-bottom).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevPathname = useRef(pathname)

  // Save scroll position when navigating away; restore when coming back.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    // If the pathname changed, save the old position and restore the new one
    if (prevPathname.current !== pathname) {
      // Save previous page's scroll position
      scrollPositions.set(prevPathname.current, el.scrollTop)
      prevPathname.current = pathname

      // Restore this page's scroll position (0 if never visited)
      const saved = scrollPositions.get(pathname)
      el.scrollTop = saved ?? 0
    }
  }, [pathname])

  // Also save on unmount / before navigating away
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    return () => {
      scrollPositions.set(pathname, el.scrollTop)
    }
  }, [pathname])

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
      <div ref={scrollRef} className="app-shell-content">
        {children}
      </div>
      <BottomNav />
    </div>
  )
}
