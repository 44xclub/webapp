'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  WeekStrip,
  BlockModal,
  ViewModeToggle,
  DayView,
  WeekOverview,
  SharePromptModal,
  VoiceButton,
  VoiceConfirmationSheet,
  VoiceDebugOverlay,
} from '@/components/blocks'
import type { ViewMode } from '@/components/blocks'
import { Button } from '@/components/ui'
import { useAuth, useBlocks, useBlockMedia, useProfile, useFrameworks, useProgrammes, useRank, useCommunityChallenge, useWhopLink, useVoiceScheduling } from '@/lib/hooks'
import { getWeekDays, formatDateForApi } from '@/lib/date'
import { Plus, Mic, Loader2 } from 'lucide-react'
import { BlockListSkeleton, CompactCardSkeleton } from '@/components/ui/Skeletons'
import { HeaderStrip } from '@/components/shared/HeaderStrip'
import { StreakCard } from '@/components/shared/StreakCard'
import { BottomNav } from '@/components/shared/BottomNav'
import { FrameworkChecklistModal } from '@/components/shared/FrameworkChecklistModal'
import { ActiveFrameworkCard } from '@/components/structure/ActiveFrameworkCard'
import { ChallengeLogModal } from '@/components/structure/ChallengeLogModal'
import { ChallengeCard } from '@/components/structure/ChallengeCard'
import type { Block, BlockType } from '@/lib/types'
import type { BlockFormData } from '@/lib/schemas'
import type { LLMCreateBlock, VoiceParseResponse } from '@/lib/voice/types'
import { DEFAULT_WORKOUT_DURATION_MINUTES } from '@/lib/voice/config'

/**
 * Convert a voice LLM create_block proposal into BlockFormData
 * so the BlockModal can open at step 2 with all fields pre-filled.
 */
