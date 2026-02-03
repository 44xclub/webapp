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
  className?: string
  showClose?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
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
          'relative z-10 w-full sm:max-w-lg max-h-[90vh] bg-[#0d1014] border border-[rgba(255,255,255,0.10)] rounded-t-[16px] sm:rounded-[16px] overflow-hidden animate-slideUp shadow-lg',
          className
        )}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.07)]">
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

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-60px)] safe-bottom">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

// Dropdown menu component for block actions
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
}

export function DropdownMenu({
  isOpen,
  onClose,
  items,
  className,
}: DropdownMenuProps) {
  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = () => onClose()
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

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
