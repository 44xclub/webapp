'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Layers, Users, User } from 'lucide-react'

const navItems = [
  { href: '/app', label: 'Home', icon: Home },
  { href: '/structure', label: 'Structure', icon: Layers },
  { href: '/community', label: 'Community', icon: Users },
  { href: '/profile', label: 'Profile', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[rgba(7,9,13,0.92)] backdrop-blur-[16px] border-t border-[rgba(255,255,255,0.07)]">
      <div className="flex h-16 safe-x">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href === '/app' && pathname === '/') ||
            (item.href !== '/app' && pathname?.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-[140ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] relative ${
                isActive ? 'text-[#3b82f6]' : 'text-[rgba(238,242,255,0.52)] hover:text-[rgba(238,242,255,0.72)]'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-transparent via-[#3b82f6] to-transparent" />
              )}
              <div className={`p-1.5 rounded-[10px] transition-all duration-[140ms] ${isActive ? 'bg-[rgba(59,130,246,0.16)]' : ''}`}>
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 1.5} />
              </div>
              <span className={`text-[11px] font-bold tracking-wide ${isActive ? '' : 'font-semibold'}`}>{item.label}</span>
            </Link>
          )
        })}
      </div>
      {/* Safe area bottom spacer */}
      <div className="safe-bottom" />
    </nav>
  )
}
