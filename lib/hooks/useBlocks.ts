'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getDateRange, incrementTime, formatDateForApi } from '@/lib/date'
import type { Block, BlockMedia } from '@/lib/types'
import type { BlockFormData } from '@/lib/schemas'

export function useBlocks(selectedDate: Date, userId: string | undefined) {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  // Fetch blocks for the date range
  const fetchBlocks = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { start, end } = getDateRange(selectedDate)

      const { data, error: fetchError } = await supabase
        .from('blocks')
        .select('*, block_media(*)')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      if (fetchError) throw fetchError

      setBlocks((data as Block[]) || [])
    } catch (err) {
      console.error('Failed to fetch blocks:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch blocks')
    } finally {
      setLoading(false)
    }
  }, [selectedDate, userId, supabase])

  // Initial fetch and refetch on date change
  useEffect(() => {
    fetchBlocks()
  }, [fetchBlocks])

  // Create a new block (with optional share-to-feed)
  // entryMode: 'schedule' = future planning (is_planned=true), 'log' = past/now logging (is_planned=false, auto-complete)
  const createBlock = useCallback(
    async (data: BlockFormData, entryMode: 'schedule' | 'log' = 'schedule') => {
      if (!userId) throw new Error('Not authenticated')

      const sharedToFeed = (data as any).shared_to_feed === true || data.block_type === 'challenge'

      // Schedule mode = planned, Log mode = unplanned (already done)
      const isLogMode = entryMode === 'log'
      // Challenge blocks are always unplanned (DB enforces this via trigger)
      const isPlanned = !isLogMode && data.block_type !== 'challenge'

      const now = new Date().toISOString()

      const insertData: Record<string, unknown> = {
        user_id: userId,
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time || null,
        block_type: data.block_type,
        title: data.title || null,
        notes: data.notes || null,
        payload: data.payload || {},
        repeat_rule: data.repeat_rule || null,
        shared_to_feed: sharedToFeed,
        is_planned: isPlanned,
      }

      // Auto-set completed_at and performed_at for Log mode (logging something already done)
      if (isLogMode) {
        insertData.completed_at = now
        insertData.performed_at = now
      }

      const { data: newBlock, error } = await supabase
        .from('blocks')
        .insert(insertData)
        .select('*, block_media(*)')
        .single()

      if (error) throw error

      setBlocks((prev) => [...prev, newBlock as Block])
      return newBlock as Block
    },
    [userId, supabase]
  )

  // Update an existing block
  const updateBlock = useCallback(
    async (blockId: string, data: Partial<BlockFormData>) => {
      if (!userId) throw new Error('Not authenticated')

      const updateData = {
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time || null,
        title: data.title || null,
        notes: data.notes || null,
        payload: data.payload || {},
        repeat_rule: data.repeat_rule || null,
      }

      const { data: updatedBlock, error } = await supabase
        .from('blocks')
        .update(updateData)
        .eq('id', blockId)
        .eq('user_id', userId)
        .select('*, block_media(*)')
        .single()

      if (error) throw error

      setBlocks((prev) =>
        prev.map((b) => (b.id === blockId ? (updatedBlock as Block) : b))
      )
      return updatedBlock as Block
    },
    [userId, supabase]
  )

  // Toggle completion (optimistic update) + create feed post if shared
  const toggleComplete = useCallback(
    async (block: Block) => {
      if (!userId) throw new Error('Not authenticated')

      const newCompletedAt = block.completed_at ? null : new Date().toISOString()

      // Optimistic update
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === block.id ? { ...b, completed_at: newCompletedAt } : b
        )
      )

      try {
        const { error } = await supabase
          .from('blocks')
          .update({ completed_at: newCompletedAt })
          .eq('id', block.id)
          .eq('user_id', userId)

        if (error) throw error

        // Create feed post when completing a shared block (not when un-completing)
        if (newCompletedAt && block.shared_to_feed && block.block_type !== 'personal') {
          try {
            await supabase
              .from('feed_posts')
              .upsert({
                user_id: userId,
                block_id: block.id,
                title: block.title || `${block.block_type.charAt(0).toUpperCase() + block.block_type.slice(1)} completed`,
                payload: block.payload || {},
              }, { onConflict: 'block_id' })
          } catch (feedErr) {
            // Don't fail the completion if feed post fails
            console.error('Feed post creation failed:', feedErr)
          }
        }
      } catch (err) {
        // Revert on error
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === block.id ? { ...b, completed_at: block.completed_at } : b
          )
        )
        throw err
      }
    },
    [userId, supabase]
  )

  // Duplicate a block
  const duplicateBlock = useCallback(
    async (block: Block) => {
      if (!userId) throw new Error('Not authenticated')

      // Get existing blocks for the same date to check for time conflicts
      const sameDate = blocks.filter((b) => b.date === block.date)
      let newStartTime = incrementTime(block.start_time)

      // Keep incrementing if there's a conflict
      while (sameDate.some((b) => b.start_time === newStartTime)) {
        newStartTime = incrementTime(newStartTime)
      }

      const insertData = {
        user_id: userId,
        date: block.date,
        start_time: newStartTime,
        end_time: block.end_time,
        block_type: block.block_type,
        title: block.title,
        notes: block.notes,
        payload: block.payload,
        repeat_rule: block.repeat_rule,
      }

      const { data: newBlock, error } = await supabase
        .from('blocks')
        .insert(insertData)
        .select('*, block_media(*)')
        .single()

      if (error) throw error

      setBlocks((prev) => [...prev, newBlock as Block])
      return newBlock as Block
    },
    [userId, blocks, supabase]
  )

  // Soft delete a block
  const deleteBlock = useCallback(
    async (blockId: string) => {
      if (!userId) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('blocks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', blockId)
        .eq('user_id', userId)

      if (error) throw error

      // Remove from local state
      setBlocks((prev) => prev.filter((b) => b.id !== blockId))
    },
    [userId, supabase]
  )

  return {
    blocks,
    loading,
    error,
    createBlock,
    updateBlock,
    toggleComplete,
    duplicateBlock,
    deleteBlock,
    refetch: fetchBlocks,
  }
}

