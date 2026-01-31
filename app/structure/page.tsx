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
  const { frameworks, activeFramework, todaySubmission, todayItems, completionCount, loading: frameworksLoading, activateFramework, submitDailyStatus, toggleFrameworkItem, refetch: refetchFrameworks } = useFrameworks(user?.id)
  const { programmes, activeProgramme, sessions, loading: programmesLoading, activateProgramme, deactivateProgramme, scheduleWeek, refetch: refetchProgrammes } = useProgrammes(user?.id)

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-16">
      <HeaderStrip profile={profile} loading={profileLoading} />

      {/* Page Header */}
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="px-4 py-3">
          <h1 className="text-lg font-semibold text-zinc-100">Structure</h1>
        </div>

        {/* Tab Toggle */}
        <div className="px-4 pb-3">
          <div className="flex bg-zinc-800 rounded-md p-0.5">
            <button
              onClick={() => setActiveTab('discipline')}
              className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${
                activeTab === 'discipline'
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Discipline
            </button>
            <button
              onClick={() => setActiveTab('training')}
              className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${
                activeTab === 'training'
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
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
            {activeFramework?.framework_template && !frameworksLoading && (
              <button onClick={() => setFrameworkModalOpen(true)} className="w-full text-left">
                <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Active Framework</p>
                      <p className="font-medium text-zinc-100">{activeFramework.framework_template.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <CheckSquare className={`h-4 w-4 ${
                          completionCount.completed === completionCount.total && completionCount.total > 0
                            ? 'text-emerald-400' : completionCount.completed > 0 ? 'text-amber-400' : 'text-zinc-500'
                        }`} />
                        <span className={`text-xs ${
                          completionCount.completed === completionCount.total && completionCount.total > 0
                            ? 'text-emerald-400' : completionCount.completed > 0 ? 'text-amber-400' : 'text-zinc-500'
                        }`}>
                          {completionCount.completed}/{completionCount.total} complete
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-zinc-600" />
                  </div>
                </div>
              </button>
            )}

            {challengeLoading ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-md p-8 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
              </div>
            ) : (
              <ChallengeCard challenge={challenge} todayBlock={todayBlock} onLogChallenge={logChallenge} onRefetch={refetchChallenge} />
            )}

            {frameworksLoading ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-md p-8 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
              </div>
            ) : (
              <FrameworksSection frameworks={frameworks} activeFramework={activeFramework} todaySubmission={todaySubmission} onActivateFramework={activateFramework} onSubmitStatus={submitDailyStatus} onRefetch={refetchFrameworks} />
            )}
          </>
        ) : (
          <>
            {programmesLoading ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-md p-8 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
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
      />
    </div>
  )
}
