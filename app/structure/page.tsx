'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, ChevronRight, Target } from 'lucide-react'
import { useAuth, useProfile, useFrameworks, useProgrammes, useRank } from '@/lib/hooks'
import { ActiveFrameworkCard } from '@/components/structure/ActiveFrameworkCard'
import { FrameworksSection } from '@/components/structure/FrameworksSection'
import { ProgrammeSection } from '@/components/structure/ProgrammeSection'
import { ProgrammeCatalogue } from '@/components/structure/ProgrammeCatalogue'
import { PersonalProgrammeCTA } from '@/components/structure/PersonalProgrammeCTA'
import { HeaderStrip } from '@/components/shared/HeaderStrip'
import { BottomNav } from '@/components/shared/BottomNav'
import { FrameworkChecklistModal } from '@/components/shared/FrameworkChecklistModal'
import { SegmentedControl } from '@/components/ui'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { StructureSkeleton, ProgrammeCardSkeleton } from '@/components/ui/Skeletons'

type TabType = 'discipline' | 'training'

const TABS = [
  { value: 'discipline', label: 'Discipline' },
  { value: 'training', label: 'Training' },
]

export default function StructurePage() {
  return (
    <Suspense fallback={
      <div className="min-h-app flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    }>
      <StructurePageContent />
    </Suspense>
  )
}

function StructurePageContent() {
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('discipline')
  const [frameworkModalOpen, setFrameworkModalOpen] = useState(false)
  const searchParams = useSearchParams()
  const frameworksSectionRef = useRef<HTMLDivElement>(null)

  const { profile, loading: profileLoading, avatarUrl } = useProfile(user?.id)
  const { rank } = useRank(user?.id)
  const { frameworks, activeFramework, todaySubmission, todayItems, completionCount, loading: frameworksLoading, activateFramework, deactivateFramework, submitDailyStatus, toggleFrameworkItem, refetch: refetchFrameworks } = useFrameworks(user?.id)
  const { programmes, activeProgramme, sessions, progress, loading: programmesLoading, activateProgramme, deactivateProgramme, scheduleWeek, fetchProgrammeSessions, refetch: refetchProgrammes } = useProgrammes(user?.id)

  // Handle deep-link to frameworks section via ?section=frameworks
  useEffect(() => {
    const section = searchParams.get('section')
    if (section === 'frameworks') {
      setActiveTab('discipline')
      // Wait for content to render before scrolling
      const timer = setTimeout(() => {
        frameworksSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [searchParams, frameworksLoading])

  if (authLoading || !user) {
    return (
      <div className="min-h-app flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    )
  }

  return (
    <div className="min-h-app content-container animate-fadeIn" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))' }}>
      <HeaderStrip profile={profile} rank={rank} loading={profileLoading} avatarUrl={avatarUrl} />

      {/* Tab Navigation - sticky under header */}
      <div className="sticky top-0 z-40 bg-[rgba(7,9,13,0.92)] backdrop-blur-[12px] px-4 pt-1.5 pb-1">
        <SegmentedControl
          tabs={TABS}
          activeTab={activeTab}
          onChange={(v) => setActiveTab(v as TabType)}
        />
      </div>

      {/* Content */}
      <main className="px-4 pt-2 pb-6 space-y-4" style={{ overflowAnchor: 'none' }}>
        {activeTab === 'discipline' ? (
          <>
            {/* Active Framework card */}
            {!frameworksLoading && (
              <ActiveFrameworkCard
                activeFramework={activeFramework}
                todaySubmission={todaySubmission}
                completionCount={completionCount}
                onOpenChecklist={() => setFrameworkModalOpen(true)}
              />
            )}

            {/* Personal Framework CTA — above available frameworks, matching programme CTA style */}
            <a href="/personal-framework" className="block no-underline">
              <div className="relative overflow-hidden rounded-[12px] h-[64px] border border-[rgba(255,255,255,0.08)] bg-gradient-to-r from-[rgba(59,130,246,0.12)] to-[rgba(59,130,246,0.04)] hover:border-[rgba(255,255,255,0.14)] active:border-[rgba(255,255,255,0.18)] transition-colors group">
                <div className="absolute inset-0 p-3 flex items-center gap-3">
                  <div className="p-2 rounded-[10px] bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.20)] flex-shrink-0">
                    <Target className="h-4 w-4 text-[#60a5fa]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#eef2ff] leading-tight">
                      Personal Framework
                    </p>
                    <p className="text-[11px] text-[rgba(238,242,255,0.45)] leading-tight mt-0.5">
                      Build your own
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[rgba(238,242,255,0.30)] flex-shrink-0 group-hover:text-[rgba(238,242,255,0.50)] transition-colors" />
                </div>
              </div>
            </a>

            {/* Available Frameworks */}
            <div ref={frameworksSectionRef} />
            {frameworksLoading ? (
              <div className="space-y-2">
                <ProgrammeCardSkeleton />
                <ProgrammeCardSkeleton />
              </div>
            ) : (
              <FrameworksSection frameworks={frameworks} activeFramework={activeFramework} todaySubmission={todaySubmission} onActivateFramework={activateFramework} onSubmitStatus={submitDailyStatus} onRefetch={refetchFrameworks} />
            )}
          </>
        ) : (
          <>
            {programmesLoading ? (
              <div className="space-y-2">
                <ProgrammeCardSkeleton />
                <ProgrammeCardSkeleton />
              </div>
            ) : (
              <>
                {/* Active Programme */}
                <ProgrammeSection
                  activeProgramme={activeProgramme}
                  sessions={sessions}
                  progress={progress}
                  onDeactivate={deactivateProgramme}
                  onScheduleWeek={scheduleWeek}
                  fetchProgrammeSessions={fetchProgrammeSessions}
                />

                {/* Personal Programme CTA - above Available Programmes */}
                <PersonalProgrammeCTA />

                {/* Available Programmes Catalogue */}
                <ProgrammeCatalogue
                  programmes={programmes}
                  activeProgrammeId={activeProgramme?.programme_template_id}
                  onActivate={activateProgramme}
                  onRefetch={refetchProgrammes}
                  fetchProgrammeSessions={fetchProgrammeSessions}
                />
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
