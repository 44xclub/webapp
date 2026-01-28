'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, User, Settings, LogOut, LayoutGrid } from 'lucide-react'

interface TopMenuProps {
  onSignOut: () => void
}

export function TopMenu({ onSignOut }: TopMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close menu on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-secondary transition-colors"
        aria-label="Menu"
      >
        <MoreVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false)
                router.push('/structure')
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
            >
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              Structure
            </button>

            <button
              onClick={() => {
                setIsOpen(false)
                // Account placeholder - can be implemented later
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              Account
            </button>

            <button
              onClick={() => {
                setIsOpen(false)
                // Settings placeholder - can be implemented later
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              Settings
            </button>

            <div className="border-t border-border my-1" />

            <button
              onClick={() => {
                setIsOpen(false)
                onSignOut()
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
