'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  WeekStrip,
  BlockModal,
  ViewModeToggle,
  DayView,
  WeekOverview,
} from '@/components/blocks'
import type { ViewMode } from '@/components/blocks'
import { Button } from '@/components/ui'
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout'
import { StreakModule, ActiveFrameworkCard } from '@/components/home'
import { useAuth } from '@/lib/contexts'
import { useBlocks, useBlockMedia, useProfile, useFrameworks, useDailyFrameworkItems } from '@/lib/hooks'
import { getWeekDays, formatDateForApi } from '@/lib/date'
import { Plus, Loader2 } from 'lucide-react'
import type { Block } from '@/lib/types'
import type { BlockFormData } from '@/lib/schemas'

export default function AppPage() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<Block | null>(null)
  const [addingToDate, setAddingToDate] = useState<Date | null>(null)

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
  const { profile, hasHeight } = useProfile(user?.id)
  const { activeFramework, todaySubmission } = useFrameworks(user?.id)
  const { items: todayFrameworkItems } = useDailyFrameworkItems(user?.id)

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

  return (
    <AuthenticatedLayout>
      {/* Streak Module */}
      <div className="px-4 pt-4">
        <StreakModule
          currentStreak={profile?.current_streak ?? 0}
          bestStreak={profile?.best_streak ?? 0}
        />
      </div>

      {/* Active Framework Card */}
      <div className="px-4 pt-3">
        <ActiveFrameworkCard
          activeFramework={activeFramework}
          todaySubmission={todaySubmission}
          todayItems={todayFrameworkItems}
        />
      </div>

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

      {/* Floating Action Button - positioned above bottom nav */}
      <div className="fixed bottom-20 right-4 z-40">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => handleAddBlock(selectedDate)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

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
    </AuthenticatedLayout>
  )
}
