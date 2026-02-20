'use client'

import { useEffect, useCallback, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X, Search } from 'lucide-react'
import { lockBodyScroll, unlockBodyScroll } from './Modal'

interface FullScreenOverlayProps {
  isOpen: boolean
  onClose: () => void
  title: string
  searchQuery?: string
  onSearchChange?: (query: string) => void
  searchPlaceholder?: string
  children: ReactNode
  className?: string
}

export function FullScreenOverlay({
  isOpen,
  onClose,
  title,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  children,
  className,
}: FullScreenOverlayProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  const wasOpen = useRef(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

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
  useEffect(() => {
    if (!isOpen) return
    const vv = window.visualViewport
    if (!vv) return
    const sync = () => {
      if (wrapperRef.current) {
        wrapperRef.current.style.height = `${vv.height}px`
        wrapperRef.current.style.top = `${vv.offsetTop}px`
      }
    }
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

  // ── iOS focus handling ──
  useEffect(() => {
    if (!isOpen) return
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const handleFocusIn = () => {
      requestAnimationFrame(() => {
        if (window.scrollY !== 0) window.scrollTo(0, 0)
      })
    }
    wrapper.addEventListener('focusin', handleFocusIn)
    return () => wrapper.removeEventListener('focusin', handleFocusIn)
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div
      ref={wrapperRef}
      className="fixed inset-x-0 top-0 z-50 flex flex-col bg-[#07090d]"
      style={{ height: 'var(--app-height, 100dvh)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.07)]">
        <h2 className="text-[17px] font-semibold text-[#eef2ff]">{title}</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-[10px] text-[rgba(238,242,255,0.52)] hover:text-[rgba(238,242,255,0.92)] hover:bg-[rgba(255,255,255,0.05)] transition-all"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Search */}
      {onSearchChange && (
        <div className="px-4 py-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[rgba(238,242,255,0.35)]" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-[13px] bg-[rgba(255,255,255,0.04)] text-[#eef2ff] border border-[rgba(255,255,255,0.07)] rounded-[10px] placeholder:text-[rgba(238,242,255,0.30)] focus:outline-none focus:border-[rgba(255,255,255,0.15)] transition-colors"
            />
          </div>
        </div>
      )}

      {/* Grid content — overscroll-contain prevents scroll-chaining */}
      <div className={cn('flex-1 overflow-y-auto overscroll-contain px-4 pb-6', className)} style={{ WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>
    </div>,
    document.body
  )
}
