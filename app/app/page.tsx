'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { WeekStrip, DaySection, BlockModal } from '@/components/blocks'
import { Button } from '@/components/ui'
import { useBlocks, useBlockMedia, useProfile } from '@/lib/hooks'
import {
  getWeekDays,
  formatDateForApi,
  isSameDayDate,
} from '@/lib/date'
import { Plus, LogOut, Loader2 } from 'lucide-react'
import type { Block } from '@/lib/types'
import type { BlockFormData } from '@/lib/schemas'
import type { User } from '@supabase/supabase-js'

export default function AppPage() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<Block | null>(null)
  const [addingToDate, setAddingToDate] = useState<Date | null>(null)

  const router = useRouter()
  const supabase = createClient()
  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map())

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
      const existing = grouped.get(block.date) || []
      grouped.set(block.date, [...existing, block])
    })
    return grouped
  }, [blocks, weekDays])

  // Scroll to selected day
  useEffect(() => {
    const dateKey = formatDateForApi(selectedDate)
    const el = dayRefs.current.get(dateKey)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedDate])

  // Handlers
  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date)
  }, [])

  const handleWeekChange = useCallback((date: Date) => {
    setSelectedDate(date)
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
      />

      {/* Main Content */}
      <main className="flex-1 pb-24 overflow-y-auto">
        {blocksLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="pt-2">
            {weekDays.map((day) => {
              const dateKey = formatDateForApi(day)
              const dayBlocks = blocksByDate.get(dateKey) || []

              return (
                <DaySection
                  key={dateKey}
                  ref={(el) => {
                    if (el) dayRefs.current.set(dateKey, el)
                  }}
                  date={day}
                  blocks={dayBlocks}
                  onAddBlock={handleAddBlock}
                  onToggleComplete={handleToggleComplete}
                  onEdit={handleEditBlock}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              )
            })}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 items-end safe-bottom">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => handleAddBlock(selectedDate)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Sign Out Button - top right on desktop */}
      <button
        onClick={handleSignOut}
        className="fixed top-3 right-3 p-2 rounded-lg hover:bg-secondary transition-colors z-40"
        title="Sign out"
      >
        <LogOut className="h-5 w-5 text-muted-foreground" />
      </button>

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
