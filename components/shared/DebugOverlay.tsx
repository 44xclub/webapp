'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

interface DebugMetrics {
  standalone: boolean
  matchMediaStandalone: boolean
  windowInnerHeight: number
  windowOuterHeight: number
  screenHeight: number
  visualViewportHeight: number | null
  visualViewportOffsetTop: number | null
  documentClientHeight: number
  shellRect: string
  shellOffsetHeight: string
  shellComputedPosition: string
  shellComputedInset: string
  shellComputedHeight: string
  navComputedPaddingBottom: string
  navComputedPosition: string
  navRectBottom: number | null
  navGap: number | null
  shellGapFromScreenBottom: number | null
  cssAppHeight: string
  hundredDvh: string
  hundredVh: string
  bodyOverflow: string
}

function getMetrics(): DebugMetrics {
  const shell = document.querySelector('.app-shell') as HTMLElement | null
  const nav = document.querySelector('nav[class*="flex-shrink-0"]') as HTMLElement | null
  const shellRect = shell?.getBoundingClientRect() ?? null
  const navRect = nav?.getBoundingClientRect() ?? null

  const shellStyles = shell ? getComputedStyle(shell) : null
  const navStyles = nav ? getComputedStyle(nav) : null
  const rootStyles = getComputedStyle(document.documentElement)
  const bodyStyles = getComputedStyle(document.body)

  // Measure what 100dvh and 100vh actually resolve to
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;top:0;height:100dvh;width:0;pointer-events:none;visibility:hidden;'
  document.body.appendChild(probe)
  const hundredDvh = `${probe.offsetHeight}px`
  probe.style.height = '100vh'
  const hundredVh = `${probe.offsetHeight}px`
  document.body.removeChild(probe)

  return {
    standalone: !!(navigator as any).standalone,
    matchMediaStandalone: window.matchMedia('(display-mode: standalone)').matches,
    windowInnerHeight: window.innerHeight,
    windowOuterHeight: window.outerHeight,
    screenHeight: window.screen.height,
    visualViewportHeight: window.visualViewport?.height ?? null,
    visualViewportOffsetTop: window.visualViewport?.offsetTop ?? null,
    documentClientHeight: document.documentElement.clientHeight,
    shellRect: shellRect ? `${Math.round(shellRect.top)},${Math.round(shellRect.left)} ${Math.round(shellRect.width)}x${Math.round(shellRect.height)}` : 'N/A',
    shellOffsetHeight: shell ? `${shell.offsetHeight}px` : 'N/A',
    shellComputedPosition: shellStyles?.position ?? 'N/A',
    shellComputedInset: shellStyles ? `T:${shellStyles.top} R:${shellStyles.right} B:${shellStyles.bottom} L:${shellStyles.left}` : 'N/A',
    shellComputedHeight: shellStyles?.height ?? 'N/A',
    navComputedPaddingBottom: navStyles?.paddingBottom ?? 'N/A',
    navComputedPosition: navStyles?.position ?? 'N/A',
    navRectBottom: navRect ? Math.round(navRect.bottom) : null,
    navGap: navRect ? Math.round(window.innerHeight - navRect.bottom) : null,
    shellGapFromScreenBottom: shellRect ? Math.round(window.innerHeight - shellRect.bottom) : null,
    cssAppHeight: rootStyles.getPropertyValue('--app-height').trim() || 'unset',
    hundredDvh,
    hundredVh,
    bodyOverflow: bodyStyles.overflow,
  }
}

