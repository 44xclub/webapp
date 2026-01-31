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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-800 safe-bottom">
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
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 w-8 h-0.5 bg-blue-500" />
              )}
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
