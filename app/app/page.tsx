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
} from '@/components/blocks'
import type { ViewMode } from '@/components/blocks'
import { Button } from '@/components/ui'
import { useBlocks, useBlockMedia, useProfile, useFrameworks } from '@/lib/hooks'
import { getWeekDays, formatDateForApi } from '@/lib/date'
import { Plus, Loader2, Flame } from 'lucide-react'
import { HeaderStrip } from '@/components/shared/HeaderStrip'
import { BottomNav } from '@/components/shared/BottomNav'
import { FrameworkChecklistModal } from '@/components/shared/FrameworkChecklistModal'
import { ActiveFrameworkCard } from '@/components/structure/ActiveFrameworkCard'
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
  const { activeFramework, todayItems, completionCount, loading: frameworkLoading, toggleFrameworkItem, deactivateFramework } = useFrameworks(user?.id)

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
  const handleSaveBlock = useCallback(async (data: BlockFormData) => {
    if (editingBlock) await updateBlock(editingBlock.id, data)
    else await createBlock(data)
  }, [editingBlock, createBlock, updateBlock])
  const handleToggleComplete = useCallback(async (block: Block) => await toggleComplete(block), [toggleComplete])
  const handleDuplicate = useCallback(async (block: Block) => await duplicateBlock(block), [duplicateBlock])
  const handleDelete = useCallback(async (block: Block) => await deleteBlock(block.id), [deleteBlock])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07090d]">
        <Loader2 className="h-6 w-6 animate-spin text-[#3b82f6]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#07090d] flex flex-col pb-16">
      <HeaderStrip profile={profile} loading={profileLoading} />

      {/* Streak Module */}
      {profile && (
        <div className="mx-4 mt-2 px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-[12px] bg-gradient-to-b from-[rgba(245,158,11,0.16)] to-[rgba(245,158,11,0.06)] flex items-center justify-center border border-[rgba(245,158,11,0.26)]">
                <Flame className="h-5 w-5 text-[#f59e0b]" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[rgba(238,242,255,0.52)]">Current Streak</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-[20px] font-semibold text-[#eef2ff]">{profile.current_streak || 0}</span>
                  <span className="text-[13px] text-[rgba(238,242,255,0.60)]">days</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[rgba(238,242,255,0.52)]">Personal Best</p>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-[16px] font-semibold text-[#22d3ee]">{profile.best_streak || 0}</span>
                <span className="text-[12px] text-[rgba(238,242,255,0.52)]">days</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <WeekStrip selectedDate={selectedDate} onSelectDate={handleSelectDate} onWeekChange={handleWeekChange} blocksByDate={blocksByDate} />

      <div className="px-4 py-3 flex justify-center border-b border-[rgba(255,255,255,0.07)] bg-[#07090d]">
        <ViewModeToggle mode={viewMode} onModeChange={handleViewModeChange} />
      </div>

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

      <BlockModal isOpen={modalOpen} onClose={handleCloseModal} onSave={handleSaveBlock} initialDate={addingToDate || selectedDate} editingBlock={editingBlock} blockMedia={editingBlock?.block_media || []} userId={user?.id} onMediaUpload={uploadMedia} onMediaDelete={deleteMedia} userHasHeight={hasHeight} />

      <FrameworkChecklistModal isOpen={frameworkModalOpen} onClose={() => setFrameworkModalOpen(false)} framework={activeFramework?.framework_template} todayItems={todayItems} completionCount={completionCount} onToggleItem={toggleFrameworkItem} onDeactivate={deactivateFramework} />
    </div>
  )
}
