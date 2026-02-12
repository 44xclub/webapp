'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ChevronRight, Target, Dumbbell } from 'lucide-react'
import { useProfile, useCommunityChallenge, useFrameworks, useProgrammes, useRank } from '@/lib/hooks'
import { ChallengeCard } from '@/components/structure/ChallengeCard'
import { ChallengeLogModal } from '@/components/structure/ChallengeLogModal'
import { ActiveFrameworkCard } from '@/components/structure/ActiveFrameworkCard'
import { FrameworksSection } from '@/components/structure/FrameworksSection'
import { ProgrammeSection } from '@/components/structure/ProgrammeSection'
import { ProgrammeCatalogue } from '@/components/structure/ProgrammeCatalogue'
import { HeaderStrip } from '@/components/shared/HeaderStrip'
import { BottomNav } from '@/components/shared/BottomNav'
import { FrameworkChecklistModal } from '@/components/shared/FrameworkChecklistModal'
import { SegmentedControl, SectionCard, ListRow } from '@/components/ui'
import { SectionHeader } from '@/components/ui/SectionHeader'
import type { User as SupabaseUser } from '@supabase/supabase-js'

type TabType = 'discipline' | 'training'

const TABS = [
  { value: 'discipline', label: 'Discipline' },
  { value: 'training', label: 'Training' },
]

export default function StructurePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('discipline')
  const [frameworkModalOpen, setFrameworkModalOpen] = useState(false)
  const [challengeModalOpen, setChallengeModalOpen] = useState(false)

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
  const { rank } = useRank(user?.id)
  const { challenge, todayBlock, loading: challengeLoading, refetch: refetchChallenge } = useCommunityChallenge(user?.id)
  const { frameworks, activeFramework, todaySubmission, todayItems, completionCount, loading: frameworksLoading, activateFramework, deactivateFramework, submitDailyStatus, toggleFrameworkItem, refetch: refetchFrameworks } = useFrameworks(user?.id)
  const { programmes, activeProgramme, sessions, loading: programmesLoading, activateProgramme, deactivateProgramme, scheduleWeek, fetchProgrammeSessions, refetch: refetchProgrammes } = useProgrammes(user?.id)

  const handleChallengeLogSuccess = () => {
    refetchChallenge()
    setChallengeModalOpen(false)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh]" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))' }}>
      <HeaderStrip profile={profile} rank={rank} loading={profileLoading} />

      {/* Tab Navigation - sticky under header */}
      <div className="sticky top-0 z-40 bg-[rgba(7,9,13,0.92)] backdrop-blur-[12px] px-4 pt-2.5 pb-1.5">
        <SegmentedControl
          tabs={TABS}
          activeTab={activeTab}
          onChange={(v) => setActiveTab(v as TabType)}
        />
      </div>

      {/* Content */}
      <main className="px-4 pt-2 pb-6 space-y-5" style={{ overflowAnchor: 'none' }}>
        {activeTab === 'discipline' ? (
          <>
            {/* Community Challenge */}
            <div>
              <SectionHeader title="Community Challenge" subtitle="This month's challenge for all members" />
              {challengeLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
                </div>
              ) : (
                <ChallengeCard
                  challenge={challenge}
                  todayBlock={todayBlock}
                  onLogToday={() => setChallengeModalOpen(true)}
                />
              )}
            </div>

            {/* Active Framework */}
            {!frameworksLoading && (
              <div>
                <SectionHeader title="Active Framework" subtitle="Your current daily structure" />
                <ActiveFrameworkCard
                  activeFramework={activeFramework}
                  todaySubmission={todaySubmission}
                  completionCount={completionCount}
                  onOpenChecklist={() => setFrameworkModalOpen(true)}
                />
              </div>
            )}

            {/* Available Frameworks */}
            {frameworksLoading ? (
              <SectionCard>
                <div className="flex justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
                </div>
              </SectionCard>
            ) : (
              <FrameworksSection frameworks={frameworks} activeFramework={activeFramework} todaySubmission={todaySubmission} onActivateFramework={activateFramework} onSubmitStatus={submitDailyStatus} onRefetch={refetchFrameworks} />
            )}

            {/* Personal Discipline Framework Link */}
            <ListRow
              href="/personal-framework"
              icon={<Target className="h-5 w-5 text-[var(--accent-blue)]" />}
              label="Personal Discipline Framework"
              meta="Create your own daily non-negotiables"
            />
          </>
        ) : (
          <>
            {programmesLoading ? (
              <SectionCard>
                <div className="flex justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
                </div>
              </SectionCard>
            ) : (
              <>
                <ProgrammeSection activeProgramme={activeProgramme} sessions={sessions} onDeactivate={deactivateProgramme} onScheduleWeek={scheduleWeek} fetchProgrammeSessions={fetchProgrammeSessions} />
                <ProgrammeCatalogue programmes={programmes} activeProgrammeId={activeProgramme?.programme_template_id} onActivate={activateProgramme} onRefetch={refetchProgrammes} fetchProgrammeSessions={fetchProgrammeSessions} />
              </>
            )}

            {/* Personal Programmes Link */}
            <ListRow
              href="/programmes"
              icon={<Dumbbell className="h-5 w-5 text-purple-400" />}
              label="Personal Programmes"
              meta="Build your own workout programmes"
            />
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

      {challenge && user && (
        <ChallengeLogModal
          isOpen={challengeModalOpen}
          onClose={() => setChallengeModalOpen(false)}
          challenge={challenge}
          userId={user.id}
          userProfile={profile}
          userRank={rank}
          onSuccess={handleChallengeLogSuccess}
        />
      )}
    </div>
  )
}
