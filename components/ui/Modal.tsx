'use client'

import { useEffect, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

/*
  44CLUB Modal
  Clean. Focused. No decoration.
*/

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
  showClose?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className,
  showClose = true,
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#05070a]/85 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal content - bottom sheet on mobile, centered on desktop */}
      <div
        className={cn(
          'relative z-10 w-full sm:max-w-lg max-h-[90dvh] bg-[#0d1014] border border-[rgba(255,255,255,0.10)] rounded-t-[16px] sm:rounded-[16px] overflow-hidden animate-slideUp shadow-lg flex flex-col',
          className
        )}
      >
        {/* Header - fixed */}
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

        {/* Scrollable Content - body */}
        <div className={cn(
          'flex-1 overflow-y-auto overscroll-contain',
          footer ? 'max-h-[calc(90dvh-140px)]' : 'max-h-[calc(90dvh-60px)]'
        )}>
          {children}
        </div>

        {/* Sticky Footer - fixed with safe area + centered padding */}
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

// Dropdown menu component for block actions - uses portal to escape overflow:hidden
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
      // Use mousedown to catch clicks before they propagate
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // If anchorRect is provided, use portal with fixed positioning
  if (anchorRect) {
    // Position menu below and to the left of anchor (right-aligned)
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

  // Fallback: absolute positioning (for backwards compatibility)
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
