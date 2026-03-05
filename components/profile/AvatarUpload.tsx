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
  const [imgFailed, setImgFailed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const initials = displayName.slice(0, 2).toUpperCase()

  // Use preview (blob) URL first, then the pre-resolved signed URL from parent
  const avatarUrl = imgFailed ? null : (previewUrl || resolvedAvatarUrl || null)

  const handleClick = () => {
    if (!uploading) {
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset file input so same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    // Validate file type — also accept files with no type (iOS HEIC sometimes reports empty)
    if (file.type && !isValidImageFile(file)) {
      setError('Please select a valid image (JPEG, PNG, WebP, or GIF)')
      return
    }

    setError(null)
    setImgFailed(false)
    setUploading(true)

    let newPreviewUrl: string | null = null

    try {
      // Compress the image
      const compressed = await compressAvatar(file)

      // Create preview immediately
      newPreviewUrl = createPreviewUrl(compressed.blob)
      setPreviewUrl(newPreviewUrl)

      // Upload to Supabase storage — use timestamp to bust cache
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

    } catch (err) {
      console.error('Avatar upload failed:', err)
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(`Upload failed: ${msg}`)
      // Clean up preview on error
      if (newPreviewUrl) {
        revokePreviewUrl(newPreviewUrl)
        setPreviewUrl(null)
      }
    } finally {
      setUploading(false)
    }
  }, [userId, supabase, onUploadComplete])

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={uploading}
        className="relative h-20 w-20 rounded-[14px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] overflow-hidden group focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:ring-offset-2 focus:ring-offset-[#07090d] flex items-center justify-center"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-full w-full object-cover"
            onError={() => setImgFailed(true)}
            loading="eager"
            width={80}
            height={80}
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

      {/* Accept all image types including iOS camera formats.
          Use opacity-0/absolute instead of hidden — display:none prevents
          iOS standalone PWA from opening the photo picker. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="absolute w-0 h-0 opacity-0 overflow-hidden"
        tabIndex={-1}
      />

      {error && (
        <p className="absolute top-full left-0 right-0 mt-2 text-[11px] text-red-400 text-center whitespace-nowrap">
          {error}
        </p>
      )}
    </div>
  )
}