export function DebugOverlay() {
  const [metrics, setMetrics] = useState<DebugMetrics | null>(null)
  const [visible, setVisible] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(() => setMetrics(getMetrics()), [])

  // Activate via ?debug=1, localStorage, or env var
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const debugOn =
      params.get('debug') === '1' ||
      localStorage.getItem('44club-debug') === '1' ||
      process.env.NEXT_PUBLIC_DEBUG_UI === '1'

    if (debugOn) {
      localStorage.setItem('44club-debug', '1')
      setVisible(true)
    }
  }, [])

  // Triple-tap in top-left 60x60px area to toggle debug
  useEffect(() => {
    const handler = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch || touch.clientX > 60 || touch.clientY > 60) return

      tapCountRef.current++
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current)

      if (tapCountRef.current >= 3) {
        tapCountRef.current = 0
        const isOn = localStorage.getItem('44club-debug') === '1'
        if (isOn) {
          localStorage.removeItem('44club-debug')
          setVisible(false)
        } else {
          localStorage.setItem('44club-debug', '1')
          setVisible(true)
        }
      } else {
        tapTimerRef.current = setTimeout(() => {
          tapCountRef.current = 0
        }, 600)
      }
    }

    window.addEventListener('touchstart', handler, { passive: true })
    return () => window.removeEventListener('touchstart', handler)
  }, [])

  // Start collecting metrics when visible
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(refresh, 200)
    window.addEventListener('resize', refresh)
    window.visualViewport?.addEventListener('resize', refresh)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', refresh)
      window.visualViewport?.removeEventListener('resize', refresh)
    }
  }, [visible, refresh])

  if (!visible || !metrics) return null

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        style={{
          position: 'fixed', top: 4, right: 4, zIndex: 99999,
          background: 'rgba(0,180,0,0.85)', color: '#fff',
          padding: '4px 8px', borderRadius: 6, fontSize: 10,
          border: 'none', fontFamily: 'monospace',
        }}
      >
        DBG
      </button>
    )
  }

  const gap = metrics.navGap
  const gapColor = gap !== null && Math.abs(gap) > 1 ? '#ff4444' : '#44ff44'
  const L = (label: string, val: string | number | null, color = '#ff0') => (
    <div>{label}: <span style={{ color }}>{val ?? 'N/A'}</span></div>
  )

  return (
    <div style={{
      position: 'fixed', top: 44, left: 4, right: 4, zIndex: 99999,
      background: 'rgba(0,0,0,0.92)', color: '#0f0',
      padding: 8, borderRadius: 8, fontSize: 10,
      fontFamily: 'monospace', lineHeight: 1.5,
      maxHeight: '60vh', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <strong style={{ color: '#fff' }}>Layout Debug v4</strong>
        <div>
          <button onClick={refresh} style={{ background: '#333', color: '#0f0', border: 'none', padding: '2px 6px', borderRadius: 4, marginRight: 4, fontSize: 10 }}>Refresh</button>
          <button onClick={() => setMinimized(true)} style={{ background: '#333', color: '#ff0', border: 'none', padding: '2px 6px', borderRadius: 4, marginRight: 4, fontSize: 10 }}>Min</button>
          <button onClick={() => { localStorage.removeItem('44club-debug'); setVisible(false) }} style={{ background: '#333', color: '#f44', border: 'none', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>Off</button>
        </div>
      </div>

      <div style={{ color: '#aaa' }}>--- PWA ---</div>
      {L('standalone', String(metrics.standalone))}
      {L('matchMedia', String(metrics.matchMediaStandalone))}

      <div style={{ color: '#aaa', marginTop: 4 }}>--- Viewport ---</div>
      {L('innerHeight', metrics.windowInnerHeight)}
      {L('outerHeight', metrics.windowOuterHeight)}
      {L('screen.height', metrics.screenHeight)}
      {L('visualViewport.h', metrics.visualViewportHeight)}
      {L('visualViewport.offT', metrics.visualViewportOffsetTop)}
      {L('clientHeight', metrics.documentClientHeight)}
      {L('100dvh', metrics.hundredDvh)}
      {L('100vh', metrics.hundredVh)}
      {L('--app-height', metrics.cssAppHeight)}

      <div style={{ color: '#aaa', marginTop: 4 }}>--- Shell ---</div>
      {L('position', metrics.shellComputedPosition)}
      {L('inset', metrics.shellComputedInset)}
      {L('computedH', metrics.shellComputedHeight)}
      {L('rect', metrics.shellRect)}
      {L('offsetHeight', metrics.shellOffsetHeight)}
      {L('shell gap', metrics.shellGapFromScreenBottom !== null ? `${metrics.shellGapFromScreenBottom}px` : 'N/A')}

      <div style={{ color: '#aaa', marginTop: 4 }}>--- Nav ---</div>
      {L('position', metrics.navComputedPosition)}
      {L('paddingBottom', metrics.navComputedPaddingBottom)}
      {L('rect.bottom', metrics.navRectBottom)}

      <div style={{ color: '#aaa', marginTop: 4 }}>--- Body ---</div>
      {L('overflow', metrics.bodyOverflow)}

      <div style={{ color: '#aaa', marginTop: 4 }}>--- GAP ---</div>
      <div style={{ fontSize: 14, fontWeight: 'bold', color: gapColor }}>
        innerH - nav.bottom = {gap !== null ? `${gap}px` : 'N/A'}
      </div>
      {gap !== null && Math.abs(gap) > 1 && (
        <div style={{ color: '#ff4444', fontSize: 11 }}>
          GAP: {gap}px below nav
        </div>
      )}
    </div>
  )
}
