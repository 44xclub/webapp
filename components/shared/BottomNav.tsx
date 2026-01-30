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
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom md:left-1/2 md:-translate-x-1/2 md:max-w-[480px] md:bottom-6 md:px-4">
      <div className="bg-card/80 backdrop-blur-xl border-t border-white/[0.06] md:border md:rounded-2xl md:shadow-lg">
        <div className="flex items-center justify-around h-16 md:h-14">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href === '/app' && pathname === '/') ||
              (item.href !== '/app' && pathname?.startsWith(item.href))
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-150 ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full md:hidden" />
                )}
                <div className={`relative p-1.5 rounded-xl transition-colors ${
                  isActive ? 'bg-primary/10' : ''
                }`}>
                  <Icon className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                </div>
                <span className={`text-[10px] mt-0.5 font-semibold tracking-wide ${
                  isActive ? 'text-primary' : ''
                }`}>
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
