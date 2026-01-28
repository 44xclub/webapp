'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/contexts'
import { GlobalHeader } from './GlobalHeader'
import { BottomNav } from './BottomNav'

interface AuthenticatedLayoutProps {
  children: ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { user, profile, loading, profileLoading } = useAuth()
  const router = useRouter()

  // Redirect to login if not authenticated after loading completes
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // If no user after loading, return null while redirect happens
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16">
      {/* Global Header Strip - always visible */}
      {!profileLoading && profile && (
        <GlobalHeader profile={profile} userEmail={user.email} />
      )}

      {/* Profile loading placeholder */}
      {profileLoading && (
        <header className="sticky top-0 z-50 bg-card border-b border-border safe-top">
          <div className="px-4 py-2 h-[52px] flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        </header>
      )}

      {/* Page content */}
      {children}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
