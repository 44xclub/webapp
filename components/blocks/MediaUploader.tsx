'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui'
import { ImagePlus, X, Loader2, AlertCircle } from 'lucide-react'
import { ImageCropper, type CropMetadata } from '@/components/media/ImageCropper'
import type { BlockMedia } from '@/lib/types'

// File size limits
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_VIDEO_SIZE = 25 * 1024 * 1024 // 25MB
const MAX_MEDIA_COUNT = 3

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/mov']

interface MediaUploaderProps {
  blockId: string
  userId: string
  media: BlockMedia[]
  onUpload: (blockId: string, file: File, meta?: Record<string, unknown>) => Promise<BlockMedia | void>
  onDelete: (mediaId: string) => Promise<void>
}

export function MediaUploader({
  blockId,
  userId,
  media,
  onUpload,
  onDelete,
}: MediaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({})
  const [urlsLoading, setUrlsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Crop flow state
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showCropper, setShowCropper] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const canAddMore = media.length < MAX_MEDIA_COUNT

  // Pre-fetch URLs for all media items
  useEffect(() => {
    const fetchUrls = async () => {
      if (media.length === 0) {
        setUrlsLoading(false)
        return
      }

      setUrlsLoading(true)
      const urls: Record<string, string> = {}

      for (const item of media) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (supabaseUrl) {
          urls[item.storage_path] = `${supabaseUrl}/storage/v1/object/public/block-media/${item.storage_path}`
        }
      }

      setMediaUrls(urls)
      setUrlsLoading(false)
    }

    fetchUrls()
  }, [media])

  // Validate file
  const validateFile = (file: File): string | null => {
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      return 'Please select an image or video file'
    }

    // Check allowed types
    if (isImage && !ALLOWED_IMAGE_TYPES.some(t => file.type.includes(t.split('/')[1]))) {
      return 'Allowed image types: JPEG, PNG, HEIC'
    }

    if (isVideo && !ALLOWED_VIDEO_TYPES.some(t => file.type.includes(t.split('/')[1]))) {
      return 'Allowed video types: MP4, MOV'
    }

    // Check file size
    if (isImage && file.size > MAX_IMAGE_SIZE) {
      return `Image too large. Max size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`
    }

    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      return `Video too large. Max size: ${MAX_VIDEO_SIZE / 1024 / 1024}MB`
    }

    return null
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // Check media limit
    if (!canAddMore) {
      setError(`Maximum ${MAX_MEDIA_COUNT} media files per block`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // For images, show cropper
    if (file.type.startsWith('image/')) {
      setPendingFile(file)
      setShowCropper(true)
    } else {
      // For videos, upload directly
      await uploadFile(file)
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Upload file with optional metadata
  const uploadFile = async (file: File, meta?: Record<string, unknown>) => {
    setIsUploading(true)
    setError(null)

    try {
      const newMedia = await onUpload(blockId, file, meta)

      if (newMedia?.storage_path) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (supabaseUrl) {
          const url = `${supabaseUrl}/storage/v1/object/public/block-media/${newMedia.storage_path}`
          setMediaUrls(prev => ({ ...prev, [newMedia.storage_path]: url }))
        }
      }
    } catch (error) {
      console.error('Upload failed:', error)
      setError('Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }

  // Handle crop complete
  const handleCropComplete = async (croppedFile: File, metadata: CropMetadata) => {
    setShowCropper(false)
    setPendingFile(null)

    await uploadFile(croppedFile, {
      width: metadata.width,
      height: metadata.height,
      aspect_ratio: metadata.aspect_ratio,
      is_cropped: metadata.is_cropped,
      crop_ratio: metadata.crop_ratio,
      original_width: metadata.original_width,
      original_height: metadata.original_height,
      file_size_bytes: croppedFile.size,
      mime_type: croppedFile.type,
      device_hint: 'mobile_feed',
    })
  }

  // Handle skip crop (upload original)
  const handleSkipCrop = async () => {
    if (!pendingFile) return

    setShowCropper(false)
    const file = pendingFile
    setPendingFile(null)

    // Get original dimensions
    const img = new Image()
    const url = URL.createObjectURL(file)

    await new Promise<void>((resolve) => {
      img.onload = async () => {
        URL.revokeObjectURL(url)
        await uploadFile(file, {
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspect_ratio: `${img.naturalWidth}:${img.naturalHeight}`,
          is_cropped: false,
          crop_ratio: null,
          original_width: img.naturalWidth,
          original_height: img.naturalHeight,
          file_size_bytes: file.size,
          mime_type: file.type,
          device_hint: 'mobile_feed',
        })
        resolve()
      }
      img.src = url
    })
  }

  // Handle cancel crop
  const handleCancelCrop = () => {
    setShowCropper(false)
    setPendingFile(null)
  }

  const handleDelete = async (mediaId: string) => {
    setDeletingId(mediaId)
    setError(null)
    try {
      await onDelete(mediaId)
    } catch (error) {
      console.error('Delete failed:', error)
      setError('Failed to delete file')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <label className="block text-[13px] font-medium text-[rgba(238,242,255,0.72)] mb-2">
        Media {media.length > 0 && <span className="text-[rgba(238,242,255,0.40)]">({media.length}/{MAX_MEDIA_COUNT})</span>}
      </label>

      {/* Error message */}
      {error && (
        <div className="mb-3 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
          <p className="text-[12px] text-rose-400">{error}</p>
        </div>
      )}

      {/* Media grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {media.map((item) => (
            <div key={item.id} className="relative aspect-square">
              {urlsLoading || !mediaUrls[item.storage_path] ? (
                <div className="w-full h-full bg-[rgba(255,255,255,0.05)] rounded-lg flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-[rgba(238,242,255,0.30)]" />
                </div>
              ) : item.media_type === 'image' ? (
                <img
                  src={mediaUrls[item.storage_path]}
                  alt=""
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    console.error('Image load error for:', item.storage_path)
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <video
                  src={mediaUrls[item.storage_path]}
                  className="w-full h-full object-cover rounded-lg"
                />
              )}

              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                disabled={deletingId === item.id}
                className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
              >
                {deletingId === item.id ? (
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                ) : (
                  <X className="h-4 w-4 text-white" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {canAddMore && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/heic,video/mp4,video/quicktime"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <ImagePlus className="h-4 w-4 mr-2" />
                Add Photo/Video
              </>
            )}
          </Button>

          {/* File size limits info */}
          <p className="mt-2 text-[11px] text-[rgba(238,242,255,0.35)] text-center">
            Max image: 8MB • Max video: 50MB
          </p>
        </div>
      )}

      {/* Cropper modal */}
      {showCropper && pendingFile && (
        <ImageCropper
          imageFile={pendingFile}
          onCropComplete={handleCropComplete}
          onSkip={handleSkipCrop}
          onCancel={handleCancelCrop}
        />
      )}
    </div>
  )
}
