'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { WeekStrip, BlockModal, BlockRow } from '@/components/blocks'
import { Button, DropdownMenu } from '@/components/ui'
import { useBlocks, useBlockMedia, useProfile } from '@/lib/hooks'
import {
  getWeekDays,
  formatDateForApi,
  formatDayHeader,
} from '@/lib/date'
import { Plus, Loader2, MoreVertical, User, Settings, LogOut } from 'lucide-react'
import type { Block } from '@/lib/types'
import type { BlockFormData } from '@/lib/schemas'
import type { User as SupabaseUser } from '@supabase/supabase-js'

type ViewMode = 'day' | 'week'

export default function AppPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<Block | null>(null)
  const [addingToDate, setAddingToDate] = useState<Date | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      setAuthLoading(false)
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          router.push('/login')
        } else if (session?.user) {
          setUser(session.user)
        }
      }
    )

    return () => subscription.unsubscribe()
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
  const { hasHeight } = useProfile(user?.id)

  // Get week days
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate])

  // Group blocks by date
  const blocksByDate = useMemo(() => {
    const grouped = new Map<string, Block[]>()
    weekDays.forEach((day) => {
      const dateKey = formatDateForApi(day)
      grouped.set(dateKey, [])
    })
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

  // Get blocks for selected date only
  const selectedDateKey = formatDateForApi(selectedDate)
  const selectedDayBlocks = blocksByDate.get(selectedDateKey) || []

  // Calculate progress for selected day
  const completedCount = selectedDayBlocks.filter(b => b.completed_at).length
  const totalCount = selectedDayBlocks.length
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  // Handlers
  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date)
  }, [])

  const handleWeekChange = useCallback((date: Date) => {
    setSelectedDate(date)
  }, [])

  const handleDayClickFromWeekView = useCallback((date: Date) => {
    setSelectedDate(date)
    setViewMode('day')
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Week Strip */}
      <WeekStrip
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        onWeekChange={handleWeekChange}
        blocksByDate={blocksByDate}
      />

      {/* Top Right Menu */}
      <div className="fixed top-3 right-3 z-40">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <MoreVertical className="h-5 w-5 text-muted-foreground" />
        </button>
        <DropdownMenu
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          items={[
            {
              label: 'Account',
              icon: <User className="h-4 w-4" />,
              onClick: () => {},
            },
            {
              label: 'Settings',
              icon: <Settings className="h-4 w-4" />,
              onClick: () => {},
            },
            {
              label: 'Log out',
              icon: <LogOut className="h-4 w-4" />,
              onClick: handleSignOut,
              variant: 'destructive',
            },
          ]}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 pb-24 overflow-y-auto">
        {/* View Toggle */}
        <div className="px-4 pt-3 pb-2">
          <div className="inline-flex bg-secondary rounded-lg p-1">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'day'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'week'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Week
            </button>
          </div>
        </div>

        {blocksLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === 'day' ? (
          /* Day View */
          <div className="px-4">
            {/* Day Header */}
            <div className="py-3">
              <h2 className="text-lg font-semibold text-foreground">
                {formatDayHeader(selectedDate)}
              </h2>
              {/* Progress Indicator */}
              {totalCount > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">
                      {completedCount}/{totalCount} completed
                    </span>
                    <span className="text-muted-foreground">
                      {Math.round(progressPercent)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Block List or Empty State */}
            {selectedDayBlocks.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No blocks yet.</p>
                <Button onClick={() => handleAddBlock(selectedDate)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add block
                </Button>
              </div>
            ) : (
              <div className="bg-card rounded-xl overflow-hidden border border-border">
                <div className="divide-y divide-border">
                  {selectedDayBlocks.map((block) => (
                    <BlockRow
                      key={block.id}
                      block={block}
                      onToggleComplete={handleToggleComplete}
                      onEdit={handleEditBlock}
                      onDuplicate={handleDuplicate}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
                {/* Add block row */}
                <button
                  onClick={() => handleAddBlock(selectedDate)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-t border-border"
                >
                  <div className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
                    <Plus className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">Add block</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Week View */
          <div className="px-4 space-y-2">
            {weekDays.map((day) => {
              const dateKey = formatDateForApi(day)
              const dayBlocks = blocksByDate.get(dateKey) || []
              const dayCompleted = dayBlocks.filter(b => b.completed_at).length
              const dayTotal = dayBlocks.length
              const isSelected = dateKey === selectedDateKey

              return (
                <button
                  key={dateKey}
                  onClick={() => handleDayClickFromWeekView(day)}
                  className={`w-full p-3 rounded-xl border transition-colors text-left ${
                    isSelected
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card border-border hover:bg-secondary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">
                        {formatDayHeader(day)}
                      </div>
                      {dayBlocks.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {dayBlocks.slice(0, 3).map((block) => (
                            <span
                              key={block.id}
                              className={`text-xs px-2 py-0.5 rounded bg-secondary ${
                                block.completed_at ? 'line-through text-muted-foreground' : 'text-foreground'
                              }`}
                            >
                              {block.title || block.block_type}
                            </span>
                          ))}
                          {dayBlocks.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{dayBlocks.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-muted-foreground">
                          No blocks
                        </div>
                      )}
                    </div>
                    {dayTotal > 0 && (
                      <div className="ml-3 text-right flex-shrink-0">
                        <div className="text-sm font-medium text-foreground">
                          {dayCompleted}/{dayTotal}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          done
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 safe-bottom">
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
    </div>
  )
}
