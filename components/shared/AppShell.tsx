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

  return (
    <div className="app-shell">
      <div ref={scrollRef} className="app-shell-content">
        {children}
      </div>
      <BottomNav />
    </div>
  )
}
