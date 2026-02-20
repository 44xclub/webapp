'use client'

import { useEffect, useCallback, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

/*
  44CLUB Modal
  Clean. Focused. No decoration.

  Keyboard / scroll stability:
  ─────────────────────────────
  Root causes addressed:
    1) iOS Safari resizes the viewport when the virtual keyboard opens, which
       causes elements sized to `100dvh` or `100vh` to reflow. We use
       `window.visualViewport` to pin the modal wrapper to the *visual*
       viewport height so it never jumps.
    2) `position: fixed` on <body> for scroll lock can interact badly with
       iOS in-app browsers (Whop embed). We also set `width: 100%` and
       prevent touch-move on the backdrop to stop rubber-band scrolling.
    3) The `overscroll-behavior: contain` on the scroll container prevents
       scroll-chaining so only the modal (not the background) scrolls.
    4) `touch-action: none` on the backdrop prevents iOS from interpreting
       swipe gestures as page scroll.
*/

// ── Ref-counted body scroll lock ────────────────────────────────────────
let lockCount = 0
let savedScrollY = 0

export function lockBodyScroll() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${savedScrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'
    // Prevent layout shift from scrollbar disappearing on desktop
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    // Prevent touch-move on body for iOS rubber-band
    document.body.style.touchAction = 'none'
  }
  lockCount++
}

export function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.left = ''
    document.body.style.right = ''
    document.body.style.width = ''
    document.body.style.paddingRight = ''
    document.body.style.touchAction = ''
    window.scrollTo(0, savedScrollY)
  }
}

