'use client'

import { BottomNav } from './BottomNav'

/**
 * AppShell — single layout contract for all routes with bottom navigation.
 *
 * Structure:
 *   ┌─────────────────────────┐  ← h-app (exact viewport height)
 *   │  flex-1 overflow-y-auto │  ← scrollable content area
 *   │  (children rendered here)│
 *   ├─────────────────────────┤
 *   │  BottomNav (flex child) │  ← pinned at bottom via flex, not fixed
 *   └─────────────────────────┘
 *
 * This eliminates iOS position:fixed bugs caused by backdrop-filter
 * on sticky headers creating new containing blocks.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <div className="app-shell-content">
        {children}
      </div>
      <BottomNav />
    </div>
  )
}
