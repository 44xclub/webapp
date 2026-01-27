'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ChevronLeft } from 'lucide-react'
import { useProfile, useCommunityChallenge, useFrameworks, useProgrammes } from '@/lib/hooks'
import { ProfileCard } from '@/components/structure/ProfileCard'
import { ChallengeCard } from '@/components/structure/ChallengeCard'
import { FrameworksSection } from '@/components/structure/FrameworksSection'
import { ProgrammeSection } from '@/components/structure/ProgrammeSection'
import { ProgrammeCatalogue } from '@/components/structure/ProgrammeCatalogue'
import type { User as SupabaseUser } from '@supabase/supabase-js'

type TabType = 'discipline' | 'training'

export default function StructurePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('discipline')

  const router = useRouter()
  const supabase = createClient()

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      setAuthLoading(false)
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          router.push('/login')
        } else if (session?.user) {
          setUser(session.user)
        }
      }
    )

    return () => subscription.unsubscribe()
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border safe-top">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={() => router.push('/app')}
            className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground ml-2">Structure</h1>
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
      <main className="px-4 py-4 pb-24 space-y-4">
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
    </div>
  )
}
