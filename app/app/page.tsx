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
import { Plus, Loader2, Flame, ChevronRight, CheckSquare } from 'lucide-react'
import { HeaderStrip } from '@/components/shared/HeaderStrip'
import { BottomNav } from '@/components/shared/BottomNav'
import { FrameworkChecklistModal } from '@/components/shared/FrameworkChecklistModal'
import type { Block } from '@/lib/types'
import type { BlockFormData } from '@/lib/schemas'
import type { User as SupabaseUser } from '@supabase/supabase-js'

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

  // Auth check
  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (!isMounted) return

        if (error) {
          console.error('Auth error:', error)
          router.push('/login')
          return
        }

        if (!user) {
          router.push('/login')
          return
        }

        setUser(user)
        setAuthLoading(false)
      } catch (err) {
        console.error('Auth check failed:', err)
        if (isMounted) {
          router.push('/login')
        }
      }
    }

    checkAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return

      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        router.push('/login')
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user)
          setAuthLoading(false)
        }
      } else if (session?.user) {
        setUser(session.user)
        setAuthLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router, supabase])

  // Data hooks
  const {
    blocks,
    loading: blocksLoading,
    createBlock,
    updateBlock,
    toggleComplete,
    duplicateBlock,
    deleteBlock,
  } = useBlocks(selectedDate, user?.id)

  const { uploadMedia, deleteMedia } = useBlockMedia(user?.id)
  const { profile, loading: profileLoading, hasHeight } = useProfile(user?.id)
  const {
    activeFramework,
    todaySubmission,
    todayItems,
    completionCount,
    loading: frameworkLoading,
    toggleFrameworkItem,
  } = useFrameworks(user?.id)

  // Get week days
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate])

  // Group blocks by date (includes all fetched blocks, not just current week)
  const blocksByDate = useMemo(() => {
    const grouped = new Map<string, Block[]>()
    // Initialize all days in the current week
    weekDays.forEach((day) => {
      const dateKey = formatDateForApi(day)
      grouped.set(dateKey, [])
    })
    // Add all blocks to their respective dates
    blocks.forEach((block) => {
      if (!block.deleted_at) {
        const existing = grouped.get(block.date) || []
        grouped.set(block.date, [...existing, block])
      }
    })
    // Sort blocks within each day
    grouped.forEach((dayBlocks, key) => {
      grouped.set(key, dayBlocks.sort((a, b) => {
        const timeCompare = a.start_time.localeCompare(b.start_time)
        if (timeCompare !== 0) return timeCompare
        return a.created_at.localeCompare(b.created_at)
      }))
    })
    return grouped
  }, [blocks, weekDays])

  // Get blocks for the selected date (for Day View)
  const selectedDateBlocks = useMemo(() => {
    const dateKey = formatDateForApi(selectedDate)
    return blocksByDate.get(dateKey) || []
  }, [blocksByDate, selectedDate])

  // Handlers
  const handleSelectDate = useCallback(
    (date: Date) => {
      setSelectedDate(date)
      // When selecting a day from week view, switch to day view
      if (viewMode === 'week') {
        setViewMode('day')
      }
    },
    [viewMode]
  )

  const handleWeekChange = useCallback((date: Date) => {
    setSelectedDate(date)
  }, [])

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
  }, [])

  const handleAddBlock = useCallback((date: Date) => {
    setAddingToDate(date)
    setEditingBlock(null)
    setModalOpen(true)
  }, [])

  const handleEditBlock = useCallback((block: Block) => {
    setEditingBlock(block)
    setAddingToDate(null)
    setModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setModalOpen(false)
    setEditingBlock(null)
    setAddingToDate(null)
  }, [])

  const handleSaveBlock = useCallback(
    async (data: BlockFormData) => {
      if (editingBlock) {
        await updateBlock(editingBlock.id, data)
      } else {
        await createBlock(data)
      }
    },
    [editingBlock, createBlock, updateBlock]
  )

  const handleToggleComplete = useCallback(
    async (block: Block) => {
      await toggleComplete(block)
    },
    [toggleComplete]
  )

  const handleDuplicate = useCallback(
    async (block: Block) => {
      await duplicateBlock(block)
    },
    [duplicateBlock]
  )

  const handleDelete = useCallback(
    async (block: Block) => {
      await deleteBlock(block.id)
    },
    [deleteBlock]
  )

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="app-shell">
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary animate-pulse-glow" />
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
    <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col pb-16">
      {/* Header Strip */}
      <HeaderStrip profile={profile} loading={profileLoading} />

      {/* Streak Module */}
      {profile && (
        <div className="px-4 py-2 bg-card border-b border-border">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <div>
                <span className="text-lg font-bold text-foreground">{profile.current_streak || 0}</span>
                <span className="text-xs text-muted-foreground ml-1">day streak</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Best: {profile.best_streak || 0}
            </div>
          </div>
        </div>
      )}

      {/* Week Strip */}
      <WeekStrip
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        onWeekChange={handleWeekChange}
        blocksByDate={blocksByDate}
      />

      {/* View Mode Toggle */}
      <div className="px-4 py-3 flex justify-center border-b border-border bg-background">
        <ViewModeToggle mode={viewMode} onModeChange={handleViewModeChange} />
      </div>

      {/* Active Framework Card - shows in Day View */}
      {viewMode === 'day' && activeFramework?.framework_template && !frameworkLoading && (
        <button
          onClick={() => setFrameworkModalOpen(true)}
          className="block mx-4 mt-3 w-[calc(100%-2rem)] text-left"
        >
          <div className="bg-card rounded-xl p-4 border border-border hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Active Framework</p>
                <p className="font-medium text-foreground">{activeFramework.framework_template.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <CheckSquare className={`h-4 w-4 ${
                    completionCount.completed === completionCount.total && completionCount.total > 0
                      ? 'text-green-500'
                      : completionCount.completed > 0
                      ? 'text-yellow-500'
                      : 'text-muted-foreground'
                  }`} />
                  <p className={`text-xs ${
                    completionCount.completed === completionCount.total && completionCount.total > 0
                      ? 'text-green-500'
                      : completionCount.completed > 0
                      ? 'text-yellow-500'
                      : 'text-muted-foreground'
                  }`}>
                    {completionCount.completed} / {completionCount.total} complete
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </button>
      )}

      {/* Main Content */}
      <main className="flex-1 pb-8 overflow-y-auto">
        {blocksLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === 'day' ? (
          // Day View - shows only selected day's blocks
          <div className="pt-2">
            <DayView
              date={selectedDate}
              blocks={selectedDateBlocks}
              onAddBlock={handleAddBlock}
              onToggleComplete={handleToggleComplete}
              onEdit={handleEditBlock}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          </div>
        ) : (
          // Week Overview - shows all days compactly
          <div className="pt-3">
            <WeekOverview
              weekDays={weekDays}
              blocksByDate={blocksByDate}
              selectedDate={selectedDate}
              onSelectDay={handleSelectDate}
              onEditBlock={handleEditBlock}
            />
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-4 z-30">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => handleAddBlock(selectedDate)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Block Modal */}
      <BlockModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveBlock}
        initialDate={addingToDate || selectedDate}
        editingBlock={editingBlock}
        blockMedia={editingBlock?.block_media || []}
        userId={user?.id}
        onMediaUpload={uploadMedia}
        onMediaDelete={deleteMedia}
        userHasHeight={hasHeight}
      />

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
    </div>
  )
}
