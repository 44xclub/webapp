'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { useProfile, useCommunityChallenge, useFrameworks, useProgrammes } from '@/lib/hooks'
import { ChallengeCard } from '@/components/structure/ChallengeCard'
import { ActiveFrameworkCard } from '@/components/structure/ActiveFrameworkCard'
import { FrameworksSection } from '@/components/structure/FrameworksSection'
import { ProgrammeSection } from '@/components/structure/ProgrammeSection'
import { ProgrammeCatalogue } from '@/components/structure/ProgrammeCatalogue'
import { HeaderStrip } from '@/components/shared/HeaderStrip'
import { BottomNav } from '@/components/shared/BottomNav'
import { FrameworkChecklistModal } from '@/components/shared/FrameworkChecklistModal'
import type { User as SupabaseUser } from '@supabase/supabase-js'

/*
  44CLUB Structure Page
  Discipline & Training. Stoic. Controlled.
*/

type TabType = 'discipline' | 'training'

export default function StructurePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('discipline')
  const [frameworkModalOpen, setFrameworkModalOpen] = useState(false)

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let isMounted = true
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (!isMounted) return
        if (error || !user) { router.push('/login'); return }
        setUser(user)
        setAuthLoading(false)
      } catch { if (isMounted) router.push('/login') }
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      if (event === 'SIGNED_OUT') router.push('/login')
      else if (session?.user) { setUser(session.user); setAuthLoading(false) }
    })

    return () => { isMounted = false; subscription.unsubscribe() }
  }, [router, supabase])

  const { profile, loading: profileLoading } = useProfile(user?.id)
  const { challenge, todayBlock, loading: challengeLoading, logChallenge, refetch: refetchChallenge } = useCommunityChallenge(user?.id)
  const { frameworks, activeFramework, todaySubmission, todayItems, completionCount, loading: frameworksLoading, activateFramework, deactivateFramework, submitDailyStatus, toggleFrameworkItem, refetch: refetchFrameworks } = useFrameworks(user?.id)
  const { programmes, activeProgramme, sessions, loading: programmesLoading, activateProgramme, deactivateProgramme, scheduleWeek, refetch: refetchProgrammes } = useProgrammes(user?.id)

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas pb-16">
      <HeaderStrip profile={profile} loading={profileLoading} />

      {/* Page Header */}
      <header className="bg-surface border-b border-border">
        <div className="px-4 py-3">
          <h1 className="text-page-title font-semibold text-text-primary">Structure</h1>
        </div>

        {/* Tab Toggle */}
        <div className="px-4 pb-3">
          <div className="flex bg-canvas-card rounded-[10px] p-1">
            <button
              onClick={() => setActiveTab('discipline')}
              className={`flex-1 py-2 text-secondary font-medium rounded-[8px] transition-colors duration-150 ${
                activeTab === 'discipline'
                  ? 'bg-accent text-white'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Discipline
            </button>
            <button
              onClick={() => setActiveTab('training')}
              className={`flex-1 py-2 text-secondary font-medium rounded-[8px] transition-colors duration-150 ${
                activeTab === 'training'
                  ? 'bg-accent text-white'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Training
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 space-y-3">
        {activeTab === 'discipline' ? (
          <>
            {/* 1. Community Challenge - shown first */}
            {challengeLoading ? (
              <div className="bg-surface border border-border rounded-[16px] p-8 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
              </div>
            ) : (
              <ChallengeCard challenge={challenge} todayBlock={todayBlock} onLogChallenge={logChallenge} onRefetch={refetchChallenge} />
            )}

            {/* 2. Active Framework - shown second */}
            {!frameworksLoading && (
              <ActiveFrameworkCard
                activeFramework={activeFramework}
                todaySubmission={todaySubmission}
                completionCount={completionCount}
                onOpenChecklist={() => setFrameworkModalOpen(true)}
              />
            )}

            {/* 3. Available Frameworks Catalogue - shown third */}
            {frameworksLoading ? (
              <div className="bg-surface border border-border rounded-[16px] p-8 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
              </div>
            ) : (
              <FrameworksSection frameworks={frameworks} activeFramework={activeFramework} todaySubmission={todaySubmission} onActivateFramework={activateFramework} onSubmitStatus={submitDailyStatus} onRefetch={refetchFrameworks} />
            )}
          </>
        ) : (
          <>
            {programmesLoading ? (
              <div className="bg-surface border border-border rounded-[16px] p-8 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
              </div>
            ) : (
              <>
                <ProgrammeSection activeProgramme={activeProgramme} sessions={sessions} onDeactivate={deactivateProgramme} onScheduleWeek={scheduleWeek} />
                <ProgrammeCatalogue programmes={programmes} activeProgrammeId={activeProgramme?.programme_template_id} onActivate={activateProgramme} onRefetch={refetchProgrammes} />
              </>
            )}
          </>
        )}
      </main>

      <BottomNav />

      <FrameworkChecklistModal
        isOpen={frameworkModalOpen}
        onClose={() => setFrameworkModalOpen(false)}
        framework={activeFramework?.framework_template}
        todayItems={todayItems}
        completionCount={completionCount}
        onToggleItem={toggleFrameworkItem}
        onDeactivate={deactivateFramework}
      />
    </div>
  )
}
