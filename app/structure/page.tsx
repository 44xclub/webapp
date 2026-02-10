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
import { SegmentedControl } from '@/components/ui/SegmentedControl'
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
      <div className="min-h-screen flex items-center justify-center bg-[#07090d]">
        <Loader2 className="h-6 w-6 animate-spin text-[rgba(238,242,255,0.35)]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#07090d] pb-16">
      <HeaderStrip profile={profile} loading={profileLoading} />

      {/* Page Header - compact */}
      <div className="px-4 pt-2 pb-1">
        <h1 className="text-[20px] font-semibold text-[#eef2ff] mb-2">Structure</h1>
        <SegmentedControl
          tabs={TABS}
          activeTab={activeTab}
          onChange={(v) => setActiveTab(v as TabType)}
        />
      </div>

      {/* Content */}
      <main className="px-4 pt-4 space-y-5">
        {activeTab === 'discipline' ? (
          <>
            {/* Community Challenge */}
            <div>
              <SectionHeader title="Community Challenge" subtitle="Monthly team challenge" />
              {challengeLoading ? (
                <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[14px] p-6 flex justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-[rgba(238,242,255,0.30)]" />
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

            {/* Personal Discipline Framework Link */}
            <Link
              href="/personal-framework"
              className="flex items-center justify-between px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[14px] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[10px] bg-[#3b82f6]/20 flex items-center justify-center">
                  <Target className="h-5 w-5 text-[#3b82f6]" />
                </div>
                <div>
                  <p className="text-[14px] font-medium text-[#eef2ff]">Personal Discipline Framework</p>
                  <p className="text-[12px] text-[rgba(238,242,255,0.52)]">Create your own daily non-negotiables</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-[rgba(238,242,255,0.35)]" />
            </Link>

            {/* Available Frameworks */}
            {frameworksLoading ? (
              <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[14px] p-6 flex justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-[rgba(238,242,255,0.30)]" />
              </div>
            ) : (
              <FrameworksSection frameworks={frameworks} activeFramework={activeFramework} todaySubmission={todaySubmission} onActivateFramework={activateFramework} onSubmitStatus={submitDailyStatus} onRefetch={refetchFrameworks} />
            )}
          </>
        ) : (
          <>
            {/* Personal Programmes Link */}
            <Link
              href="/programmes"
              className="flex items-center justify-between px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[14px] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[10px] bg-purple-500/20 flex items-center justify-center">
                  <Dumbbell className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-[14px] font-medium text-[#eef2ff]">Personal Programmes</p>
                  <p className="text-[12px] text-[rgba(238,242,255,0.52)]">Build your own workout programmes</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-[rgba(238,242,255,0.35)]" />
            </Link>

            {programmesLoading ? (
              <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[14px] p-6 flex justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-[rgba(238,242,255,0.30)]" />
              </div>
            ) : (
              <>
                <ProgrammeSection activeProgramme={activeProgramme} sessions={sessions} onDeactivate={deactivateProgramme} onScheduleWeek={scheduleWeek} fetchProgrammeSessions={fetchProgrammeSessions} />
                <ProgrammeCatalogue programmes={programmes} activeProgrammeId={activeProgramme?.programme_template_id} onActivate={activateProgramme} onRefetch={refetchProgrammes} fetchProgrammeSessions={fetchProgrammeSessions} />
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
