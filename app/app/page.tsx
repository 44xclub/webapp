'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  WeekStrip,
  BlockModal,
  ViewModeToggle,
  DayView,
  WeekOverview,
  SharePromptModal,
} from '@/components/blocks'
import type { ViewMode } from '@/components/blocks'
import { Button } from '@/components/ui'
import { useBlocks, useBlockMedia, useProfile, useFrameworks, useProgrammes, useRank, useCommunityChallenge } from '@/lib/hooks'
import { getWeekDays, formatDateForApi } from '@/lib/date'
import { Plus, Loader2, Target } from 'lucide-react'
import { HeaderStrip } from '@/components/shared/HeaderStrip'
import { StreakCard } from '@/components/shared/StreakCard'
import { BottomNav } from '@/components/shared/BottomNav'
import { FrameworkChecklistModal } from '@/components/shared/FrameworkChecklistModal'
import { ActiveFrameworkCard } from '@/components/structure/ActiveFrameworkCard'
import { ChallengeLogModal } from '@/components/structure/ChallengeLogModal'
import type { Block } from '@/lib/types'
import type { BlockFormData } from '@/lib/schemas'
import type { User as SupabaseUser } from '@supabase/supabase-js'

/*
  44CLUB App Page
  The daily command center. Stoic. Controlled.
*/

