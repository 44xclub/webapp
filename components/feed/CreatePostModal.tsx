'use client'

import { useState, useCallback, useMemo } from 'react'
import { X, ImagePlus, Loader2, Trash2, AlertCircle, Share2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Block, BlockMedia, Profile } from '@/lib/types'
import { FeedPostCard, FeedPostPayload } from './FeedPostCard'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  block: Block | null
  userId: string
  userProfile?: Profile | null
  existingMedia?: BlockMedia[]
  onSuccess: () => void
}

// Block types that can be shared to feed
const SHAREABLE_TYPES = ['workout', 'nutrition', 'habit', 'checkin', 'challenge']

// Helper to get storage URL from path
function getStorageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const supabase = createClient()
  const { data } = supabase.storage.from('block-media').getPublicUrl(path)
  return data.publicUrl
}

export function CreatePostModal({
  isOpen,
  onClose,
  block,
  userId,
  userProfile,
  existingMedia = [],
  onSuccess,
}: CreatePostModalProps) {
  const [shareEnabled, setShareEnabled] = useState(true)
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const isChallenge = block?.block_type === 'challenge'
  const isSharableType = block && SHAREABLE_TYPES.includes(block.block_type)

  // Challenge requires media
  const mediaRequired = isChallenge
  const hasMedia = mediaFiles.length > 0 || existingMedia.length > 0

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
        basePayload.workout = {
          is_programme: !!block.programme_session_id,
          session_title: payload?.session_title,
          rpe: payload?.rpe,
          duration_min: payload?.duration,
          exercises: exercises.map((ex: any) => ({
            name: ex.exercise || ex.name || 'Exercise',
            sets: Array.isArray(ex.sets)
              ? ex.sets
              : Array.from({ length: ex.sets || 0 }, () => ({
                  reps: ex.reps,
                  weight: ex.weight,
                })),
          })),
        }
        break

      case 'nutrition':
        basePayload.nutrition = {
          meals: payload?.meals || [],
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

    return basePayload
  }, [block])

  // Build preview post for the FeedPostCard
  const previewPost = useMemo(() => {
    const feedPayload = buildFeedPayload()
    return {
      id: 'preview',
      user_id: userId,
      block_id: block?.id || null,
      title: block?.title || 'Untitled',
      body: block?.notes || null,
      media_path: mediaPreviewUrls[0] || existingMedia[0]?.storage_path || null,
      payload: feedPayload,
      created_at: new Date().toISOString(),
      deleted_at: null,
      user_profile: userProfile
        ? {
            display_name: userProfile.display_name,
            avatar_path: userProfile.avatar_path,
            discipline_score: userProfile.discipline_score,
          }
        : undefined,
      respect_count: 0,
      has_respected: false,
    }
  }, [buildFeedPayload, block, userId, userProfile, mediaPreviewUrls, existingMedia])

  // Handle media file selection
  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validate files
    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      const isValidSize = file.size <= 50 * 1024 * 1024 // 50MB max
      return (isImage || isVideo) && isValidSize
    })

    if (validFiles.length !== files.length) {
      setError('Some files were skipped (invalid type or too large)')
    }

    // Create preview URLs
    const newUrls = validFiles.map((file) => URL.createObjectURL(file))
    setMediaFiles((prev) => [...prev, ...validFiles])
    setMediaPreviewUrls((prev) => [...prev, ...newUrls])
    setError(null)
  }

  // Remove a media file
  const removeMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreviewUrls[index])
    setMediaFiles((prev) => prev.filter((_, i) => i !== index))
    setMediaPreviewUrls((prev) => prev.filter((_, i) => i !== index))
  }

  // Upload media to storage
  const uploadMedia = async (): Promise<string[]> => {
    const paths: string[] = []

    for (const file of mediaFiles) {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${userId}/${block?.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('block-media')
        .upload(path, file)

      if (uploadError) {
        throw new Error(`Failed to upload media: ${uploadError.message}`)
      }

      paths.push(path)
    }

    return paths
  }

  // Create the feed post
  const handlePost = async () => {
    if (!block || !isSharableType) return

    // Validate challenge has media
    if (isChallenge && !hasMedia) {
      setError('Challenge posts require proof (photo/video)')
      return
    }

    setPosting(true)
    setError(null)

    try {
      // Upload new media files
      const uploadedPaths = await uploadMedia()

      // Insert block_media rows for new uploads
      if (uploadedPaths.length > 0) {
        const mediaRows = uploadedPaths.map((path) => ({
          block_id: block.id,
          user_id: userId,
          storage_path: path,
          media_type: path.match(/\.(mp4|mov|webm)$/i) ? 'video' : 'image',
        }))

        const { error: mediaError } = await supabase
          .from('block_media')
          .insert(mediaRows)

        if (mediaError) {
          console.error('Failed to insert block_media:', mediaError)
        }
      }

      // Build the feed post payload
      const feedPayload = buildFeedPayload()

      // Add media to payload
      const allMediaPaths = [
        ...existingMedia.map((m) => ({ type: m.media_type, path: m.storage_path })),
        ...uploadedPaths.map((path) => ({
          type: path.match(/\.(mp4|mov|webm)$/i) ? 'video' : 'image',
          path,
        })),
      ]
      if (allMediaPaths.length > 0) {
        feedPayload.media = allMediaPaths as FeedPostPayload['media']
      }

      // Insert feed_posts row
      const { error: postError } = await supabase.from('feed_posts').insert({
        user_id: userId,
        block_id: block.id,
        title: block.title || 'Untitled',
        body: block.notes || null,
        payload: feedPayload,
        media_path: allMediaPaths[0]?.path || null,
      })

      if (postError) {
        // Handle unique constraint (already posted)
        if (postError.code === '23505') {
          setError('This block has already been shared to the feed')
          setPosting(false)
          return
        }
        throw new Error(`Failed to create post: ${postError.message}`)
      }

      // Update block shared_to_feed flag
      await supabase
        .from('blocks')
        .update({ shared_to_feed: true })
        .eq('id', block.id)

      // Success
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create post')
    } finally {
      setPosting(false)
    }
  }

  if (!isOpen || !block) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#0d1017] w-full max-w-lg max-h-[90vh] rounded-t-[20px] sm:rounded-[20px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="text-[16px] font-semibold text-[#eef2ff]">Create Post</h2>
          <button
            onClick={onClose}
            className="p-2 text-[rgba(238,242,255,0.45)] hover:text-[#eef2ff] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Preview Section */}
          <div>
            <p className="text-[12px] font-medium text-[rgba(238,242,255,0.45)] mb-2 uppercase tracking-wide">
              Post Preview
            </p>
            <FeedPostCard
              post={previewPost}
              userId={userId}
              onRespect={async () => {}}
              onDelete={async () => {}}
            />
          </div>

          {/* Media Upload Section */}
          <div>
            <p className="text-[12px] font-medium text-[rgba(238,242,255,0.45)] mb-2 uppercase tracking-wide">
              Add Media {mediaRequired && <span className="text-rose-400">*</span>}
            </p>

            <div className="flex flex-wrap gap-2">
              {/* Existing media thumbnails */}
              {existingMedia.map((media, idx) => {
                const imageUrl = getStorageUrl(media.storage_path)
                if (!imageUrl) return null
                return (
                  <div
                    key={media.id}
                    className="relative w-20 h-20 rounded-lg overflow-hidden bg-[rgba(255,255,255,0.05)]"
                  >
                    <img
                      src={imageUrl}
                      alt={`Media ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )
              })}

              {/* New media previews */}
              {mediaPreviewUrls.map((url, idx) => (
                <div
                  key={idx}
                  className="relative w-20 h-20 rounded-lg overflow-hidden bg-[rgba(255,255,255,0.05)]"
                >
                  <img src={url} alt={`New media ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeMedia(idx)}
                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {/* Add media button */}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-[rgba(255,255,255,0.15)] flex items-center justify-center cursor-pointer hover:border-[rgba(255,255,255,0.25)] transition-colors">
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleMediaSelect}
                  className="hidden"
                />
                <ImagePlus className="h-6 w-6 text-[rgba(238,242,255,0.40)]" />
              </label>
            </div>

            {mediaRequired && !hasMedia && (
              <p className="text-[12px] text-rose-400 mt-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Proof required for challenge posts
              </p>
            )}
          </div>

          {/* Share Toggle */}
          {!isChallenge && (
            <div className="flex items-center justify-between py-3 border-t border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-[rgba(238,242,255,0.45)]" />
                <span className="text-[13px] text-[#eef2ff]">Share to Community Feed</span>
              </div>
              <button
                onClick={() => setShareEnabled(!shareEnabled)}
                className={`w-11 h-6 rounded-full transition-colors ${
                  shareEnabled ? 'bg-[#3b82f6]' : 'bg-[rgba(255,255,255,0.15)]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    shareEnabled ? 'translate-x-[22px]' : 'translate-x-[2px]'
                  }`}
                />
              </button>
            </div>
          )}

          {isChallenge && (
            <div className="flex items-center gap-2 py-3 border-t border-[rgba(255,255,255,0.06)]">
              <Share2 className="h-4 w-4 text-[#3b82f6]" />
              <span className="text-[13px] text-[rgba(238,242,255,0.52)]">
                Challenge posts are always shared to the feed
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
              <p className="text-[13px] text-rose-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-[rgba(255,255,255,0.06)] space-y-2">
          <button
            onClick={handlePost}
            disabled={posting || (mediaRequired && !hasMedia) || (!isChallenge && !shareEnabled)}
            className="w-full py-3 rounded-[12px] bg-[#3b82f6] text-white font-medium text-[14px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {posting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              'Post to Feed'
            )}
          </button>
          <button
            onClick={onClose}
            disabled={posting}
            className="w-full py-3 rounded-[12px] text-[rgba(238,242,255,0.52)] font-medium text-[14px] hover:text-[#eef2ff] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
