'use client'

import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { getDateRange, incrementTime, formatDateForApi } from '@/lib/date'
import type { Block, BlockMedia } from '@/lib/types'
import type { BlockFormData } from '@/lib/schemas'

export function useBlocks(selectedDate: Date, userId: string | undefined) {
  const supabase = useMemo(() => createClient(), [])
  const dateKey = formatDateForApi(selectedDate)

  const { data: blocks, isLoading: loading, error: swrError, mutate } = useSWR<Block[]>(
    userId ? ['blocks', userId, dateKey] : null,
    async () => {
      const { start, end } = getDateRange(selectedDate)

      const { data, error } = await supabase
        .from('blocks')
        .select('*, block_media(*)')
        .eq('user_id', userId!)
        .is('deleted_at', null)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) throw error
      return (data as Block[]) || []
    },
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  )

  const error = swrError ? (swrError instanceof Error ? swrError.message : 'Failed to fetch blocks') : null

  // Create a new block (with optional share-to-feed)
  const createBlock = useCallback(
    async (data: BlockFormData, entryMode: 'schedule' | 'log' = 'schedule') => {
      if (!userId) throw new Error('Not authenticated')

      const sharedToFeed = (data as any).shared_to_feed === true || data.block_type === 'challenge'
      const isLogMode = entryMode === 'log'
      const isPlanned = !isLogMode && data.block_type !== 'challenge'
      const now = new Date().toISOString()

      const payload = data.payload || {}
      const programmeTemplateId = (payload as any).programme_template_id || null
      const programmeSessionId = (payload as any).programme_session_id || null

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
        programme_template_id: programmeTemplateId,
        programme_session_id: programmeSessionId,
      }

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

      mutate((prev) => [...(prev || []), newBlock as Block], false)
      return newBlock as Block
    },
    [userId, supabase, mutate]
  )

  // Update an existing block (merges payload to prevent clobbering)
  const updateBlock = useCallback(
    async (blockId: string, data: Partial<BlockFormData>) => {
      if (!userId) throw new Error('Not authenticated')

      const currentBlocks = blocks || []
      const currentBlock = currentBlocks.find(b => b.id === blockId)
      const existingPayload = (currentBlock?.payload as Record<string, unknown>) || {}
      const incomingPayload = (data.payload as Record<string, unknown>) || {}
      const mergedPayload = { ...existingPayload, ...incomingPayload }

      const updateData = {
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time || null,
        title: data.title || null,
        notes: data.notes || null,
        payload: mergedPayload,
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

      mutate(
        (prev) => (prev || []).map((b) => (b.id === blockId ? (updatedBlock as Block) : b)),
        false
      )
      return updatedBlock as Block
    },
    [userId, blocks, supabase, mutate]
  )

  // Merge-update only specific payload keys
  const updateBlockPayload = useCallback(
    async (blockId: string, payloadPatch: Record<string, unknown>) => {
      if (!userId) throw new Error('Not authenticated')

      const currentBlocks = blocks || []
      const currentBlock = currentBlocks.find(b => b.id === blockId)
      const currentPayload = (currentBlock?.payload as Record<string, unknown>) || {}
      const mergedPayload = { ...currentPayload, ...payloadPatch }

      const { data: updatedBlock, error } = await supabase
        .from('blocks')
        .update({ payload: mergedPayload })
        .eq('id', blockId)
        .eq('user_id', userId)
        .select('*, block_media(*)')
        .single()

      if (error) throw error

      mutate(
        (prev) => (prev || []).map((b) => (b.id === blockId ? (updatedBlock as Block) : b)),
        false
      )
      return updatedBlock as Block
    },
    [userId, blocks, supabase, mutate]
  )

  // Toggle completion (optimistic update) + create feed post if shared
  // When whopToken is provided and a workout block is being completed,
  // the request goes through /api/workouts/{id}/complete which also
  // posts a message to the Whop Elite Community Chat channel.
  const toggleComplete = useCallback(
    async (block: Block, whopToken?: string | null) => {
      if (!userId) throw new Error('Not authenticated')

      const isCompleting = !block.completed_at
      const newCompletedAt = isCompleting ? new Date().toISOString() : null

      // Optimistic update
      mutate(
        (prev) =>
          (prev || []).map((b) =>
            b.id === block.id ? { ...b, completed_at: newCompletedAt } : b
          ),
        false
      )

      try {
        // Route workout completions through the API when a Whop token is
        // available so the backend can verify identity and post to Whop chat.
        if (isCompleting && block.block_type === 'workout' && whopToken) {
          const res = await fetch(`/api/workouts/${block.id}/complete`, {
            method: 'POST',
            headers: { 'x-whop-user-token': whopToken },
          })

          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body.error || `Completion API returned ${res.status}`)
          }
        } else {
          // Direct Supabase update for non-workout blocks or un-completing
          const { error } = await supabase
            .from('blocks')
            .update({ completed_at: newCompletedAt })
            .eq('id', block.id)
            .eq('user_id', userId)

          if (error) throw error
        }

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
            console.error('Feed post creation failed:', feedErr)
          }
        }
      } catch (err) {
        // Revert on error
        mutate(
          (prev) =>
            (prev || []).map((b) =>
              b.id === block.id ? { ...b, completed_at: block.completed_at } : b
            ),
          false
        )
        throw err
      }
    },
    [userId, supabase, mutate]
  )

  // Duplicate a block
  const duplicateBlock = useCallback(
    async (block: Block) => {
      if (!userId) throw new Error('Not authenticated')

      const currentBlocks = blocks || []
      const sameDate = currentBlocks.filter((b) => b.date === block.date)
      let newStartTime = incrementTime(block.start_time)

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

      mutate((prev) => [...(prev || []), newBlock as Block], false)
      return newBlock as Block
    },
    [userId, blocks, supabase, mutate]
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

      mutate((prev) => (prev || []).filter((b) => b.id !== blockId), false)
    },
    [userId, supabase, mutate]
  )

  const refetch = useCallback(() => { mutate() }, [mutate])

  return {
    blocks: blocks || [],
    loading,
    error,
    createBlock,
    updateBlock,
    updateBlockPayload,
    toggleComplete,
    duplicateBlock,
    deleteBlock,
    refetch,
  }
}

// Hook for block media operations (no caching needed - pure mutations)
export function useBlockMedia(userId: string | undefined) {
  const supabase = useMemo(() => createClient(), [])

  const uploadMedia = useCallback(
    async (blockId: string, file: File, meta?: Record<string, unknown>) => {
      if (!userId) throw new Error('Not authenticated')

      const ext = file.name.split('.').pop() || 'webp'
      const filename = `${Date.now()}.${ext}`
      const storagePath = `${userId}/${blockId}/${filename}`

      const { error: uploadError } = await supabase.storage
        .from('block-media')
        .upload(storagePath, file)

      if (uploadError) throw uploadError

      const mediaType = file.type.startsWith('image/') ? 'image' : 'video'
      const sortOrder = (meta?.sort_order as number) ?? 0
      const { data, error: insertError } = await supabase
        .from('block_media')
        .insert({
          block_id: blockId,
          user_id: userId,
          storage_path: storagePath,
          media_type: mediaType,
          sort_order: sortOrder,
          meta: meta || null,
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

      const { data: media, error: fetchError } = await supabase
        .from('block_media')
        .select('storage_path')
        .eq('id', mediaId)
        .eq('user_id', userId)
        .single()

      if (fetchError) throw fetchError

      const { error: storageError } = await supabase.storage
        .from('block-media')
        .remove([media.storage_path])

      if (storageError) console.error('Storage delete failed:', storageError)

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
