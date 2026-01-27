'use client'

import { useEffect, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal content - bottom sheet on mobile, centered on desktop */}
      <div
        className={cn(
          'relative z-10 w-full sm:max-w-lg max-h-[90vh] bg-card rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden animate-slideUp',
          className
        )}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            {showClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-secondary transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
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
        'absolute right-0 top-full mt-1 z-20 min-w-[160px] bg-card border border-border rounded-lg shadow-lg py-1 animate-fadeIn',
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
            'w-full px-3 py-2 text-left text-sm hover:bg-secondary transition-colors flex items-center gap-2',
            item.variant === 'destructive' && 'text-destructive hover:bg-destructive/10'
          )}
        >
          {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  )
}
