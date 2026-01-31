'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckSquare, ChevronRight } from 'lucide-react'
import { useProfile, useCommunityChallenge, useFrameworks, useProgrammes } from '@/lib/hooks'
import { ChallengeCard } from '@/components/structure/ChallengeCard'
import { FrameworksSection } from '@/components/structure/FrameworksSection'
import { ProgrammeSection } from '@/components/structure/ProgrammeSection'
import { ProgrammeCatalogue } from '@/components/structure/ProgrammeCatalogue'
import { HeaderStrip } from '@/components/shared/HeaderStrip'
import { BottomNav } from '@/components/shared/BottomNav'
import { FrameworkChecklistModal } from '@/components/shared/FrameworkChecklistModal'
import type { User as SupabaseUser } from '@supabase/supabase-js'

type TabType = 'discipline' | 'training'

export default function StructurePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('discipline')
  const [frameworkModalOpen, setFrameworkModalOpen] = useState(false)

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
  const {
    frameworks,
    activeFramework,
    todaySubmission,
    todayItems,
    completionCount,
    loading: frameworksLoading,
    activateFramework,
    submitDailyStatus,
    toggleFrameworkItem,
    refetch: refetchFrameworks,
  } = useFrameworks(user?.id)
  const { programmes, activeProgramme, sessions, loading: programmesLoading, activateProgramme, deactivateProgramme, scheduleWeek, refetch: refetchProgrammes } = useProgrammes(user?.id)

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#0a0a0f] pb-20">
      {/* Header Strip */}
      <HeaderStrip profile={profile} loading={profileLoading} />

      {/* Page Header */}
      <header className="sticky top-[52px] z-30 bg-[#0d1117]/95 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 py-3">
          <h1 className="text-lg font-semibold text-white">Structure</h1>
        </div>

        {/* Tab Toggle */}
        <div className="px-4 pb-3">
          <div className="inline-flex bg-white/5 rounded-xl p-1 w-full">
            <button
              onClick={() => setActiveTab('discipline')}
              className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'discipline'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Discipline
            </button>
            <button
              onClick={() => setActiveTab('training')}
              className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'training'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Training
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 space-y-4">
        {activeTab === 'discipline' ? (
          <>
            {/* Active Framework Quick Card - opens checklist modal */}
            {activeFramework?.framework_template && !frameworksLoading && (
              <button
                onClick={() => setFrameworkModalOpen(true)}
                className="w-full text-left"
              >
                <div className="bg-[#0d1117] rounded-2xl p-4 border border-white/5 hover:border-blue-500/30 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Active Framework</p>
                      <p className="font-medium text-white">{activeFramework.framework_template.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <CheckSquare className={`h-4 w-4 ${
                          completionCount.completed === completionCount.total && completionCount.total > 0
                            ? 'text-emerald-400'
                            : completionCount.completed > 0
                            ? 'text-yellow-400'
                            : 'text-gray-500'
                        }`} />
                        <p className={`text-xs ${
                          completionCount.completed === completionCount.total && completionCount.total > 0
                            ? 'text-emerald-400'
                            : completionCount.completed > 0
                            ? 'text-yellow-400'
                            : 'text-gray-500'
                        }`}>
                          {completionCount.completed} / {completionCount.total} complete
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  </div>
                </div>
              </button>
            )}

            {/* Community Challenge */}
            {challengeLoading ? (
              <div className="bg-[#0d1117] rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
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

            {/* Frameworks Catalogue */}
            {frameworksLoading ? (
              <div className="bg-[#0d1117] rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
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
              <div className="bg-[#0d1117] rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
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

      {/* Framework Checklist Modal */}
      <FrameworkChecklistModal
        isOpen={frameworkModalOpen}
        onClose={() => setFrameworkModalOpen(false)}
        framework={activeFramework?.framework_template}
        todayItems={todayItems}
        completionCount={completionCount}
        onToggleItem={toggleFrameworkItem}
      />
    </div>
  )
}
