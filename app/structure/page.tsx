'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { useProfile, useCommunityChallenge, useFrameworks, useProgrammes } from '@/lib/hooks'
import { ProfileCard } from '@/components/structure/ProfileCard'
import { ChallengeCard } from '@/components/structure/ChallengeCard'
import { FrameworksSection } from '@/components/structure/FrameworksSection'
import { ProgrammeSection } from '@/components/structure/ProgrammeSection'
import { ProgrammeCatalogue } from '@/components/structure/ProgrammeCatalogue'
import { HeaderStrip } from '@/components/shared/HeaderStrip'
import { BottomNav } from '@/components/shared/BottomNav'
import type { User as SupabaseUser } from '@supabase/supabase-js'

type TabType = 'discipline' | 'training'

export default function StructurePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('discipline')

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Auth check
  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (!isMounted) return

        if (error || !user) {
          router.push('/login')
          return
        }
        setUser(user)
        setAuthLoading(false)
      } catch (err) {
        if (isMounted) {
          router.push('/login')
        }
      }
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return

        if (event === 'SIGNED_OUT') {
          router.push('/login')
        } else if (session?.user) {
          setUser(session.user)
          setAuthLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router, supabase])

  // Data hooks
  const { profile, loading: profileLoading } = useProfile(user?.id)
  const { challenge, todayBlock, loading: challengeLoading, logChallenge, refetch: refetchChallenge } = useCommunityChallenge(user?.id)
  const { frameworks, activeFramework, todaySubmission, loading: frameworksLoading, activateFramework, submitDailyStatus, refetch: refetchFrameworks } = useFrameworks(user?.id)
  const { programmes, activeProgramme, sessions, loading: programmesLoading, activateProgramme, deactivateProgramme, scheduleWeek, refetch: refetchProgrammes } = useProgrammes(user?.id)

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header Strip */}
      <HeaderStrip profile={profile} loading={profileLoading} />

      {/* Page Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border">
        <div className="px-4 py-3">
          <h1 className="text-lg font-semibold text-foreground">Structure</h1>
        </div>

        {/* Tab Toggle */}
        <div className="px-4 pb-3">
          <div className="inline-flex bg-secondary rounded-lg p-1 w-full">
            <button
              onClick={() => setActiveTab('discipline')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'discipline'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Discipline
            </button>
            <button
              onClick={() => setActiveTab('training')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'training'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Training
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 space-y-4">
        {/* Profile Card - always visible */}
        {!profileLoading && profile && (
          <ProfileCard profile={profile} />
        )}

        {activeTab === 'discipline' ? (
          <>
            {/* Community Challenge */}
            {challengeLoading ? (
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </div>
            ) : (
              <ChallengeCard
                challenge={challenge}
                todayBlock={todayBlock}
                onLogChallenge={logChallenge}
                onRefetch={refetchChallenge}
              />
            )}

            {/* Frameworks */}
            {frameworksLoading ? (
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </div>
            ) : (
              <FrameworksSection
                frameworks={frameworks}
                activeFramework={activeFramework}
                todaySubmission={todaySubmission}
                onActivateFramework={activateFramework}
                onSubmitStatus={submitDailyStatus}
                onRefetch={refetchFrameworks}
              />
            )}
          </>
        ) : (
          <>
            {/* Active Programme */}
            {programmesLoading ? (
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </div>
            ) : (
              <>
                <ProgrammeSection
                  activeProgramme={activeProgramme}
                  sessions={sessions}
                  onDeactivate={deactivateProgramme}
                  onScheduleWeek={scheduleWeek}
                />

                {/* Programme Catalogue */}
                <ProgrammeCatalogue
                  programmes={programmes}
                  activeProgrammeId={activeProgramme?.programme_template_id}
                  onActivate={activateProgramme}
                  onRefetch={refetchProgrammes}
                />
              </>
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