// ── Modal ────────────────────────────────────────────────────────────────

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
  showClose?: boolean
  fullScreen?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className,
  showClose = true,
  fullScreen = false,
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  const wasOpen = useRef(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // ── Open / close lifecycle ──
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      document.addEventListener('keydown', handleEscape)
      lockBodyScroll()
      wasOpen.current = true
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      if (wasOpen.current) {
        unlockBodyScroll()
        wasOpen.current = false
      }
    }
  }, [isOpen, handleEscape])

  // ── Visual-viewport pinning (iOS keyboard stability) ──
  // Runs for ALL modals so bottom-sheet modals also stay stable when the
  // keyboard opens.  On desktop (no visualViewport resize) this is a no-op.
  useEffect(() => {
    if (!isOpen) return

    const vv = window.visualViewport
    if (!vv) return

    const sync = () => {
      // Pin the fixed wrapper to the visual viewport so it doesn't
      // overflow behind the keyboard or shift when viewport resizes.
      if (wrapperRef.current) {
        wrapperRef.current.style.height = `${vv.height}px`
        wrapperRef.current.style.top = `${vv.offsetTop}px`
      }
    }

    // Initial sync
    sync()

    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      if (wrapperRef.current) {
        wrapperRef.current.style.height = ''
        wrapperRef.current.style.top = ''
      }
    }
  }, [isOpen])

  // ── Prevent backdrop touch-move from scrolling body ──
  useEffect(() => {
    if (!isOpen) return

    const el = wrapperRef.current
    if (!el) return

    const preventBodyScroll = (e: TouchEvent) => {
      // Only prevent if the touch target is the backdrop itself
      // (not inside the modal panel)
      if (e.target === el || e.target === el.querySelector('[data-modal-backdrop]')) {
        e.preventDefault()
      }
    }

    el.addEventListener('touchmove', preventBodyScroll, { passive: false })
    return () => el.removeEventListener('touchmove', preventBodyScroll)
  }, [isOpen])

  // ── iOS focus handling: prevent "auto scroll to focused input" from
  //    moving the root document.  When an input inside the modal receives
  //    focus, iOS Safari may scroll the *window* to reveal it.  We counteract
  //    by resetting window.scrollTo and scrolling the modal body instead. ──
  useEffect(() => {
    if (!isOpen) return

    const wrapper = wrapperRef.current
    if (!wrapper) return

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (!target) return

      // Only handle input/textarea/select/contenteditable
      const isInput = target.matches('input, textarea, select, [contenteditable]')
      if (!isInput) return

      // Find the modal's scrollable body (flex-1 overflow-y-auto)
      const scrollBody = wrapper.querySelector('[data-modal-body]') as HTMLElement
      if (!scrollBody) return

      // Prevent the browser from scrolling the window
      // (body is position:fixed so scrollY should be ~0)
      requestAnimationFrame(() => {
        if (window.scrollY !== 0) {
          window.scrollTo(0, 0)
        }

        // Scroll the modal body to reveal the focused input
        const bodyRect = scrollBody.getBoundingClientRect()
        const inputRect = target.getBoundingClientRect()

        // If the input is below the visible area of the modal body
        if (inputRect.bottom > bodyRect.bottom) {
          scrollBody.scrollTop += inputRect.bottom - bodyRect.bottom + 20
        }
        // If the input is above the visible area
        else if (inputRect.top < bodyRect.top) {
          scrollBody.scrollTop -= bodyRect.top - inputRect.top + 20
        }
      })
    }

    wrapper.addEventListener('focusin', handleFocusIn)
    return () => wrapper.removeEventListener('focusin', handleFocusIn)
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div
      ref={wrapperRef}
      className="fixed inset-x-0 top-0 z-50 flex items-end sm:items-center justify-center"
      style={{ height: 'var(--app-height, 100dvh)' }}
    >
      {/* Backdrop — touch-action: none prevents iOS rubber-band on this layer */}
      <div
        data-modal-backdrop
        className="absolute inset-0 bg-[#05070a]/85 backdrop-blur-sm animate-fadeIn"
        style={{ touchAction: 'none' }}
        onClick={onClose}
      />

      {/* Modal panel — uses h-full (of wrapper) for fullscreen, max-h for sheet */}
      <div
        ref={modalRef}
        className={cn(
          'relative z-10 bg-[#0d1014] overflow-hidden animate-slideUp shadow-lg flex flex-col',
          fullScreen
            ? 'w-full h-full safe-top'
            : 'w-full sm:max-w-lg max-h-[90%] border border-[rgba(255,255,255,0.10)] rounded-t-[16px] sm:rounded-[16px]',
          className
        )}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.07)]">
            <h2 className="text-[15px] font-bold text-[#eef2ff]">
              {title}
            </h2>
            {showClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-[10px] text-[rgba(238,242,255,0.52)] hover:text-[rgba(238,242,255,0.92)] hover:bg-[rgba(255,255,255,0.05)] transition-all duration-[140ms]"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable content — momentum scrolling on iOS */}
        <div
          data-modal-body
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>

        {/* Sticky footer */}
        {footer && (
          <div
            className="flex-shrink-0 border-t border-[rgba(255,255,255,0.08)] bg-[rgba(13,16,20,0.98)] px-4 pt-4"
            style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// ── DropdownMenu ─────────────────────────────────────────────────────────

interface DropdownMenuProps {
  isOpen: boolean
  onClose: () => void
  items: {
    label: string
    onClick: () => void
    variant?: 'default' | 'destructive'
    icon?: ReactNode
  }[]
  className?: string
  anchorRect?: DOMRect | null
}

export function DropdownMenu({
  isOpen,
  onClose,
  items,
  className,
  anchorRect,
}: DropdownMenuProps) {
  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = () => onClose()
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  if (anchorRect) {
    const menuWidth = 180
    const top = anchorRect.bottom + 4
    const left = anchorRect.right - menuWidth

    return createPortal(
      <div
        className={cn(
          'fixed z-[9999] min-w-[180px] bg-[rgba(9,11,16,0.96)] border border-[rgba(255,255,255,0.10)] rounded-[14px] py-2 px-2 animate-fadeIn backdrop-blur-[14px] shadow-2xl',
          className
        )}
        style={{
          top: `${top}px`,
          left: `${Math.max(8, left)}px`,
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => {
              item.onClick()
              onClose()
            }}
            className={cn(
              'w-full px-3 py-2.5 text-left text-[13px] font-bold text-[rgba(238,242,255,0.86)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(238,242,255,0.96)] rounded-[12px] transition-all duration-[140ms] flex items-center gap-2',
              item.variant === 'destructive' && 'text-danger hover:bg-danger/10'
            )}
          >
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </div>,
      document.body
    )
  }

  return (
    <div
      className={cn(
        'absolute right-0 top-full mt-1 z-20 min-w-[180px] bg-[rgba(9,11,16,0.92)] border border-[rgba(255,255,255,0.10)] rounded-[14px] py-2 px-2 animate-fadeIn backdrop-blur-[14px] shadow-lg',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            item.onClick()
            onClose()
          }}
          className={cn(
            'w-full px-3 py-2.5 text-left text-[13px] font-bold text-[rgba(238,242,255,0.86)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(238,242,255,0.96)] rounded-[12px] transition-all duration-[140ms] flex items-center gap-2',
            item.variant === 'destructive' && 'text-danger hover:bg-danger/10'
          )}
        >
          {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  )
}
