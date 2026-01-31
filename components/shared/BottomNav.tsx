'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Layers, Users, User } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: typeof Home
}

const navItems: NavItem[] = [
  { href: '/app', label: 'Home', icon: Home },
  { href: '/structure', label: 'Structure', icon: Layers },
  { href: '/community', label: 'Community', icon: Users },
  { href: '/profile', label: 'Profile', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom">
      <div className="bg-[#0d1117]/95 backdrop-blur-xl border-t border-white/5">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href === '/app' && pathname === '/') ||
              (item.href !== '/app' && pathname?.startsWith(item.href))
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 ${
                  isActive
                    ? 'text-blue-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" />
                )}
                <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-blue-500/10' : ''}`}>
                  <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                </div>
                <span className={`text-[10px] font-semibold ${isActive ? 'text-blue-400' : ''}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