function voiceProposalToFormData(
  action: LLMCreateBlock,
  proposal: VoiceParseResponse
): BlockFormData {
  const { block } = action
  const dt = proposal.resolved_datetime || block.datetime_local
  const dateStr = dt ? dt.slice(0, 10) : new Date().toISOString().slice(0, 10)
  const timeStr = dt ? dt.slice(11, 16) : new Date().toISOString().slice(11, 16)
  const durationMinutes = block.duration_minutes || DEFAULT_WORKOUT_DURATION_MINUTES

  // Calculate end time
  const [h, m] = timeStr.split(':').map(Number)
  const totalMins = h * 60 + m + durationMinutes
  const endTime = `${String(Math.floor(totalMins / 60) % 24).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`

  const blockType = block.block_type as BlockType

  // Build type-specific payload matching what the forms expect
  const base = {
    date: dateStr,
    start_time: timeStr,
    end_time: endTime,
    block_type: blockType,
    title: block.title || '',
    notes: block.notes || '',
    repeat_rule: null,
  }

  switch (blockType) {
    case 'workout': {
      const workoutData = block.payload?.workout as { items?: { name: string; sets?: number | null; reps?: number | null; weight?: string | null; notes?: string }[] } | undefined
      const items = workoutData?.items || []

      const exerciseMatrix = items.map((item) => ({
        exercise: item.name,
        sets: Array.from({ length: item.sets || 1 }, (_, i) => ({
          set: i + 1,
          reps: item.reps != null ? String(item.reps) : '',
          weight: item.weight != null ? String(item.weight).replace(/[^0-9.]/g, '') : '',
        })),
        notes: item.notes || '',
      }))

      if (exerciseMatrix.length === 0) {
        exerciseMatrix.push({ exercise: '', sets: [{ set: 1, reps: '', weight: '' }], notes: '' })
      }

      return {
        ...base,
        block_type: 'workout' as const,
        payload: {
          subtype: 'custom' as const,
          category: 'weight_lifting' as const,
          exercise_matrix: exerciseMatrix,
          duration: durationMinutes,
        },
      }
    }

    case 'nutrition': {
      const mealType = (block.payload?.meal_type as string) || 'lunch'
      const mealName = (block.payload?.meal_name as string) || block.title || ''
      return {
        ...base,
        block_type: 'nutrition' as const,
        title: block.title || mealName || null,
        payload: {
          meal_type: (mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack'),
          meal_name: mealName,
          ...(block.payload?.calories != null ? { calories: Number(block.payload.calories) } : {}),
          ...(block.payload?.protein != null ? { protein: Number(block.payload.protein) } : {}),
        },
      }
    }

    case 'checkin': {
      return {
        ...base,
        block_type: 'checkin' as const,
        end_time: null,
        payload: {
          weight: block.payload?.weight != null ? Number(block.payload.weight) : 0,
          ...(block.payload?.body_fat_percent != null ? { body_fat_percent: Number(block.payload.body_fat_percent) } : {}),
        },
      }
    }

    case 'habit': {
      return {
        ...base,
        block_type: 'habit' as const,
        payload: {},
      }
    }

    case 'personal': {
      return {
        ...base,
        block_type: 'personal' as const,
        payload: {},
      }
    }

    default:
      return {
        ...base,
        block_type: 'workout' as const,
        payload: {
          subtype: 'custom' as const,
          category: 'weight_lifting' as const,
          exercise_matrix: [{ exercise: '', sets: [{ set: 1, reps: '', weight: '' }], notes: '' }],
        },
      }
  }
}

/*
  44CLUB App Page
  The daily command center. Stoic. Controlled.
*/

export default function AppPage() {
  const { user, loading: authLoading } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<Block | null>(null)
  const [addingToDate, setAddingToDate] = useState<Date | null>(null)
  const [frameworkModalOpen, setFrameworkModalOpen] = useState(false)
  const [challengeModalOpen, setChallengeModalOpen] = useState(false)
  const [sharePromptBlock, setSharePromptBlock] = useState<Block | null>(null)
  const [voiceDraft, setVoiceDraft] = useState<BlockFormData | null>(null)

  const { blocks, loading: blocksLoading, createBlock, updateBlock, updateBlockPayload, toggleComplete, duplicateBlock, deleteBlock, refetch: refetchBlocks } = useBlocks(selectedDate, user?.id)
  const { uploadMedia, deleteMedia } = useBlockMedia(user?.id)
  const { profile, loading: profileLoading, hasHeight, avatarUrl } = useProfile(user?.id)
  const { rank, loading: rankLoading } = useRank(user?.id)
  const { activeFramework, todayItems, completionCount, loading: frameworkLoading, toggleFrameworkItem, deactivateFramework } = useFrameworks(user?.id)
  const { activeProgramme, sessions: programmeSessions } = useProgrammes(user?.id)
  const { challenge, todayBlock: challengeTodayBlock, refetch: refetchChallenge } = useCommunityChallenge(user?.id)

  // Auto-link Whop account when loaded inside the Whop iframe
  useWhopLink(user?.id, !!profile?.whop_user_id)

  // Voice scheduling
  const voice = useVoiceScheduling(
    useCallback(() => {
      // Refetch blocks after successful voice command
      refetchBlocks()
    }, [refetchBlocks])
  )

  // Handle "Edit" from voice confirmation — open BlockModal at step 2 with voice data pre-filled
  const handleVoiceEdit = useCallback(() => {
    if (!voice.proposal?.proposed_action) return
    const action = voice.proposal.proposed_action
    if (action.intent === 'create_block') {
      const draft = voiceProposalToFormData(action, voice.proposal)
      setVoiceDraft(draft)
      setEditingBlock(null)
      setAddingToDate(null)
      setModalOpen(true)
    }
    voice.dismiss()
  }, [voice])

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
  const handleCloseModal = useCallback(() => { setModalOpen(false); setEditingBlock(null); setAddingToDate(null); setVoiceDraft(null) }, [])
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
  const handleTaskToggle = useCallback(async (blockId: string, tasks: import('@/lib/types').TaskItem[]) => {
    try {
      await updateBlockPayload(blockId, { tasks })
    } catch (err) {
      console.error('Failed to autosave tasks:', err)
    }
  }, [updateBlockPayload])
  const handleDuplicate = useCallback(async (block: Block) => await duplicateBlock(block), [duplicateBlock])
  const handleDelete = useCallback(async (block: Block) => await deleteBlock(block.id), [deleteBlock])

  if (authLoading || !user) {
    return (
      <div className="min-h-app flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-blue)]" />
      </div>
    )
  }

  return (
    <div className="min-h-app flex flex-col content-container animate-fadeIn" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))' }}>
      <HeaderStrip profile={profile} rank={rank} loading={profileLoading || rankLoading} avatarUrl={avatarUrl} />

      {/* Streak Strip - ultra-compact */}
      {profile && (
        <div className="px-4 pt-2">
          <StreakCard
            currentStreak={profile.current_streak || 0}
            bestStreak={profile.best_streak || 0}
            variant="strip"
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

      {/* Framework + Challenge cards side-by-side */}
      {viewMode === 'day' && (
        <div className="px-4 pt-2">
          {frameworkLoading ? (
            <div className="grid grid-cols-2 gap-2">
              <CompactCardSkeleton />
              <CompactCardSkeleton />
            </div>
          ) : challenge && !challengeTodayBlock?.completed_at ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="inline-block text-[9px] font-semibold uppercase tracking-wider text-[rgba(238,242,255,0.35)] mb-1">Framework</span>
                <ActiveFrameworkCard
                  activeFramework={activeFramework}
                  todaySubmission={null}
                  completionCount={completionCount}
                  onOpenChecklist={() => setFrameworkModalOpen(true)}
                  compact
                />
              </div>
              <div>
                <span className="inline-block text-[9px] font-semibold uppercase tracking-wider text-[rgba(238,242,255,0.35)] mb-1">Challenge</span>
                <ChallengeCard
                  challenge={challenge}
                  todayBlock={challengeTodayBlock}
                  onLogToday={() => setChallengeModalOpen(true)}
                  variant="compact"
                />
              </div>
            </div>
          ) : (
            <>
              <ActiveFrameworkCard
                activeFramework={activeFramework}
                todaySubmission={null}
                completionCount={completionCount}
                onOpenChecklist={() => setFrameworkModalOpen(true)}
                compact
              />
              {challenge && !challengeTodayBlock?.completed_at && (
                <div className="mt-2">
                  <ChallengeCard
                    challenge={challenge}
                    todayBlock={challengeTodayBlock}
                    onLogToday={() => setChallengeModalOpen(true)}
                    variant="compact"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      <main className="flex-1 pb-4">
        {blocksLoading ? (
          <div className="pt-2">
            <div className="px-4 py-3">
              <div className="animate-pulse bg-[rgba(255,255,255,0.06)] h-5 w-28 rounded mb-1" />
              <div className="animate-pulse bg-[rgba(255,255,255,0.06)] h-3 w-20 rounded" />
            </div>
            <BlockListSkeleton count={4} />
          </div>
        ) : viewMode === 'day' ? (
          <div className="pt-2">
            <DayView date={selectedDate} blocks={selectedDateBlocks} onAddBlock={handleAddBlock} onToggleComplete={handleToggleComplete} onEdit={handleEditBlock} onDuplicate={handleDuplicate} onDelete={handleDelete} />
          </div>
        ) : (
          <div className="pt-2">
            <WeekOverview weekDays={weekDays} blocksByDate={blocksByDate} selectedDate={selectedDate} onSelectDay={handleSelectDate} onEditBlock={handleEditBlock} />
          </div>
        )}
      </main>

      {/* FAB area — voice button + add block button */}
      {!modalOpen && !challengeModalOpen && (
        <div
          className="fixed z-30 flex items-end gap-3"
          style={{
            bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 16px)',
            right: 'calc(16px + env(safe-area-inset-right, 0px))',
          }}
        >
          {/* Voice mic button */}
          <VoiceButton
            state={voice.state}
            error={voice.error}
            onStartRecording={voice.startRecording}
            onStopRecording={voice.stopRecording}
            onDismiss={voice.dismiss}
            onCheckBreakout={voice.checkBreakoutResult}
          />
          {/* Add block FAB */}
          <Button size="icon" className="h-14 w-14 rounded-full shadow-lg" onClick={() => handleAddBlock(selectedDate)}>
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Voice confirmation sheet */}
      <VoiceConfirmationSheet
        proposal={voice.proposal}
        state={voice.state}
        error={voice.error}
        onConfirm={voice.confirmAction}
        onEdit={handleVoiceEdit}
        onCancel={voice.dismiss}
        onTextSubmit={voice.parseTranscript}
      />

      <BottomNav />

      <BlockModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveBlock}
        onShowSharePreview={handleShowSharePreview}
        initialDate={addingToDate || selectedDate}
        editingBlock={editingBlock}
        draftData={voiceDraft}
        blockMedia={editingBlock?.block_media || []}
        userId={user?.id}
        onMediaUpload={uploadMedia}
        onMediaDelete={deleteMedia}
        userHasHeight={hasHeight}
        activeProgramme={activeProgramme}
        programmeSessions={programmeSessions}
        userTimezone={profile?.timezone}
        onTaskToggle={handleTaskToggle}
      />

      <FrameworkChecklistModal isOpen={frameworkModalOpen} onClose={() => setFrameworkModalOpen(false)} framework={activeFramework?.framework_template} todayItems={todayItems} completionCount={completionCount} onToggleItem={toggleFrameworkItem} onDeactivate={deactivateFramework} />

      <SharePromptModal
        isOpen={!!sharePromptBlock}
        onClose={() => setSharePromptBlock(null)}
        block={sharePromptBlock}
        userId={user?.id}
        userProfile={profile}
        avatarUrl={avatarUrl}
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
          avatarUrl={avatarUrl}
          onSuccess={handleChallengeLogSuccess}
        />
      )}

      {/* Voice diagnostics overlay — enabled via ?voice_debug=1 */}
      <VoiceDebugOverlay />
    </div>
  )
}
