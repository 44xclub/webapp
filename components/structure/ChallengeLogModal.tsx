'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import { Modal, Button, Textarea } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { formatDateForApi } from '@/lib/date'
import { ImagePlus, X, Loader2, Lock, ArrowLeft, Check, Share2 } from 'lucide-react'
import type { CommunityChallenge, Block, Profile, ProfileRank } from '@/lib/types'

interface MediaItem {
  id: string
  file: File
  preview: string
  type: 'image' | 'video'
}

interface ChallengeLogModalProps {
  isOpen: boolean
  onClose: () => void
  challenge: CommunityChallenge
  userId: string
  userProfile?: Profile | null
  userRank?: ProfileRank | null
  avatarUrl?: string | null
  onSuccess: (block: Block) => void
}

type Step = 'form' | 'preview'

export function ChallengeLogModal({
  isOpen,
  onClose,
  challenge,
  userId,
  userProfile,
  userRank,
  avatarUrl,
  onSuccess,
}: ChallengeLogModalProps) {
  const [step, setStep] = useState<Step>('form')
  const [description, setDescription] = useState('')
  const [media, setMedia] = useState<MediaItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = useMemo(() => createClient(), [])

  // Reset state when modal opens/closes
  const handleClose = useCallback(() => {
    setStep('form')
    setDescription('')
    setMedia([])
    setError(null)
    onClose()
  }, [onClose])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newMedia: MediaItem[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        continue
      }

      newMedia.push({
        id: `${Date.now()}-${i}`,
        file,
        preview: URL.createObjectURL(file),
        type: file.type.startsWith('image/') ? 'image' : 'video',
      })
    }

    setMedia((prev) => [...prev, ...newMedia])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeMedia = (id: string) => {
    setMedia((prev) => {
      const item = prev.find((m) => m.id === id)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter((m) => m.id !== id)
    })
  }

  const canProceedToPreview = media.length > 0

  const handlePreview = () => {
    if (!canProceedToPreview) {
      setError('Please add at least one photo or video')
      return
    }
    setError(null)
    setStep('preview')
  }

  const handlePost = async () => {
    if (!canProceedToPreview) return

    setIsSubmitting(true)
    setError(null)

    try {
      const today = formatDateForApi(new Date())
      const now = new Date()
      const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0')}`

      // 1. Create challenge block
      const { data: block, error: blockError } = await supabase
        .from('blocks')
        .insert({
          user_id: userId,
          date: today,
          start_time: startTime,
          block_type: 'challenge',
          title: challenge.title,
          challenge_id: challenge.id,
          payload: {
            challenge_id: challenge.id,
            description: description || null,
          },
          is_planned: false,
          completed_at: now.toISOString(),
          performed_at: now.toISOString(),
          shared_to_feed: true,
        })
        .select()
        .single()

      if (blockError) throw blockError

      // 2. Upload media and create block_media rows
      const uploadedMedia: { storage_path: string; media_type: 'image' | 'video' }[] = []

      for (const item of media) {
        const ext = item.file.name.split('.').pop() || 'jpg'
        const path = `${userId}/${block.id}/${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('block-media')
          .upload(path, item.file)

        if (uploadError) {
          console.error('Media upload failed:', uploadError)
          continue
        }

        uploadedMedia.push({
          storage_path: path,
          media_type: item.type,
        })
      }

      // Insert block_media rows
      if (uploadedMedia.length > 0) {
        const { error: mediaInsertError } = await supabase.from('block_media').insert(
          uploadedMedia.map((m) => ({
            block_id: block.id,
            user_id: userId,
            storage_path: m.storage_path,
            media_type: m.media_type,
          }))
        )
        if (mediaInsertError) console.error('block_media insert error:', mediaInsertError)
      }

      // 3. Create feed post
      const firstMediaPath = uploadedMedia.length > 0 ? uploadedMedia[0].storage_path : null

      const { error: feedError } = await supabase.from('feed_posts').insert({
        user_id: userId,
        block_id: block.id,
        title: `Challenge: ${challenge.title}`,
        body: description || null,
        media_path: firstMediaPath,
        payload: {
          block_type: 'challenge',
          challenge_id: challenge.id,
          media: uploadedMedia,
        },
      })

      if (feedError) console.error('Feed post error:', feedError)

      // Success
      onSuccess(block as Block)
      handleClose()
    } catch (err) {
      console.error('Failed to post challenge:', err)
      setError('Failed to post challenge. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }


  // Form step
  if (step === 'form') {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Log Challenge" fullScreen={true}
        footer={
          <Button
            onClick={handlePreview}
            disabled={!canProceedToPreview}
            className="w-full h-11"
          >
            Preview Post
          </Button>
        }
      >
        <div className="px-4 pb-4 space-y-4">
          {/* Challenge info */}
          <div className="p-3 rounded-[12px] bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.15)]">
            <p className="text-[11px] uppercase tracking-wider text-[#3b82f6] font-semibold mb-1">
              Active Challenge
            </p>
            <h3 className="text-[15px] font-bold text-[#eef2ff]">{challenge.title}</h3>
            {challenge.description && (
              <p className="text-[12px] text-[rgba(238,242,255,0.60)] mt-1 line-clamp-2">
                {challenge.description}
              </p>
            )}
          </div>

          {/* Description input */}
          <div>
            <label className="block text-[13px] font-medium text-[rgba(238,242,255,0.72)] mb-2">
              Your Notes (optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="How did it go? Share your experience..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Media upload (required) */}
          <div>
            <label className="block text-[13px] font-medium text-[rgba(238,242,255,0.72)] mb-2">
              Media <span className="text-rose-400">*</span>
            </label>

            {/* Media grid */}
            {media.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {media.map((item) => (
                  <div key={item.id} className="relative aspect-square">
                    {item.type === 'image' ? (
                      <img
                        src={item.preview}
                        alt=""
                        className="w-full h-full object-cover rounded-[10px]"
                      />
                    ) : (
                      <video
                        src={item.preview}
                        className="w-full h-full object-cover rounded-[10px]"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(item.id)}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <ImagePlus className="h-4 w-4 mr-2" />
              {media.length > 0 ? 'Add More' : 'Add Photo/Video'}
            </Button>
            {media.length === 0 && (
              <p className="text-[11px] text-[rgba(238,242,255,0.45)] mt-1.5 text-center">
                At least one photo or video is required
              </p>
            )}
          </div>

          {/* Share to feed - locked ON */}
          <div className="flex items-center justify-between p-3 rounded-[12px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-[#3b82f6]" />
              <span className="text-[13px] font-medium text-[rgba(238,242,255,0.85)]">
                Share to Feed
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[rgba(238,242,255,0.45)]">
              <Lock className="h-3.5 w-3.5" />
              <span className="text-[11px]">Required</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-[12px] text-rose-400 text-center">{error}</p>
          )}
        </div>
      </Modal>
    )
  }

  // Preview step
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Preview Post" fullScreen={true}
      footer={
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setStep('form')}
            disabled={isSubmitting}
            className="flex-1 h-11"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button
            onClick={handlePost}
            disabled={isSubmitting}
            className="flex-1 h-11"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Post
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="px-4 pb-4 space-y-4">
        {/* Post preview */}
        <div className="rounded-[14px] border border-[rgba(255,255,255,0.08)] overflow-hidden bg-[rgba(255,255,255,0.02)]">
          {/* User header */}
          <div className="flex items-center gap-3 p-3 border-b border-[rgba(255,255,255,0.06)]">
            <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[rgba(238,242,255,0.45)] text-[14px] font-semibold">
                  {(userProfile?.display_name || 'U')[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#eef2ff] truncate">
                {userProfile?.display_name || 'You'}
              </p>
              <div className="flex items-center gap-2">
                {userRank && (
                  <span className="text-[11px] font-medium text-[#3b82f6]">
                    {userRank.badge} L{userRank.badge_level}
                  </span>
                )}
                <span className="text-[11px] text-[rgba(238,242,255,0.45)]">Just now</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-3">
            <p className="text-[15px] font-bold text-[#eef2ff] mb-1">
              Challenge: {challenge.title}
            </p>
            {description && (
              <p className="text-[13px] text-[rgba(238,242,255,0.72)] leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {/* Media preview */}
          {media.length > 0 && (
            <div className={`grid ${media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-0.5`}>
              {media.slice(0, 4).map((item, i) => (
                <div key={item.id} className={`relative aspect-square ${media.length === 3 && i === 0 ? 'col-span-2' : ''}`}>
                  {item.type === 'image' ? (
                    <img src={item.preview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <video src={item.preview} className="w-full h-full object-cover" />
                  )}
                  {i === 3 && media.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">+{media.length - 4}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Respect button (disabled preview) */}
          <div className="p-3 border-t border-[rgba(255,255,255,0.06)]">
            <button disabled className="flex items-center gap-1.5 text-[rgba(238,242,255,0.45)]">
              <span className="text-[13px]">Respect</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-[12px] text-rose-400 text-center">{error}</p>
        )}
      </div>
    </Modal>
  )
}