export default function AppPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<Block | null>(null)
  const [addingToDate, setAddingToDate] = useState<Date | null>(null)
  const [frameworkModalOpen, setFrameworkModalOpen] = useState(false)
  const [challengeModalOpen, setChallengeModalOpen] = useState(false)
  const [sharePromptBlock, setSharePromptBlock] = useState<Block | null>(null)

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
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) router.push('/login')
      else if (session?.user) { setUser(session.user); setAuthLoading(false) }
    })

    return () => { isMounted = false; subscription.unsubscribe() }
  }, [router, supabase])

  const { blocks, loading: blocksLoading, createBlock, updateBlock, toggleComplete, duplicateBlock, deleteBlock } = useBlocks(selectedDate, user?.id)
  const { uploadMedia, deleteMedia } = useBlockMedia(user?.id)
  const { profile, loading: profileLoading, hasHeight } = useProfile(user?.id)
  const { rank, loading: rankLoading } = useRank(user?.id)
  const { activeFramework, todayItems, completionCount, loading: frameworkLoading, toggleFrameworkItem, deactivateFramework } = useFrameworks(user?.id)
  const { activeProgramme, sessions: programmeSessions } = useProgrammes(user?.id)
  const { challenge, todayBlock: challengeTodayBlock, refetch: refetchChallenge } = useCommunityChallenge(user?.id)

  const handleChallengeLogSuccess = useCallback(() => {
    refetchChallenge()
    setChallengeModalOpen(false)
  }, [refetchChallenge])

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate])

  const blocksByDate = useMemo(() => {
    const grouped = new Map<string, Block[]>()
    weekDays.forEach((day) => grouped.set(formatDateForApi(day), []))
    blocks.forEach((block) => {
      if (!block.deleted_at) {
        const existing = grouped.get(block.date) || []
        grouped.set(block.date, [...existing, block])
      }
    })
    grouped.forEach((dayBlocks, key) => {
      grouped.set(key, dayBlocks.sort((a, b) => {
        const timeCompare = a.start_time.localeCompare(b.start_time)
        if (timeCompare !== 0) return timeCompare
        return a.created_at.localeCompare(b.created_at)
      }))
    })
    return grouped
  }, [blocks, weekDays])

  const selectedDateBlocks = useMemo(() => blocksByDate.get(formatDateForApi(selectedDate)) || [], [blocksByDate, selectedDate])

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date)
    if (viewMode === 'week') setViewMode('day')
  }, [viewMode])

  const handleWeekChange = useCallback((date: Date) => setSelectedDate(date), [])
  const handleViewModeChange = useCallback((mode: ViewMode) => setViewMode(mode), [])
  const handleAddBlock = useCallback((date: Date) => { setAddingToDate(date); setEditingBlock(null); setModalOpen(true) }, [])
  const handleEditBlock = useCallback((block: Block) => { setEditingBlock(block); setAddingToDate(null); setModalOpen(true) }, [])
  const handleCloseModal = useCallback(() => { setModalOpen(false); setEditingBlock(null); setAddingToDate(null) }, [])
  const handleSaveBlock = useCallback(async (data: BlockFormData, entryMode?: 'schedule' | 'log') => {
    if (editingBlock) {
      await updateBlock(editingBlock.id, data)
      return undefined
    } else {
      return await createBlock(data, entryMode || 'schedule')
    }
  }, [editingBlock, createBlock, updateBlock])

  // Handle showing share preview for logged blocks (called from BlockModal after save)
  const handleShowSharePreview = useCallback((block: Block) => {
    setSharePromptBlock(block)
  }, [])

  // Determine if block should show share prompt on completion
  const isShareEligible = useCallback((block: Block) => {
    const shareTypes = ['workout', 'habit', 'nutrition', 'checkin', 'challenge']
    return shareTypes.includes(block.block_type) && block.block_type !== 'personal'
  }, [])

  const handleToggleComplete = useCallback(async (block: Block) => {
    // If completing (not un-completing) and share eligible, show share prompt
    // But don't show prompt if already shared to feed
    if (!block.completed_at && isShareEligible(block) && !block.shared_to_feed) {
      // Complete the block first
      await toggleComplete(block)
      // Then show share prompt
      setSharePromptBlock(block)
    } else {
      // Just toggle without prompt
      await toggleComplete(block)
    }
  }, [toggleComplete, isShareEligible])

  const handleSharePromptConfirm = useCallback(async (shareToFeed: boolean) => {
    if (!sharePromptBlock || !user?.id) return
    // Update block with share_to_feed setting and create feed post if needed
    if (shareToFeed) {
      await updateBlock(sharePromptBlock.id, { shared_to_feed: true } as any)
    }
    setSharePromptBlock(null)
  }, [sharePromptBlock, user?.id, updateBlock])
  const handleDuplicate = useCallback(async (block: Block) => await duplicateBlock(block), [duplicateBlock])
  const handleDelete = useCallback(async (block: Block) => await deleteBlock(block.id), [deleteBlock])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-blue)]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col pb-16">
      <HeaderStrip profile={profile} rank={rank} loading={profileLoading || rankLoading} />

      {/* Streak Module - using shared component */}
      {profile && (
        <div className="mx-3 mt-2">
          <StreakCard
            currentStreak={profile.current_streak || 0}
            bestStreak={profile.best_streak || 0}
            variant="compact"
          />
        </div>
      )}

      <WeekStrip
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        onWeekChange={handleWeekChange}
        blocksByDate={blocksByDate}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />

      {/* Active Framework Card - same as Structure page */}
      {viewMode === 'day' && !frameworkLoading && (
        <div className="mx-4 mt-3">
          <ActiveFrameworkCard
            activeFramework={activeFramework}
            todaySubmission={null}
            completionCount={completionCount}
            onOpenChecklist={() => setFrameworkModalOpen(true)}
          />
        </div>
      )}

      {/* Challenge Quick Action - show if active challenge and not completed today */}
      {viewMode === 'day' && challenge && !challengeTodayBlock?.completed_at && (
        <div className="mx-4 mt-3">
          <button
            onClick={() => setChallengeModalOpen(true)}
            className="w-full flex items-center gap-3 p-3 rounded-[var(--radius-card)] bg-[var(--accent-blue-muted)] border border-[rgba(59,130,246,0.15)] hover:bg-[rgba(59,130,246,0.24)] transition-colors text-left"
          >
            <div className="p-2 rounded-[var(--radius-button)] bg-[rgba(59,130,246,0.15)]">
              <Target className="h-4 w-4 text-[var(--accent-blue)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-label truncate">
                {challenge.title}
              </p>
              <p className="text-micro normal-case text-[var(--accent-blue)]">Tap to log today&apos;s challenge</p>
            </div>
          </button>
        </div>
      )}

      <main className="flex-1 pb-8 overflow-y-auto">
        {blocksLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[rgba(238,242,255,0.45)]" />
          </div>
        ) : viewMode === 'day' ? (
          <div className="pt-2">
            <DayView date={selectedDate} blocks={selectedDateBlocks} onAddBlock={handleAddBlock} onToggleComplete={handleToggleComplete} onEdit={handleEditBlock} onDuplicate={handleDuplicate} onDelete={handleDelete} />
          </div>
        ) : (
          <div className="pt-3">
            <WeekOverview weekDays={weekDays} blocksByDate={blocksByDate} selectedDate={selectedDate} onSelectDay={handleSelectDate} onEditBlock={handleEditBlock} />
          </div>
        )}
      </main>

      {/* FAB */}
      <div className="fixed bottom-20 right-4 z-30">
        <Button size="icon" className="h-14 w-14 rounded-full shadow-lg" onClick={() => handleAddBlock(selectedDate)}>
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <BottomNav />

      <BlockModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveBlock}
        onShowSharePreview={handleShowSharePreview}
        initialDate={addingToDate || selectedDate}
        editingBlock={editingBlock}
        blockMedia={editingBlock?.block_media || []}
        userId={user?.id}
        onMediaUpload={uploadMedia}
        onMediaDelete={deleteMedia}
        userHasHeight={hasHeight}
        activeProgramme={activeProgramme}
        programmeSessions={programmeSessions}
        userTimezone={profile?.timezone}
      />

      <FrameworkChecklistModal isOpen={frameworkModalOpen} onClose={() => setFrameworkModalOpen(false)} framework={activeFramework?.framework_template} todayItems={todayItems} completionCount={completionCount} onToggleItem={toggleFrameworkItem} onDeactivate={deactivateFramework} />

      <SharePromptModal
        isOpen={!!sharePromptBlock}
        onClose={() => setSharePromptBlock(null)}
        block={sharePromptBlock}
        userId={user?.id}
        userProfile={profile}
        onMediaUpload={uploadMedia}
        onMediaDelete={deleteMedia}
        onConfirm={handleSharePromptConfirm}
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
