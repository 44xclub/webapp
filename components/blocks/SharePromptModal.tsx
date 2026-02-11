'use client'

import { useState, useMemo, useCallback } from 'react'
import { Modal, Button } from '@/components/ui'
import { MediaUploader } from './MediaUploader'
import { Camera, Share2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { FeedPostCard, FeedPostPayload } from '@/components/feed/FeedPostCard'
import type { Block, BlockMedia, Profile } from '@/lib/types'

interface SharePromptModalProps {
  isOpen: boolean
  onClose: () => void
  block: Block | null
  userId?: string
  userProfile?: Profile | null
  onMediaUpload?: (blockId: string, file: File, meta?: Record<string, unknown>) => Promise<BlockMedia | void>
  onMediaDelete?: (mediaId: string) => Promise<void>
  onConfirm: (shareToFeed: boolean) => Promise<void>
}

// Block types that can be shared to feed
const SHAREABLE_TYPES = ['workout', 'nutrition', 'habit', 'checkin', 'challenge']

export function SharePromptModal({
  isOpen,
  onClose,
  block,
  userId,
  userProfile,
  onMediaUpload,
  onMediaDelete,
  onConfirm,
}: SharePromptModalProps) {
  const [shareToFeed, setShareToFeed] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedMedia, setUploadedMedia] = useState<BlockMedia[]>([])
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const isChallenge = block?.block_type === 'challenge'
  const isSharableType = block && SHAREABLE_TYPES.includes(block.block_type)

  // Challenge requires media
  const mediaRequired = isChallenge
  const allMedia = [...(block?.block_media || []), ...uploadedMedia]
  const hasMedia = allMedia.length > 0

  // Build the feed post payload from block data
  const buildFeedPayload = useCallback((): FeedPostPayload => {
    if (!block) {
      return { type: 'habit', title: '' }
    }

    const payload = block.payload as Record<string, any>
    const basePayload: FeedPostPayload = {
      type: block.block_type as FeedPostPayload['type'],
      title: block.title || '',
      notes: block.notes || undefined,
    }

    switch (block.block_type) {
      case 'workout':
        const exercises = payload?.exercise_matrix || payload?.exercises || []
        const category = payload?.category || 'weight_lifting'
        const isMatrixType = ['weight_lifting', 'hyrox', 'hybrid'].includes(category)

        basePayload.workout = {
          is_programme: !!block.programme_session_id,
          session_title: payload?.session_title,
          rpe: payload?.rpe,
          duration_min: payload?.duration,
          kind: category, // Include workout kind for proper rendering
          exercises: isMatrixType ? exercises.map((ex: any) => ({
            name: ex.exercise || ex.name || 'Exercise',
            sets: Array.isArray(ex.sets)
              ? ex.sets
              : Array.from({ length: ex.sets || 0 }, () => ({
                  reps: ex.reps,
                  weight: ex.weight,
                })),
          })) : [],
          // Include details for running/sport/other
          details: !isMatrixType ? {
            description: payload?.description,
            distance_km: payload?.distance_km,
            pace: payload?.pace,
          } : undefined,
        }
        break

      case 'nutrition':
        // Include macros if available
        const hasMacros = payload?.calories || payload?.protein || payload?.carbs || payload?.fat
        basePayload.nutrition = {
          meals: [{
            meal_type: payload?.meal_type,
            description: payload?.meal_name,
            calories: payload?.calories,
            protein: payload?.protein,
            carbs: payload?.carbs,
            fat: payload?.fat,
          }],
          has_macros: hasMacros,
        }
        break

      case 'checkin':
        basePayload.checkin = {
          weight_kg: payload?.weight_kg || payload?.weight,
          body_fat_pct: payload?.body_fat_pct || payload?.body_fat,
          height_cm: payload?.height_cm || payload?.height,
        }
        break

      case 'challenge':
        basePayload.challenge = {
          challenge_title: block.title || 'Challenge',
          proof_required: true,
        }
        break

      case 'habit':
        basePayload.habit = {
          description: block.notes || undefined,
        }
        break
    }

    // Add media to payload
    if (allMedia.length > 0) {
      basePayload.media = allMedia.map((m) => ({
        type: m.media_type,
        path: m.storage_path,
      }))
    }

    return basePayload
  }, [block, allMedia])

  // Build preview post for the FeedPostCard
  const previewPost = useMemo(() => {
    if (!block) return null

    const feedPayload = buildFeedPayload()
    return {
      id: 'preview',
      user_id: userId || '',
      block_id: block.id,
      title: block.title || 'Untitled',
      body: block.notes || null,
      media_path: allMedia[0]?.storage_path || null,
      payload: feedPayload,
      created_at: new Date().toISOString(),
      deleted_at: null,
      user_profile: userProfile
        ? {
            display_name: userProfile.display_name,
            avatar_path: userProfile.avatar_path,
            discipline_score: userProfile.discipline_score,
          }
        : {
            display_name: 'You',
            avatar_path: null,
            discipline_score: 29,
          },
      respect_count: 0,
      has_respected: false,
    }
  }, [block, buildFeedPayload, userId, userProfile, allMedia])

  const handleConfirm = async () => {
    // Validate challenge has media
    if (isChallenge && !hasMedia) {
      setError('Challenge posts require proof (photo/video)')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Create feed post if sharing
      if ((shareToFeed || isChallenge) && block && userId) {
        const feedPayload = buildFeedPayload()

        // Insert feed_posts row
        const { error: postError } = await supabase.from('feed_posts').insert({
          user_id: userId,
          block_id: block.id,
          title: block.title || 'Untitled',
          body: block.notes || null,
          payload: feedPayload,
          media_path: allMedia[0]?.storage_path || null,
        })

        if (postError) {
          // Handle unique constraint (already posted)
          if (postError.code === '23505') {
            // Already posted, that's fine
            console.log('Block already shared to feed')
          } else {
            throw new Error(`Failed to create post: ${postError.message}`)
          }
        }
      }

      // Call parent confirm handler
      await onConfirm(shareToFeed || isChallenge)

      // Reset state
      setUploadedMedia([])
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to share')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNotNow = () => {
    setUploadedMedia([])
    setError(null)
    onClose()
  }

  const handleMediaUpload = async (blockId: string, file: File, meta?: Record<string, unknown>) => {
    if (onMediaUpload) {
      const media = await onMediaUpload(blockId, file, meta)
      if (media) {
        setUploadedMedia((prev) => [...prev, media])
      }
      return media
    }
  }

  const handleMediaDelete = async (mediaId: string) => {
    if (onMediaDelete) {
      await onMediaDelete(mediaId)
      setUploadedMedia((prev) => prev.filter((m) => m.id !== mediaId))
    }
  }

  if (!block || !isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleNotNow}
      title="Share to Feed"
      showClose={true}
    >
      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Post Preview */}
        <div>
          <p className="text-[11px] font-medium text-[rgba(238,242,255,0.45)] mb-2 uppercase tracking-wide">
            Post Preview
          </p>
          {previewPost && (
            <div className="pointer-events-none">
              <FeedPostCard
                post={previewPost}
                userId={userId}
                onRespect={async () => {}}
                onDelete={async () => {}}
              />
            </div>
          )}
        </div>

        {/* Media Uploader */}
        {userId && onMediaUpload && onMediaDelete && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[12px] font-medium text-[rgba(238,242,255,0.45)] uppercase tracking-wide">
              <Camera className="h-4 w-4" />
              Add Media {mediaRequired && <span className="text-rose-400">*</span>}
            </label>
            <MediaUploader
              blockId={block.id}
              userId={userId}
              media={allMedia}
              onUpload={handleMediaUpload}
              onDelete={handleMediaDelete}
            />
            {mediaRequired && !hasMedia && (
              <p className="text-[12px] text-rose-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Proof required for challenge posts
              </p>
            )}
          </div>
        )}

        {/* Share to Feed Toggle - forced ON for challenges */}
        {!isChallenge && (
          <div className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.03)] rounded-[12px] border border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-[rgba(238,242,255,0.52)]" />
              <div>
                <p className="text-[13px] font-medium text-[#eef2ff]">Share to Community Feed</p>
                <p className="text-[11px] text-[rgba(238,242,255,0.40)]">Post visible to all members</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShareToFeed(!shareToFeed)}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors duration-200',
                shareToFeed ? 'bg-[#3b82f6]' : 'bg-[rgba(255,255,255,0.12)]'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200',
                  shareToFeed ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        )}

        {/* Challenge notice */}
        {isChallenge && (
          <div className="p-3 bg-[rgba(59,130,246,0.08)] rounded-[12px] border border-[rgba(59,130,246,0.2)]">
            <p className="text-[12px] text-[#3b82f6]">
              Challenge posts are always shared to the community feed with proof.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
            <p className="text-[13px] text-rose-400">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleNotNow}
            className="flex-1"
            disabled={isSubmitting}
          >
            Not now
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            loading={isSubmitting}
            disabled={isChallenge && !hasMedia}
            className="flex-1"
          >
            {shareToFeed || isChallenge ? 'Post to Feed' : 'Done'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
