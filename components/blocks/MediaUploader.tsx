'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import type { BlockMedia } from '@/lib/types'

interface MediaUploaderProps {
  blockId: string
  userId: string
  media: BlockMedia[]
  onUpload: (blockId: string, file: File) => Promise<BlockMedia | void>
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Please select an image or video file')
      return
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setIsUploading(true)
    try {
      await onUpload(blockId, file)
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload file')
    } finally {
      setIsUploading(false)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async (mediaId: string) => {
    setDeletingId(mediaId)
    try {
      await onDelete(mediaId)
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Failed to delete file')
    } finally {
      setDeletingId(null)
    }
  }

  const getMediaUrl = (storagePath: string) => {
    const { data } = supabase.storage
      .from('block-media')
      .getPublicUrl(storagePath)
    return data.publicUrl
  }

  return (
    <div>
      <label className="block text-[13px] font-medium text-[rgba(238,242,255,0.72)] mb-2">
        Media
      </label>

      {/* Media grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {media.map((item) => (
            <div key={item.id} className="relative aspect-square">
              {item.media_type === 'image' ? (
                <img
                  src={getMediaUrl(item.storage_path)}
                  alt=""
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <video
                  src={getMediaUrl(item.storage_path)}
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
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
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
      </div>
    </div>
  )
}
