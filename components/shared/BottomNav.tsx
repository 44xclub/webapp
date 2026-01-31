'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Layers, Users, User } from 'lucide-react'

/*
  44CLUB Bottom Navigation
  Minimal. Functional. No decoration.
*/

const navItems = [
  { href: '/app', label: 'Home', icon: Home },
  { href: '/structure', label: 'Structure', icon: Layers },
  { href: '/community', label: 'Community', icon: Users },
  { href: '/profile', label: 'Profile', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-canvas border-t border-border safe-bottom">
      <div className="flex h-14">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href === '/app' && pathname === '/') ||
            (item.href !== '/app' && pathname?.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors duration-150 ${
                isActive ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-meta">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