// Hook for block media operations
export function useBlockMedia(userId: string | undefined) {
  const supabase = useMemo(() => createClient(), [])

  const uploadMedia = useCallback(
    async (blockId: string, file: File) => {
      if (!userId) throw new Error('Not authenticated')

      // Generate unique filename
      const ext = file.name.split('.').pop()
      const filename = `${blockId}-${Date.now()}.${ext}`
      const storagePath = `${userId}/${filename}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('block-media')
        .upload(storagePath, file)

      if (uploadError) throw uploadError

      // Create media record
      const mediaType = file.type.startsWith('image/') ? 'image' : 'video'
      const { data, error: insertError } = await supabase
        .from('block_media')
        .insert({
          block_id: blockId,
          user_id: userId,
          storage_path: storagePath,
          media_type: mediaType,
        })
        .select()
        .single()

      if (insertError) throw insertError

      return data as BlockMedia
    },
    [userId, supabase]
  )

  const deleteMedia = useCallback(
    async (mediaId: string) => {
      if (!userId) throw new Error('Not authenticated')

      // Get media record first
      const { data: media, error: fetchError } = await supabase
        .from('block_media')
        .select('storage_path')
        .eq('id', mediaId)
        .eq('user_id', userId)
        .single()

      if (fetchError) throw fetchError

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('block-media')
        .remove([media.storage_path])

      if (storageError) console.error('Storage delete failed:', storageError)

      // Delete record
      const { error: deleteError } = await supabase
        .from('block_media')
        .delete()
        .eq('id', mediaId)
        .eq('user_id', userId)

      if (deleteError) throw deleteError
    },
    [userId, supabase]
  )

  return { uploadMedia, deleteMedia }
}
