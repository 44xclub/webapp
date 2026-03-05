'use client'

import { useEffect, useState, useCallback } from 'react'

interface DebugMetrics {
  standalone: boolean
  matchMediaStandalone: boolean
  windowInnerHeight: number
  windowOuterHeight: number
  visualViewportHeight: number | null
  visualViewportOffsetTop: number | null
  documentClientHeight: number
  appShellHeight: string
  appShellComputedHeight: string
  appShellComputedMinHeight: string
  appShellComputedPaddingBottom: string
  navComputedMarginBottom: string
  navComputedPaddingBottom: string
  navComputedTransform: string
  navComputedPosition: string
  navGap: number | null
  navRectBottom: number | null
  cssAppHeight: string
  cssAppDvh: string
  cssKeyboardHeight: string
  cssSafeBottom: string
  hundredDvh: string
}

function getMetrics(): DebugMetrics {
  const shell = document.querySelector('.app-shell') as HTMLElement | null
  const nav = document.querySelector('nav[class*="flex-shrink-0"]') as HTMLElement | null
  const navRect = nav?.getBoundingClientRect() ?? null

  const shellStyles = shell ? getComputedStyle(shell) : null
  const navStyles = nav ? getComputedStyle(nav) : null

  // Read CSS custom properties from :root
  const rootStyles = getComputedStyle(document.documentElement)

  // Measure what 100dvh actually resolves to
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;top:0;height:100dvh;width:0;pointer-events:none;visibility:hidden;'
  document.body.appendChild(probe)
  const hundredDvh = `${probe.offsetHeight}px`
  document.body.removeChild(probe)

  return {
    standalone: !!(navigator as any).standalone,
    matchMediaStandalone: window.matchMedia('(display-mode: standalone)').matches,
    windowInnerHeight: window.innerHeight,
    windowOuterHeight: window.outerHeight,
    visualViewportHeight: window.visualViewport?.height ?? null,
    visualViewportOffsetTop: window.visualViewport?.offsetTop ?? null,
    documentClientHeight: document.documentElement.clientHeight,
    appShellHeight: shell ? `${shell.offsetHeight}px` : 'N/A',
    appShellComputedHeight: shellStyles?.height ?? 'N/A',
    appShellComputedMinHeight: shellStyles?.minHeight ?? 'N/A',
    appShellComputedPaddingBottom: shellStyles?.paddingBottom ?? 'N/A',
    navComputedMarginBottom: navStyles?.marginBottom ?? 'N/A',
    navComputedPaddingBottom: navStyles?.paddingBottom ?? 'N/A',
    navComputedTransform: navStyles?.transform ?? 'N/A',
    navComputedPosition: navStyles?.position ?? 'N/A',
    navGap: navRect ? Math.round(window.innerHeight - navRect.bottom) : null,
    navRectBottom: navRect ? Math.round(navRect.bottom) : null,
    cssAppHeight: rootStyles.getPropertyValue('--app-height').trim() || 'unset',
    cssAppDvh: rootStyles.getPropertyValue('--app-dvh').trim() || 'unset',
    cssKeyboardHeight: rootStyles.getPropertyValue('--app-shell-keyboard-height').trim() || 'unset',
    cssSafeBottom: rootStyles.getPropertyValue('--safe-bottom').trim() || 'unset',
    hundredDvh,
  }
}

