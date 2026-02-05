'use client'

import { useState } from 'react'
import { Modal, Button } from '@/components/ui'
import { MediaUploader } from './MediaUploader'
import { Camera, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Block, BlockMedia } from '@/lib/types'

interface SharePromptModalProps {
  isOpen: boolean
  onClose: () => void
  block: Block | null
  userId?: string
  onMediaUpload?: (blockId: string, file: File) => Promise<BlockMedia | void>
  onMediaDelete?: (mediaId: string) => Promise<void>
  onConfirm: (shareToFeed: boolean) => Promise<void>
}

export function SharePromptModal({
  isOpen,
  onClose,
  block,
  userId,
  onMediaUpload,
  onMediaDelete,
  onConfirm,
}: SharePromptModalProps) {
  const [shareToFeed, setShareToFeed] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedMedia, setUploadedMedia] = useState<BlockMedia[]>([])

  const isChallenge = block?.block_type === 'challenge'

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm(shareToFeed)
      onClose()
    } catch (error) {
      console.error('Failed to share:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNotNow = () => {
    onClose()
  }

  const handleMediaUpload = async (blockId: string, file: File) => {
    if (onMediaUpload) {
      const media = await onMediaUpload(blockId, file)
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

  if (!block) return null

  const allMedia = [...(block.block_media || []), ...uploadedMedia]

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleNotNow}
      title="Add a photo and share to feed?"
      showClose={true}
    >
      <div className="p-4 space-y-4">
        {/* Info text */}
        <p className="text-[13px] text-[rgba(238,242,255,0.65)]">
          {isChallenge
            ? 'Challenges require a photo and will be shared to the community feed.'
            : 'Share your achievement with the community! Add a photo to make it more engaging.'}
        </p>

        {/* Media Uploader */}
        {userId && onMediaUpload && onMediaDelete && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[13px] font-medium text-[rgba(238,242,255,0.72)]">
              <Camera className="h-4 w-4" />
              Add Photo/Video
            </label>
            <MediaUploader
              blockId={block.id}
              userId={userId}
              media={allMedia}
              onUpload={handleMediaUpload}
              onDelete={handleMediaDelete}
            />
          </div>
        )}

        {/* Share to Feed Toggle - forced ON for challenges */}
        {!isChallenge && (
          <div className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.03)] rounded-[12px] border border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-[rgba(238,242,255,0.52)]" />
              <div>
                <p className="text-[13px] font-medium text-[#eef2ff]">Share to Feed</p>
                <p className="text-[11px] text-[rgba(238,242,255,0.40)]">Post to community feed</p>
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
          <div className="p-3 bg-[rgba(245,158,11,0.08)] rounded-[12px] border border-[rgba(245,158,11,0.2)]">
            <p className="text-[12px] text-[#f59e0b]">
              ⚡ Challenges require a photo and will automatically be shared to the feed.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleNotNow}
            className="flex-1"
          >
            Not now
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            loading={isSubmitting}
            disabled={isChallenge && allMedia.length === 0}
            className="flex-1"
          >
            {shareToFeed || isChallenge ? 'Share' : 'Done'}
          </Button>
        </div>

        {/* Challenge media requirement notice */}
        {isChallenge && allMedia.length === 0 && (
          <p className="text-[11px] text-[#ef4444] text-center">
            Please add a photo to complete this challenge
          </p>
        )}
      </div>
    </Modal>
  )
}
