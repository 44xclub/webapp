'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout'
import { useAuth } from '@/lib/contexts'
import { useProfile, useCommunityChallenge, useFrameworks, useDailyFrameworkItems, useProgrammes } from '@/lib/hooks'
import { ProfileCard } from '@/components/structure/ProfileCard'
import { ChallengeCard } from '@/components/structure/ChallengeCard'
import { FrameworksSection } from '@/components/structure/FrameworksSection'
import { ProgrammeSection } from '@/components/structure/ProgrammeSection'
import { ProgrammeCatalogue } from '@/components/structure/ProgrammeCatalogue'

type TabType = 'discipline' | 'training'

export default function StructurePage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('discipline')

  // Data hooks
  const { profile, loading: profileLoading } = useProfile(user?.id)
  const { challenge, todayBlock, loading: challengeLoading, logChallenge, refetch: refetchChallenge } = useCommunityChallenge(user?.id)
  const { frameworks, activeFramework, todaySubmission, loading: frameworksLoading, activateFramework, submitDailyStatus, refetch: refetchFrameworks } = useFrameworks(user?.id)
  const { items: todayFrameworkItems, toggleItem } = useDailyFrameworkItems(user?.id)
  const { programmes, activeProgramme, sessions, loading: programmesLoading, activateProgramme, deactivateProgramme, scheduleWeek, refetch: refetchProgrammes } = useProgrammes(user?.id)

  return (
    <AuthenticatedLayout>
      {/* Page Header */}
      <div className="bg-card border-b border-border">
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
      </div>

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
                todayItems={todayFrameworkItems}
                onActivateFramework={activateFramework}
                onSubmitStatus={submitDailyStatus}
                onToggleItem={toggleItem}
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
    </AuthenticatedLayout>
  )
}