export function DebugOverlay() {
  const [metrics, setMetrics] = useState<DebugMetrics | null>(null)
  const [visible, setVisible] = useState(false)
  const [minimized, setMinimized] = useState(false)

  const refresh = useCallback(() => {
    setMetrics(getMetrics())
  }, [])

  useEffect(() => {
    // Check ?debug=1 or env var
    const params = new URLSearchParams(window.location.search)
    const debugEnabled = params.get('debug') === '1' ||
      process.env.NEXT_PUBLIC_DEBUG_UI === '1'

    if (!debugEnabled) return

    setVisible(true)
    // Small delay to let layout settle
    const t = setTimeout(refresh, 200)

    window.addEventListener('resize', refresh)
    window.addEventListener('orientationchange', () => setTimeout(refresh, 200))
    window.visualViewport?.addEventListener('resize', refresh)

    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', refresh)
      window.visualViewport?.removeEventListener('resize', refresh)
    }
  }, [refresh])

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

  return (
    <div style={{
      position: 'fixed', top: 44, left: 4, right: 4, zIndex: 99999,
      background: 'rgba(0,0,0,0.92)', color: '#0f0',
      padding: 8, borderRadius: 8, fontSize: 10,
      fontFamily: 'monospace', lineHeight: 1.5,
      maxHeight: '60vh', overflowY: 'auto',
      pointerEvents: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <strong style={{ color: '#fff' }}>Layout Debug</strong>
        <div>
          <button onClick={refresh} style={{ background: '#333', color: '#0f0', border: 'none', padding: '2px 6px', borderRadius: 4, marginRight: 4, fontSize: 10 }}>Refresh</button>
          <button onClick={() => setMinimized(true)} style={{ background: '#333', color: '#ff0', border: 'none', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>Min</button>
        </div>
      </div>

      <div style={{ color: '#aaa' }}>--- PWA Status ---</div>
      <div>navigator.standalone: <span style={{ color: '#ff0' }}>{String(metrics.standalone)}</span></div>
      <div>matchMedia standalone: <span style={{ color: '#ff0' }}>{String(metrics.matchMediaStandalone)}</span></div>

      <div style={{ color: '#aaa', marginTop: 4 }}>--- Viewport ---</div>
      <div>window.innerHeight: <span style={{ color: '#ff0' }}>{metrics.windowInnerHeight}</span></div>
      <div>window.outerHeight: <span style={{ color: '#ff0' }}>{metrics.windowOuterHeight}</span></div>
      <div>visualViewport.height: <span style={{ color: '#ff0' }}>{metrics.visualViewportHeight ?? 'N/A'}</span></div>
      <div>visualViewport.offsetTop: <span style={{ color: '#ff0' }}>{metrics.visualViewportOffsetTop ?? 'N/A'}</span></div>
      <div>document.clientHeight: <span style={{ color: '#ff0' }}>{metrics.documentClientHeight}</span></div>
      <div>100dvh (measured): <span style={{ color: '#ff0' }}>{metrics.hundredDvh}</span></div>

      <div style={{ color: '#aaa', marginTop: 4 }}>--- CSS Variables ---</div>
      <div>--app-height: <span style={{ color: '#ff0' }}>{metrics.cssAppHeight}</span></div>
      <div>--app-dvh: <span style={{ color: '#ff0' }}>{metrics.cssAppDvh}</span></div>
      <div>--app-shell-keyboard-height: <span style={{ color: '#ff0' }}>{metrics.cssKeyboardHeight}</span></div>
      <div>--safe-bottom: <span style={{ color: '#ff0' }}>{metrics.cssSafeBottom}</span></div>

      <div style={{ color: '#aaa', marginTop: 4 }}>--- AppShell ---</div>
      <div>offsetHeight: <span style={{ color: '#ff0' }}>{metrics.appShellHeight}</span></div>
      <div>computed height: <span style={{ color: '#ff0' }}>{metrics.appShellComputedHeight}</span></div>
      <div>computed minHeight: <span style={{ color: '#ff0' }}>{metrics.appShellComputedMinHeight}</span></div>
      <div>computed paddingBottom: <span style={{ color: '#ff0' }}>{metrics.appShellComputedPaddingBottom}</span></div>

      <div style={{ color: '#aaa', marginTop: 4 }}>--- BottomNav ---</div>
      <div>position: <span style={{ color: '#ff0' }}>{metrics.navComputedPosition}</span></div>
      <div>marginBottom: <span style={{ color: '#ff0' }}>{metrics.navComputedMarginBottom}</span></div>
      <div>paddingBottom: <span style={{ color: '#ff0' }}>{metrics.navComputedPaddingBottom}</span></div>
      <div>transform: <span style={{ color: '#ff0' }}>{metrics.navComputedTransform}</span></div>
      <div>nav rect.bottom: <span style={{ color: '#ff0' }}>{metrics.navRectBottom ?? 'N/A'}</span></div>

      <div style={{ color: '#aaa', marginTop: 4 }}>--- GAP (key metric) ---</div>
      <div style={{ fontSize: 14, fontWeight: 'bold', color: gapColor }}>
        innerHeight - nav.bottom = {gap !== null ? `${gap}px` : 'N/A'}
      </div>
      {gap !== null && Math.abs(gap) > 1 && (
        <div style={{ color: '#ff4444', fontSize: 11, marginTop: 2 }}>
          GAP DETECTED! Shell is {gap}px shorter than viewport.
        </div>
      )}
    </div>
  )
}
