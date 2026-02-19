'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, Loader2 } from 'lucide-react'
import { compressAvatar, isValidImageFile, createPreviewUrl, revokePreviewUrl } from '@/lib/utils/imageCompression'

interface AvatarUploadProps {
  userId: string
  currentPath: string | null
  displayName: string
  onUploadComplete: (path: string) => void
  /** Pre-resolved signed URL for the current avatar */
  resolvedAvatarUrl?: string | null
}

export function AvatarUpload({ userId, currentPath, displayName, onUploadComplete, resolvedAvatarUrl }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const initials = displayName.slice(0, 2).toUpperCase()

  // Use preview (blob) URL first, then the pre-resolved signed URL from parent
  const avatarUrl = previewUrl || resolvedAvatarUrl || null

  const handleClick = () => {
    if (!uploading) {
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    // Validate file type
    if (!isValidImageFile(file)) {
      setError('Please select a valid image file (JPEG, PNG, WebP, or GIF)')
      return
    }

    setError(null)
    setUploading(true)

    try {
      // Compress the image
      const compressed = await compressAvatar(file)

      // Create preview
      const preview = createPreviewUrl(compressed.blob)
      setPreviewUrl(preview)

      // Upload to Supabase storage
      const storagePath = `${userId}/avatar.webp`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(storagePath, compressed.blob, {
          contentType: 'image/webp',
          upsert: true,
          cacheControl: '3600',
        })

      if (uploadError) {
        throw uploadError
      }

      // Update profile with the path
      onUploadComplete(storagePath)

      // Clean up old preview after successful upload
      setTimeout(() => {
        if (previewUrl) revokePreviewUrl(previewUrl)
      }, 1000)

    } catch (err) {
      console.error('Avatar upload failed:', err)
      setError('Failed to upload avatar. Please try again.')
      // Clean up preview on error
      if (previewUrl) {
        revokePreviewUrl(previewUrl)
        setPreviewUrl(null)
      }
    } finally {
      setUploading(false)
    }
  }, [userId, supabase, onUploadComplete, previewUrl])

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={uploading}
        className="relative h-20 w-20 rounded-[14px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] overflow-hidden group focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:ring-offset-2 focus:ring-offset-[#07090d]"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-[18px] font-semibold text-[rgba(238,242,255,0.65)]">
            {initials}
          </span>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </div>

        {/* Loading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          </div>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <p className="absolute top-full left-0 right-0 mt-2 text-[11px] text-red-400 text-center">
          {error}
        </p>
      )}
    </div>
  )
}
